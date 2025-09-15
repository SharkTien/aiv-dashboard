import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;
  const pool = getDbPool();

  // Ensure it exists
  const [rows] = await pool.query(`SELECT id FROM feedback WHERE id = ?`, [id]);
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Cascade via FK will remove replies
  await pool.execute(`DELETE FROM feedback WHERE id = ?`, [id]);
  return NextResponse.json({ success: true });
}


