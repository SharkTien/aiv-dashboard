import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get('entity_id');
  const pool = getDbPool();
  try {
    if (!entityId) {
      const [rows] = await pool.query("SELECT id, entity_id, code, name, description, is_active, created_at, updated_at FROM utm_campaigns WHERE is_active = TRUE ORDER BY updated_at DESC");
      return NextResponse.json({ active: Array.isArray(rows) ? rows : [] });
    }
    const [rows] = await pool.query("SELECT id, entity_id, code, name, description, is_active, created_at, updated_at FROM utm_campaigns WHERE entity_id = ? AND is_active = TRUE ORDER BY updated_at DESC", [entityId]);
    return NextResponse.json({ active: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    console.error("Error fetching active campaign:", error);
    return NextResponse.json({ error: "Failed to fetch active campaign" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, entity_id } = body || {} as { id: number; entity_id: number };
  if (!id || !entity_id) return NextResponse.json({ error: "id and entity_id are required" }, { status: 400 });

  const pool = getDbPool();
  try {
    await pool.query("UPDATE utm_campaigns SET is_active = FALSE WHERE entity_id = ?", [entity_id]);
    await pool.query("UPDATE utm_campaigns SET is_active = TRUE WHERE id = ? AND entity_id = ?", [id, entity_id]);

    const [rows] = await pool.query("SELECT id, entity_id, code, name, description, is_active, created_at, updated_at FROM utm_campaigns WHERE entity_id = ? AND is_active = TRUE", [entity_id]);
    return NextResponse.json({ success: true, active: Array.isArray(rows) ? rows : [] });
  } catch (error) {
    console.error("Error activating campaign:", error);
    return NextResponse.json({ error: "Failed to activate campaign" }, { status: 500 });
  }
}
