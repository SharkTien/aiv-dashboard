import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const formId = parseInt(id);
    
    if (isNaN(formId)) {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 });
    }


    const pool = getDbPool();

    // First, let's test with a simple query
    const testQuery = `SELECT COUNT(*) as count FROM form_submissions WHERE form_id = ?`;
    const [testResult] = await pool.query(testQuery, [formId]);

    // Get submissions with empty entity_id or organic entity_id
    const submissionsQuery = `
      SELECT 
        fs.id,
        fs.form_id,
        fs.entity_id,
        fs.timestamp,
        ff.field_name,
        fr.value,
        CASE 
          WHEN ff.field_name = 'uni' AND fr.value != 'other--uni-2' THEN um.uni_name
          WHEN ff.field_name = 'uni' AND fr.value = 'other--uni-2' THEN 'other--uni-2'
          ELSE fr.value
        END as value_label
      FROM form_submissions fs
      LEFT JOIN form_responses fr ON fs.id = fr.submission_id
      LEFT JOIN form_fields ff ON fr.field_id = ff.id
      LEFT JOIN uni_mapping um ON ff.field_name = 'uni' AND fr.value = um.uni_id
      LEFT JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ? AND (fs.entity_id IS NULL OR fs.entity_id = 0 OR e.name = 'organic')
      ORDER BY fs.timestamp DESC
    `;
    const [submissions] = await pool.query(submissionsQuery, [formId]);

    // Group responses by submission
    const groupedSubmissions: any[] = [];
    const submissionMap = new Map();

    (submissions as any[]).forEach((row: any) => {
      if (!submissionMap.has(row.id)) {
        const submission = {
          id: row.id,
          form_id: row.form_id,
          entity_id: row.entity_id,
          timestamp: row.timestamp,
          responses: []
        };
        submissionMap.set(row.id, submission);
        groupedSubmissions.push(submission);
      }

      if (row.field_name && row.value !== null) {
        submissionMap.get(row.id).responses.push({
          field_name: row.field_name,
          value: row.value,
          value_label: row.value_label
        });
      }
    });

    return NextResponse.json({
      submissions: groupedSubmissions
    });

  } catch (error) {
    console.error('Error fetching submissions for manual allocation:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
