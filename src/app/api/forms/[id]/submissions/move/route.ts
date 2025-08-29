import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sourceFormId } = await ctx.params;
  const { submissionIds, targetFormId } = await req.json();

  if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
    return NextResponse.json({ error: "No submission IDs provided" }, { status: 400 });
  }

  if (!targetFormId || targetFormId === sourceFormId) {
    return NextResponse.json({ error: "Invalid target form ID" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Verify source form exists
    const [sourceFormRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [sourceFormId]);
    if (!Array.isArray(sourceFormRows) || (sourceFormRows as any).length === 0) {
      return NextResponse.json({ error: "Source form not found" }, { status: 404 });
    }

    // Verify target form exists
    const [targetFormRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [targetFormId]);
    if (!Array.isArray(targetFormRows) || (targetFormRows as any).length === 0) {
      return NextResponse.json({ error: "Target form not found" }, { status: 404 });
    }

    // Verify all submissions belong to source form
    const [existingSubmissions] = await pool.query(
      "SELECT id FROM form_submissions WHERE id IN (?) AND form_id = ?",
      [submissionIds, sourceFormId]
    );
    
    const existingIds = Array.isArray(existingSubmissions) ? (existingSubmissions as any).map((s: any) => s.id) : [];
    const validIds = submissionIds.filter((id: number) => existingIds.includes(id));
    
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid submissions found" }, { status: 400 });
    }

    // Get target form fields to map field names
    const [targetFormFields] = await pool.query(
      "SELECT id, field_name FROM form_fields WHERE form_id = ? ORDER BY sort_order ASC",
      [targetFormId]
    );
    const targetFields = Array.isArray(targetFormFields) ? targetFormFields as any[] : [];
    const targetFieldMap = new Map(targetFields.map(f => [f.field_name, f.id]));

    // Get source form fields
    const [sourceFormFields] = await pool.query(
      "SELECT id, field_name FROM form_fields WHERE form_id = ? ORDER BY sort_order ASC",
      [sourceFormId]
    );
    const sourceFields = Array.isArray(sourceFormFields) ? sourceFormFields as any[] : [];
    const sourceFieldMap = new Map(sourceFields.map(f => [f.field_name, f.id]));

    // Start transaction
    await pool.query("START TRANSACTION");

    try {
      let movedCount = 0;
      let skippedCount = 0;

      for (const submissionId of validIds) {
        // Get submission data
        const [submissionRows] = await pool.query(
          "SELECT id, timestamp FROM form_submissions WHERE id = ? AND form_id = ?",
          [submissionId, sourceFormId]
        );

        if (!Array.isArray(submissionRows) || (submissionRows as any).length === 0) {
          skippedCount++;
          continue;
        }

        const submission = (submissionRows as any)[0];

        // Create new submission in target form
        const [newSubmissionResult] = await pool.query(
          "INSERT INTO form_submissions (form_id, timestamp) VALUES (?, ?)",
          [targetFormId, submission.timestamp]
        );

        const newSubmissionId = (newSubmissionResult as any).insertId;

        // Get responses from source submission
        const [responseRows] = await pool.query(
          "SELECT fr.field_id, fr.value FROM form_responses fr " +
          "JOIN form_fields ff ON fr.field_id = ff.id " +
          "WHERE fr.submission_id = ? AND ff.form_id = ?",
          [submissionId, sourceFormId]
        );

        const responses = Array.isArray(responseRows) ? responseRows as any[] : [];

        // Insert responses into target form (only for matching field names)
        for (const response of responses) {
          const sourceField = sourceFields.find(f => f.id === response.field_id);
          if (sourceField && targetFieldMap.has(sourceField.field_name)) {
            const targetFieldId = targetFieldMap.get(sourceField.field_name);
            await pool.query(
              "INSERT INTO form_responses (submission_id, field_id, value) VALUES (?, ?, ?)",
              [newSubmissionId, targetFieldId, response.value]
            );
          }
        }

        // Delete original submission (this will cascade delete responses)
        await pool.query("DELETE FROM form_submissions WHERE id = ?", [submissionId]);

        movedCount++;
      }

      // Commit transaction
      await pool.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: `Successfully moved ${movedCount} submissions to target form`,
        details: {
          movedCount,
          skippedCount,
          totalRequested: submissionIds.length,
          validIds: validIds.length
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await pool.query("ROLLBACK");
      throw error;
    }

  } catch (error) {
    console.error("Error moving submissions:", error);
    return NextResponse.json({ 
      error: "Failed to move submissions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
