import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getDbPool();
  
  try {
    const [rows] = await pool.query(
      `SELECT 
        uc.id, 
        uc.entity_id, 
        uc.code, 
        uc.name, 
        uc.description, 
        uc.is_active, 
        uc.created_at, 
        uc.updated_at,
        e.name as entity_name
      FROM utm_campaigns uc
      LEFT JOIN entity e ON uc.entity_id = e.entity_id
      ORDER BY uc.name ASC`
    );
    
    const campaigns = Array.isArray(rows) ? rows : [];
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error fetching UTM campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch UTM campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, name, description, is_active = true, entity_id } = body || {};

  if (!code || !name) {
    return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
  }
  if (entity_id === undefined || entity_id === null || isNaN(Number(entity_id))) {
    return NextResponse.json({ error: "entity_id is required and must be a number" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    const [result] = await pool.query(
      "INSERT INTO utm_campaigns (entity_id, code, name, description, is_active) VALUES (?, ?, ?, ?, ?)",
      [Number(entity_id), code, name, description || null, is_active]
    );
    
    const campaignId = (result as any).insertId;
    
    // If this campaign is set active, deactivate other active campaigns of the same entity
    if (is_active) {
      await pool.query(
        "UPDATE utm_campaigns SET is_active = 0 WHERE entity_id = ? AND id <> ?",
        [Number(entity_id), campaignId]
      );
    }
    
    const [rows] = await pool.query(
      `SELECT 
        uc.id, 
        uc.entity_id, 
        uc.code, 
        uc.name, 
        uc.description, 
        uc.is_active, 
        uc.created_at, 
        uc.updated_at,
        e.name as entity_name
      FROM utm_campaigns uc
      LEFT JOIN entity e ON uc.entity_id = e.entity_id
      WHERE uc.id = ?`,
      [campaignId]
    );
    
    const campaign = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    
    return NextResponse.json({ 
      success: true, 
      campaign 
    });
  } catch (error) {
    console.error("Error creating UTM campaign:", error);
    return NextResponse.json({ error: "Failed to create UTM campaign" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, code, name, description, is_active, entity_id } = body || {};

  if (!id || !code || !name) {
    return NextResponse.json({ error: "ID, code and name are required" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Determine effective entity id (either provided or from DB)
    let effectiveEntityId: number | null = null;
    if (entity_id !== undefined && entity_id !== null && !isNaN(Number(entity_id))) {
      effectiveEntityId = Number(entity_id);
    } else {
      const [existingRows] = await pool.query(
        "SELECT entity_id FROM utm_campaigns WHERE id = ?",
        [id]
      );
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        effectiveEntityId = (existingRows[0] as any).entity_id as number;
      }
    }

    await pool.query(
      "UPDATE utm_campaigns SET entity_id = COALESCE(?, entity_id), code = ?, name = ?, description = ?, is_active = ? WHERE id = ?",
      [effectiveEntityId, code, name, description || null, is_active, id]
    );
    
    // If marking this campaign active, deactivate other campaigns of the same entity
    if (is_active && effectiveEntityId !== null && !isNaN(Number(effectiveEntityId))) {
      await pool.query(
        "UPDATE utm_campaigns SET is_active = 0 WHERE entity_id = ? AND id <> ?",
        [Number(effectiveEntityId), id]
      );
    }
    
    const [rows] = await pool.query(
      `SELECT 
        uc.id, 
        uc.entity_id, 
        uc.code, 
        uc.name, 
        uc.description, 
        uc.is_active, 
        uc.created_at, 
        uc.updated_at,
        e.name as entity_name
      FROM utm_campaigns uc
      LEFT JOIN entity e ON uc.entity_id = e.entity_id
      WHERE uc.id = ?`,
      [id]
    );
    
    const campaign = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    
    return NextResponse.json({ 
      success: true, 
      campaign 
    });
  } catch (error) {
    console.error("Error updating UTM campaign:", error);
    return NextResponse.json({ error: "Failed to update UTM campaign" }, { status: 500 });
  }
}
