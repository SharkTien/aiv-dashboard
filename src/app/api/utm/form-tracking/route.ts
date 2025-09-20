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

  console.log('[Form Tracking] API called with params:', {
    startDate,
    endDate,
    entityIdFilter,
    allEntities,
    formId,
    page,
    pageSize,
    datePage,
    datePageSize,
    rollup,
    user: { role: user.role, entity_id: user.entity_id }
  });

  try {
    await pool.query("SELECT 1");

    // Pre-fetch UTM field IDs to avoid subqueries in JOIN conditions
    const [fieldResult] = await pool.query(`
      SELECT 
        MAX(CASE WHEN field_name='utm_campaign' THEN id END) AS utm_campaign,
        MAX(CASE WHEN field_name='utm_medium' THEN id END) AS utm_medium,
        MAX(CASE WHEN field_name='utm_source' THEN id END) AS utm_source
      FROM form_fields
      WHERE form_id = ?
    `, [formId]);
    
    const fieldIds = Array.isArray(fieldResult) ? fieldResult[0] : fieldResult;
    const { utm_campaign, utm_medium, utm_source } = fieldIds as any;
    
    console.log('[Form Tracking] UTM Field IDs:', { utm_campaign, utm_medium, utm_source });
    
    // Check if any field IDs are null
    if (!utm_campaign || !utm_medium || !utm_source) {
      console.warn('[Form Tracking] Missing UTM field IDs:', {
        utm_campaign: utm_campaign ? 'found' : 'MISSING',
        utm_medium: utm_medium ? 'found' : 'MISSING', 
        utm_source: utm_source ? 'found' : 'MISSING',
        formId
      });
    }

    // Build aggregation query (daily or weekly) - normalize to YYYY-MM-DD format
    let selectDate = `DATE_FORMAT(fs.timestamp, '%Y-%m-%d') as submission_date`;
    let groupDate = `DATE_FORMAT(fs.timestamp, '%Y-%m-%d')`;
    if (rollup === 'week') {
      // Week starts Monday (mode 3 ISO); use week start date for label
      selectDate = `DATE_FORMAT(DATE_SUB(DATE(fs.timestamp), INTERVAL WEEKDAY(fs.timestamp) DAY), '%Y-%m-%d') as submission_date`;
      groupDate = `DATE_FORMAT(DATE_SUB(DATE(fs.timestamp), INTERVAL WEEKDAY(fs.timestamp) DAY), '%Y-%m-%d')`;
    }

    // Build WHERE conditions
    let whereConditions = ['fs.duplicated = FALSE', 'fs.timestamp BETWEEN ? AND ?'];
    const params: any[] = [startDate + ' 00:00:00', endDate + ' 23:59:59'];

    // Add form_id filter if provided
    if (formId) {
      whereConditions.push('fs.form_id = ?');
      params.push(Number(formId));
    }

    // Add entity filter based on user role
    if (user.role !== 'admin') {
      if (entityIdFilter) {
        whereConditions.push('fs.entity_id = ?');
        params.push(Number(entityIdFilter));
      } else if (!allEntities) {
        whereConditions.push('fs.entity_id = ?');
        params.push(Number(user.entity_id));
      } else {
        whereConditions.push('(fs.entity_id IS NULL OR fs.entity_id NOT IN (SELECT entity_id FROM entity WHERE LOWER(name) = \'organic\'))');
      }
    } else if (entityIdFilter) {
      whereConditions.push('fs.entity_id = ?');
      params.push(Number(entityIdFilter));
    }

    let baseQuery = `
      SELECT 
        ${selectDate},
        COALESCE(fr.value, 'No campaign') AS utm_campaign,
        COALESCE(um.code, fr2.value, 'unknown') AS utm_medium,
        COALESCE(us.code, fr3.value, 'unknown') AS utm_source,
        COUNT(DISTINCT fs.id) AS unique_submissions
      FROM form_submissions fs
      LEFT JOIN form_responses fr ON fr.submission_id = fs.id AND fr.field_id = ?
      LEFT JOIN form_responses fr2 ON fr2.submission_id = fs.id AND fr2.field_id = ?
      LEFT JOIN utm_mediums um ON fr2.value = um.code
      LEFT JOIN form_responses fr3 ON fr3.submission_id = fs.id AND fr3.field_id = ?
      LEFT JOIN utm_sources us ON fr3.value = us.code
      WHERE ${whereConditions.join(' AND ')}
    `;

    console.log('[Form Tracking] Query conditions:', {
      whereConditions,
      params: [...params, utm_campaign, utm_medium, utm_source]
    });

    // Get total count first for pagination - optimized without redundant aggregation
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT 
          ${groupDate} AS submission_date,
          COALESCE(fr.value, 'No campaign') AS utm_campaign, 
          COALESCE(um.code, fr2.value, 'unknown') AS utm_medium, 
          COALESCE(us.code, fr3.value, 'unknown') AS utm_source
        FROM form_submissions fs
        LEFT JOIN form_responses fr ON fr.submission_id = fs.id AND fr.field_id = ?
        LEFT JOIN form_responses fr2 ON fr2.submission_id = fs.id AND fr2.field_id = ?
        LEFT JOIN utm_mediums um ON fr2.value = um.code
        LEFT JOIN form_responses fr3 ON fr3.submission_id = fs.id AND fr3.field_id = ?
        LEFT JOIN utm_sources us ON fr3.value = us.code
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY ${groupDate}, fr.value, fr2.value, fr3.value, um.code, us.code
      ) AS final_group
    `;

    // Add field IDs to params for both queries
    const fieldParams = [utm_campaign, utm_medium, utm_source];
    
    const [countResult] = await pool.query(countQuery, [...fieldParams, ...params]);
    const totalCombos = Array.isArray(countResult) && countResult.length > 0 
      ? (countResult[0] as any).total : 0;

    // Apply pagination to main query
    const offset = (page - 1) * pageSize;
    baseQuery += `
      GROUP BY submission_date, utm_campaign, utm_medium, utm_source
      ORDER BY submission_date ASC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(baseQuery, [...fieldParams, ...params, pageSize, offset]);
    const data = Array.isArray(rows) ? (rows as any[]) : [];
    
    console.log('[Form Tracking] Query results:', {
      totalCombos,
      dataLength: data.length,
      sampleData: data.slice(0, 3), // First 3 records
      page,
      pageSize,
      offset
    });
    
    // Always check actual UTM values in database for debugging
    const [utmValuesResult] = await pool.query(`
      SELECT 
        fr.value as utm_value,
        ff.field_name,
        COUNT(*) as count
      FROM form_responses fr
      JOIN form_fields ff ON fr.field_id = ff.id
      JOIN form_submissions fs ON fr.submission_id = fs.id
      WHERE fs.form_id = ? 
        AND ff.field_name IN ('utm_campaign', 'utm_medium', 'utm_source')
        AND fr.value IS NOT NULL 
        AND fr.value != ''
        AND fs.duplicated = FALSE
      GROUP BY fr.value, ff.field_name
      ORDER BY ff.field_name, COUNT(*) DESC
      LIMIT 20
    `, [formId]);
    const utmValues = Array.isArray(utmValuesResult) ? utmValuesResult : [];
    
    console.log('[Form Tracking] Actual UTM values in database:', utmValues);
    
    // Debug: Check if we have any UTM data at all
    if (data.length === 0) {
      console.warn('[Form Tracking] No UTM data found. Checking raw submissions...');
      
      // Check total submissions for this form
      const [totalSubmissionsResult] = await pool.query(`
        SELECT COUNT(*) as total FROM form_submissions fs 
        WHERE fs.form_id = ? AND fs.duplicated = FALSE
      `, [formId]);
      const totalSubmissions = Array.isArray(totalSubmissionsResult) && totalSubmissionsResult.length > 0 
        ? (totalSubmissionsResult[0] as any).total : 0;
      
      console.log('[Form Tracking] Total submissions for form:', totalSubmissions);
      
      // Check if UTM fields exist for this form
      const [utmFieldsResult] = await pool.query(`
        SELECT field_name, id FROM form_fields 
        WHERE form_id = ? AND field_name IN ('utm_campaign', 'utm_medium', 'utm_source')
      `, [formId]);
      const utmFields = Array.isArray(utmFieldsResult) ? utmFieldsResult : [];
      
      console.log('[Form Tracking] UTM fields for form:', utmFields);
      
      // Check actual UTM values in form_responses
      if (utmFields.length > 0) {
        const [utmValuesResult] = await pool.query(`
          SELECT 
            fr.value as utm_value,
            ff.field_name,
            COUNT(*) as count
          FROM form_responses fr
          JOIN form_fields ff ON fr.field_id = ff.id
          JOIN form_submissions fs ON fr.submission_id = fs.id
          WHERE fs.form_id = ? 
            AND ff.field_name IN ('utm_campaign', 'utm_medium', 'utm_source')
            AND fr.value IS NOT NULL 
            AND fr.value != ''
            AND fs.duplicated = FALSE
          GROUP BY fr.value, ff.field_name
          ORDER BY ff.field_name, COUNT(*) DESC
          LIMIT 20
        `, [formId]);
        const utmValues = Array.isArray(utmValuesResult) ? utmValuesResult : [];
        
        console.log('[Form Tracking] Actual UTM values in database:', utmValues);
      }
    }

    // Get last updated timestamp for ETag accuracy
    let lastUpdated = null;
    try {
      let lastUpdatedQuery = `
        SELECT MAX(fs.timestamp) as last_updated
        FROM form_submissions fs
        WHERE fs.duplicated = FALSE
          AND fs.timestamp BETWEEN ? AND ?
      `;
      const lastUpdatedParams: any[] = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
      
      if (formId) {
        lastUpdatedQuery += " AND fs.form_id = ?";
        lastUpdatedParams.push(Number(formId));
      }
      
      if (user.role !== 'admin') {
        if (entityIdFilter) {
          lastUpdatedQuery += " AND fs.entity_id = ?";
          lastUpdatedParams.push(Number(entityIdFilter));
        } else if (!allEntities) {
          lastUpdatedQuery += " AND fs.entity_id = ?";
          lastUpdatedParams.push(Number(user.entity_id));
        } else {
          lastUpdatedQuery += " AND (fs.entity_id IS NULL OR fs.entity_id NOT IN (SELECT entity_id FROM entity WHERE LOWER(name) = 'organic'))";
        }
      } else if (entityIdFilter) {
        lastUpdatedQuery += " AND fs.entity_id = ?";
        lastUpdatedParams.push(Number(entityIdFilter));
      }

      const [lastUpdatedResult] = await pool.query(lastUpdatedQuery, lastUpdatedParams);
      const lastUpdatedData = Array.isArray(lastUpdatedResult) ? lastUpdatedResult : [];
      lastUpdated = lastUpdatedData.length > 0 ? (lastUpdatedData[0] as any).last_updated : null;
    } catch (error) {
      console.warn('Failed to get last updated timestamp:', error);
      // Continue without last_updated if query fails
    }

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
    
    console.log('[Form Tracking] Processing daily data:', {
      totalRecords: data.length,
      sampleRecord: data[0]
    });
    
    data.forEach(r => {
      // Ensure date format is YYYY-MM-DD to match allDates
      const day = new Date(r.submission_date).toISOString().split('T')[0];
      const campaign = String(r.utm_campaign || 'No campaign');
      const medium = String(r.utm_medium || 'unknown');
      const source = String(r.utm_source || 'unknown');
      const key = `${campaign}|||${medium}|||${source}`;
      const unique = Number(r.unique_submissions || 0);
      
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
          dailySubmissions: Object.create(null), // Optimized: no prototype overhead
          __total: 0,
        });
      }
      const row = map.get(key)!;
      const daily = row.dailySubmissions;
      if (!daily[day]) daily[day] = { unique: 0 };
      daily[day].unique += unique;
      row.__total = (row.__total || 0) + unique;
    });

    const allRows = Array.from(map.values());
    allRows.sort((a, b) => (b.__total || 0) - (a.__total || 0));

    const totalPages = Math.max(1, Math.ceil(totalCombos / pageSize));
    const safePage = Math.min(page, totalPages);
    const limitedRows = allRows.map(({ __total, ...rest }) => rest);

    // Build full date range (daily or weekly labels) - optimized
    const allDatesFull: string[] = [];
    const dateFormatter = new Intl.DateTimeFormat('en-CA'); // YYYY-MM-DD format
    
    if (rollup === 'week') {
      // iterate weeks
      const cur = new Date(start);
      // move to week start (Mon)
      cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
      const endCopy = new Date(end);
      while (cur <= endCopy) {
        allDatesFull.push(dateFormatter.format(cur));
        cur.setDate(cur.getDate() + 7);
      }
    } else {
      const cur = new Date(start);
      while (cur <= end) {
        allDatesFull.push(dateFormatter.format(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Date pagination
    const totalDatePages = Math.max(1, Math.ceil(allDatesFull.length / datePageSize));
    const safeDatePage = Math.min(datePage, totalDatePages);
    const dateStartIdx = (safeDatePage - 1) * datePageSize;
    const limitedDates = allDatesFull.slice(dateStartIdx, dateStartIdx + datePageSize);

    // Compute visible day totals (unique only) on limited dates - optimized O(N) instead of O(N*M)
    const dayTotalSubmissions = Object.create(null);
    const limitedDatesSet = new Set(limitedDates); // O(1) lookup instead of O(n) includes()
    limitedRows.forEach(link => {
      for (const date in link.dailySubmissions) {
        if (limitedDatesSet.has(date)) { // Only count dates in visible range
          if (!dayTotalSubmissions[date]) dayTotalSubmissions[date] = 0;
          dayTotalSubmissions[date] += link.dailySubmissions[date].unique;
        }
      }
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

    console.log('[Form Tracking] Final response:', {
      totalLinks: limitedRows.length,
      totalDates: limitedDates.length,
      totalSubmissions: Object.values(dayTotalSubmissions).reduce((sum: number, val: unknown) => sum + (val as number), 0),
      meta: responseBody.data.meta
    });

    const etagSource = JSON.stringify({
      p: page,
      ps: pageSize,
      dp: datePage,
      dps: datePageSize,
      s: startDate,
      e: endDate,
      r: rollup,
      c: responseBody.data.meta.totalCombos,
      d: responseBody.data.allDates.length,
      u: lastUpdated // Include last_updated timestamp for accurate cache invalidation
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
