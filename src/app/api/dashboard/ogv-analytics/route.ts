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
    let queryParams: (string | number)[] = [formId];
    
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
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND e.type = 'local'
      GROUP BY DATE(fs.timestamp), e.name
      ORDER BY date ASC, e.name
    `, [formId]);

    const dailySignUps = Array.isArray(dailySignUpsResult) ? dailySignUpsResult : [];

    // Get channel breakdown (by entity, no filters)
    const [channelBreakdownResult] = await pool.query(`
      SELECT 
        e.name as channel,
        COUNT(*) as signUps
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND e.type = 'local'
      GROUP BY e.name
      ORDER BY signUps DESC
    `, [formId]);

    const channelBreakdown = Array.isArray(channelBreakdownResult) ? channelBreakdownResult : [];
    const totalChannelSignUps = channelBreakdown.reduce((sum: number, item: any) => sum + item.signUps, 0);
    
    const channelBreakdownWithPercentage = channelBreakdown.map((item: any) => ({
      channel: item.channel,
      signUps: item.signUps,
      percentage: totalChannelSignUps > 0 ? (item.signUps / totalChannelSignUps) * 100 : 0
    }));

    // Get UTM breakdown
    const [utmBreakdownResult] = await pool.query(`
      SELECT 
        fr_campaign.value as utm_campaign,
        fr_source.value as utm_source,
        fr_medium.value as utm_medium,
        COUNT(DISTINCT fs.id) as signUps
      FROM form_submissions fs
      JOIN form_responses fr_campaign ON fs.id = fr_campaign.submission_id
      JOIN form_fields ff_campaign ON fr_campaign.field_id = ff_campaign.id
      LEFT JOIN form_responses fr_source ON fs.id = fr_source.submission_id
      LEFT JOIN form_fields ff_source ON fr_source.field_id = ff_source.id AND ff_source.field_name = 'utm_source'
      LEFT JOIN form_responses fr_medium ON fs.id = fr_medium.submission_id
      LEFT JOIN form_fields ff_medium ON fr_medium.field_id = ff_medium.id AND ff_medium.field_name = 'utm_medium'
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND ff_campaign.field_name = 'utm_campaign'
        AND fr_campaign.value IS NOT NULL
        AND fr_campaign.value != ''
      GROUP BY fr_campaign.value, fr_source.value, fr_medium.value
      ORDER BY signUps DESC
      LIMIT 20
    `, [formId]);

    const utmBreakdown = Array.isArray(utmBreakdownResult) ? utmBreakdownResult : [];

    // Get university distribution
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


    // Get age group distribution
    const [ageGroupDistributionResult] = await pool.query(`
      SELECT 
        CASE 
          WHEN fr_dob.value REGEXP '^[0-9]{4}$' THEN 
            -- Handle year only (YYYY format)
            CASE 
              WHEN YEAR(CURDATE()) - CAST(fr_dob.value AS UNSIGNED) < 18 THEN 'Under 18'
              WHEN YEAR(CURDATE()) - CAST(fr_dob.value AS UNSIGNED) BETWEEN 18 AND 24 THEN '18-24'
              WHEN YEAR(CURDATE()) - CAST(fr_dob.value AS UNSIGNED) BETWEEN 25 AND 34 THEN '25-34'
              WHEN YEAR(CURDATE()) - CAST(fr_dob.value AS UNSIGNED) BETWEEN 35 AND 44 THEN '35-44'
              WHEN YEAR(CURDATE()) - CAST(fr_dob.value AS UNSIGNED) BETWEEN 45 AND 54 THEN '45-54'
              WHEN YEAR(CURDATE()) - CAST(fr_dob.value AS UNSIGNED) BETWEEN 55 AND 64 THEN '55-64'
              ELSE '65+'
            END
          WHEN fr_dob.value REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' OR fr_dob.value REGEXP '^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$' THEN
            -- Handle full date (MM/DD/YYYY or YYYY-MM-DD format)
            CASE 
              WHEN TIMESTAMPDIFF(YEAR, STR_TO_DATE(fr_dob.value, '%m/%d/%Y'), CURDATE()) < 18 THEN 'Under 18'
              WHEN TIMESTAMPDIFF(YEAR, STR_TO_DATE(fr_dob.value, '%m/%d/%Y'), CURDATE()) BETWEEN 18 AND 24 THEN '18-24'
              WHEN TIMESTAMPDIFF(YEAR, STR_TO_DATE(fr_dob.value, '%m/%d/%Y'), CURDATE()) BETWEEN 25 AND 34 THEN '25-34'
              WHEN TIMESTAMPDIFF(YEAR, STR_TO_DATE(fr_dob.value, '%m/%d/%Y'), CURDATE()) BETWEEN 35 AND 44 THEN '35-44'
              WHEN TIMESTAMPDIFF(YEAR, STR_TO_DATE(fr_dob.value, '%m/%d/%Y'), CURDATE()) BETWEEN 45 AND 54 THEN '45-54'
              WHEN TIMESTAMPDIFF(YEAR, STR_TO_DATE(fr_dob.value, '%m/%d/%Y'), CURDATE()) BETWEEN 55 AND 64 THEN '55-64'
              ELSE '65+'
            END
          ELSE 'Unknown'
        END as ageGroup,
        COUNT(DISTINCT fs.id) as signUps
      FROM form_submissions fs
      JOIN form_responses fr_dob ON fs.id = fr_dob.submission_id
      JOIN form_fields ff_dob ON fr_dob.field_id = ff_dob.id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND ff_dob.field_name = 'dob'
        AND fr_dob.value IS NOT NULL
        AND fr_dob.value != ''
      GROUP BY ageGroup
      ORDER BY 
        CASE ageGroup
          WHEN 'Under 18' THEN 1
          WHEN '18-24' THEN 2
          WHEN '25-34' THEN 3
          WHEN '35-44' THEN 4
          WHEN '45-54' THEN 5
          WHEN '55-64' THEN 6
          WHEN '65+' THEN 7
          WHEN 'Unknown' THEN 8
        END
    `, [formId]);

    const ageGroupDistribution = Array.isArray(ageGroupDistributionResult) ? ageGroupDistributionResult : [];
    const totalAgeGroupSignUps = ageGroupDistribution.reduce((sum: number, item: any) => sum + item.signUps, 0);
    
    const ageGroupDistributionWithPercentage = ageGroupDistribution.map((item: any) => ({
      ageGroup: item.ageGroup,
      signUps: item.signUps,
      percentage: totalAgeGroupSignUps > 0 ? (item.signUps / totalAgeGroupSignUps) * 100 : 0
    }));

    // Get major distribution
    const [majorDistributionResult] = await pool.query(`
      SELECT 
        fr_major.value as major,
        COUNT(DISTINCT fs.id) as signUps
      FROM form_submissions fs
      JOIN form_responses fr_major ON fs.id = fr_major.submission_id
      JOIN form_fields ff_major ON fr_major.field_id = ff_major.id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND ff_major.field_name = 'Major'
        AND fr_major.value IS NOT NULL
        AND fr_major.value != ''
      GROUP BY fr_major.value
      ORDER BY signUps DESC
      LIMIT 10
    `, [formId]);

    const majorDistribution = Array.isArray(majorDistributionResult) ? majorDistributionResult : [];
    const totalMajorSignUps = majorDistribution.reduce((sum: number, item: any) => sum + item.signUps, 0);
    
    const majorDistributionWithPercentage = majorDistribution.map((item: any) => ({
      major: item.major,
      signUps: item.signUps,
      percentage: totalMajorSignUps > 0 ? (item.signUps / totalMajorSignUps) * 100 : 0
    }));

    // Get university year distribution by entity
    const [universityYearDistributionResult] = await pool.query(`
      SELECT 
        fs.entity_id,
        e.name,
        fr_year.value as universityYear,
        COUNT(DISTINCT fs.id) as signUps
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      JOIN form_responses fr_year ON fs.id = fr_year.submission_id
      JOIN form_fields ff_year ON fr_year.field_id = ff_year.id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND ff_year.field_name = 'UniversityYear'
        AND fr_year.value IS NOT NULL
        AND fr_year.value != ''
      GROUP BY fs.entity_id, e.name, fr_year.value
      ORDER BY e.name, 
        CASE 
          WHEN fr_year.value = '1st year' THEN 1
          WHEN fr_year.value = '2nd year' THEN 2
          WHEN fr_year.value = '3rd year' THEN 3
          WHEN fr_year.value = '4th year' THEN 4
          WHEN fr_year.value = '5th year' THEN 5
          WHEN fr_year.value = 'Graduate' THEN 6
          ELSE 7
        END
    `, [formId]);

    const universityYearDistribution = Array.isArray(universityYearDistributionResult) ? universityYearDistributionResult : [];
    
    // Group by entity
    const universityYearByEntity: { [key: string]: any[] } = {};
    universityYearDistribution.forEach((item: any) => {
      const entityName = item.name;
      if (!universityYearByEntity[entityName]) {
        universityYearByEntity[entityName] = [];
      }
      universityYearByEntity[entityName].push({
        universityYear: item.universityYear,
        signUps: item.signUps,
        entity_id: item.entity_id,
        entity_name: item.name
      });
    });

    // Calculate percentages for each entity
    const universityYearDistributionWithPercentage = Object.keys(universityYearByEntity).map(entityName => {
      const entityData = universityYearByEntity[entityName];
      const totalEntitySignUps = entityData.reduce((sum: number, item: any) => sum + item.signUps, 0);
      
      return {
        entity_name: entityName,
        entity_id: entityData[0].entity_id,
        totalSignUps: totalEntitySignUps,
        yearDistribution: entityData.map((item: any) => ({
          universityYear: item.universityYear,
          signUps: item.signUps,
          percentage: totalEntitySignUps > 0 ? (item.signUps / totalEntitySignUps) * 100 : 0
        }))
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalSignUps,
        dailySignUps,
        channelBreakdown: channelBreakdownWithPercentage,
        utmBreakdown,
        uniDistribution: uniDistributionWithPercentage,
        ageGroupDistribution: ageGroupDistributionWithPercentage,
        majorDistribution: majorDistributionWithPercentage,
        universityYearDistribution: universityYearDistributionWithPercentage
      }
    });

  } catch (error) {
    console.error("Error fetching oGV analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 });
  }
}
