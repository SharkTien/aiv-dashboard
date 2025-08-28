import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const formCode = params.code;
  const pool = getDbPool();
  
  try {
    // Get form by code
    const [formRows] = await pool.query(
      "SELECT id, code, name FROM forms WHERE code = ?", 
      [formCode]
    );
    
    if (!Array.isArray(formRows) || formRows.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    const form = formRows[0];
    
    // Get form fields
    const [fieldRows] = await pool.query(
      `SELECT field_name, field_label, field_type, field_options, is_required, sort_order 
       FROM form_fields 
       WHERE form_id = ? 
       ORDER BY sort_order ASC, id ASC`,
      [form.id]
    );
    
    const fields = Array.isArray(fieldRows) ? fieldRows : [];
    
    // Parse field options for select/radio/checkbox fields
    const processedFields = fields.map(field => ({
      ...field,
      field_options: field.field_options ? JSON.parse(field.field_options) : null
    }));
    
    return NextResponse.json({ 
      form: {
        id: form.id,
        code: form.code,
        name: form.name
      },
      fields: processedFields
    });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}
