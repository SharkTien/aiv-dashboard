import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const pool = getDbPool();

  // Ensure the requesting user can see the feedback: admin sees all, others only own
  const [fbRows] = await pool.query(`SELECT id, user_id FROM feedback WHERE id = ?`, [id]);
  if (!Array.isArray(fbRows) || fbRows.length === 0) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
  const fb = fbRows[0] as any;
  if (user.role !== 'admin' && Number(user.sub) !== Number(fb.user_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [rows] = await pool.query(
    `SELECT id, feedback_id, author_id, message, created_at
     FROM feedback_reply
     WHERE feedback_id = ?
     ORDER BY id ASC`,
    [id]
  );

  return NextResponse.json({ success: true, items: Array.isArray(rows) ? rows : [] });
}


