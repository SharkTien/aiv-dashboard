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

  const { id: formId } = await ctx.params;
  const pool = getDbPool();

  try {
    // Get the original form
    const [formRows] = await pool.query(
      "SELECT id, name, code FROM forms WHERE id = ?",
      [formId]
    );
    
    if (!Array.isArray(formRows) || formRows.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const originalForm = formRows[0] as any;

    // Get the original form fields
    const [fieldRows] = await pool.query(
      "SELECT field_name, field_label, field_type, field_options, is_required, sort_order FROM form_fields WHERE form_id = ? ORDER BY sort_order ASC",
      [formId]
    );
    
    const fields = Array.isArray(fieldRows) ? fieldRows as any[] : [];

    // Create new form with "(Copy)" suffix
    const newFormName = `${originalForm.name} (Copy)`;
    const newFormCode = `${originalForm.code}_copy_${Date.now()}`;

    const [newFormResult] = await pool.query(
      "INSERT INTO forms (name, code) VALUES (?, ?)",
      [newFormName, newFormCode]
    );
    
    const newFormId = (newFormResult as any).insertId;

    // Copy all fields to the new form
    for (const field of fields) {
      await pool.query(
        "INSERT INTO form_fields (form_id, field_name, field_label, field_type, field_options, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          newFormId,
          field.field_name,
          field.field_label,
          field.field_type,
          field.field_options,
          field.is_required,
          field.sort_order
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Form duplicated successfully",
      newForm: {
        id: newFormId,
        name: newFormName,
        code: newFormCode
      },
      fieldsCopied: fields.length
    });

  } catch (error) {
    console.error("Error duplicating form:", error);
    return NextResponse.json({ 
      error: "Failed to duplicate form",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
