import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

// Lightweight analytics endpoint optimized for User Performance table
// Supports: entity_id filter; non-admins can request all entities (excluding Organic)
// by passing all_entities=true
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("start_date") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const endDate = searchParams.get("end_date") || new Date().toISOString().slice(0, 10);
  const entityId = searchParams.get("entity_id");
  const formId = searchParams.get("form_id");
  const formType = searchParams.get("form_type"); // oGV | TMR | EWA
  const allEntities = String(searchParams.get("all_entities") || "false").toLowerCase() === "true";

  const pool = getDbPool();

  // Build base link query
  let linkQuery = `
    SELECT 
      ul.id,
      ul.entity_id,
      ul.utm_name,
      ul.custom_name,
      e.name as entity_name,
      uc.name as campaign_name,
      uc.code as campaign_code,
      us.name as source_name,
      us.code as source_code,
      um.name as medium_name,
      um.code as medium_code,
      f.type as form_type
    FROM utm_links ul
    JOIN entity e ON ul.entity_id = e.entity_id
    JOIN utm_campaigns uc ON ul.campaign_id = uc.id
    JOIN forms f ON uc.form_id = f.id
    JOIN utm_sources us ON ul.source_id = us.id
    JOIN utm_mediums um ON ul.medium_id = um.id
    WHERE 1=1
  `;
  const linkParams: any[] = [];

  // Scope by role
  if (user.role !== 'admin') {
    if (entityId) {
      linkQuery += " AND ul.entity_id = ?";
      linkParams.push(Number(entityId));
    } else if (allEntities) {
      // Non-admin requests all: exclude Organic
      linkQuery += " AND (e.name IS NULL OR LOWER(e.name) <> 'organic')";
    } else {
      linkQuery += " AND ul.entity_id = ?";
      linkParams.push(Number(user.entity_id));
    }
  } else {
    if (entityId) {
      linkQuery += " AND ul.entity_id = ?";
      linkParams.push(Number(entityId));
    }
  }

  if (formId) {
    linkQuery += " AND uc.form_id = ?";
    linkParams.push(Number(formId));
  } else if (formType && ["oGV","TMR","EWA"].includes(formType)) {
    linkQuery += " AND f.type = ?";
    linkParams.push(formType);
  }

  // Fetch links
  const [linkRows] = await pool.query(linkQuery, linkParams);
  const links = Array.isArray(linkRows) ? (linkRows as any[]) : [];

  if (links.length === 0) {
    return NextResponse.json({ success: true, data: { links: [], period: { startDate, endDate } } });
  }

  // Aggregate clicks per link per day
  const linkIds = links.map(l => l.id);
  const placeholders = linkIds.map(() => '?').join(',');
  const [dailyRows] = await pool.query(
    `SELECT utm_link_id, DATE(clicked_at) as date, COUNT(*) as clicks, COUNT(DISTINCT session_id) as unique_clicks
     FROM click_logs
     WHERE utm_link_id IN (${placeholders})
       AND DATE(clicked_at) >= ?
       AND DATE(clicked_at) <= ?
     GROUP BY utm_link_id, DATE(clicked_at)
     ORDER BY utm_link_id, date ASC`,
    [...linkIds, startDate, endDate]
  );
  const daily = Array.isArray(dailyRows) ? (dailyRows as any[]) : [];

  // Map daily to each link
  const mapByLink = new Map<number, Array<{ date: string; clicks: number; unique: number }>>();
  daily.forEach(row => {
    const list = mapByLink.get(row.utm_link_id) || [];
    list.push({ date: String(row.date), clicks: Number(row.clicks || 0), unique: Number(row.unique_clicks || 0) });
    mapByLink.set(row.utm_link_id, list);
  });

  const data = links.map(l => ({
    ...l,
    clicksByDate: mapByLink.get(l.id) || [],
    clicks: (mapByLink.get(l.id) || []).reduce((s, r) => s + (r.clicks || 0), 0),
    uniqueClicks: (mapByLink.get(l.id) || []).reduce((s, r) => s + (r.unique || 0), 0)
  }));

  return NextResponse.json({ success: true, data: { links: data, period: { startDate, endDate } } });
}


