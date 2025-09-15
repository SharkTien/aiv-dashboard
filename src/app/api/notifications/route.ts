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

  const where = ['user_id = ?'];
  const params: any[] = [user.sub];
  if (unreadOnly) where.push('read_flag = 0');
  const whereClause = `WHERE ${where.join(' AND ')}`;

  const [rows] = await pool.query(
    `SELECT id, type, title, body, read_flag, created_at
     FROM notification
     ${whereClause}
     ORDER BY id DESC
     LIMIT ?`,
    [...params, limit]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM notification ${whereClause}`,
    params
  );
  const total = Array.isArray(countRows) && countRows.length ? (countRows[0] as any).total : 0;

  return NextResponse.json({ success: true, items: Array.isArray(rows) ? rows : [], pagination: { total } });
}

