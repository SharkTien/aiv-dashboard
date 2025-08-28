import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getDbPool();
  
  try {
    const [rows] = await pool.query(
      "SELECT entity_id, name, type FROM entity ORDER BY name ASC"
    );
    
    const data = Array.isArray(rows) ? rows : [];
    
    const response = NextResponse.json({ items: data });
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    return response;
  } catch (error) {
    console.error("Error fetching entities:", error);
    return NextResponse.json({ error: "Failed to fetch entities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { name, type } = body || {};
  if (!name || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const pool = getDbPool();
  await pool.query("INSERT INTO entity (name, type) VALUES (?, ?)", [name, type]);
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { entity_id, name, type } = body || {};
  if (!entity_id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const pool = getDbPool();
  await pool.query("UPDATE entity SET name = COALESCE(?, name), type = COALESCE(?, type) WHERE entity_id = ?", [name ?? null, type ?? null, entity_id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const pool = getDbPool();
  await pool.query("DELETE FROM entity WHERE entity_id = ?", [id]);
  return NextResponse.json({ success: true });
}


