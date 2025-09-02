import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Vary", "Origin");
  return res;
}

export async function OPTIONS() {
  const res = NextResponse.json({}, { status: 204 });
  return cors(res);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code: formCode } = await ctx.params;
  const pool = getDbPool();
  
  try {
    // Get form by code
    const [formRows] = await pool.query(
      "SELECT id, code, name FROM forms WHERE code = ?", 
      [formCode]
    );
    
    if (!Array.isArray(formRows) || (formRows as any).length === 0) {
      return cors(NextResponse.json({ error: "Form not found" }, { status: 404 }));
    }
    
    const form: any = (formRows as any)[0];
    
    // Get form fields
    const [fieldRows] = await pool.query(
      `SELECT field_name, field_label, field_type, field_options, sort_order 
       FROM form_fields 
       WHERE form_id = ? 
       ORDER BY sort_order ASC, id ASC`,
      [form.id]
    );
    
    const fields = Array.isArray(fieldRows) ? (fieldRows as any) : [];
    
    // Parse field options for select/radio/checkbox fields
    const processedFields = fields.map((field: any) => ({
      ...field,
      field_options: field.field_options ? JSON.parse(field.field_options) : null
    }));
    
    return cors(NextResponse.json({ 
      form: {
        id: form.id,
        code: form.code,
        name: form.name
      },
      fields: processedFields
    }));
  } catch (error) {
    console.error("Error fetching form:", error);
    return cors(NextResponse.json({ error: "Failed to fetch form" }, { status: 500 }));
  }
}
