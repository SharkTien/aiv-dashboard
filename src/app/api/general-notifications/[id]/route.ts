import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const nid = Number(id);
  if (!nid) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await req.json();
  const { title, content_html, category } = body || {};
  const pool = getDbPool();
  try {
    await pool.query(
      `UPDATE general_notifications SET title = COALESCE(?, title), content_html = COALESCE(?, content_html), category = COALESCE(?, category), updated_at = NOW() WHERE id = ?`,
      [title ?? null, content_html ?? null, category ?? null, nid]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error updating general notification:", e);
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const nid = Number(id);
  if (!nid) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const pool = getDbPool();
  try {
    await pool.query(`DELETE FROM general_notifications WHERE id = ?`, [nid]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error deleting general notification:", e);
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 });
  }
}

