import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { old_password, new_password } = body || {};
  if (!old_password || !new_password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const pool = getDbPool();
  try {
    const [rows] = await pool.query("SELECT password FROM user WHERE user_id = ?", [user.sub]);
    const row = Array.isArray(rows) && rows[0] ? (rows[0] as any) : null;
    if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const ok = await bcrypt.compare(String(old_password), row.password);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    const hash = await bcrypt.hash(String(new_password), 10);
    await pool.query("UPDATE user SET password = ? WHERE user_id = ?", [hash, user.sub]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}


