import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: formId } = await ctx.params;
  const pool = getDbPool();

  try {
    // Verify form exists and get its fields
    const [formRows] = await pool.query("SELECT id, code FROM forms WHERE id = ?", [formId]);
    if (!Array.isArray(formRows) || formRows.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const [fieldRows] = await pool.query(
      "SELECT id, field_name, field_label, field_type, field_options FROM form_fields WHERE form_id = ? ORDER BY sort_order ASC",
      [formId]
    );
    const fields = Array.isArray(fieldRows) ? fieldRows as any[] : [];
    const fieldMap = new Map(fields.map(f => [f.field_name, f]));

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length < 2) {
      return NextResponse.json({ error: "File must have at least a header row and one data row" }, { status: 400 });
    }

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1) as any[][];

    // Map columns to form fields and detect timestamp/form code columns
    const columnMapping: { [key: string]: string } = {};
    const validFields: string[] = [];
    let formCodeField: string | null = null;
    let timestampField: string | null = null;
    let timestampColumnIndex: number = -1;

    // Step 1: Check if there's a timestamp column
    headers.forEach((header, index) => {
      const normalizedHeader = header?.toString().toLowerCase().trim();
      if (normalizedHeader && (normalizedHeader.includes('timestamp') || normalizedHeader.includes('submitted'))) {
        timestampField = header;
        timestampColumnIndex = index;
      }
    });

    // Step 2: Map form fields (excluding timestamp field)
    headers.forEach((header, index) => {
      const normalizedHeader = header?.toString().toLowerCase().trim();
      if (index === timestampColumnIndex) return;
      for (const [fieldName, field] of fieldMap) {
        if (
          fieldName.toLowerCase() === normalizedHeader ||
          field.field_label.toLowerCase() === normalizedHeader
        ) {
          columnMapping[header] = fieldName;
          validFields.push(fieldName);
          if (fieldName.toLowerCase().includes('form') && fieldName.toLowerCase().includes('code')) {
            formCodeField = fieldName;
          }
          break;
        }
      }
    });

    if (validFields.length === 0) {
      return NextResponse.json({
        error: "No valid columns found. Available fields: " + Array.from(fieldMap.keys()).join(", ")
      }, { status: 400 });
    }

    // Pre-fetch database lookups for database fields to avoid repeated queries
    const databaseLookups = new Map<string, Map<string, string>>();
    for (const field of fields) {
      if (field.field_type === "database") {
        try {
          const cfg = field.field_options ? JSON.parse(field.field_options) : null;
          const source = cfg?.source as string | undefined;
          if (source) {
            const [rows] = await pool.query(
              source === "uni_mapping"
                ? `SELECT uni_id, uni_name FROM uni_mapping`
                : `SELECT id, name FROM ${source}`
            );
            const lookupMap = new Map<string, string>();
            if (Array.isArray(rows)) {
              for (const row of rows as any[]) {
                const key = source === "uni_mapping" ? row.uni_name : row.name;
                const value = source === "uni_mapping" ? row.uni_id : row.id;
                lookupMap.set(String(key).toLowerCase(), String(value));
              }
            }
            databaseLookups.set(field.field_name, lookupMap);
          }
        } catch (e) {
        }
      }
    }

    // Get existing form codes if formCodeField exists
    const existingFormCodes = new Set<string>();
    if (formCodeField) {
      try {
        const field = fieldMap.get(formCodeField);
        if (field?.id) {
          const [existingRows] = await pool.query(
            "SELECT fr.value FROM form_responses fr " +
            "JOIN form_submissions fs ON fr.submission_id = fs.id " +
            "WHERE fs.form_id = ? AND fr.field_id = ? AND fr.value IS NOT NULL AND fr.value != ''",
            [formId, field.id]
          );
          if (Array.isArray(existingRows)) {
            for (const row of existingRows as any[]) {
              existingFormCodes.add(String(row.value));
            }
          }
        }
      } catch (e) {
      }
    }

    // Process and insert submissions in batches
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];
    const batchSize = 100;

    for (let batchStart = 0; batchStart < dataRows.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, dataRows.length);
      const batch = dataRows.slice(batchStart, batchEnd);

      try {
        const submissionsToInsert: Array<[number, string]> = [];
        const responsesToInsert: Array<[any, number, string]> = [];
        const rowResponseCounts: number[] = [];

        for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
          const row = batch[rowIndex];
          if (!row || row.length === 0) continue;

          const globalRowIndex = batchStart + rowIndex;

          try {
            // Do not skip any rows here; we'll mark older duplicates after import (newest wins)
            let formCodeValue = "";
            if (formCodeField) {
              const formCodeHeader = Object.keys(columnMapping).find(header =>
                columnMapping[header] === formCodeField
              );
              if (formCodeHeader) {
                const columnIndex = headers.indexOf(formCodeHeader);
                if (columnIndex >= 0 && columnIndex < row.length) {
                  formCodeValue = String(row[columnIndex] || "").trim();
                }
              }
            }

            // Process each valid field for this row
            let rowResponseCount = 0;
            for (const [excelHeader, fieldName] of Object.entries(columnMapping)) {
              const columnIndex = headers.indexOf(excelHeader);
              if (columnIndex >= 0 && columnIndex < row.length) {
                const rawValue = row[columnIndex];
                if (rawValue !== null && rawValue !== undefined) {
                  const field = fieldMap.get(fieldName);
                  let saveValue = String(rawValue);

                  if (field?.field_type === "database") {
                    const lookupMap = databaseLookups.get(field.field_name);
                    if (lookupMap && rawValue && String(rawValue).trim() !== "") {
                      const lookupKey = String(rawValue).toLowerCase();
                      const foundId = lookupMap.get(lookupKey);
                      if (foundId) {
                        saveValue = foundId;
                      }
                    }
                  }

                  if (field?.id && fieldName !== timestampField) {
                    responsesToInsert.push([0, field.id, saveValue]);
                    rowResponseCount++;
                  }
                }
              }
            }

            if (formCodeValue && formCodeField) {
              existingFormCodes.add(formCodeValue);
            }

            // Timestamp processing
            let submissionTimestamp = "";
            if (timestampColumnIndex >= 0 && timestampColumnIndex < row.length) {
              const timestampValue = row[timestampColumnIndex];
              if (timestampValue !== null && timestampValue !== undefined && String(timestampValue).trim() !== "") {
                try {
                  const timestampStr = String(timestampValue).trim();
                  let parsedDate: Date | null = null;

                  // Special handling for Excel date objects
                  if (timestampValue instanceof Date) {
                    parsedDate = timestampValue;
                  }
                  
                  // Try XLSX date parsing first (most accurate for Excel files)
                  if (!parsedDate && typeof timestampValue === 'number') {
                    try {
                      // XLSX date parsing - more accurate than manual calculation
                      const xlsxDate = XLSX.SSF.parse_date_code(timestampValue);
                      if (xlsxDate) {
                        parsedDate = new Date(xlsxDate.y, xlsxDate.m - 1, xlsxDate.d, xlsxDate.H || 0, xlsxDate.M || 0, xlsxDate.S || 0);
                      }
                    } catch (e) {
                    }
                  }

                  // Check if it's a pure Excel serial number (just digits and decimal)
                  if (!parsedDate && /^\d+(\.\d+)?$/.test(timestampStr)) {
                    const serialNumber = parseFloat(timestampStr);
                    // Excel serial numbers are typically large numbers (40000+ for recent dates)
                    if (serialNumber >= 1 && serialNumber <= 100000) {
                      // More accurate Excel date calculation
                      const excelEpoch = new Date(1900, 0, 1);
                      const days = Math.floor(serialNumber);
                      const time = (serialNumber - days) * 24; // Convert fractional part to hours
                      const hours = Math.floor(time);
                      const minutes = Math.floor((time - hours) * 60);
                      const seconds = Math.floor(((time - hours) * 60 - minutes) * 60);
                      
                      // Excel date calculation (accounting for leap year bug)
                      let adjustedDays = days;
                      if (days > 59) {
                        adjustedDays = days - 1; // Excel incorrectly treats 1900 as leap year
                      }
                      
                      // Use UTC to avoid timezone issues
                      parsedDate = new Date(Date.UTC(1900, 0, adjustedDays, hours, minutes, seconds));
                      // Keep original timezone - no conversion
                    }
                  }

                  if (!parsedDate || isNaN(parsedDate.getTime())) {
                    // Handle DD/MM/YYYY HH:mm format (e.g., "1/8/2025 0:00" = 1st August 2025)
                    if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(:\d{2})?(\s+[AP]M)?$/i.test(timestampStr)) {
                      const [datePart, timePart] = timestampStr.split(' ');
                      const [day, month, year] = datePart.split('/'); // Note: day first, then month
                      const [time, ampm] = timePart.split(' ');
                      
                      let [hours, minutes, seconds = '0'] = time.split(':');
                      let hourNum = parseInt(hours);
                      const minuteNum = parseInt(minutes);
                      const secondNum = parseInt(seconds);
                      
                      // Handle AM/PM
                      if (ampm) {
                        if (ampm.toUpperCase() === 'PM' && hourNum !== 12) {
                          hourNum += 12;
                        } else if (ampm.toUpperCase() === 'AM' && hourNum === 12) {
                          hourNum = 0;
                        }
                      }
                      
                      const monthNum = parseInt(month) - 1; // Month is 0-indexed
                      const dayNum = parseInt(day);
                      const yearNum = parseInt(year);
                      
                      // Parse as local time to match server timezone
                      parsedDate = new Date(yearNum, monthNum, dayNum, hourNum, minuteNum, secondNum);
                    }
                    // Handle MM/DD/YYYY format (date only)
                    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(timestampStr)) {
                      const [month, day, year] = timestampStr.split('/');
                      const monthNum = parseInt(month) - 1;
                      const dayNum = parseInt(day);
                      const yearNum = parseInt(year);
                      // Use local time instead of UTC to preserve original timezone
                      parsedDate = new Date(yearNum, monthNum, dayNum, 0, 0, 0);
                    } 
                    // Handle YYYY-MM-DD format
                    else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(timestampStr)) {
                      const [year, month, day] = timestampStr.split('-');
                      const monthNum = parseInt(month) - 1;
                      const dayNum = parseInt(day);
                      const yearNum = parseInt(year);
                      // Use local time instead of UTC to preserve original timezone
                      parsedDate = new Date(yearNum, monthNum, dayNum, 0, 0, 0);
                    } 
                    // Handle YYYY-MM-DD HH:mm:ss format
                    else if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?$/.test(timestampStr)) {
                      const [datePart, timePart] = timestampStr.split(' ');
                      const [year, month, day] = datePart.split('-');
                      const [hours, minutes, seconds = '0'] = timePart.split(':');
                      
                      const monthNum = parseInt(month) - 1;
                      const dayNum = parseInt(day);
                      const yearNum = parseInt(year);
                      const hourNum = parseInt(hours);
                      const minuteNum = parseInt(minutes);
                      const secondNum = parseInt(seconds);
                      
                      parsedDate = new Date(yearNum, monthNum, dayNum, hourNum, minuteNum, secondNum);
                    }
                    // Fallback to native Date parsing
                    else {
                      parsedDate = new Date(timestampStr);
                    }
                  }

                  if (parsedDate && !isNaN(parsedDate.getTime())) {
                    // Use local time instead of UTC to match server timezone
                    const year = parsedDate.getFullYear();
                    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(parsedDate.getDate()).padStart(2, '0');
                    const hours = String(parsedDate.getHours()).padStart(2, '0');
                    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
                    const seconds = String(parsedDate.getSeconds()).padStart(2, '0');
                    
                    submissionTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                  } else {
                  }
                } catch (error) {
                  // ignore, fallback to now
                }
              }
            }
            if (!submissionTimestamp) {
              const now = new Date();
              // Use current time without timezone conversion
              submissionTimestamp = now.toISOString().slice(0, 19).replace('T', ' ');
            }

            submissionsToInsert.push([Number(formId), submissionTimestamp]);
            rowResponseCounts.push(rowResponseCount);
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Row ${globalRowIndex + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Batch insert submissions
        if (submissionsToInsert.length > 0) {
          const [submissionResult] = await pool.query(
            "INSERT INTO form_submissions (form_id, timestamp) VALUES ?",
            [submissionsToInsert]
          );
          const submissionIds = [];
          const insertId = (submissionResult as any).insertId;
          for (let i = 0; i < submissionsToInsert.length; i++) {
            submissionIds.push(insertId + i);
          }

          // Update response data with actual submission IDs
          let responseIndex = 0;
          for (let i = 0; i < submissionsToInsert.length; i++) {
            const submissionId = submissionIds[i];
            const rowResponseCount = rowResponseCounts[i];
            if (responseIndex + rowResponseCount > responsesToInsert.length) {
              continue;
            }
            const rowResponses = responsesToInsert.slice(responseIndex, responseIndex + rowResponseCount);
            for (const response of rowResponses) {
              (response as any)[0] = submissionId;
            }
            responseIndex += rowResponseCount;
          }

          if (responsesToInsert.length > 0) {
            await pool.query(
              "INSERT INTO form_responses (submission_id, field_id, value) VALUES ?",
              [responsesToInsert]
            );
          }
        }
      } catch (error) {
        errorCount += batch.length;
        errors.push(`Batch ${Math.floor(batchStart / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update entity_id for submissions that have 'uni' field
    let entityUpdateCount = 0;
    try {
      const uniField = fields.find(f => f.field_name === 'uni');
      if (uniField) {
        const [submissionRows] = await pool.query(
          `SELECT fs.id, fr.value as uni_value
           FROM form_submissions fs
           JOIN form_responses fr ON fs.id = fr.submission_id
           WHERE fs.form_id = ? AND fr.field_id = ? AND fr.value IS NOT NULL AND fr.value != ''`,
          [formId, uniField.id]
        );
        if (Array.isArray(submissionRows) && submissionRows.length > 0) {
          for (const submission of submissionRows as any[]) {
            try {
              const uniValue = submission.uni_value;
              if (!uniValue || uniValue === "other--uni-2") continue;
              const [uniMappingRows] = await pool.query(
                "SELECT entity_id FROM uni_mapping WHERE uni_id = ?",
                [uniValue]
              );
              if (Array.isArray(uniMappingRows) && uniMappingRows.length > 0) {
                const entityId = (uniMappingRows as any)[0].entity_id;
                await pool.query(
                  "UPDATE form_submissions SET entity_id = ? WHERE id = ?",
                  [entityId, submission.id]
                );
                entityUpdateCount++;
              }
            } catch (error) {
            }
          }
        }
      }
    } catch (error) {
    }

    // Post-import de-duplication: mark older submissions as duplicated if a newer one shares phone or email
    let duplicateCheckCount = 0;
    try {
      // Mark older phone duplicates
      const [dupPhoneResult] = await pool.query(
        `UPDATE form_submissions fs
         JOIN form_responses frp ON frp.submission_id = fs.id
         JOIN form_fields ffp ON ffp.id = frp.field_id AND ffp.field_name = 'phone'
         SET fs.duplicated = TRUE
         WHERE fs.form_id = ? AND fs.duplicated = FALSE AND EXISTS (
           SELECT 1 FROM form_submissions fs2
           JOIN form_responses frp2 ON frp2.submission_id = fs2.id
           JOIN form_fields ffp2 ON ffp2.id = frp2.field_id AND ffp2.field_name = 'phone'
           WHERE fs2.form_id = fs.form_id AND fs2.id != fs.id AND frp2.value = frp.value AND fs2.id > fs.id
         )`,
        [formId]
      );
      const affectedPhone = (dupPhoneResult as any).affectedRows || 0;

      // Mark older email duplicates
      const [dupEmailResult] = await pool.query(
        `UPDATE form_submissions fs
         JOIN form_responses fre ON fre.submission_id = fs.id
         JOIN form_fields ffe ON ffe.id = fre.field_id AND ffe.field_name = 'email'
         SET fs.duplicated = TRUE
         WHERE fs.form_id = ? AND fs.duplicated = FALSE AND EXISTS (
           SELECT 1 FROM form_submissions fs2
           JOIN form_responses fre2 ON fre2.submission_id = fs2.id
           JOIN form_fields ffe2 ON ffe2.id = fre2.field_id AND ffe2.field_name = 'email'
           WHERE fs2.form_id = fs.form_id AND fs2.id != fs.id AND fre2.value = fre.value AND fs2.id > fs.id
         )`,
        [formId]
      );
      const affectedEmail = (dupEmailResult as any).affectedRows || 0;

      duplicateCount += affectedPhone + affectedEmail;
      duplicateCheckCount = affectedPhone + affectedEmail;
    } catch (e) {
    }

    // Clear relevant caches after successful import
    const response = NextResponse.json({
      success: true,
      message: `Import completed. ${successCount} submissions imported successfully, ${errorCount} failed, ${duplicateCount} older duplicates marked.`,
      details: {
        totalRows: dataRows.length,
        successCount,
        errorCount,
        duplicateCount,
        validFields,
        formCodeField,
        timestampField,
        entityUpdateCount,
        duplicateCheckCount,
        errors: errors.slice(0, 10)
      }
    });

    // Clear cache headers to force fresh data on next request
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error("Error importing submissions:", error);
    return NextResponse.json({
      error: "Failed to import submissions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
