import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: formId } = await ctx.params;
  const pool = getDbPool();
  
  try {
    // Verify form exists
    const [formRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [formId]);
    if (!Array.isArray(formRows) || (formRows as any).length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Get submissions with responses
    const [submissionRows] = await pool.query(
      `SELECT fs.id, fs.submitted_at
       FROM form_submissions fs
       WHERE fs.form_id = ?
       ORDER BY fs.submitted_at DESC`,
      [formId]
    );
    
    const submissions: any[] = Array.isArray(submissionRows) ? (submissionRows as any) : [];
    
    // Get responses for each submission
    const submissionsWithResponses = await Promise.all(
      submissions.map(async (submission) => {
        const [responseRows] = await pool.query(
          `SELECT ff.field_name, ff.field_label, fr.value
           FROM form_responses fr
           JOIN form_fields ff ON fr.field_id = ff.id
           WHERE fr.submission_id = ?
           ORDER BY ff.sort_order ASC`,
          [submission.id]
        );
        
        return {
          id: submission.id,
          submitted_at: submission.submitted_at,
          responses: Array.isArray(responseRows) ? (responseRows as any) : []
        };
      })
    );
    
    const response = NextResponse.json({ items: submissionsWithResponses });
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    return response;
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    return NextResponse.json({ error: "Failed to fetch form submissions" }, { status: 500 });
  }
}
