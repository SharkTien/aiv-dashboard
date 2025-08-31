import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const pool = getDbPool();

    // Fetch real entities from database
    const [entities] = await pool.execute(`
      SELECT 
        entity_id,
        name,
        type
      FROM entity 
      ORDER BY type, name
    `);

    return NextResponse.json({
      success: true,
      items: entities
    });

  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entities' },
      { status: 500 }
    );
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
  
  // Check if this is the organic entity
  const [organicCheck] = await pool.query("SELECT name FROM entity WHERE entity_id = ?", [entity_id]);
  if (Array.isArray(organicCheck) && organicCheck.length > 0) {
    const entity = organicCheck[0] as any;
    if (entity.name.toLowerCase() === 'organic') {
      return NextResponse.json({ error: "Cannot edit the organic entity" }, { status: 403 });
    }
  }
  
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
  
  // Check if this is the organic entity
  const [organicCheck] = await pool.query("SELECT name FROM entity WHERE entity_id = ?", [id]);
  if (Array.isArray(organicCheck) && organicCheck.length > 0) {
    const entity = organicCheck[0] as any;
    if (entity.name.toLowerCase() === 'organic') {
      return NextResponse.json({ error: "Cannot delete the organic entity" }, { status: 403 });
    }
  }
  
  await pool.query("DELETE FROM entity WHERE entity_id = ?", [id]);
  return NextResponse.json({ success: true });
}


