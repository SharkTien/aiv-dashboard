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

    // Get university distribution with filters
    let uniDistributionQuery = `
      SELECT 
        um.uni_name,
        COUNT(DISTINCT fs.id) as signUps
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
    
    let uniParams = [formId];
    if (uni) {
      uniDistributionQuery += ' AND um.uni_name = ?';
      uniParams.push(uni);
    }
    
    if (entity) {
      uniDistributionQuery += ' AND fs.entity_id IN (SELECT entity_id FROM entity WHERE name = ?)';
      uniParams.push(entity);
    }
    
    uniDistributionQuery += ' GROUP BY um.uni_name ORDER BY signUps DESC';
    
    const [uniDistributionResult] = await pool.query(uniDistributionQuery, uniParams);

    const uniDistribution = Array.isArray(uniDistributionResult) ? uniDistributionResult : [];
    const totalUniSignUps = uniDistribution.reduce((sum: number, item: any) => sum + item.signUps, 0);
    
    const uniDistributionWithPercentage = uniDistribution.map((item: any) => ({
      uni_name: item.uni_name,
      signUps: item.signUps,
      percentage: totalUniSignUps > 0 ? (item.signUps / totalUniSignUps) * 100 : 0
    }));

    return NextResponse.json({
      success: true,
      data: uniDistributionWithPercentage
    });

  } catch (error) {
    console.error("Error fetching university distribution:", error);
    return NextResponse.json({ error: "Failed to fetch university distribution" }, { status: 500 });
  }
}
