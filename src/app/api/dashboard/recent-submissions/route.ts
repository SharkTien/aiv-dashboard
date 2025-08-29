import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getDbPool();

  try {
    // Get recent submissions with form names (oGV forms only)
    const [submissionsResult] = await pool.query(`
      SELECT 
        fs.id,
        f.name as form_name,
        fs.timestamp,
        'completed' as status,
        'Anonymous User' as user
      FROM form_submissions fs
      JOIN forms f ON fs.form_id = f.id
      WHERE f.type = 'oGV'
      ORDER BY fs.timestamp DESC
      LIMIT 10
    `);

    const recentSubmissions = Array.isArray(submissionsResult) ? submissionsResult.map((row: any) => ({
      id: row.id,
      formName: row.form_name,
      timestamp: row.timestamp,
      status: row.status,
      user: row.user
    })) : [];

    return NextResponse.json(recentSubmissions);
  } catch (error) {
    console.error("Error fetching recent submissions:", error);
    return NextResponse.json({ error: "Failed to fetch recent submissions" }, { status: 500 });
  }
}
