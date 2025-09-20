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
    let queryParams: any[] = [formId];
    
    if (entity) {
      queryParams.push(entity);
    }
    
    if (uni) {
      queryParams.push(uni);
    }

    // Get total for percentage calculation - optimized query
    let totalQuery = `
      SELECT COUNT(DISTINCT fs.id) as total
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE`;

    if (entity) {
      totalQuery += ' AND e.name = ?';
    }

    const [totalResult] = await pool.query(totalQuery, queryParams);

    const total = Array.isArray(totalResult) && totalResult.length > 0 
      ? (totalResult[0] as any).total : 0;

    if (total === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get university distribution with filters - optimized query using MAX(CASE WHEN)
    let uniQuery = `
      SELECT 
        COALESCE(um.uni_name, fs_with_uni.uni_value, fs_with_uni.other_uni_value, 'Unknown University') as uni_name,
        COUNT(DISTINCT fs_with_uni.id) as signUps,
        ROUND((COUNT(DISTINCT fs_with_uni.id) * 100.0 / ?), 2) as percentage
      FROM (
        SELECT 
          fs.id,
          fs.entity_id,
          MAX(CASE WHEN ff.field_name = 'uni' THEN fr.value END) as uni_value,
          MAX(CASE WHEN ff.field_name = 'other--uni' THEN fr.value END) as other_uni_value
        FROM form_submissions fs
        LEFT JOIN form_responses fr ON fr.submission_id = fs.id
        LEFT JOIN form_fields ff ON ff.id = fr.field_id 
        WHERE fs.form_id = ? 
          AND fs.duplicated = FALSE
          AND (ff.field_name = 'uni' OR ff.field_name = 'other--uni')
          AND fr.value IS NOT NULL 
          AND fr.value != ''
        GROUP BY fs.id, fs.entity_id
      ) fs_with_uni
      JOIN entity e ON fs_with_uni.entity_id = e.entity_id
      LEFT JOIN uni_mapping um ON COALESCE(fs_with_uni.uni_value, fs_with_uni.other_uni_value) = um.uni_id
      WHERE 1=1`;

    // Add entity filter if provided
    if (entity) {
      uniQuery += ' AND e.name = ?';
    }

    // Add uni filter if provided  
    if (uni) {
      uniQuery += ' AND COALESCE(um.uni_name, fs_with_uni.uni_value, fs_with_uni.other_uni_value) = ?';
    }

    uniQuery += `
      GROUP BY COALESCE(um.uni_name, fs_with_uni.uni_value, fs_with_uni.other_uni_value, 'Unknown University')
      ORDER BY COUNT(DISTINCT fs_with_uni.id) DESC
      LIMIT 100
    `;

    const [uniDistributionResult] = await pool.query(uniQuery, [total, ...queryParams]);

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
