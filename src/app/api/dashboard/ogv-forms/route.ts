import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET() {
  const pool = getDbPool();

  try {
    // Get all oGV forms ordered by default first, then by creation date (newest first)
    const [formsResult] = await pool.query(`
      SELECT id, name, code, is_default, created_at, updated_at
      FROM forms 
      WHERE type = 'oGV'
      ORDER BY is_default DESC, created_at DESC
    `);

    const forms = Array.isArray(formsResult) ? formsResult : [];

    return NextResponse.json({
      success: true,
      data: forms
    });

  } catch (error) {
    console.error("Error fetching oGV forms:", error);
    return NextResponse.json({ error: "Failed to fetch oGV forms" }, { status: 500 });
  }
}
