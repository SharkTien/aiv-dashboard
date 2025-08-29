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

    // Simple pipeline: Check for timestamp column and map form fields
    const columnMapping: { [key: string]: string } = {};
    const validFields: string[] = [];
    let formCodeField: string | null = null;
    let timestampField: string | null = null;
    let timestampColumnIndex: number = -1;

    // Step 1: Check if there's a timestamp column
    headers.forEach((header, index) => {
      const normalizedHeader = header?.toString().toLowerCase().trim();
      
      // Check if this is a timestamp column
      if (normalizedHeader.includes('timestamp') || 
          normalizedHeader.includes('submitted')) {
        timestampField = header;
        timestampColumnIndex = index;
      }
    });

    // Step 2: Map form fields (excluding timestamp field)
    headers.forEach((header, index) => {
      const normalizedHeader = header?.toString().toLowerCase().trim();
      
      // Skip timestamp column as it's handled separately
      if (index === timestampColumnIndex) {
        return;
      }
      
      // Try to match by field_name or field_label
      for (const [fieldName, field] of fieldMap) {
        if (
          fieldName.toLowerCase() === normalizedHeader ||
          field.field_label.toLowerCase() === normalizedHeader
        ) {
          columnMapping[header] = fieldName;
          validFields.push(fieldName);
          
          // Check if this is a form-code field
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
              source === "uni_mapping" ?
              `SELECT uni_id, uni_name FROM uni_mapping` :
              `SELECT id, name FROM ${source}`
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

    // Process and insert submissions in batches
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const batchSize = 100; // Process 100 rows at a time

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

    // Process rows in batches
    for (let batchStart = 0; batchStart < dataRows.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, dataRows.length);
      const batch = dataRows.slice(batchStart, batchEnd);
      
      try {
        // Prepare batch data
        const submissionsToInsert: Array<[number, string]> = []; // [formId, timestamp]
        const responsesToInsert: Array<[any, number, string]> = [];
        const skippedRows: number[] = [];
        const rowResponseCounts: number[] = []; // Track how many responses each row has

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
                    skippedRows.push(globalRowIndex + 2); // +2 for header row and 1-based index
                  }
                }
              }
            }

            if (isDuplicate) {
              // Skip this row if it's a duplicate
              continue;
            }

            // Process each valid field for this row
            let rowResponseCount = 0;
            for (const [excelHeader, fieldName] of Object.entries(columnMapping)) {
              const columnIndex = headers.indexOf(excelHeader);
              if (columnIndex >= 0 && columnIndex < row.length) {
                const rawValue = row[columnIndex];
                // Include empty strings but not null/undefined
                if (rawValue !== null && rawValue !== undefined) {
                  const field = fieldMap.get(fieldName);
                  let saveValue = String(rawValue);

                  // Handle database field type (lookup from pre-fetched data)
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

                  // Store response data for batch insert (include empty strings)
                  // Skip timestamp field as it's handled separately for database insertion
                  if (field?.id && fieldName !== timestampField) {
                    responsesToInsert.push([0, field.id, saveValue]); // submissionId will be filled later
                    rowResponseCount++;
                  }
                }
              }
            }

            // Add form code to existing set to prevent duplicates within the same import
            if (formCodeValue && formCodeField) {
              existingFormCodes.add(formCodeValue);
            }

            // Simple timestamp processing: Use timestamp from Excel or current time
            let submissionTimestamp = "";
            
            if (timestampColumnIndex >= 0 && timestampColumnIndex < row.length) {
              const timestampValue = row[timestampColumnIndex];
              
              // Check if timestamp value is not empty
              if (timestampValue !== null && timestampValue !== undefined && String(timestampValue).trim() !== "") {
                try {
                  const timestampStr = String(timestampValue).trim();
                  let parsedDate = null;
                  
                  // Try to parse as Excel serial number first (most common case)
                  if (/^\d+(\.\d+)?$/.test(timestampStr)) {
                    const serialNumber = parseFloat(timestampStr);
                    if (serialNumber >= 1 && serialNumber <= 100000) {
                      // Excel dates are days since 1900-01-01
                      // Note: Excel incorrectly treats 1900 as a leap year, so we need to adjust
                      const excelEpoch = new Date(1900, 0, 1);
                      const millisecondsPerDay = 24 * 60 * 60 * 1000;
                      let adjustedSerial = serialNumber;
                      if (serialNumber > 59) {
                        adjustedSerial = serialNumber - 1; // Excel leap year bug
                      }
                      parsedDate = new Date(excelEpoch.getTime() + (adjustedSerial - 1) * millisecondsPerDay);
                      // Convert to Vietnam time (+7)
                      const vietnamTime = new Date(parsedDate.getTime() + (8 * 60 * 60 * 1000));
                      parsedDate = vietnamTime;
                    }
                  }
                  
                  // If not Excel serial, try standard date parsing
                  if (!parsedDate || isNaN(parsedDate.getTime())) {
                    // Check if it's a date-only format (like "8/1/2025") and add time
                    let dateStr = timestampStr; 
                    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(timestampStr)) {
                      // Format: M/D/YYYY or MM/DD/YYYY - treat as UTC date at 00:00:00
                      const [month, day, year] = timestampStr.split('/');
                      const monthNum = parseInt(month) - 1; // JavaScript months are 0-based
                      const dayNum = parseInt(day);
                      const yearNum = parseInt(year);
                      parsedDate = new Date(Date.UTC(yearNum, monthNum, dayNum, 0, 0, 0));
                    } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(timestampStr)) {
                      // Format: YYYY-M-D or YYYY-MM-DD - treat as UTC date at 00:00:00
                      const [year, month, day] = timestampStr.split('-');
                      const monthNum = parseInt(month) - 1; // JavaScript months are 0-based
                      const dayNum = parseInt(day);
                      const yearNum = parseInt(year);
                      parsedDate = new Date(Date.UTC(yearNum, monthNum, dayNum, 0, 0, 0));
                    } else {
                      // Other formats, try standard parsing
                      parsedDate = new Date(timestampStr);
                    }
                  }
                  
                  // If valid date, use it
                  if (parsedDate && !isNaN(parsedDate.getTime())) {
                    submissionTimestamp = parsedDate.toISOString().slice(0, 19).replace('T', ' ');
                  } else {
                    // Invalid timestamp format, will use current time
                  }
                } catch (error) {
                  // Error parsing timestamp, will use current time
                }
              }
            }
            
            // Use current time if no valid timestamp found
            if (!submissionTimestamp) {
              const now = new Date();
              const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
              submissionTimestamp = vietnamTime.toISOString().slice(0, 19).replace('T', ' ');
            }
            
            // Mark that we need to create a submission for this row
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
            
            // Validate that we have enough responses
            if (responseIndex + rowResponseCount > responsesToInsert.length) {
              console.error(`Row ${i + 1}: Expected ${rowResponseCount} responses but only ${responsesToInsert.length - responseIndex} available`);
              continue;
            }
            
            const rowResponses = responsesToInsert.slice(responseIndex, responseIndex + rowResponseCount);
            for (const response of rowResponses) {
              (response as any)[0] = submissionId; // Set the submission ID
            }
            responseIndex += rowResponseCount;
          }

          // Batch insert responses
          if (responsesToInsert.length > 0) {
            console.log(`Inserting ${responsesToInsert.length} responses for ${submissionsToInsert.length} submissions`);
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
        errors: errors.slice(0, 10) // Limit error messages
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
