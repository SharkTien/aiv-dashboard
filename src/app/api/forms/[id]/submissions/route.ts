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
      `SELECT fs.id, fs.timestamp
       FROM form_submissions fs
       WHERE fs.form_id = ?
       ORDER BY fs.timestamp DESC`,
      [formId]
    );
    
    const submissions: any[] = Array.isArray(submissionRows) ? (submissionRows as any) : [];
    
    
    // Test timestamp parsing
    submissions.forEach(s => {
      if (s.timestamp) {
        try {
          const date = new Date(s.timestamp);
          console.log(`Submission ${s.id}: "${s.timestamp}" -> ${date.toISOString()} -> ${date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
        } catch (error) {
          console.error(`Submission ${s.id}: Error parsing "${s.timestamp}":`, error);
        }
      }
    });
    
    // Get responses for each submission, include value_label when sourced from uni_mapping
    const submissionsWithResponses = await Promise.all(
      submissions.map(async (submission) => {
        const [responseRows] = await pool.query(
          `SELECT ff.field_name, ff.field_label, fr.value,
                  um.uni_name AS value_label
           FROM form_responses fr
           JOIN form_fields ff ON fr.field_id = ff.id
           LEFT JOIN uni_mapping um
             ON ff.field_type = 'database'
            AND ff.field_options LIKE '%"source":"uni_mapping"%'
            AND CAST(fr.value AS UNSIGNED) = um.uni_id
           WHERE fr.submission_id = ?
           ORDER BY ff.sort_order ASC`,
          [submission.id]
        );
        
        return {
          id: submission.id,
          timestamp: submission.timestamp,
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

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: formId } = await ctx.params;
  const pool = getDbPool();
  
  try {
    const { submissionIds } = await req.json();
    
    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json({ error: "No submission IDs provided" }, { status: 400 });
    }

    // Verify form exists
    const [formRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [formId]);
    if (!Array.isArray(formRows) || (formRows as any).length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Verify all submissions belong to this form
    const [existingSubmissions] = await pool.query(
      "SELECT id FROM form_submissions WHERE id IN (?) AND form_id = ?",
      [submissionIds, formId]
    );
    
    const existingIds = Array.isArray(existingSubmissions) ? (existingSubmissions as any).map((s: any) => s.id) : [];
    const validIds = submissionIds.filter((id: number) => existingIds.includes(id));
    
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid submissions found" }, { status: 400 });
    }

    // Delete responses first (due to foreign key constraint)
    await pool.query(
      "DELETE FROM form_responses WHERE submission_id IN (?)",
      [validIds]
    );

    // Delete submissions
    const [deleteResult] = await pool.query(
      "DELETE FROM form_submissions WHERE id IN (?)",
      [validIds]
    );

    const deletedCount = (deleteResult as any).affectedRows;

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} submissions`,
      deletedCount,
      requestedCount: submissionIds.length,
      validCount: validIds.length
    });

  } catch (error) {
    console.error("Error deleting submissions:", error);
    return NextResponse.json({ error: "Failed to delete submissions" }, { status: 500 });
  }
}
