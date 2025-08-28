import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const pool = getDbPool();

    // Basic connectivity probe
    try {
      await pool.query("SELECT 1");
    } catch (probeErr: unknown) {
      const msg = (probeErr as any)?.message || String(probeErr);
      console.error("[Login] DB probe failed:", msg);
      return NextResponse.json({ error: "DB probe failed", detail: msg }, { status: 500 });
    }

    const [rows] = await pool.query(
      `SELECT user_id, entity_id, name, password AS password_hash, role, status FROM user WHERE email = ? LIMIT 1`,
      [email]
    );

    const list = Array.isArray(rows) ? (rows as Array<{ user_id: number; entity_id: number; name: string; password_hash: string; role: string; status: number }>) : [];
    const user = list.length ? list[0] : null;
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (!user.status) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = jwt.sign(
      { sub: user.user_id, role: user.role, name: user.name, entity_id: user.entity_id },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({ success: true });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err: unknown) {
    const msg = (err as any)?.message || String(err);
    console.error("[Login] Server error:", msg);
    return NextResponse.json({ error: "Server error", detail: msg }, { status: 500 });
  }
}


