import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const formId = searchParams.get("formId");

  if (!formId) {
    return NextResponse.json({ error: "formId parameter is required" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Simple query to check entity_id directly from form_submissions
    const [result] = await pool.query(`
      SELECT 
        id as submission_id,
        timestamp,
        entity_id,
        'Direct from form_submissions' as source
      FROM form_submissions 
      WHERE form_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `, [formId]);

    const submissions = Array.isArray(result) ? result : [];

    // Also check with entity join
    const [resultWithEntity] = await pool.query(`
      SELECT 
        fs.id as submission_id,
        fs.timestamp,
        fs.entity_id,
        e.name as entity_name,
        e.type as entity_type,
        'With entity join' as source
      FROM form_submissions fs
      LEFT JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ?
      ORDER BY fs.timestamp DESC
      LIMIT 20
    `, [formId]);

    const submissionsWithEntity = Array.isArray(resultWithEntity) ? resultWithEntity : [];

    // Count total submissions and entity distribution
    const [countResult] = await pool.query(`
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN entity_id IS NOT NULL THEN 1 END) as with_entity,
        COUNT(CASE WHEN entity_id IS NULL THEN 1 END) as without_entity
      FROM form_submissions 
      WHERE form_id = ?
    `, [formId]);

    const counts = Array.isArray(countResult) && countResult.length > 0 ? countResult[0] : {};

    return NextResponse.json({
      formId: formId,
      counts: counts,
      directCheck: submissions,
      withEntityJoin: submissionsWithEntity
    });

  } catch (error) {
    console.error("Error in entity debug check:", error);
    return NextResponse.json({ error: "Failed to check entity data" }, { status: 500 });
  }
}
