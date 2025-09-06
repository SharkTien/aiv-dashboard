import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const entity = searchParams.get('entity');
    const uni = searchParams.get('uni');

    if (!formId) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
    }

    const pool = getDbPool();

    // Build filter conditions
    let entityFilter = '';
    let uniFilter = '';
    let queryParams: any[] = [formId];
    
    if (entity) {
      entityFilter = ' AND e.name = ?';
      queryParams.push(entity);
    }
    
    if (uni) {
      uniFilter = ' AND um.uni_name = ?';
      queryParams.push(uni);
    }

    // Get total for percentage calculation
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      LEFT JOIN form_responses fr ON fs.id = fr.submission_id
      LEFT JOIN form_fields ff ON fr.field_id = ff.id
      LEFT JOIN uni_mapping um ON fr.value = um.uni_id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND (ff.field_name = 'uni' OR ff.field_name = 'other--uni')
        AND fr.value IS NOT NULL 
        AND fr.value != ''${entityFilter}${uniFilter}
    `, queryParams);

    const total = Array.isArray(totalResult) && totalResult.length > 0 
      ? (totalResult[0] as any).total : 0;

    // Get university distribution with filters
    const [uniDistributionResult] = await pool.query(`
      SELECT 
        COALESCE(um.uni_name, fr.value, 'Unknown University') as uni_name,
        COUNT(*) as signUps,
        ROUND((COUNT(*) * 100.0 / ?), 2) as percentage
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      LEFT JOIN form_responses fr ON fs.id = fr.submission_id
      LEFT JOIN form_fields ff ON fr.field_id = ff.id
      LEFT JOIN uni_mapping um ON fr.value = um.uni_id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND (ff.field_name = 'uni' OR ff.field_name = 'other--uni')
        AND fr.value IS NOT NULL 
        AND fr.value != ''${entityFilter}${uniFilter}
      GROUP BY COALESCE(um.uni_name, fr.value)
      ORDER BY COUNT(*) DESC
    `, [total, ...queryParams]);

    const uniDistribution = Array.isArray(uniDistributionResult) ? uniDistributionResult : [];

    return NextResponse.json({
      success: true,
      data: uniDistribution
    });

  } catch (error) {
    console.error('Error fetching TMR university distribution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch university distribution' },
      { status: 500 }
    );
  }
}
