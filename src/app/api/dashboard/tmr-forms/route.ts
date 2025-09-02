import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET() {
  const pool = getDbPool();

  try {
    const [formsResult] = await pool.query(`
      SELECT id, name, code, created_at, updated_at
      FROM forms 
      WHERE type = 'TMR'
      ORDER BY created_at DESC
    `);

    const forms = Array.isArray(formsResult) ? formsResult : [];

    return NextResponse.json({
      success: true,
      data: forms
    });

  } catch (error) {
    console.error("Error fetching TMR forms:", error);
    return NextResponse.json({ error: "Failed to fetch TMR forms" }, { status: 500 });
  }
}


