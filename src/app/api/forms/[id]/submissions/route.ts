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

    // Get submissions with responses and entity information in a single optimized query
    const [submissionRows] = await pool.query(
      `SELECT 
        fs.id, fs.timestamp, fs.entity_id, e.name as entity_name, fs.duplicated,
        fr.field_id, fr.value,
        ff.field_name, ff.field_label, ff.field_type, ff.sort_order,
        CASE 
          WHEN fr.value = 'other--uni-2' THEN 'other--uni-2'
          WHEN um.uni_name IS NOT NULL THEN um.uni_name
          ELSE fr.value
        END AS value_label
       FROM form_submissions fs
       LEFT JOIN entity e ON fs.entity_id = e.entity_id
       LEFT JOIN form_responses fr ON fs.id = fr.submission_id
       LEFT JOIN form_fields ff ON fr.field_id = ff.id
       LEFT JOIN uni_mapping um
         ON ff.field_name = 'uni'
        AND fr.value = um.uni_id
       WHERE fs.form_id = ?
       ORDER BY fs.timestamp DESC, ff.sort_order ASC`,
      [formId]
    );
    
    const rows: any[] = Array.isArray(submissionRows) ? (submissionRows as any) : [];
    
    // Group responses by submission
    const submissionsMap = new Map();
    
    rows.forEach(row => {
      if (!submissionsMap.has(row.id)) {
        submissionsMap.set(row.id, {
          id: row.id,
          timestamp: row.timestamp,
          entityId: row.entity_id,
          entityName: row.entity_name || null,
          duplicated: row.duplicated === 1,
          responses: []
        });
      }
      
      // Add response if field data exists
      if (row.field_id) {
        submissionsMap.get(row.id).responses.push({
          field_id: row.field_id,
          field_name: row.field_name,
          field_label: row.field_label,
          field_type: row.field_type,
          value: row.value,
          value_label: row.value_label
        });
      }
    });
    
    const submissionsWithResponses = Array.from(submissionsMap.values());
    
    const response = NextResponse.json({ items: submissionsWithResponses });
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    return response;
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
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
