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
          console.warn(`Failed to pre-fetch lookup data for field ${field.field_name}:`, e);
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
        console.warn("Failed to fetch existing form codes:", e);
      }
    }

    // Process and insert submissions in batches
    let successCount = 0;
    let errorCount = 0;
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
            // Check for duplicate form code
            let isDuplicate = false;
            let formCodeValue = "";

            if (formCodeField) {
              const formCodeHeader = Object.keys(columnMapping).find(header =>
                columnMapping[header] === formCodeField
              );
              if (formCodeHeader) {
                const columnIndex = headers.indexOf(formCodeHeader);
                if (columnIndex >= 0 && columnIndex < row.length) {
                  formCodeValue = String(row[columnIndex] || "").trim();
                  if (formCodeValue && existingFormCodes.has(formCodeValue)) {
                    isDuplicate = true;
                  }
                }
              }
            }

            if (isDuplicate) {
              continue;
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

                  // Excel serial number
                  if (/^\d+(\.\d+)?$/.test(timestampStr)) {
                    const serialNumber = parseFloat(timestampStr);
                    if (serialNumber >= 1 && serialNumber <= 100000) {
                      const excelEpoch = new Date(1900, 0, 1);
                      const millisecondsPerDay = 24 * 60 * 60 * 1000;
                      let adjustedSerial = serialNumber;
                      if (serialNumber > 59) {
                        adjustedSerial = serialNumber - 1;
                      }
                      parsedDate = new Date(excelEpoch.getTime() + (adjustedSerial - 1) * millisecondsPerDay);
                      // Convert to Vietnam time (+7)
                      parsedDate = new Date(parsedDate.getTime() + (7 * 60 * 60 * 1000));
                    }
                  }

                  if (!parsedDate || isNaN(parsedDate.getTime())) {
                    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(timestampStr)) {
                      const [month, day, year] = timestampStr.split('/');
                      const monthNum = parseInt(month) - 1;
                      const dayNum = parseInt(day);
                      const yearNum = parseInt(year);
                      parsedDate = new Date(Date.UTC(yearNum, monthNum, dayNum, 0, 0, 0));
                    } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(timestampStr)) {
                      const [year, month, day] = timestampStr.split('-');
                      const monthNum = parseInt(month) - 1;
                      const dayNum = parseInt(day);
                      const yearNum = parseInt(year);
                      parsedDate = new Date(Date.UTC(yearNum, monthNum, dayNum, 0, 0, 0));
                    } else {
                      parsedDate = new Date(timestampStr);
                    }
                  }

                  if (parsedDate && !isNaN(parsedDate.getTime())) {
                    submissionTimestamp = parsedDate.toISOString().slice(0, 19).replace('T', ' ');
                  }
                } catch (error) {
                  // ignore, fallback to now
                }
              }
            }
            if (!submissionTimestamp) {
              const now = new Date();
              const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
              submissionTimestamp = vietnamTime.toISOString().slice(0, 19).replace('T', ' ');
            }

            submissionsToInsert.push([Number(formId), submissionTimestamp]);
            rowResponseCounts.push(rowResponseCount);
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Row ${globalRowIndex + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error(`Error processing row ${globalRowIndex + 2}:`, error);
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
              console.error(`Row ${i + 1}: Expected ${rowResponseCount} responses but only ${responsesToInsert.length - responseIndex} available`);
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
        console.error(`Error processing batch starting at row ${batchStart + 1}:`, error);
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
              console.error(`Error updating entity_id for submission ${submission.id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating entity_id for submissions:", error);
    }

    // Check for duplicate phone/email and update duplicated field
    let duplicateCheckCount = 0;
    try {
      // Load per-form duplicate field settings
      let duplicateFieldIds: number[] = [];
      try {
        const [dupRows] = await pool.query(
          `SELECT field_id FROM form_duplicate_settings WHERE form_id = ?`,
          [formId]
        );
        duplicateFieldIds = Array.isArray(dupRows) ? (dupRows as any[]).map(r => r.field_id) : [];
      } catch (e) {
        console.warn('Duplicate settings table not found or error querying. Falling back to phone/email if exist.');
      }

      // Resolve fields to check
      let fieldsToCheck = fields.filter(f => duplicateFieldIds.includes(f.id));
      if (fieldsToCheck.length === 0) {
        const phoneField = fields.find(f => f.field_name === 'phone');
        const emailField = fields.find(f => f.field_name === 'email');
        fieldsToCheck = [phoneField, emailField].filter(Boolean) as any[];
      }

      if (fieldsToCheck.length > 0) {
        let query = `
          SELECT fs.id, fs.timestamp, fs.duplicated
        FROM form_submissions fs
        `;
        const params: any[] = [];
        const aliasList: string[] = [];
        fieldsToCheck.forEach((field, idx) => {
          const alias = `f${idx}`;
          aliasList.push(alias);
          query += ` LEFT JOIN form_responses ${alias} ON fs.id = ${alias}.submission_id AND ${alias}.field_id = ?`;
          params.push(field.id);
        });
        query += ` WHERE fs.form_id = ? ORDER BY fs.id ASC`;
        params.push(formId);

        const [allSubmissionRows] = await pool.query(query, params);

        if (Array.isArray(allSubmissionRows) && allSubmissionRows.length > 0) {
          const groups: { [key: string]: any[] } = {};
          for (const submission of allSubmissionRows as any[]) {
            const parts: string[] = [];
            fieldsToCheck.forEach((_, idx) => {
              const alias = `f${idx}`;
              const val = submission?.[`${alias}.value`] ?? submission?.[alias]?.value ?? submission?.[alias + '_value'] ?? '';
              parts.push(String(val || '').trim());
            });
            const key = parts.join('|');
            if (!key || parts.every(p => p === '')) continue;
            if (!groups[key]) groups[key] = [];
            groups[key].push(submission);
          }

          const duplicateIds = new Set<number>();
          for (const submissions of Object.values(groups)) {
            if (submissions.length > 1) {
              const sorted = (submissions as any[]).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              for (let i = 1; i < sorted.length; i++) {
                duplicateIds.add(sorted[i].id);
              }
            }
          }
          if (duplicateIds.size > 0) {
            const duplicateIdsArray = Array.from(duplicateIds);
            await pool.query(
              "UPDATE form_submissions SET duplicated = 1 WHERE id IN (?)",
              [duplicateIdsArray]
            );
            duplicateCheckCount = duplicateIdsArray.length;
          }
        }
      }
    } catch (error) {
      console.error("Error checking for duplicate phone/email submissions:", error);
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${successCount} submissions imported successfully, ${errorCount} failed.`,
      details: {
        totalRows: dataRows.length,
        successCount,
        errorCount,
        validFields,
        formCodeField,
        timestampField,
        duplicateCount: dataRows.length - successCount - errorCount,
        entityUpdateCount,
        duplicateCheckCount,
        errors: errors.slice(0, 10)
      }
    });

  } catch (error) {
    console.error("Error importing submissions:", error);
    return NextResponse.json({
      error: "Failed to import submissions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
