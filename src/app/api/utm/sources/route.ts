import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getDbPool();
  
  try {
    const [rows] = await pool.query(
      "SELECT id, code, name, description, platform, is_active, created_at, updated_at FROM utm_sources ORDER BY name ASC"
    );
    
    const sources = Array.isArray(rows) ? rows : [];
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Error fetching UTM sources:", error);
    return NextResponse.json({ error: "Failed to fetch UTM sources" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, name, description, platform, is_active = true } = body || {};

  if (!code || !name) {
    return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    const [result] = await pool.query(
      "INSERT INTO utm_sources (code, name, description, platform, is_active) VALUES (?, ?, ?, ?, ?)",
      [code, name, description || null, platform || null, is_active]
    );
    
    const sourceId = (result as any).insertId;
    
    // Get the created source
    const [rows] = await pool.query(
      "SELECT id, code, name, description, platform, is_active, created_at, updated_at FROM utm_sources WHERE id = ?",
      [sourceId]
    );
    
    const source = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    
    return NextResponse.json({ 
      success: true, 
      source 
    });
  } catch (error) {
    console.error("Error creating UTM source:", error);
    return NextResponse.json({ error: "Failed to create UTM source" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, code, name, description, platform, is_active } = body || {};

  if (!id || !code || !name) {
    return NextResponse.json({ error: "ID, code and name are required" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    await pool.query(
      "UPDATE utm_sources SET code = ?, name = ?, description = ?, platform = ?, is_active = ? WHERE id = ?",
      [code, name, description || null, platform || null, is_active, id]
    );
    
    // Get the updated source
    const [rows] = await pool.query(
      "SELECT id, code, name, description, platform, is_active, created_at, updated_at FROM utm_sources WHERE id = ?",
      [id]
    );
    
    const source = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    
    return NextResponse.json({ 
      success: true, 
      source 
    });
  } catch (error) {
    console.error("Error updating UTM source:", error);
    return NextResponse.json({ error: "Failed to update UTM source" }, { status: 500 });
  }
}
