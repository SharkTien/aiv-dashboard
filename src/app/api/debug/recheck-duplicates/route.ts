import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = await request.json();

  if (!formId) {
    return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // 1. Reset all duplicated flags to 0
    await pool.query(
      "UPDATE form_submissions SET duplicated = 0 WHERE form_id = ?",
      [formId]
    );

    // 2. Get form fields
    const [fieldRows] = await pool.query(
      "SELECT id, field_name, field_label, field_type FROM form_fields WHERE form_id = ? ORDER BY sort_order ASC",
      [formId]
    );
    const fields = Array.isArray(fieldRows) ? fieldRows as any[] : [];

    // 3. Load duplicate field settings
    let duplicateFieldIds: number[] = [];
    try {
      const [dupRows] = await pool.query(
        `SELECT field_id FROM form_duplicate_settings WHERE form_id = ?`,
        [formId]
      );
      duplicateFieldIds = Array.isArray(dupRows) ? (dupRows as any[]).map(r => r.field_id) : [];
    } catch (e) {
    }

    // 4. Resolve fields to check
    let fieldsToCheck = fields.filter(f => duplicateFieldIds.includes(f.id));
    if (fieldsToCheck.length === 0) {
      const phoneField = fields.find(f => f.field_name === 'phone');
      const emailField = fields.find(f => f.field_name === 'email');
      fieldsToCheck = [phoneField, emailField].filter(Boolean) as any[];
    }

    let duplicateCheckCount = 0;

    if (fieldsToCheck.length > 0) {
      // 5. Build query to get all submissions with their duplicate field values
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
        // 6. Group submissions by duplicate field values
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

        // 7. Mark duplicates (keep the latest submission, mark others as duplicate)
        const duplicateIds = new Set<number>();
        for (const submissions of Object.values(groups)) {
          if (submissions.length > 1) {
            const sorted = (submissions as any[]).sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            // Mark all except the first (latest) as duplicate
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

    // 8. Get final statistics
    const [statsRows] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN duplicated = 1 THEN 1 ELSE 0 END) as duplicated_count
       FROM form_submissions 
       WHERE form_id = ?`,
      [formId]
    );
    const stats = Array.isArray(statsRows) && statsRows.length > 0 ? statsRows[0] as any : { total: 0, duplicated_count: 0 };

    return NextResponse.json({
      success: true,
      message: `Duplicate check completed for form ${formId}`,
      details: {
        formId: parseInt(formId),
        fieldsChecked: fieldsToCheck.map(f => f.field_name),
        duplicateSettingsUsed: duplicateFieldIds.length > 0,
        totalSubmissions: stats.total,
        duplicatesFound: duplicateCheckCount,
        finalDuplicateCount: stats.duplicated_count
      }
    });

  } catch (error) {
    console.error("Error rechecking duplicates:", error);
    return NextResponse.json(
      { success: false, error: 'Failed to recheck duplicates' },
      { status: 500 }
    );
  }
}
