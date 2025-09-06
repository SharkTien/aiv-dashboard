import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const pool = getDbPool();

    // Get all TMR forms
    const [formsResult] = await pool.query(`
      SELECT id, name, code
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
    console.error('Error fetching TMR forms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch TMR forms' },
      { status: 500 }
    );
  }
}