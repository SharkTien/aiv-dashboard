import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isAdmin = user.role === 'admin';
  const pool = getDbPool();

  const { id } = await ctx.params;
  const body = await req.json();
  const message = String(body?.message || '').trim();
  const newStatus = body?.status as 'open' | 'closed' | undefined;
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  // Ensure feedback exists and get owner
  const [rows] = await pool.query(`SELECT id, user_id, title FROM feedback WHERE id = ?`, [id]);
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
  const fb = rows[0] as any;

  await pool.execute(
    `INSERT INTO feedback_reply (feedback_id, author_id, message) VALUES (?, ?, ?)`,
    [id, user.sub, message]
  );

  if (isAdmin && (newStatus === 'open' || newStatus === 'closed')) {
    await pool.execute(`UPDATE feedback SET status = ? WHERE id = ?`, [newStatus, id]);
  }

  // Notifications: if admin replies, notify owner; if user replies, notify admins
  if (isAdmin) {
    await pool.execute(
      `INSERT INTO notification (user_id, type, title, body) VALUES (?, 'feedback_reply', ?, ?)`,
      [fb.user_id, `Admin replied to your feedback: ${fb.title}`, message]
    );
  } else {
    const [admins] = await pool.query(`SELECT user_id FROM user WHERE role = 'admin' AND status = 1`);
    const adminIds: number[] = Array.isArray(admins) ? (admins as any[]).map((r) => r.user_id) : [];
    for (const adminId of adminIds) {
      await pool.execute(
        `INSERT INTO notification (user_id, type, title, body) VALUES (?, 'feedback_reply', ?, ?)`,
        [adminId, `New reply on feedback #${id}`, message]
      );
    }
  }

  return NextResponse.json({ success: true });
}


