import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const timeRange = searchParams.get('timeRange') || 'week';
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

    // Get total sign ups (with entity filter if provided)
    let totalSignUpsQuery = `
      SELECT COUNT(*) as total
      FROM form_submissions fs
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
    `;
    let totalSignUpsParams: (string | number)[] = [formId];
    
    if (entity) {
      // If entity is a number (entity_id), use it directly, otherwise treat as entity name
      if (!isNaN(Number(entity))) {
        totalSignUpsQuery += ' AND fs.entity_id = ?';
        totalSignUpsParams.push(Number(entity));
      } else {
        totalSignUpsQuery += ' AND fs.entity_id IN (SELECT entity_id FROM entity WHERE name = ?)';
        totalSignUpsParams.push(entity);
      }
    }
    
    const [totalSignUpsResult] = await pool.query(totalSignUpsQuery, totalSignUpsParams);

    const totalSignUps = Array.isArray(totalSignUpsResult) && totalSignUpsResult.length > 0 
      ? (totalSignUpsResult[0] as any).total : 0;

    // Get daily sign ups by local (all submissions, no filters)
    const [dailySignUpsResult] = await pool.query(`
      SELECT 
        DATE(fs.timestamp) as date,
        e.name as local,
        COUNT(*) as signUps
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
      GROUP BY DATE(fs.timestamp), e.name
      ORDER BY DATE(fs.timestamp) DESC, e.name
    `, [formId]);

    const dailySignUps = Array.isArray(dailySignUpsResult) ? dailySignUpsResult : [];

    // Get channel breakdown (local ranking)
    const [channelBreakdownResult] = await pool.query(`
      SELECT 
        e.name as channel,
        COUNT(*) as signUps,
        ROUND((COUNT(*) * 100.0 / NULLIF(?, 0)), 2) as percentage
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
      GROUP BY e.name
      ORDER BY COUNT(*) DESC
    `, [totalSignUps, formId]);

    const channelBreakdown = Array.isArray(channelBreakdownResult) ? channelBreakdownResult : [];

    // Get UTM breakdown - Fixed query using subquery to avoid Cartesian product
    const [utmBreakdownResult] = await pool.query(`
      SELECT 
        COALESCE(fs_with_utm.utm_campaign_value, 'No campaign') as utm_campaign,
        COALESCE(fs_with_utm.utm_source_value, 'unknown') as utm_source,
        COALESCE(fs_with_utm.utm_medium_value, 'unknown') as utm_medium,
        COUNT(DISTINCT fs_with_utm.id) as signUps
      FROM (
        SELECT 
          fs.id,
          fs.entity_id,
          MAX(CASE WHEN ff.field_name = 'utm_campaign' THEN fr.value END) as utm_campaign_value,
          MAX(CASE WHEN ff.field_name = 'utm_source' THEN us.code END) as utm_source_value,
          MAX(CASE WHEN ff.field_name = 'utm_medium' THEN um.code END) as utm_medium_value
        FROM form_submissions fs
        LEFT JOIN form_responses fr ON fs.id = fr.submission_id
        LEFT JOIN form_fields ff ON fr.field_id = ff.id 
        LEFT JOIN utm_sources us ON ff.field_name = 'utm_source' AND fr.value = us.code
        LEFT JOIN utm_mediums um ON ff.field_name = 'utm_medium' AND fr.value = um.code
        WHERE fs.form_id = ? 
          AND fs.duplicated = FALSE
          AND (ff.field_name = 'utm_campaign' OR ff.field_name = 'utm_source' OR ff.field_name = 'utm_medium')
        GROUP BY fs.id, fs.entity_id
      ) fs_with_utm
      GROUP BY 
        COALESCE(fs_with_utm.utm_campaign_value, 'No campaign'),
        COALESCE(fs_with_utm.utm_source_value, 'unknown'),
        COALESCE(fs_with_utm.utm_medium_value, 'unknown')
      ORDER BY COUNT(DISTINCT fs_with_utm.id) DESC
      LIMIT 20
    `, [formId]);

    const utmBreakdown = Array.isArray(utmBreakdownResult) ? utmBreakdownResult : [];

    // Get university distribution
    const [uniDistributionResult] = await pool.query(`
      SELECT 
        COALESCE(um.uni_name, fr.value, 'Unknown University') as uni_name,
        COUNT(*) as signUps,
        ROUND((COUNT(*) * 100.0 / NULLIF(?, 0)), 2) as percentage
      FROM form_submissions fs
      LEFT JOIN form_responses fr ON fs.id = fr.submission_id
      LEFT JOIN form_fields ff ON fr.field_id = ff.id
      LEFT JOIN uni_mapping um ON fr.value = um.uni_id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND (ff.field_name = 'uni' OR ff.field_name = 'other--uni')
        AND fr.value IS NOT NULL 
        AND fr.value != ''
      GROUP BY COALESCE(um.uni_name, fr.value, 'Unknown University')
      ORDER BY COUNT(*) DESC
    `, [totalSignUps, formId]);

    const uniDistribution = Array.isArray(uniDistributionResult) ? uniDistributionResult : [];

    // Get major distribution with normalized values
    const [majorDistributionResult] = await pool.query(`
      SELECT 
        TRIM(BOTH '"' FROM COALESCE(fr.value, 'Unknown Major')) as major,
        COUNT(*) as signUps,
        ROUND((COUNT(*) * 100.0 / NULLIF(?, 0)), 2) as percentage
      FROM form_submissions fs
      LEFT JOIN form_responses fr ON fs.id = fr.submission_id
      LEFT JOIN form_fields ff ON fr.field_id = ff.id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND (ff.field_name LIKE '%major%' OR ff.field_name LIKE '%ngành%' OR ff.field_name LIKE '%Major%')
      GROUP BY TRIM(BOTH '"' FROM COALESCE(fr.value, 'Unknown Major'))
      ORDER BY COUNT(*) DESC
    `, [totalSignUps, formId]);

    const majorDistribution = Array.isArray(majorDistributionResult) ? majorDistributionResult : [];

    // Get university year distribution by entity using universityyear field
    // Fixed query to properly handle university year data with subquery approach
    const [universityYearResult] = await pool.query(`
      SELECT 
        e.name as entity_name,
        e.entity_id,
        COALESCE(fs_with_year.university_year_value, 'Unknown Year') as universityYear,
        COUNT(DISTINCT fs_with_year.id) as signUps
      FROM (
        SELECT 
          fs.id,
          fs.entity_id,
          MAX(CASE WHEN ff.field_name = 'universityyear' THEN fr.value END) as university_year_value
        FROM form_submissions fs
        LEFT JOIN form_responses fr ON fs.id = fr.submission_id
        LEFT JOIN form_fields ff ON fr.field_id = ff.id 
        WHERE fs.form_id = ? 
          AND fs.duplicated = FALSE
          AND fs.timestamp >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY fs.id, fs.entity_id
      ) fs_with_year
      JOIN entity e ON fs_with_year.entity_id = e.entity_id
      GROUP BY e.name, e.entity_id, COALESCE(fs_with_year.university_year_value, 'Unknown Year')
      ORDER BY e.name, COUNT(DISTINCT fs_with_year.id) DESC
      LIMIT 1000
    `, [formId]);


    // Group by entity and calculate percentages
    const entityYearMap = new Map();
    const entityTotals = new Map();

    // First pass: collect data and calculate totals
    if (Array.isArray(universityYearResult)) {
      universityYearResult.forEach((row: any) => {
        const entityKey = `${row.entity_name}_${row.entity_id}`;
        
        if (!entityYearMap.has(entityKey)) {
          entityYearMap.set(entityKey, {
            entity_name: row.entity_name,
            entity_id: row.entity_id,
            yearDistribution: []
          });
          entityTotals.set(entityKey, 0);
        }
        
        entityTotals.set(entityKey, entityTotals.get(entityKey) + row.signUps);
      });

      // Second pass: calculate percentages and build final structure
      universityYearResult.forEach((row: any) => {
        const entityKey = `${row.entity_name}_${row.entity_id}`;
        const total = entityTotals.get(entityKey);
        const percentage = total > 0 ? parseFloat(((row.signUps * 100.0) / total).toFixed(2)) : 0;
        
        entityYearMap.get(entityKey).yearDistribution.push({
          universityYear: row.universityYear,
          signUps: row.signUps,
          percentage: percentage
        });
      });
    }

    const universityYearDistribution = Array.from(entityYearMap.values()).map(entity => ({
      ...entity,
      totalSignUps: entityTotals.get(`${entity.entity_name}_${entity.entity_id}`)
    }));


    // Get age group distribution (placeholder - can be implemented based on DOB field)
    const ageGroupDistribution: any[] = [];

    return NextResponse.json({
      success: true,
      data: {
        totalSignUps,
        dailySignUps,
        channelBreakdown,
        utmBreakdown,
        uniDistribution,
        ageGroupDistribution,
        majorDistribution,
        universityYearDistribution
      }
    });

  } catch (error) {
    console.error('Error fetching TMR analytics data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
