import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const timeRange = searchParams.get('timeRange') || 'week';

    if (!formId) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
    }

    const pool = getDbPool();

    // Get total sign ups
    const [totalSignUpsResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM form_submissions fs
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
    `, [formId]);

    const totalSignUps = Array.isArray(totalSignUpsResult) && totalSignUpsResult.length > 0 
      ? (totalSignUpsResult[0] as any).total : 0;

    // Get daily sign ups by local (all submissions)
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

    // Get channel breakdown (by entity)
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
        COUNT(*) as signUps
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
    const [uniDistributionResult] = await pool.query(`
      SELECT 
        um.uni_name,
        COUNT(*) as signUps
      FROM form_submissions fs
      JOIN entity e ON fs.entity_id = e.entity_id
      JOIN uni_mapping um ON e.entity_id = um.entity_id
      WHERE fs.form_id = ? 
        AND fs.duplicated = FALSE
        AND e.type = 'local'
      GROUP BY um.uni_name
      ORDER BY signUps DESC
    `, [formId]);

    const uniDistribution = Array.isArray(uniDistributionResult) ? uniDistributionResult : [];
    const totalUniSignUps = uniDistribution.reduce((sum: number, item: any) => sum + item.signUps, 0);
    
    const uniDistributionWithPercentage = uniDistribution.map((item: any) => ({
      uni_name: item.uni_name,
      signUps: item.signUps,
      percentage: totalUniSignUps > 0 ? (item.signUps / totalUniSignUps) * 100 : 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalSignUps,
        dailySignUps,
        channelBreakdown: channelBreakdownWithPercentage,
        utmBreakdown,
        uniDistribution: uniDistributionWithPercentage
      }
    });

  } catch (error) {
    console.error("Error fetching oGV analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 });
  }
}
