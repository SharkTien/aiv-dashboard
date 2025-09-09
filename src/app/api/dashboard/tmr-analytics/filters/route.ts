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

    // Get all entities for this form
    const [entitiesResult] = await pool.query(`
      SELECT DISTINCT e.name
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
      ORDER BY e.name
    `, [formId]);

    const entities = Array.isArray(entitiesResult) ? 
      entitiesResult.map((item: any) => item.name) : [];

    // Get universities from form responses - if entity is specified, filter by entity
    let universitiesQuery = `
      SELECT DISTINCT COALESCE(um.uni_name, fr.value) as uni_name
      FROM form_submissions fs
      LEFT JOIN form_responses fr ON fs.id = fr.submission_id
      LEFT JOIN form_fields ff ON fr.field_id = ff.id
      LEFT JOIN uni_mapping um ON fr.value = um.uni_id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND (ff.field_name = 'uni' OR ff.field_name = 'other--uni')
        AND fr.value IS NOT NULL 
        AND fr.value != ''
    `;
    
    let queryParams: any[] = [formId];
    
    if (entity) {
      // If entity is a number (entity_id), use it directly, otherwise treat as entity name
      if (!isNaN(Number(entity))) {
        universitiesQuery += ` AND fs.entity_id = ?`;
        queryParams.push(Number(entity));
      } else {
        universitiesQuery += ` AND fs.entity_id = (SELECT entity_id FROM entity WHERE name = ?)`;
        queryParams.push(entity);
      }
    }
    
    universitiesQuery += ` ORDER BY COALESCE(um.uni_name, fr.value)`;

    const [universitiesResult] = await pool.query(universitiesQuery, queryParams);

    const universities = Array.isArray(universitiesResult) ? 
      universitiesResult
        .map((item: any) => item.uni_name)
        .filter((name: string) => name && name !== 'Unknown University') : [];

    return NextResponse.json({
      success: true,
      data: {
        entities,
        universities
      }
    });

  } catch (error) {
    console.error('Error fetching TMR analytics filters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}
