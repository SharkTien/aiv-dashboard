import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("start_date") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = searchParams.get("end_date") || new Date().toISOString().split('T')[0];
  const entityIdFilter = searchParams.get("entity_id");
  const allEntities = String(searchParams.get("all_entities") || "false").toLowerCase() === "true";
  const formId = searchParams.get("form_id");
  const pageParam = Number(searchParams.get("page") || 1);
  const pageSizeParam = Number(searchParams.get("page_size") || 80);
  const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
  const pageSize = Math.min(Math.max(10, isNaN(pageSizeParam) ? 80 : pageSizeParam), 200);
  const datePageParam = Number(searchParams.get("date_page") || 1);
  const datePageSizeParam = Number(searchParams.get("date_page_size") || 30);
  const datePage = Math.max(1, isNaN(datePageParam) ? 1 : datePageParam);
  const datePageSize = Math.min(Math.max(7, isNaN(datePageSizeParam) ? 30 : datePageSizeParam), 120);
  const rollup = String(searchParams.get("rollup") || "").toLowerCase(); // '' | 'week'

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  const daysRange = Math.ceil((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1;
  const MAX_DAYS = 180;
  if (rollup !== 'week' && daysRange > MAX_DAYS) {
    return NextResponse.json({ error: `Date range too large (${daysRange} days). Use <= ${MAX_DAYS} days or enable rollup=week.` }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    await pool.query("SELECT 1");

    // Build aggregation query (daily or weekly)
    let selectDate = `DATE(fs.timestamp) as submission_date`;
    let groupDate = `DATE(fs.timestamp)`;
    if (rollup === 'week') {
      // Week starts Monday (mode 3 ISO); use week start date for label
      selectDate = `DATE_SUB(DATE(fs.timestamp), INTERVAL WEEKDAY(fs.timestamp) DAY) as submission_date`;
      groupDate = `YEARWEEK(fs.timestamp, 3)`;
    }

    let baseQuery = `
      SELECT 
        ${selectDate},
        COALESCE(frc.value, 'No campaign') as utm_campaign,
        COALESCE(frm.value, 'unknown') as utm_medium,
        COALESCE(frs.value, 'unknown') as utm_source,
        COUNT(DISTINCT fs.id) as unique_submissions
      FROM form_submissions fs
      LEFT JOIN form_responses frc ON frc.submission_id = fs.id
      LEFT JOIN form_fields ffc ON ffc.id = frc.field_id AND ffc.field_name = 'utm_campaign'
      LEFT JOIN form_responses frm ON frm.submission_id = fs.id
      LEFT JOIN form_fields ffm ON ffm.id = frm.field_id AND ffm.field_name = 'utm_medium'
      LEFT JOIN form_responses frs ON frs.submission_id = fs.id
      LEFT JOIN form_fields ffs ON ffs.id = frs.field_id AND ffs.field_name = 'utm_source'
      WHERE fs.duplicated = FALSE
        AND fs.timestamp >= ?
        AND fs.timestamp <= ?
    `;
    const params: any[] = [startDate + ' 00:00:00', endDate + ' 23:59:59'];

    if (formId) {
      baseQuery += " AND fs.form_id = ?";
      params.push(Number(formId));
    }

    if (user.role !== 'admin') {
      if (entityIdFilter) {
        baseQuery += " AND fs.entity_id = ?";
        params.push(Number(entityIdFilter));
      } else if (!allEntities) {
        baseQuery += " AND fs.entity_id = ?";
        params.push(Number(user.entity_id));
      } else {
        baseQuery += " AND (fs.entity_id IS NULL OR fs.entity_id NOT IN (SELECT entity_id FROM entity WHERE LOWER(name) = 'organic'))";
      }
    } else if (entityIdFilter) {
      baseQuery += " AND fs.entity_id = ?";
      params.push(Number(entityIdFilter));
    }

    baseQuery += `
      GROUP BY ${groupDate}, utm_campaign, utm_medium, utm_source
      ORDER BY submission_date ASC
    `;

    const [rows] = await pool.query(baseQuery, params);
    const data = Array.isArray(rows) ? (rows as any[]) : [];

    type LinkRow = {
      id: number;
      campaign_name: string;
      campaign_code: string;
      source_name: string;
      source_code: string;
      medium_name: string;
      medium_code: string;
      utm_name: string;
      dailySubmissions: Record<string, { unique: number }>;
      __total?: number;
    };

    const map = new Map<string, LinkRow>();
    let autoId = 1;
    data.forEach(r => {
      const day = String(r.submission_date);
      const campaign = String(r.utm_campaign || 'No campaign');
      const medium = String(r.utm_medium || 'unknown');
      const source = String(r.utm_source || 'unknown');
      const key = `${campaign}|||${medium}|||${source}`;
      if (!map.has(key)) {
        map.set(key, {
          id: autoId++,
          campaign_name: campaign,
          campaign_code: campaign,
          source_name: source,
          source_code: source,
          medium_name: medium,
          medium_code: medium,
          utm_name: `${campaign} / ${medium} / ${source}`,
          dailySubmissions: {},
          __total: 0,
        });
      }
      const row = map.get(key)!;
      if (!row.dailySubmissions[day]) row.dailySubmissions[day] = { unique: 0 };
      row.dailySubmissions[day].unique += Number(r.unique_submissions || 0);
      row.__total = (row.__total || 0) + Number(r.unique_submissions || 0);
    });

    const allRows = Array.from(map.values());
    allRows.sort((a, b) => (b.__total || 0) - (a.__total || 0));

    const totalCombos = allRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCombos / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const limitedRows = allRows.slice(startIndex, startIndex + pageSize).map(({ __total, ...rest }) => rest);

    // Build full date range (daily or weekly labels)
    const allDatesFull: string[] = [];
    if (rollup === 'week') {
      // iterate weeks
      const cur = new Date(start);
      // move to week start (Mon)
      cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
      const endCopy = new Date(end);
      while (cur <= endCopy) {
        allDatesFull.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 7);
      }
    } else {
      const cur = new Date(start);
      while (cur <= end) {
        allDatesFull.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Date pagination
    const totalDatePages = Math.max(1, Math.ceil(allDatesFull.length / datePageSize));
    const safeDatePage = Math.min(datePage, totalDatePages);
    const dateStartIdx = (safeDatePage - 1) * datePageSize;
    const limitedDates = allDatesFull.slice(dateStartIdx, dateStartIdx + datePageSize);

    // Compute visible day totals (unique only) on limited dates
    const dayTotalSubmissions: Record<string, number> = {};
    limitedDates.forEach(date => {
      dayTotalSubmissions[date] = limitedRows.reduce((sum, link) => sum + (link.dailySubmissions[date]?.unique || 0), 0);
    });

    // Prepare response body and ETag
    const responseBody = {
      success: true,
      data: {
        links: limitedRows,
        allDates: limitedDates,
        dayTotalSubmissions,
        period: { startDate, endDate },
        meta: { page: safePage, pageSize, totalPages, totalCombos, datePage: safeDatePage, datePageSize, totalDatePages, rollup: rollup || 'day' }
      }
    } as const;

    const etagSource = JSON.stringify({
      p: page,
      ps: pageSize,
      dp: datePage,
      dps: datePageSize,
      s: startDate,
      e: endDate,
      r: rollup,
      c: responseBody.data.meta.totalCombos,
      d: responseBody.data.allDates.length
    });
    const etag = crypto.createHash('sha1').update(etagSource).digest('hex');

    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const response = NextResponse.json(responseBody);
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return response;

  } catch (error: any) {
    const message: string = String(error?.sqlMessage || error?.message || 'Unknown error');
    const code: string | undefined = error?.code;
    const status = code === 'ER_TOO_MANY_USER_CONNECTIONS' ? 503 : 500;
    console.error('Error fetching form tracking data:', error);
    return NextResponse.json(
      { error: "Failed to fetch form tracking data", details: message, code },
      { status }
    );
  }
}
