import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/general-notifications
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const offset = (page - 1) * limit;
  const category = searchParams.get("category") || ""; // "new_features" | "guideline" or empty
  const q = (searchParams.get("q") || "").trim();

  const pool = getDbPool();
  const params: any[] = [];
  let where = "";
  if (category) {
    where += (where ? " AND" : " WHERE") + " category = ?";
    params.push(category);
  }
  if (q) {
    where += (where ? " AND" : " WHERE") + " (title LIKE ? OR content_html LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  try {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM general_notifications ${where}`,
      params
    );
    const total = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).total : 0;

    const [rows] = await pool.query(
      `SELECT id, category, title, content_html, author_sub, created_at, updated_at
       FROM general_notifications
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({ success: true, items: rows, pagination: { page, limit, total } });
  } catch (e) {
    console.error("Error fetching general notifications:", e);
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/general-notifications (admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, content_html, category } = body || {};
  if (!title || !content_html || !category) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const pool = getDbPool();
  try {
    const [result] = await pool.query(
      `INSERT INTO general_notifications (category, title, content_html, author_sub, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [category, title, content_html, user.sub]
    );
    const id = (result as any).insertId;
    return NextResponse.json({ success: true, id });
  } catch (e) {
    console.error("Error creating general notification:", e);
    return NextResponse.json({ success: false, error: "Failed to create" }, { status: 500 });
  }
}

