import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 500);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const offset = (page - 1) * limit;
  const q = (searchParams.get("q") || "").trim();
  const type = searchParams.get("type");

  const pool = getDbPool();
  const params: any[] = [];
  let where = "";
  
  if (q || type) {
    where += " WHERE";
    const conditions = [];
    
    if (q) {
      conditions.push("(name LIKE ? OR code LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    
    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }
    
    where += " " + conditions.join(" AND ");
  }

  // Get total count
  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM forms ${where}`,
    params
  );
  
  const total = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).total : 0;

  // Get paginated data
  const [rows] = await pool.query(
    `SELECT id, code, name, type, created_at, updated_at
     FROM forms ${where}
     ORDER BY created_at DESC
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
  const { name, type = 'oGV' } = body || {};
  
  if (!name) {
    return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
  }

  if (!['oGV', 'TMR', 'EWA'].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Must be one of: oGV, TMR, EWA" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Generate unique code based on name and timestamp
    const timestamp = Date.now();
    const code = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;
    
    const [result] = await pool.query(
      "INSERT INTO forms (code, name, type) VALUES (?, ?, ?)",
      [code, name, type]
    );
    
    const formId = (result as any).insertId;
    
    return NextResponse.json({ 
      success: true, 
      form: { id: formId, code, name, type }
    });
  } catch (error) {
    console.error("Error creating form:", error);
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  const { id, code, name, type } = body || {};
  
  if (!id) {
    return NextResponse.json({ error: "Missing form id" }, { status: 400 });
  }

  if (type && !['oGV', 'TMR', 'EWA'].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Must be one of: oGV, TMR, EWA" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Verify form exists
    const [existingRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [id]);
    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    // Check if code already exists (if updating code)
    if (code) {
      const [codeRows] = await pool.query("SELECT id FROM forms WHERE code = ? AND id != ?", [code, id]);
      if (Array.isArray(codeRows) && codeRows.length > 0) {
        return NextResponse.json({ error: "Form code already exists" }, { status: 409 });
      }
    }
    
    await pool.query(
      "UPDATE forms SET code = COALESCE(?, code), name = COALESCE(?, name), type = COALESCE(?, type) WHERE id = ?",
      [code ?? null, name ?? null, type ?? null, id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "Missing form id" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    const [result] = await pool.query("DELETE FROM forms WHERE id = ?", [id]);
    // @ts-expect-error mysql2 types
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
}
