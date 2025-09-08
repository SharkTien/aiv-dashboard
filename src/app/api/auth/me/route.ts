import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const pool = getDbPool();
    const [rows] = await pool.query(
      "SELECT user_id as sub, email, name, role, entity_id, program FROM user WHERE user_id = ?",
      [user.sub]
    );
    const dbUser = Array.isArray(rows) && rows.length ? rows[0] : null;
    // Fallback to session values if not found
    const merged = dbUser || user;
    const response = NextResponse.json({ user: merged });
    // Cache for 1 minute
    response.headers.set('Cache-Control', 'private, max-age=60');
    return response;
  } catch (e) {
    // On error, still return session user
    const response = NextResponse.json({ user });
    // Cache for 1 minute
    response.headers.set('Cache-Control', 'private, max-age=60');
    return response;
  }
}


