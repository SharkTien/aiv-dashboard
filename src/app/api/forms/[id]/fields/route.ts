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
  console.log("API: Fetching fields for formId:", formId);
  const pool = getDbPool();
  
  try {
    // Verify form exists
    const [formRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [formId]);
    console.log("API: Form rows:", formRows);
    if (!Array.isArray(formRows) || (formRows as any).length === 0) {
      console.log("API: Form not found");
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Get fields
    const [rows] = await pool.query(
      `SELECT id, field_name, field_label, field_type, field_options, sort_order, created_at
       FROM form_fields 
       WHERE form_id = ? 
       ORDER BY sort_order ASC, id ASC`,
      [formId]
    );
    
    const data = Array.isArray(rows) ? (rows as any) : [];
    console.log("API: Fields data:", data);
    
    const response = NextResponse.json({ fields: data });
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    return response;
  } catch (error) {
    console.error("Error fetching form fields:", error);
    return NextResponse.json({ error: "Failed to fetch form fields" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { id: formId } = await ctx.params;
  const body = await req.json();
  const { field_name, field_label, field_type, field_options, sort_order } = body || {};
  
  if (!field_name || !field_label || !field_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Verify form exists
    const [formRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [formId]);
    if (!Array.isArray(formRows) || (formRows as any).length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Check if field_name already exists in this form
    const [existingRows] = await pool.query(
      "SELECT id FROM form_fields WHERE form_id = ? AND field_name = ?", 
      [formId, field_name]
    );
    if (Array.isArray(existingRows) && (existingRows as any).length > 0) {
      return NextResponse.json({ error: "Field name already exists in this form" }, { status: 409 });
    }

    // Get the next sort_order value
    const [maxOrderResult] = await pool.query(
      "SELECT COALESCE(MAX(sort_order), 0) as max_order FROM form_fields WHERE form_id = ?",
      [formId]
    );
    const nextSortOrder = ((maxOrderResult as any)[0]?.max_order || 0) + 1;
    
    const [result] = await pool.query(
      "INSERT INTO form_fields (form_id, field_name, field_label, field_type, field_options, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [formId, field_name, field_label, field_type, field_options || null, nextSortOrder]
    );
    
    const fieldId = (result as any).insertId;
    
    return NextResponse.json({ 
      success: true, 
      field: { 
        id: fieldId, 
        form_id: formId, 
        field_name, 
        field_label, 
        field_type, 
        field_options, 
        sort_order 
      }
    });
  } catch (error) {
    console.error("Error creating form field:", error);
    return NextResponse.json({ error: "Failed to create form field" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { id: formId } = await ctx.params;
  const body = await req.json();
  const { field_id, field_name, field_label, field_type, field_options, sort_order } = body || {};
  
  if (!field_id) {
    return NextResponse.json({ error: "Missing field id" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Verify field exists and belongs to this form
    const [existingRows] = await pool.query(
      "SELECT id FROM form_fields WHERE id = ? AND form_id = ?", 
      [field_id, formId]
    );
    if (!Array.isArray(existingRows) || (existingRows as any).length === 0) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }
    
    // Check if field_name already exists (if updating field_name)
    if (field_name) {
      const [nameRows] = await pool.query(
        "SELECT id FROM form_fields WHERE form_id = ? AND field_name = ? AND id != ?", 
        [formId, field_name, field_id]
      );
      if (Array.isArray(nameRows) && (nameRows as any).length > 0) {
        return NextResponse.json({ error: "Field name already exists in this form" }, { status: 409 });
      }
    }
    
    await pool.query(
      `UPDATE form_fields 
       SET field_name = COALESCE(?, field_name), 
           field_label = COALESCE(?, field_label), 
           field_type = COALESCE(?, field_type), 
           field_options = ?, 
           sort_order = COALESCE(?, sort_order) 
       WHERE id = ? AND form_id = ?`,
      [field_name ?? null, field_label ?? null, field_type ?? null, field_options, sort_order ?? null, field_id, formId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating form field:", error);
    return NextResponse.json({ error: "Failed to update form field" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { id: formId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get("field_id");
  
  if (!fieldId) {
    return NextResponse.json({ error: "Missing field id" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    const [result] = await pool.query(
      "DELETE FROM form_fields WHERE id = ? AND form_id = ?", 
      [fieldId, formId]
    );
    
    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form field:", error);
    return NextResponse.json({ error: "Failed to delete form field" }, { status: 500 });
  }
}
