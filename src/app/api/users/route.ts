import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const cursor = searchParams.get("cursor");
  const q = (searchParams.get("q") || "").trim();

  const pool = getDbPool();
  const params: any[] = [];
  let where = "";
  if (q) {
    where += " WHERE email LIKE ? OR name LIKE ?";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (cursor) {
    where += (where ? " AND" : " WHERE") + " user_id < ?";
    params.push(Number(cursor));
  }
  const [rows] = await pool.query(
    `SELECT user_id, entity_id, email, name, role, status, created_at
     FROM user ${where}
     ORDER BY user_id DESC
     LIMIT ?`,
    [...params, limit + 1]
  );
  // @ts-expect-error mysql2 types
  const list = Array.isArray(rows) ? rows : [];
  const hasMore = list.length > limit;
  const data = hasMore ? list.slice(0, limit) : list;
  const nextCursor = hasMore ? data[data.length - 1].user_id : null;
  return NextResponse.json({ items: data, nextCursor });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { entity_id, email, name, password, role = "member", status = 1 } = body || {};
  if (!entity_id || !email || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const rawPassword = password || generatePassword();
  const hash = await bcrypt.hash(rawPassword, 10);
  const pool = getDbPool();
  await pool.query(
    "INSERT INTO user (entity_id, email, name, password, role, status) VALUES (?, ?, ?, ?, ?, ?)",
    [entity_id, email, name, hash, role, status]
  );

  return NextResponse.json({ success: true, email, name, password: rawPassword, role, entity_id });
}

function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}


