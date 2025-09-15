import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const pool = getDbPool();

  // Only allow marking own notifications as read
  const [res] = await pool.execute(`UPDATE notification SET read_flag = 1 WHERE id = ? AND user_id = ?`, [id, user.sub]);
  const affected = (res as any)?.affectedRows || 0;
  if (affected === 0) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

