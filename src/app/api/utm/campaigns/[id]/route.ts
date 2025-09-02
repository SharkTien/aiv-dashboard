import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  const { form_id } = body || {};

  if (form_id === undefined || form_id === null || isNaN(Number(form_id))) {
    return NextResponse.json({ error: "form_id is required and must be a number" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Check if campaign exists
    const [rows] = await pool.query(
      "SELECT id FROM utm_campaigns WHERE id = ?",
      [id]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Update the campaign form_id
    await pool.query(
      "UPDATE utm_campaigns SET form_id = ?, updated_at = NOW() WHERE id = ?",
      [Number(form_id), id]
    );
    
    // Get updated campaign data
    const [updatedRows] = await pool.query(
      `SELECT 
        uc.id, 
        uc.entity_id, 
        uc.code, 
        uc.name, 
        uc.description, 
        uc.form_id, 
        uc.created_at, 
        uc.updated_at,
        e.name as entity_name,
        f.name as form_name
      FROM utm_campaigns uc
      LEFT JOIN entity e ON uc.entity_id = e.entity_id
      LEFT JOIN forms f ON uc.form_id = f.id
      WHERE uc.id = ?`,
      [id]
    );
    
    const campaign = Array.isArray(updatedRows) && updatedRows.length > 0 ? updatedRows[0] : null;
    
    return NextResponse.json({ 
      success: true, 
      campaign 
    });
  } catch (error) {
    console.error("Error updating UTM campaign:", error);
    return NextResponse.json({ error: "Failed to update UTM campaign" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Check if campaign exists
    const [rows] = await pool.query(
      "SELECT id FROM utm_campaigns WHERE id = ?",
      [id]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Delete the campaign
    await pool.query("DELETE FROM utm_campaigns WHERE id = ?", [id]);
    
    return NextResponse.json({ 
      success: true, 
      message: "Campaign deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting UTM campaign:", error);
    return NextResponse.json({ error: "Failed to delete UTM campaign" }, { status: 500 });
  }
}
