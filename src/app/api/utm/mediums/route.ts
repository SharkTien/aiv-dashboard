import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getDbPool();
  
  try {
    const [rows] = await pool.query(
      "SELECT id, code, name, description, name_required, is_active, created_at, updated_at FROM utm_mediums ORDER BY name ASC"
    );
    
    const mediums = Array.isArray(rows) ? rows : [];
    return NextResponse.json(mediums);
  } catch (error) {
    console.error("Error fetching UTM mediums:", error);
    return NextResponse.json({ error: "Failed to fetch UTM mediums" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, name, description, name_required = false, is_active = true } = body || {};

  if (!code || !name) {
    return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    const [result] = await pool.query(
      "INSERT INTO utm_mediums (code, name, description, name_required, is_active) VALUES (?, ?, ?, ?, ?)",
      [code, name, description || null, name_required, is_active]
    );
    
    const mediumId = (result as any).insertId;
    
    // Get the created medium
    const [rows] = await pool.query(
      "SELECT id, code, name, description, name_required, is_active, created_at, updated_at FROM utm_mediums WHERE id = ?",
      [mediumId]
    );
    
    const medium = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    
    return NextResponse.json({ 
      success: true, 
      medium 
    });
  } catch (error) {
    console.error("Error creating UTM medium:", error);
    return NextResponse.json({ error: "Failed to create UTM medium" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, code, name, description, name_required, is_active } = body || {};

  if (!id || !code || !name) {
    return NextResponse.json({ error: "ID, code and name are required" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    await pool.query(
      "UPDATE utm_mediums SET code = ?, name = ?, description = ?, name_required = ?, is_active = ? WHERE id = ?",
      [code, name, description || null, name_required, is_active, id]
    );
    
    // Get the updated medium
    const [rows] = await pool.query(
      "SELECT id, code, name, description, name_required, is_active, created_at, updated_at FROM utm_mediums WHERE id = ?",
      [id]
    );
    
    const medium = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    
    return NextResponse.json({ 
      success: true, 
      medium 
    });
  } catch (error) {
    console.error("Error updating UTM medium:", error);
    return NextResponse.json({ error: "Failed to update UTM medium" }, { status: 500 });
  }
}
