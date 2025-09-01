import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET() {
  const pool = getDbPool();

  try {
    // Get all oGV forms ordered by creation date (newest first)
    const [formsResult] = await pool.query(`
      SELECT id, name, code, created_at, updated_at
      FROM forms 
      WHERE type = 'oGV'
      ORDER BY created_at DESC, id DESC
    `);

    const forms = Array.isArray(formsResult) ? formsResult : [];
    
    // Debug: Log the forms being returned
    console.log('Debug - oGV Forms returned (newest first):', forms.map(f => ({
      id: f.id,
      name: f.name,
      code: f.code,
      created_at: f.created_at
    })));

    return NextResponse.json({
      success: true,
      data: forms
    });

  } catch (error) {
    console.error("Error fetching oGV forms:", error);
    return NextResponse.json({ error: "Failed to fetch oGV forms" }, { status: 500 });
  }
}
