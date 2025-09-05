import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const entity = searchParams.get('entity');

    if (!formId) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
    }

    const pool = getDbPool();

    // Get unique entities for this form
    const [entitiesResult] = await pool.query(`
      SELECT DISTINCT e.name as entity_name
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND e.type = 'local'
      ORDER BY e.name
    `, [formId]);

    // Get unique universities for this form (optionally filtered by entity)
    let universitiesQuery = `
      SELECT DISTINCT um.uni_name
      FROM form_submissions fs
      JOIN form_responses fr ON fs.id = fr.submission_id
      JOIN form_fields ff ON fr.field_id = ff.id
      JOIN uni_mapping um ON fr.value = um.uni_id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND ff.field_name = 'uni'
        AND fr.value IS NOT NULL
        AND fr.value != ''
        AND um.uni_name IS NOT NULL
        AND um.uni_name != ''
    `;
    
    let universitiesParams = [formId];
    if (entity) {
      universitiesQuery += ' AND fs.entity_id IN (SELECT entity_id FROM entity WHERE name = ?)';
      universitiesParams.push(entity);
    }
    
    universitiesQuery += ' ORDER BY um.uni_name';
    
    const [universitiesResult] = await pool.query(universitiesQuery, universitiesParams);

    const entities = Array.isArray(entitiesResult) ? (entitiesResult as any).map((item: any) => item.entity_name) : [];
    const universities = Array.isArray(universitiesResult) ? (universitiesResult as any).map((item: any) => item.uni_name) : [];

    return NextResponse.json({
      success: true,
      data: {
        entities,
        universities
      }
    });

  } catch (error) {
    console.error("Error fetching filters:", error);
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
  }
}
