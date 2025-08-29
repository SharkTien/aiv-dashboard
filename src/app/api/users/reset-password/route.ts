import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (admin?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { user_id, new_password } = body || {};
  if (!user_id) return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  const pool = getDbPool();
  const password = new_password && String(new_password).trim().length >= 6 ? String(new_password) : generatePassword();
  const hash = await bcrypt.hash(password, 10);
  try {
    await pool.query("UPDATE user SET password = ? WHERE user_id = ?", [hash, user_id]);
    return NextResponse.json({ success: true, password });
  } catch (e) {
    console.error("Failed to reset password", e);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}

function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}


