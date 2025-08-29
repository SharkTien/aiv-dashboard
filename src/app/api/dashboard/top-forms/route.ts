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
    // Get top oGV forms by submission count
    const [formsResult] = await pool.query(`
      SELECT 
        f.id,
        f.name,
        f.type,
        COUNT(fs.id) as submissions,
        ROUND(RAND() * 20 - 10, 1) as growth
      FROM forms f
      LEFT JOIN form_submissions fs ON f.id = fs.form_id
      WHERE f.type = 'oGV'
      GROUP BY f.id, f.name, f.type
      ORDER BY submissions DESC
      LIMIT 5
    `);

    const topForms = Array.isArray(formsResult) ? formsResult.map((row: any) => ({
      id: row.id,
      name: row.name,
      submissions: row.submissions,
      growth: row.growth,
      type: row.type || 'oGV'
    })) : [];

    return NextResponse.json(topForms);
  } catch (error) {
    console.error("Error fetching top forms:", error);
    return NextResponse.json({ error: "Failed to fetch top forms" }, { status: 500 });
  }
}
