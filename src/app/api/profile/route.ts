import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, email, role } = body || {};
  const pool = getDbPool();
  try {
    await pool.query("UPDATE user SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role) WHERE user_id = ?", [name ?? null, email ?? null, role ?? null, user.sub]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}


