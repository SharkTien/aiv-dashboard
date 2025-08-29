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
    const [rows] = await pool.query(
      "SELECT id, code, name, created_at, updated_at FROM forms WHERE id = ?",
      [formId]
    );
    
    if (!Array.isArray(rows) || (rows as any).length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    const form: any = (rows as any)[0];
    
    const response = NextResponse.json({ form });
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    return response;
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}

export async function PUT(
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
    const { name } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: "Form name is required" }, { status: 400 });
    }

    // Generate new form code based on name
    const newFormCode = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim()
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      + '-' + Date.now(); // Add timestamp to ensure uniqueness

    // Check if the new code already exists (excluding current form)
    const [existingRows] = await pool.query(
      "SELECT id FROM forms WHERE code = ? AND id != ?",
      [newFormCode, formId]
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      return NextResponse.json({ error: "A form with this name already exists" }, { status: 409 });
    }

    // Update form name and code
    const [result] = await pool.query(
      "UPDATE forms SET name = ?, code = ? WHERE id = ?",
      [name.trim(), newFormCode, formId]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Form updated successfully",
      form: {
        id: formId,
        name: name.trim(),
        code: newFormCode
      }
    });

  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json({ 
      error: "Failed to update form",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function DELETE(
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
    const [result] = await pool.query("DELETE FROM forms WHERE id = ?", [formId]);
    
    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Form deleted successfully" });

  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json({ 
      error: "Failed to delete form",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
