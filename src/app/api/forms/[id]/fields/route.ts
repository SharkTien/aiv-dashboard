import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formId = params.id;
  const pool = getDbPool();
  
  try {
    // Verify form exists
    const [formRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [formId]);
    if (!Array.isArray(formRows) || formRows.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Get fields
    const [rows] = await pool.query(
      `SELECT id, field_name, field_label, field_type, field_options, is_required, sort_order, created_at
       FROM form_fields 
       WHERE form_id = ? 
       ORDER BY sort_order ASC, id ASC`,
      [formId]
    );
    
    const data = Array.isArray(rows) ? rows : [];
    
    const response = NextResponse.json({ items: data });
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    return response;
  } catch (error) {
    console.error("Error fetching form fields:", error);
    return NextResponse.json({ error: "Failed to fetch form fields" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const formId = params.id;
  const body = await req.json();
  const { field_name, field_label, field_type, field_options, is_required, sort_order } = body || {};
  
  if (!field_name || !field_label || !field_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Verify form exists
    const [formRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [formId]);
    if (!Array.isArray(formRows) || formRows.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Check if field_name already exists in this form
    const [existingRows] = await pool.query(
      "SELECT id FROM form_fields WHERE form_id = ? AND field_name = ?", 
      [formId, field_name]
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      return NextResponse.json({ error: "Field name already exists in this form" }, { status: 409 });
    }
    
    const [result] = await pool.query(
      "INSERT INTO form_fields (form_id, field_name, field_label, field_type, field_options, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [formId, field_name, field_label, field_type, field_options || null, is_required || false, sort_order || 0]
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
        is_required, 
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
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const formId = params.id;
  const body = await req.json();
  const { field_id, field_name, field_label, field_type, field_options, is_required, sort_order } = body || {};
  
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
    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }
    
    // Check if field_name already exists (if updating field_name)
    if (field_name) {
      const [nameRows] = await pool.query(
        "SELECT id FROM form_fields WHERE form_id = ? AND field_name = ? AND id != ?", 
        [formId, field_name, field_id]
      );
      if (Array.isArray(nameRows) && nameRows.length > 0) {
        return NextResponse.json({ error: "Field name already exists in this form" }, { status: 409 });
      }
    }
    
    await pool.query(
      `UPDATE form_fields 
       SET field_name = COALESCE(?, field_name), 
           field_label = COALESCE(?, field_label), 
           field_type = COALESCE(?, field_type), 
           field_options = ?, 
           is_required = COALESCE(?, is_required), 
           sort_order = COALESCE(?, sort_order) 
       WHERE id = ? AND form_id = ?`,
      [field_name ?? null, field_label ?? null, field_type ?? null, field_options, is_required ?? null, sort_order ?? null, field_id, formId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating form field:", error);
    return NextResponse.json({ error: "Failed to update form field" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const formId = params.id;
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
