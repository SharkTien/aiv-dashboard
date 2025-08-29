import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const entity_id = searchParams.get("entity_id");
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const offset = (page - 1) * limit;
  const q = (searchParams.get("q") || "").trim();

  const pool = getDbPool();
  const params: any[] = [];
  let where = "";
  
  if (entity_id) {
    where += " WHERE um.entity_id = ?";
    params.push(Number(entity_id));
  }
  
  if (q) {
    where += (where ? " AND" : " WHERE") + " um.uni_name LIKE ?";
    params.push(`%${q}%`);
  }

  // Get total count
  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total
     FROM uni_mapping um
     LEFT JOIN entity e ON um.entity_id = e.entity_id
     ${where}`,
    params
  );
  
  const total = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).total : 0;

  // Get paginated data
  const [rows] = await pool.query(
    `SELECT um.uni_id, um.entity_id, um.uni_name, um.created_at, um.updated_at,
            e.name as entity_name
     FROM uni_mapping um
     LEFT JOIN entity e ON um.entity_id = e.entity_id
     ${where}
     ORDER BY um.uni_id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  
  const data = Array.isArray(rows) ? rows : [];
  const totalPages = Math.ceil(total / limit);
  
  const response = NextResponse.json({ 
    items: data, 
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
  response.headers.set('Content-Type', 'application/json; charset=utf-8');
  return response;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  console.log("Received body:", body);
  const { entity_id, uni_name } = body || {};
  console.log("Extracted values:", { entity_id, uni_name });
  
  if (!entity_id || !uni_name || entity_id === "" || uni_name === "" || isNaN(Number(entity_id))) {
    console.log("Validation failed:", { entity_id, uni_name });
    return NextResponse.json({ error: "Missing required fields: entity_id and uni_name" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Verify entity exists
    const [entityRows] = await pool.query("SELECT entity_id FROM entity WHERE entity_id = ?", [entity_id]);
    if (!Array.isArray(entityRows) || entityRows.length === 0) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }
    
    await pool.query(
      "INSERT INTO uni_mapping (entity_id, uni_name) VALUES (?, ?)",
      [entity_id, uni_name]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating uni_mapping:", error);
    return NextResponse.json({ error: "Failed to create uni mapping" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  const { uni_id, entity_id, uni_name } = body || {};
  
  if (!uni_id) {
    return NextResponse.json({ error: "Missing uni_id" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Verify uni_mapping exists
    const [existingRows] = await pool.query("SELECT uni_id FROM uni_mapping WHERE uni_id = ?", [uni_id]);
    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return NextResponse.json({ error: "Uni mapping not found" }, { status: 404 });
    }
    
    // Verify entity exists if entity_id is being updated
    if (entity_id) {
      const [entityRows] = await pool.query("SELECT entity_id FROM entity WHERE entity_id = ?", [entity_id]);
      if (!Array.isArray(entityRows) || entityRows.length === 0) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      }
    }
    
    await pool.query(
      "UPDATE uni_mapping SET entity_id = COALESCE(?, entity_id), uni_name = COALESCE(?, uni_name) WHERE uni_id = ?",
      [entity_id ?? null, uni_name ?? null, uni_id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating uni_mapping:", error);
    return NextResponse.json({ error: "Failed to update uni mapping" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const uni_id = searchParams.get("uni_id");
  
  if (!uni_id) {
    return NextResponse.json({ error: "Missing uni_id" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    const [result] = await pool.query("DELETE FROM uni_mapping WHERE uni_id = ?", [uni_id]);
    // @ts-expect-error mysql2 types
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Uni mapping not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting uni_mapping:", error);
    return NextResponse.json({ error: "Failed to delete uni mapping" }, { status: 500 });
  }
}
