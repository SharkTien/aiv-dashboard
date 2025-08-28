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
    const [rows] = await pool.query(
      `SELECT user_id, entity_id, name, password AS password_hash, role, status FROM user WHERE email = ? LIMIT 1`,
      [email]
    );

    // @ts-expect-error mysql2 types
    const user = Array.isArray(rows) && rows.length ? rows[0] : null;
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
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


