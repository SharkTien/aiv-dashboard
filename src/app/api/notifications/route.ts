import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pool = getDbPool();

  const { searchParams } = new URL(req.url);
  const unreadOnly = String(searchParams.get('unread_only') || '').toLowerCase() === 'true';
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100);

  // Include personal notifications; when not filtering unread, also include general (user_id = 0)
  const clauses: string[] = [];
  const params: any[] = [];
  if (unreadOnly) {
    clauses.push('user_id = ?');
    params.push(user.sub);
    clauses.push('is_read = 0');
  } else {
    clauses.push('(user_id = ? OR user_id = 0)');
    params.push(user.sub);
  }
  const whereClause = `WHERE ${clauses.join(' AND ')}`;

  const [rows] = await pool.query(
    `SELECT id, type, title, message, is_read, created_at
     FROM notifications
     ${whereClause}
     ORDER BY id DESC
     LIMIT ?`,
    [...params, limit]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
    params
  );
  const total = Array.isArray(countRows) && countRows.length ? (countRows[0] as any).total : 0;

  return NextResponse.json({ success: true, items: Array.isArray(rows) ? rows : [], pagination: { total } });
}

