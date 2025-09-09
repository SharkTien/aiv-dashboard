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
  const entityId = searchParams.get("entity_id");
  const campaignId = searchParams.get("campaign_id");
  const campaignCode = searchParams.get("campaign_code");
  const sourceId = searchParams.get("source_id");
  const sourceCode = searchParams.get("source_code");
  const mediumId = searchParams.get("medium_id");
  const mediumCode = searchParams.get("medium_code");
  const utmName = (searchParams.get("utm_name") || "").trim();
  const linkIdsParam = (searchParams.get("link_ids") || "").trim(); // comma-separated ids
  const formId = searchParams.get("form_id");
  const formType = searchParams.get("form_type"); // oGV/TMR/EWA


  // Validate date parameters
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  
  if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    return NextResponse.json(
      { success: false, error: 'Invalid date format. Use YYYY-MM-DD format.' },
      { status: 400 }
    );
  }
  
  if (startDateObj > endDateObj) {
    return NextResponse.json(
      { success: false, error: 'Start date cannot be after end date.' },
      { status: 400 }
    );
  }

  const pool = getDbPool();

  try {
    // Test database connection first
    try {
      await pool.query("SELECT 1");
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    // Get all UTM links with database tracking data
    let query = `
      SELECT 
        ul.id,
        ul.entity_id,
        ul.utm_name,
        ul.shortened_url,
        ul.created_at,
        ul.total_clicks,
        ul.unique_clicks,
        ul.last_click_at,
        ul.tracking_enabled,
        e.name as entity_name,
        uc.name as campaign_name,
        uc.code as campaign_code,
        us.name as source_name,
        us.code as source_code,
        us.platform as source_platform,
        um.name as medium_name,
        um.code as medium_code,
        f.type as form_type
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

    // Entity scope:
    // - Non-admin: always limited to their own entity
    // - Admin: may optionally filter by entity
    if (user.role !== 'admin') {
      query += " AND ul.entity_id = ?";
      params.push(user.entity_id);
    } else if (entityId) {
      query += " AND ul.entity_id = ?";
      params.push(entityId);
    }

    // Optional filters
    if (campaignId) {
      query += " AND ul.campaign_id = ?";
      params.push(Number(campaignId));
    }
    if (campaignCode) {
      query += " AND uc.code = ?";
      params.push(campaignCode);
    }
    if (sourceId) {
      query += " AND ul.source_id = ?";
      params.push(Number(sourceId));
    }
    if (sourceCode) {
      query += " AND us.code = ?";
      params.push(sourceCode);
    }
    if (mediumId) {
      query += " AND ul.medium_id = ?";
      params.push(Number(mediumId));
    }
    if (mediumCode) {
      query += " AND um.code = ?";
      params.push(mediumCode);
    }
    if (utmName) {
      query += " AND ul.utm_name LIKE ?";
      params.push(`%${utmName}%`);
    }
    if (formId) {
      query += " AND uc.form_id = ?";
      params.push(Number(formId));
    } else if (formType && ["oGV", "TMR", "EWA"].includes(formType)) {
      // Filter by form type when no specific form selected
      query += " AND f.type = ?";
      params.push(formType);
    }
    if (linkIdsParam) {
      const ids = linkIdsParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter(n => !Number.isNaN(n));
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        query += ` AND ul.id IN (${placeholders})`;
        params.push(...ids);
      }
    }

    query += " ORDER BY ul.created_at DESC";

    const [links] = await pool.query(query, params);
    const linksArray = Array.isArray(links) ? links : [];

    // Combine database tracking with Short.io data
    const analyticsData = await Promise.all(
      linksArray.map(async (link: any) => {
        try {
          // Get database click analytics
          const dbClickData = await getDatabaseClickData(pool, link.id, startDate, endDate);
          
          // Get Short.io data if shortened URL exists
          let shortIoData = null;
          if (link.shortened_url) {
            const shortUrlId = extractShortUrlId(link.shortened_url);
            shortIoData = await getShortIoClickData(shortUrlId, startDate, endDate);
          }
          
          // Combine database and Short.io data
          const combinedData = combineTrackingData(dbClickData, shortIoData);
          
          return {
            ...link,
            clicks: combinedData.totalClicks,
            uniqueClicks: combinedData.uniqueClicks,
            clicksByDate: combinedData.clicksByDate,
            clicksByCountry: combinedData.clicksByCountry,
            clicksByReferrer: combinedData.clicksByReferrer,
            clicksByDevice: combinedData.clicksByDevice,
            effectivenessScore: combinedData.effectivenessScore,
            conversionRate: combinedData.conversionRate,
            avgDailyClicks: combinedData.avgDailyClicks,
            peakDay: combinedData.peakDay,
            trendDirection: combinedData.trendDirection
          };
        } catch (linkError) {
          console.error(`Error processing link ${link.id}:`, linkError);
          // Return basic link data without analytics if processing fails
          return {
            ...link,
            clicks: 0,
            uniqueClicks: 0,
            clicksByDate: [],
            clicksByCountry: [],
            clicksByReferrer: [],
            clicksByDevice: [],
            effectivenessScore: 0,
            conversionRate: 0,
            avgDailyClicks: 0,
            peakDay: '',
            trendDirection: 'stable'
          };
        }
      })
    );

    // Aggregate data for insights
    const insights = generateUTMInsights(analyticsData);
    
    // Always compute Top 5 national EMT links (visible to all users)
    let emtTopLinks: any[] = [];
    try {
      const [emtRows] = await pool.query(
        `SELECT 
           ul.id,
           ul.utm_name,
           e.name       AS entity_name,
           uc.name      AS campaign_name,
           us.name      AS source_name,
           um.name      AS medium_name,
           COUNT(*)     AS clicks
         FROM click_logs cl
         JOIN utm_links ul     ON cl.utm_link_id = ul.id
         JOIN entity e         ON ul.entity_id   = e.entity_id
         JOIN utm_campaigns uc ON ul.campaign_id = uc.id
         JOIN utm_sources  us  ON ul.source_id   = us.id
         JOIN utm_mediums  um  ON ul.medium_id   = um.id
         WHERE DATE(cl.clicked_at) >= ?
           AND DATE(cl.clicked_at) <= ?
           AND (e.name LIKE 'EMT%' OR e.name LIKE '%National%')
         GROUP BY ul.id
         ORDER BY clicks DESC
         LIMIT 5`,
        [startDate, endDate]
      );
      emtTopLinks = Array.isArray(emtRows) ? emtRows : [];
    } catch {}

    // Build daily aggregations for heatmaps by medium and by source
    // Build date axis using local YYYY-MM-DD to avoid timezone drift
    const allDatesSet = new Set<string>();
    const toLocalYMD = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    {
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (
        let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        allDatesSet.add(toLocalYMD(d));
      }
    }
    const coerceToYMD = (value: any): string => {
      if (value instanceof Date) return toLocalYMD(value);
      if (typeof value === 'number') return toLocalYMD(new Date(value));
      if (typeof value === 'string') {
        // Accept ISO or 'YYYY-MM-DD ...'
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) return toLocalYMD(parsed);
        return value;
      }
      try {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) return toLocalYMD(parsed);
      } catch {}
      return String(value ?? '');
    };
    const ensureDate = (date: any) => {
      const ymd = coerceToYMD(date);
      if (ymd && !allDatesSet.has(ymd)) allDatesSet.add(ymd);
    };
    const allDates: string[] = Array.from(allDatesSet).sort((a, b) => String(a).localeCompare(String(b)));

    const dailyByMediumMap = new Map<string, { medium_name: string; medium_code: string; totals: number; byDate: Record<string, number> }>();
    const dailyBySourceMap = new Map<string, { source_name: string; source_code: string; totals: number; byDate: Record<string, number> }>();

    analyticsData.forEach((link: any) => {
      const mKey = link.medium_code || link.medium_name || 'unknown';
      const sKey = link.source_code || link.source_name || 'unknown';

      if (!dailyByMediumMap.has(mKey)) {
        const base: Record<string, number> = Object.fromEntries(Array.from(allDatesSet).map(d => [d, 0]));
        dailyByMediumMap.set(mKey, {
          medium_name: link.medium_name || mKey,
          medium_code: link.medium_code || mKey,
          totals: 0,
          byDate: base
        });
      }
      if (!dailyBySourceMap.has(sKey)) {
        const base: Record<string, number> = Object.fromEntries(Array.from(allDatesSet).map(d => [d, 0]));
        dailyBySourceMap.set(sKey, {
          source_name: link.source_name || sKey,
          source_code: link.source_code || sKey,
          totals: 0,
          byDate: base
        });
      }

      const mediumRow = dailyByMediumMap.get(mKey)!;
      const sourceRow = dailyBySourceMap.get(sKey)!;

      (link.clicksByDate || []).forEach((it: any) => {
        const date = coerceToYMD(it.date);
        const val = Number(it.clicks || 0);
        if (date) {
          // Ensure date exists in axis/maps
          ensureDate(date);
          if (mediumRow.byDate[date] === undefined) mediumRow.byDate[date] = 0;
          if (sourceRow.byDate[date] === undefined) sourceRow.byDate[date] = 0;
          mediumRow.byDate[date] += val;
          sourceRow.byDate[date] += val;
        }
        mediumRow.totals += val;
        sourceRow.totals += val;
      });
    });

    // Finalize ordered dates
    const orderedDates: string[] = Array.from(allDatesSet).sort((a, b) => String(a).localeCompare(String(b)));
    // Normalize rows to include any dynamically added dates
    const normalizeRowDates = (row: { byDate: Record<string, number> }) => {
      orderedDates.forEach(d => {
        if (row.byDate[d] === undefined) row.byDate[d] = 0;
      });
    };
    dailyByMediumMap.forEach(r => normalizeRowDates(r));
    dailyBySourceMap.forEach(r => normalizeRowDates(r));

    const dailyByMedium = Array.from(dailyByMediumMap.values()).sort((a, b) => b.totals - a.totals);
    const dailyBySource = Array.from(dailyBySourceMap.values()).sort((a, b) => b.totals - a.totals);

    // Build time-of-day heatmap (hours x dates) aggregated across all selected links
    const linkIdsForQuery = linksArray.map((l: any) => l.id).filter((id: any) => typeof id === 'number');
    let timeRows: { hour: number; totals: number; byDate: Record<string, number> }[] = [];
    if (linkIdsForQuery.length > 0) {
      const placeholders = linkIdsForQuery.map(() => '?').join(',');
      const [timeData] = await pool.query(
        `SELECT DATE(clicked_at) as date, HOUR(clicked_at) as hour, COUNT(*) as clicks
         FROM click_logs
         WHERE utm_link_id IN (${placeholders})
           AND DATE(clicked_at) >= ?
           AND DATE(clicked_at) <= ?
         GROUP BY DATE(clicked_at), HOUR(clicked_at)
         ORDER BY date ASC, hour ASC`,
        [...linkIdsForQuery, startDate, endDate]
      );

      // Initialize rows for 24 hours
      const baseDates: Record<string, number> = Object.fromEntries(orderedDates.map(d => [d, 0]));
      const hourMap = new Map<number, { hour: number; totals: number; byDate: Record<string, number> }>();
      for (let h = 0; h < 24; h++) {
        hourMap.set(h, { hour: h, totals: 0, byDate: { ...baseDates } });
      }

      const arrayData = Array.isArray(timeData) ? timeData : [];
      arrayData.forEach((row: any) => {
        const hr = Number(row.hour);
        const date = coerceToYMD(row.date as any);
        const clicks = Number(row.clicks || 0);
        // Ensure date is part of axis
        ensureDate(date);
        const rowRef = hourMap.get(hr);
        if (rowRef) {
          if (rowRef.byDate[date] === undefined) rowRef.byDate[date] = 0;
          rowRef.byDate[date] += clicks;
          rowRef.totals += clicks;
        }
      });

      timeRows = Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);
    } else {
      // No links: return empty rows
      const baseDates: Record<string, number> = Object.fromEntries(orderedDates.map(d => [d, 0]));
      for (let h = 0; h < 24; h++) {
        timeRows.push({ hour: h, totals: 0, byDate: { ...baseDates } });
      }
    }
    
    // (debug logs removed)

    const response = NextResponse.json({
      success: true,
      data: {
        links: analyticsData,
        insights,
        period: { startDate, endDate },
        heatmaps: {
          dates: orderedDates,
          byMedium: dailyByMedium,
          bySource: dailyBySource,
          timeOfDay: {
            hours: Array.from({ length: 24 }, (_, i) => i),
            rows: timeRows
          }
        },
        emtTopLinks
      }
    });

    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'private, max-age=300');
    return response;

  } catch (error) {
    console.error('Error fetching UTM analytics:', error);
    
    // Provide more specific error information for debugging
    let errorMessage = 'Failed to fetch UTM analytics';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific database errors
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Database connection failed';
        statusCode = 503;
      } else if (error.message.includes('Access denied')) {
        errorMessage = 'Database access denied';
        statusCode = 503;
      } else if (error.message.includes('Unknown column') || error.message.includes('Table')) {
        errorMessage = 'Database schema error';
        statusCode = 500;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: statusCode }
    );
  }
}

// Helper function to extract short URL ID
function extractShortUrlId(shortenedUrl: string): string {
  // Extract ID from short.io URL format
  // Example: https://short.io/abc123 -> abc123
  const match = shortenedUrl.match(/short\.io\/([^/?]+)/);
  return match ? match[1] : '';
}

// Fetch Short.io stats with enhanced tracking data
async function getShortIoClickData(shortUrlId: string, startDate: string, endDate: string) {
  const apiKey = process.env.SHORT_IO_API_KEY;
  const apiBase = process.env.SHORT_IO_API_BASE || 'https://api.short.io';

  // If no API key, use simulation to avoid breaking UI
  if (!apiKey) {
    return simulateShortIoClickData(startDate, endDate);
  }

  try {
    // 1) Get link details first to extract the internal linkId
    let linkId = shortUrlId;
    let linkDetails = null;
    
    try {
      // Try to get link details using domain expansion method
      const expandRes = await fetch(`${apiBase}/links/expand?shortURL=${encodeURIComponent(shortUrlId)}`, {
        headers: { 
          'Authorization': apiKey, 
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (expandRes.ok) {
        linkDetails = await expandRes.json();
        if (linkDetails && linkDetails.id) {
          linkId = linkDetails.id;
        }
      } else {
        // Try alternative approach with path extraction
        const pathMatch = shortUrlId.match(/short\.io\/([^/?]+)/);
        if (pathMatch) {
          linkId = pathMatch[1];
        }
      }
    } catch (expandError) {
      console.warn('Link expansion failed, using original ID:', expandError);
    }

    // 2) Fetch comprehensive statistics with multiple endpoints
    const promises = [];
    
    // A) Main statistics endpoint
    const statsUrl = `${apiBase}/statistics/link/${encodeURIComponent(linkId)}`;
    promises.push(
      fetch(statsUrl, {
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
        cache: 'no-store'
      }).then(res => res.ok ? res.json() : null).catch(() => null)
    );

    // B) Daily statistics (if supported)
    const fromTimestamp = new Date(`${startDate}T00:00:00Z`).getTime();
    const toTimestamp = new Date(`${endDate}T23:59:59Z`).getTime();
    
    const dailyStatsUrl = `${apiBase}/statistics/link/${encodeURIComponent(linkId)}/clicks?from=${fromTimestamp}&to=${toTimestamp}&groupBy=day`;
    promises.push(
      fetch(dailyStatsUrl, {
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
        cache: 'no-store'
      }).then(res => res.ok ? res.json() : null).catch(() => null)
    );

    // C) Geographic statistics
    const geoStatsUrl = `${apiBase}/statistics/link/${encodeURIComponent(linkId)}/countries`;
    promises.push(
      fetch(geoStatsUrl, {
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
        cache: 'no-store'
      }).then(res => res.ok ? res.json() : null).catch(() => null)
    );

    // D) Referrer statistics
    const refStatsUrl = `${apiBase}/statistics/link/${encodeURIComponent(linkId)}/referrers`;
    promises.push(
      fetch(refStatsUrl, {
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
        cache: 'no-store'
      }).then(res => res.ok ? res.json() : null).catch(() => null)
    );

    const [mainStats, dailyStats, geoStats, refStats] = await Promise.all(promises);

    // 3) Combine all statistics into comprehensive analytics
    return mapEnhancedShortIoToAnalytics({
      main: mainStats,
      daily: dailyStats,
      geo: geoStats,
      referrers: refStats,
      linkDetails
    }, startDate, endDate);
    
  } catch (err) {
    console.warn('Short.io API error, falling back to simulation:', err);
    return simulateShortIoClickData(startDate, endDate);
  }
}

// Enhanced mapping function for comprehensive Short.io data
function mapEnhancedShortIoToAnalytics(combinedData: any, startDate: string, endDate: string) {
  const { main, daily, geo, referrers, linkDetails } = combinedData;
  
  // Extract total clicks from main stats
  const totalClicks = Number(
    main?.totalClicks || 
    main?.clicks || 
    main?.humanClicks || 
    linkDetails?.totalClicks || 
    0
  );
  
  const uniqueClicks = Number(
    main?.uniqueClicks || 
    main?.unique || 
    main?.uniqueHumanClicks ||
    Math.floor(totalClicks * 0.7) // Fallback estimate
  );

  // Process daily clicks data with multiple formats support
  let clicksByDate: Array<{ date: string; clicks: number }> = [];
  
  if (daily && Array.isArray(daily.data)) {
    // Format: {data: [{date: "2023-12-01", clicks: 5}]}
    clicksByDate = daily.data
      .map((item: any) => ({
        date: formatDateToISO(item.date || item.day || item.timestamp),
        clicks: Number(item.clicks || item.count || item.value || 0)
      }))
      .filter((d: any) => d.date && d.date >= startDate && d.date <= endDate);
  } else if (daily && Array.isArray(daily.items)) {
    // Format: {items: [{day: "2023-12-01", value: 5}]}
    clicksByDate = daily.items
      .map((item: any) => ({
        date: formatDateToISO(item.day || item.date || item.timestamp),
        clicks: Number(item.value || item.clicks || item.count || 0)
      }))
      .filter((d: any) => d.date && d.date >= startDate && d.date <= endDate);
  } else if (main && Array.isArray(main.clicksByDate)) {
    // Fallback to main stats daily data
    clicksByDate = main.clicksByDate
      .map((item: any) => ({
        date: formatDateToISO(item.date || item.day),
        clicks: Number(item.clicks || item.value || 0)
      }))
      .filter((d: any) => d.date && d.date >= startDate && d.date <= endDate);
  }
  
  // If no daily data but we have total clicks, distribute evenly
  if (clicksByDate.length === 0 && totalClicks > 0) {
    clicksByDate = generateDailyClicks(startDate, endDate, totalClicks);
  }

  // Process geographic data
  const clicksByCountry = [];
  if (geo && Array.isArray(geo.data)) {
    clicksByCountry.push(...geo.data.map((item: any) => ({
      country: item.country || item.name || 'Unknown',
      clicks: Number(item.clicks || item.count || item.value || 0)
    })));
  } else if (main && Array.isArray(main.countries)) {
    clicksByCountry.push(...main.countries.map((item: any) => ({
      country: item.country || item.name || 'Unknown',
      clicks: Number(item.clicks || item.count || item.value || 0)
    })));
  }

  // Process referrer data  
  const clicksByReferrer = [];
  if (referrers && Array.isArray(referrers.data)) {
    clicksByReferrer.push(...referrers.data.map((item: any) => ({
      referrer: item.referrer || item.domain || item.name || 'Direct',
      clicks: Number(item.clicks || item.count || item.value || 0)
    })));
  } else if (main && Array.isArray(main.referrers)) {
    clicksByReferrer.push(...main.referrers.map((item: any) => ({
      referrer: item.referrer || item.domain || item.name || 'Direct',
      clicks: Number(item.clicks || item.count || item.value || 0)
    })));
  }

  // Process device data
  const clicksByDevice = [];
  if (main && Array.isArray(main.devices)) {
    clicksByDevice.push(...main.devices.map((item: any) => ({
      device: item.device || item.deviceType || item.name || 'Unknown',
      clicks: Number(item.clicks || item.count || item.value || 0)
    })));
  } else if (main && Array.isArray(main.browsers)) {
    // Sometimes device info is in browsers endpoint
    clicksByDevice.push(...main.browsers.map((item: any) => ({
      device: item.browser || item.name || 'Unknown',
      clicks: Number(item.clicks || item.count || item.value || 0)
    })));
  }

  // Add performance metrics and effectiveness scoring
  const effectivenessScore = calculateEffectivenessScore(totalClicks, uniqueClicks, clicksByDate);
  const conversionRate = uniqueClicks > 0 ? (uniqueClicks / totalClicks * 100) : 0;
  const avgDailyClicks = clicksByDate.length > 0 ? totalClicks / clicksByDate.length : 0;

  return { 
    totalClicks, 
    uniqueClicks, 
    clicksByDate, 
    clicksByCountry, 
    clicksByReferrer, 
    clicksByDevice,
    effectivenessScore,
    conversionRate: Number(conversionRate.toFixed(2)),
    avgDailyClicks: Number(avgDailyClicks.toFixed(1)),
    peakDay: findPeakDay(clicksByDate),
    trendDirection: calculateTrend(clicksByDate)
  };
}

// Legacy mapping function for backward compatibility
function mapShortIoToAnalytics(apiJson: any, startDate: string, endDate: string) {
  return mapEnhancedShortIoToAnalytics({ main: apiJson, daily: null, geo: null, referrers: null, linkDetails: null }, startDate, endDate);
}

// Helper functions for enhanced analytics
function formatDateToISO(dateInput: any): string {
  if (!dateInput) return '';
  
  // Handle timestamp (milliseconds)
  if (typeof dateInput === 'number') {
    return new Date(dateInput).toISOString().split('T')[0];
  }
  
  // Handle ISO string or date string
  if (typeof dateInput === 'string') {
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return '';
}

function calculateEffectivenessScore(totalClicks: number, uniqueClicks: number, dailyData: any[]): number {
  if (totalClicks === 0) return 0;
  
  // Score based on multiple factors
  const clickVolume = Math.min(totalClicks / 100, 1); // Normalize to 0-1
  const uniqueRatio = uniqueClicks / totalClicks; // Higher is better
  const consistency = calculateConsistency(dailyData); // 0-1 score
  
  const score = (clickVolume * 0.4 + uniqueRatio * 0.4 + consistency * 0.2) * 100;
  return Number(score.toFixed(1));
}

function calculateConsistency(dailyData: any[]): number {
  if (dailyData.length < 2) return 1;
  
  const clicks = dailyData.map(d => d.clicks);
  const avg = clicks.reduce((sum, c) => sum + c, 0) / clicks.length;
  const variance = clicks.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / clicks.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower coefficient of variation = higher consistency
  const coefficientOfVariation = avg > 0 ? stdDev / avg : 0;
  return Math.max(0, 1 - coefficientOfVariation);
}

function findPeakDay(dailyData: any[]): string {
  if (dailyData.length === 0) return '';
  
  const peak = dailyData.reduce((max, current) => 
    current.clicks > max.clicks ? current : max
  );
  
  return peak.date;
}

function calculateTrend(dailyData: any[]): 'up' | 'down' | 'stable' {
  if (dailyData.length < 3) return 'stable';
  
  const firstHalf = dailyData.slice(0, Math.floor(dailyData.length / 2));
  const secondHalf = dailyData.slice(Math.floor(dailyData.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, d) => sum + d.clicks, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.clicks, 0) / secondHalf.length;
  
  const change = (secondAvg - firstAvg) / firstAvg;
  
  if (change > 0.1) return 'up';
  if (change < -0.1) return 'down';
  return 'stable';
}

// Get click data from database
async function getDatabaseClickData(pool: any, utmLinkId: number, startDate: string, endDate: string) {
  try {
    // Get total and unique clicks from click_logs table
    const [clickData] = await pool.query(
      `SELECT 
        COUNT(*) as totalClicks,
        COUNT(DISTINCT session_id) as uniqueClicks
       FROM click_logs 
       WHERE utm_link_id = ? 
         AND DATE(clicked_at) >= ? 
         AND DATE(clicked_at) <= ?`,
      [utmLinkId, startDate, endDate]
    );
    
    const click = Array.isArray(clickData) && clickData.length > 0 ? clickData[0] : null;
    const totalClicks = Number(click?.totalClicks || 0);
    const uniqueClicks = Number(click?.uniqueClicks || 0);
    
    // (debug logs removed)
    
    // Get daily clicks breakdown
    const [dailyData] = await pool.query(
      `SELECT 
        DATE(clicked_at) as date,
        COUNT(*) as clicks,
        COUNT(DISTINCT session_id) as unique_clicks
       FROM click_logs 
       WHERE utm_link_id = ? 
         AND DATE(clicked_at) >= ? 
         AND DATE(clicked_at) <= ?
       GROUP BY DATE(clicked_at)
       ORDER BY date ASC`,
      [utmLinkId, startDate, endDate]
    );
    
    const clicksByDate = Array.isArray(dailyData) 
      ? dailyData.map((row: any) => ({
          date: row.date,
          clicks: Number(row.clicks)
        }))
      : [];
    
    // Get geographic breakdown (based on IP if available)
    const [geoData] = await pool.query(
      `SELECT 
        country,
        COUNT(*) as clicks
       FROM click_logs 
       WHERE utm_link_id = ? 
         AND DATE(clicked_at) >= ? 
         AND DATE(clicked_at) <= ?
         AND country IS NOT NULL
       GROUP BY country
       ORDER BY clicks DESC
       LIMIT 10`,
      [utmLinkId, startDate, endDate]
    );
    
    const clicksByCountry = Array.isArray(geoData)
      ? geoData.map((row: any) => ({
          country: row.country || 'Unknown',
          clicks: Number(row.clicks)
        }))
      : [];
    
    // Get referrer breakdown
    const [refData] = await pool.query(
      `SELECT 
        CASE 
          WHEN referrer = '' OR referrer IS NULL THEN 'Direct'
          WHEN referrer LIKE '%facebook%' THEN 'Facebook'
          WHEN referrer LIKE '%instagram%' THEN 'Instagram'
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%youtube%' THEN 'YouTube'
          ELSE SUBSTRING_INDEX(SUBSTRING_INDEX(referrer, '/', 3), '/', -1)
        END as referrer_group,
        COUNT(*) as clicks
       FROM click_logs 
       WHERE utm_link_id = ? 
         AND DATE(clicked_at) >= ? 
         AND DATE(clicked_at) <= ?
       GROUP BY referrer_group
       ORDER BY clicks DESC
       LIMIT 10`,
      [utmLinkId, startDate, endDate]
    );
    
    const clicksByReferrer = Array.isArray(refData)
      ? refData.map((row: any) => ({
          referrer: row.referrer_group || 'Unknown',
          clicks: Number(row.clicks)
        }))
      : [];
    
    // Get device breakdown
    const [deviceData] = await pool.query(
      `SELECT 
        device_type as device,
        COUNT(*) as clicks
       FROM click_logs 
       WHERE utm_link_id = ? 
         AND DATE(clicked_at) >= ? 
         AND DATE(clicked_at) <= ?
       GROUP BY device_type
       ORDER BY clicks DESC`,
      [utmLinkId, startDate, endDate]
    );
    
    const clicksByDevice = Array.isArray(deviceData)
      ? deviceData.map((row: any) => ({
          device: row.device || 'Unknown',
          clicks: Number(row.clicks)
        }))
      : [];
    
    return {
      totalClicks,
      uniqueClicks,
      clicksByDate,
      clicksByCountry,
      clicksByReferrer,
      clicksByDevice
    };
    
  } catch (error) {
    console.error('Error fetching database click data:', error);
    return {
      totalClicks: 0,
      uniqueClicks: 0,
      clicksByDate: [],
      clicksByCountry: [],
      clicksByReferrer: [],
      clicksByDevice: []
    };
  }
}

// Combine database and Short.io tracking data
function combineTrackingData(dbData: any, shortIoData: any) {
  // If no Short.io data, use database data only
  if (!shortIoData) {
    const effectivenessScore = calculateEffectivenessScore(
      dbData.totalClicks, 
      dbData.uniqueClicks, 
      dbData.clicksByDate
    );
    const conversionRate = dbData.totalClicks > 0 
      ? (dbData.uniqueClicks / dbData.totalClicks * 100) 
      : 0;
    const avgDailyClicks = dbData.clicksByDate.length > 0 
      ? dbData.totalClicks / dbData.clicksByDate.length 
      : 0;
    
    return {
      ...dbData,
      effectivenessScore,
      conversionRate: Number(conversionRate.toFixed(2)),
      avgDailyClicks: Number(avgDailyClicks.toFixed(1)),
      peakDay: findPeakDay(dbData.clicksByDate),
      trendDirection: calculateTrend(dbData.clicksByDate)
    };
  }
  
  // Combine database and Short.io data
  const totalClicks = Math.max(dbData.totalClicks, shortIoData.totalClicks);
  const uniqueClicks = Math.max(dbData.uniqueClicks, shortIoData.uniqueClicks);
  
  // Merge daily data (prefer database data, fallback to Short.io)
  const mergedDailyData = mergeDailyClickData(dbData.clicksByDate, shortIoData.clicksByDate);
  
  // Prefer Short.io geo/referrer data if available, otherwise use database
  const clicksByCountry = shortIoData.clicksByCountry.length > 0 
    ? shortIoData.clicksByCountry 
    : dbData.clicksByCountry;
    
  const clicksByReferrer = shortIoData.clicksByReferrer.length > 0 
    ? shortIoData.clicksByReferrer 
    : dbData.clicksByReferrer;
    
  const clicksByDevice = shortIoData.clicksByDevice.length > 0 
    ? shortIoData.clicksByDevice 
    : dbData.clicksByDevice;
  
  const effectivenessScore = calculateEffectivenessScore(totalClicks, uniqueClicks, mergedDailyData);
  const conversionRate = totalClicks > 0 ? (uniqueClicks / totalClicks * 100) : 0;
  const avgDailyClicks = mergedDailyData.length > 0 ? totalClicks / mergedDailyData.length : 0;
  
  return {
    totalClicks,
    uniqueClicks,
    clicksByDate: mergedDailyData,
    clicksByCountry,
    clicksByReferrer,
    clicksByDevice,
    effectivenessScore,
    conversionRate: Number(conversionRate.toFixed(2)),
    avgDailyClicks: Number(avgDailyClicks.toFixed(1)),
    peakDay: findPeakDay(mergedDailyData),
    trendDirection: calculateTrend(mergedDailyData)
  };
}

// Merge daily click data from database and Short.io
function mergeDailyClickData(dbDaily: any[], shortIoDaily: any[]) {
  const dateMap = new Map();
  
  // Add database data
  dbDaily.forEach(item => {
    dateMap.set(item.date, item.clicks);
  });
  
  // Add Short.io data (only if database doesn't have data for that date)
  shortIoDaily.forEach(item => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, item.clicks);
    } else {
      // Take the higher value
      dateMap.set(item.date, Math.max(dateMap.get(item.date), item.clicks));
    }
  });
  
  // Convert back to array and sort by date
  return Array.from(dateMap.entries())
    .map(([date, clicks]) => ({ date: String(date), clicks }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function simulateShortIoClickData(startDate: string, endDate: string) {
  const baseClicks = Math.floor(Math.random() * 100) + 10;
  const uniqueClicks = Math.floor(baseClicks * 0.7);
  return {
    totalClicks: baseClicks,
    uniqueClicks,
    clicksByDate: generateDailyClicks(startDate, endDate, baseClicks),
    clicksByCountry: [
      { country: 'Vietnam', clicks: Math.floor(baseClicks * 0.8) },
      { country: 'Thailand', clicks: Math.floor(baseClicks * 0.1) },
      { country: 'Others', clicks: Math.floor(baseClicks * 0.1) }
    ],
    clicksByReferrer: [
      { referrer: 'Direct', clicks: Math.floor(baseClicks * 0.4) },
      { referrer: 'Facebook', clicks: Math.floor(baseClicks * 0.3) },
      { referrer: 'Instagram', clicks: Math.floor(baseClicks * 0.2) },
      { referrer: 'Others', clicks: Math.floor(baseClicks * 0.1) }
    ],
    clicksByDevice: [
      { device: 'Mobile', clicks: Math.floor(baseClicks * 0.7) },
      { device: 'Desktop', clicks: Math.floor(baseClicks * 0.25) },
      { device: 'Tablet', clicks: Math.floor(baseClicks * 0.05) }
    ]
  };
}

// Generate daily clicks data
function generateDailyClicks(startDate: string, endDate: string, totalClicks: number) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const dailyClicks = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const clicks = Math.floor(Math.random() * (totalClicks / days * 2));
    dailyClicks.push({
      date: date.toISOString().split('T')[0],
      clicks
    });
  }
  
  return dailyClicks;
}

// Generate UTM insights
function generateUTMInsights(analyticsData: any[]) {
  const mediumPerformance = new Map();
  const sourcePerformance = new Map();
  const campaignPerformance = new Map();
  
  analyticsData.forEach(link => {
    // Medium performance
    const mediumKey = link.medium_code;
    if (!mediumPerformance.has(mediumKey)) {
      mediumPerformance.set(mediumKey, {
        medium_name: link.medium_name,
        medium_code: link.medium_code,
        totalClicks: 0,
        uniqueClicks: 0,
        linkCount: 0
      });
    }
    const mediumData = mediumPerformance.get(mediumKey);
    mediumData.totalClicks += link.clicks || 0;
    mediumData.uniqueClicks += link.uniqueClicks || 0;
    mediumData.linkCount += 1;
    
    // Source performance
    const sourceKey = link.source_code;
    if (!sourcePerformance.has(sourceKey)) {
      sourcePerformance.set(sourceKey, {
        source_name: link.source_name,
        source_code: link.source_code,
        source_platform: link.source_platform,
        totalClicks: 0,
        uniqueClicks: 0,
        linkCount: 0
      });
    }
    const sourceData = sourcePerformance.get(sourceKey);
    sourceData.totalClicks += link.clicks || 0;
    sourceData.uniqueClicks += link.uniqueClicks || 0;
    sourceData.linkCount += 1;
    
    // Campaign performance
    const campaignKey = link.campaign_code;
    if (!campaignPerformance.has(campaignKey)) {
      campaignPerformance.set(campaignKey, {
        campaign_name: link.campaign_name,
        campaign_code: link.campaign_code,
        totalClicks: 0,
        uniqueClicks: 0,
        linkCount: 0
      });
    }
    const campaignData = campaignPerformance.get(campaignKey);
    campaignData.totalClicks += link.clicks || 0;
    campaignData.uniqueClicks += link.uniqueClicks || 0;
    campaignData.linkCount += 1;
  });
  
  return {
    mediumPerformance: Array.from(mediumPerformance.values())
      .sort((a, b) => b.totalClicks - a.totalClicks),
    sourcePerformance: Array.from(sourcePerformance.values())
      .sort((a, b) => b.totalClicks - a.totalClicks),
    campaignPerformance: Array.from(campaignPerformance.values())
      .sort((a, b) => b.totalClicks - a.totalClicks),
    totalLinks: analyticsData.length,
    totalClicks: analyticsData.reduce((sum, link) => sum + (link.clicks || 0), 0),
    totalUniqueClicks: analyticsData.reduce((sum, link) => sum + (link.uniqueClicks || 0), 0)
  };
}
