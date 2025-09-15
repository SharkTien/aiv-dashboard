import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("start_date") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = searchParams.get("end_date") || new Date().toISOString().split('T')[0];
  const entityIdFilter = searchParams.get("entity_id");
  const allEntities = searchParams.get("all_entities") === "true";

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Test database connection
    await pool.query("SELECT 1");

    // Build query for UTM links with form submissions
    let query = `
      SELECT
        ul.id,
        ul.entity_id,
        ul.utm_name,
        ul.custom_name,
        ul.shortened_url,
        ul.created_at,
        e.name as entity_name,
        uc.name as campaign_name,
        uc.code as campaign_code,
        us.name as source_name,
        us.code as source_code,
        us.platform as source_platform,
        um.name as medium_name,
        um.code as medium_code,
        f.type as form_type,
        f.id as form_id,
        f.name as form_name
      FROM utm_links ul
      JOIN entity e ON ul.entity_id = e.entity_id
      JOIN utm_campaigns uc ON ul.campaign_id = uc.id
      JOIN forms f ON uc.form_id = f.id
      JOIN utm_sources us ON ul.source_id = us.id
      JOIN utm_mediums um ON ul.medium_id = um.id
      WHERE ul.created_at >= ?
        AND ul.created_at <= ?
    `;

    const params: any[] = [startDate, endDate + ' 23:59:59'];

    // Entity scope logic
    if (user.role !== 'admin') {
      if (entityIdFilter) {
        query += " AND ul.entity_id = ?";
        params.push(entityIdFilter);
      } else if (allEntities) {
        query += " AND e.name <> 'Organic'";
      } else {
        query += " AND ul.entity_id = ?";
        params.push(user.entity_id);
      }
    } else if (entityIdFilter) {
      query += " AND ul.entity_id = ?";
      params.push(entityIdFilter);
    }

    query += " ORDER BY ul.created_at DESC";

    const [links] = await pool.query(query, params);
    const linksArray = Array.isArray(links) ? links : [];

    // Get form submissions for each UTM link
    const formTrackingData = await Promise.all(
      linksArray.map(async (link: any) => {
        // Get submissions for this UTM link
        const [submissions] = await pool.query(`
          SELECT 
            DATE(created_at) as submission_date,
            COUNT(*) as total_submissions,
            COUNT(DISTINCT user_id) as unique_submissions
          FROM form_submissions 
          WHERE utm_link_id = ? 
            AND created_at >= ? 
            AND created_at <= ?
          GROUP BY DATE(created_at)
          ORDER BY submission_date
        `, [link.id, startDate, endDate + ' 23:59:59']);

        const submissionsArray = Array.isArray(submissions) ? submissions : [];
        
        // Create daily submissions map
        const dailySubmissions: Record<string, { total: number; unique: number }> = {};
        submissionsArray.forEach((sub: any) => {
          dailySubmissions[sub.submission_date] = {
            total: sub.total_submissions,
            unique: sub.unique_submissions
          };
        });

        return {
          ...link,
          dailySubmissions
        };
      })
    );

    // Generate full date range
    const allDates: string[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate daily totals
    const dayTotalSubmissions: Record<string, number> = {};
    allDates.forEach(date => {
      dayTotalSubmissions[date] = formTrackingData.reduce((sum, link) => {
        return sum + (link.dailySubmissions[date]?.total || 0);
      }, 0);
    });

    const response = NextResponse.json({
      success: true,
      data: {
        links: formTrackingData,
        allDates,
        dayTotalSubmissions,
        period: { startDate, endDate }
      }
    });

    response.headers.set('Cache-Control', 'private, max-age=300');
    return response;

  } catch (error) {
    console.error('Error fetching form tracking data:', error);
    return NextResponse.json(
      { error: "Failed to fetch form tracking data" },
      { status: 500 }
    );
  }
}
