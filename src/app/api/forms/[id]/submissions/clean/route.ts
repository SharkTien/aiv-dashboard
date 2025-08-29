import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formId = Number(params.id);
  if (!formId || isNaN(formId)) {
    return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 500);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const offset = (page - 1) * limit;

  const pool = getDbPool();

  try {
    // Get clean submissions with deduplication logic
    // This query gets the latest submission for each unique combination of form-code, phone, and email
    const [submissionsResult] = await pool.query(`
      WITH RankedSubmissions AS (
        SELECT 
          fs.id,
          fs.timestamp,
          fs.entity_id,
          e.name as entity_name,
          ROW_NUMBER() OVER (
            PARTITION BY 
              COALESCE(form_code.value, ''),
              COALESCE(phone.value, ''),
              COALESCE(email.value, '')
            ORDER BY fs.timestamp DESC
          ) as rn
        FROM form_submissions fs
        LEFT JOIN entity e ON fs.entity_id = e.entity_id
        LEFT JOIN form_responses form_code ON fs.id = form_code.submission_id 
          AND form_code.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'form-code')
        LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
          AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
        LEFT JOIN form_responses email ON fs.id = email.submission_id 
          AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
        WHERE fs.form_id = ?
      )
      SELECT 
        id,
        timestamp,
        entity_id,
        entity_name
      FROM RankedSubmissions 
      WHERE rn = 1
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `, [formId, formId, formId, formId, limit, offset]);

    const submissions = Array.isArray(submissionsResult) ? submissionsResult : [];

    // Get total count for pagination
    const [countResult] = await pool.query(`
      WITH RankedSubmissions AS (
        SELECT 
          fs.id,
          ROW_NUMBER() OVER (
            PARTITION BY 
              COALESCE(form_code.value, ''),
              COALESCE(phone.value, ''),
              COALESCE(email.value, '')
            ORDER BY fs.timestamp DESC
          ) as rn
        FROM form_submissions fs
        LEFT JOIN form_responses form_code ON fs.id = form_code.submission_id 
          AND form_code.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'form-code')
        LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
          AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
        LEFT JOIN form_responses email ON fs.id = email.submission_id 
          AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
        WHERE fs.form_id = ?
      )
      SELECT COUNT(*) as total
      FROM RankedSubmissions 
      WHERE rn = 1
    `, [formId, formId, formId, formId]);

    const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult[0] as any).total : 0;

    // Get responses for each submission
    const submissionsWithResponses = await Promise.all(
      submissions.map(async (submission: any) => {
        const [responseRows] = await pool.query(`
          SELECT ff.field_name, ff.field_label, fr.value,
                  CASE 
                    WHEN fr.value = 'other--uni-2' THEN 'other--uni-2'
                    WHEN um.uni_name IS NOT NULL THEN um.uni_name
                    ELSE fr.value
                  END AS value_label
           FROM form_responses fr
           JOIN form_fields ff ON fr.field_id = ff.id
           LEFT JOIN uni_mapping um
             ON ff.field_name = 'uni'
            AND fr.value = um.uni_id
           WHERE fr.submission_id = ?
           ORDER BY ff.sort_order ASC
        `, [submission.id]);

        return {
          id: submission.id,
          timestamp: submission.timestamp,
          entityId: submission.entity_id,
          entityName: submission.entity_name,
          responses: Array.isArray(responseRows) ? responseRows : []
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      items: submissionsWithResponses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching clean submissions:", error);
    return NextResponse.json({ error: "Failed to fetch clean submissions" }, { status: 500 });
  }
}
