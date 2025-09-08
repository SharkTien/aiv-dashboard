import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

// Simple in-memory cache for UTM link data
const linkCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedLinkData(pool: any, linkId: number) {
  const cacheKey = `link_${linkId}`;
  const cached = linkCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const [rows] = await pool.query(
      `SELECT 
         ul.base_url,
         ul.utm_name,
         us.code AS source_code,
         um.code AS medium_code,
         uc.code AS campaign_code
       FROM utm_links ul
       JOIN utm_sources us ON ul.source_id = us.id
       JOIN utm_mediums um ON ul.medium_id = um.id
       JOIN utm_campaigns uc ON ul.campaign_id = uc.id
       WHERE ul.id = ?
       LIMIT 1`,
      [linkId]
    );
    
    const link = Array.isArray(rows) && rows.length > 0 ? (rows as any)[0] : null;
    linkCache.set(cacheKey, { data: link, timestamp: Date.now() });
    return link;
  } catch (error) {
    console.error('Error fetching link data:', error);
    return null;
  }
}

// Track UTM link clicks
export async function POST(req: NextRequest) {
  const pool = getDbPool();
  
  try {
    const body = await req.json();
    const { utm_link_id, click_type = 'original' } = body;
    
    if (!utm_link_id) {
      return NextResponse.json(
        { error: "utm_link_id is required" },
        { status: 400 }
      );
    }

    // Extract visitor information
    const visitorInfo = await extractVisitorInfo(req);
    
    // Check if this is a unique click for this visitor/link combination
    const isUnique = await checkUniqueVisitor(pool, utm_link_id, click_type, visitorInfo.session_id);
    
    // Insert click log
    await insertClickLog(pool, {
      utm_link_id,
      click_type,
      ...visitorInfo,
      is_unique: isUnique
    });
    await upsertDailyCounters(pool, utm_link_id, isUnique);
    
    // Update UTM link counters
    await updateLinkCounters(pool, utm_link_id, isUnique);
    
    return NextResponse.json({ 
      success: true, 
      tracked: true,
      unique: isUnique 
    });
    
  } catch (error) {
    console.error('Error tracking click:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track click' },
      { status: 500 }
    );
  }
}

// Public GET endpoint for click tracking (can be called from any domain)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const utm_link_id = searchParams.get('id');
  const click_type = searchParams.get('type') || 'original';
  const redirect_url = searchParams.get('url');
  
  if (!utm_link_id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const pool = getDbPool();
  const linkId = parseInt(utm_link_id);

  // Kick off tracking WITHOUT awaiting to minimize redirect latency
  (async () => {
    try {
      const visitorInfo = await extractVisitorInfo(req);
      const isUnique = await checkUniqueVisitor(pool, linkId, click_type, visitorInfo.session_id);
      await insertClickLog(pool, {
        utm_link_id: linkId,
        click_type,
        ...visitorInfo,
        is_unique: isUnique
      });
      await upsertDailyCounters(pool, linkId, isUnique);
      await updateLinkCounters(pool, linkId, isUnique);
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  })();

  // Fetch link data (cached) to build redirect URL
  const linkData = await getCachedLinkData(pool, linkId);

  // Build redirect URL from cached database data
  if (linkData && linkData.base_url) {
    const link = linkData;
    const url = new URL(link.base_url);
    if (link.source_code) url.searchParams.set('utm_source', link.source_code);
    if (link.medium_code) url.searchParams.set('utm_medium', link.medium_code);
    if (link.campaign_code) url.searchParams.set('utm_campaign', link.campaign_code);
    if (link.utm_name) url.searchParams.set('utm_name', link.utm_name);
    return NextResponse.redirect(url.toString());
  }

  // Fallback: if url param existed, redirect there
  if (redirect_url) {
    return NextResponse.redirect(decodeURIComponent(redirect_url));
  }
  
  // Return 1x1 transparent pixel for image-based tracking
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  
  return new Response(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

// Upsert daily counters into utm_clicks_daily
async function upsertDailyCounters(pool: any, utmLinkId: number, isUnique: boolean) {
  try {
    const [rows] = await pool.query(
      `SELECT source_id, medium_id FROM utm_links WHERE id = ? LIMIT 1`,
      [utmLinkId]
    );
    const link = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!link) return;
    await pool.query(
      `INSERT INTO utm_clicks_daily (utm_link_id, source_id, medium_id, date, clicks, unique_clicks)
       VALUES (?, ?, ?, CURDATE(), 1, ?)
       ON DUPLICATE KEY UPDATE
         clicks = clicks + 1,
         unique_clicks = unique_clicks + VALUES(unique_clicks)`,
      [utmLinkId, link.source_id, link.medium_id, isUnique ? 1 : 0]
    );
  } catch {}
}

// Extract visitor information from request
async function extractVisitorInfo(req: NextRequest) {
  const headers = req.headers;
  const ip = getClientIP(req);
  const userAgent = headers.get('user-agent') || '';
  const referrer = headers.get('referer') || '';
  
  // Parse user agent for device/browser info
  const deviceInfo = parseUserAgent(userAgent);
  
  // Generate session ID (simple hash of IP + User Agent + today's date)
  const sessionData = `${ip}-${userAgent}-${new Date().toDateString()}`;
  const sessionId = await generateSessionId(sessionData);
  
  return {
    ip_address: ip,
    user_agent: userAgent,
    referrer: referrer.substring(0, 500), // Limit length
    device_type: deviceInfo.device,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    session_id: sessionId
  };
}

// Get client IP address
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const remoteAddr = req.headers.get('remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (remoteAddr) {
    return remoteAddr;
  }
  
  return 'unknown';
}

// Simple user agent parsing
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  // Device detection
  let device = 'desktop';
  if (ua.includes('mobile') || ua.includes('android')) device = 'mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) device = 'tablet';
  else if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) device = 'bot';
  
  // Browser detection
  let browser = 'unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';
  
  // OS detection
  let os = 'unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  return { device, browser, os };
}

// Generate session ID
async function generateSessionId(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Check if visitor is unique for this link
async function checkUniqueVisitor(
  pool: any, 
  utmLinkId: number, 
  clickType: string, 
  sessionId: string
): Promise<boolean> {
  const [existing] = await pool.query(
    `SELECT id FROM click_logs 
     WHERE utm_link_id = ? AND click_type = ? AND session_id = ? 
     LIMIT 1`,
    [utmLinkId, clickType, sessionId]
  );
  
  return Array.isArray(existing) && existing.length === 0;
}

// Insert click log
async function insertClickLog(pool: any, data: any) {
  await pool.query(
    `INSERT INTO click_logs (
      utm_link_id, click_type, ip_address, user_agent, referrer,
      device_type, browser, os, is_unique, session_id, clicked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.utm_link_id,
      data.click_type,
      data.ip_address,
      data.user_agent,
      data.referrer,
      data.device_type,
      data.browser,
      data.os,
      data.is_unique,
      data.session_id
    ]
  );
}

// Update link counters
async function updateLinkCounters(pool: any, utmLinkId: number, isUnique: boolean) {
  try {
    // First, check if the columns exist
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'utm_links' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME IN ('total_clicks', 'unique_clicks', 'last_click_at')
    `);
    
    const existingColumns = Array.isArray(columns) ? columns.map((col: any) => col.COLUMN_NAME) : [];
    
    // Verify the UTM link exists
    const [linkCheck] = await pool.query(
      "SELECT id FROM utm_links WHERE id = ?",
      [utmLinkId]
    );
    
    if (!Array.isArray(linkCheck) || linkCheck.length === 0) {
      throw new Error(`UTM link with id ${utmLinkId} not found`);
    }
    
    // Update counters if columns exist
    if (existingColumns.includes('total_clicks') && existingColumns.includes('unique_clicks') && existingColumns.includes('last_click_at')) {
      // Update total clicks (always increment)
      await pool.query(
        "UPDATE utm_links SET total_clicks = COALESCE(total_clicks, 0) + 1 WHERE id = ?",
        [utmLinkId]
      );
      
      // Update unique clicks only if this is a unique click
      if (isUnique) {
        await pool.query(
          "UPDATE utm_links SET unique_clicks = COALESCE(unique_clicks, 0) + 1 WHERE id = ?",
          [utmLinkId]
        );
      }
      
      // Update last click timestamp
      await pool.query(
        "UPDATE utm_links SET last_click_at = NOW() WHERE id = ?",
        [utmLinkId]
      );
    }
  } catch (error) {
    console.error('Error updating link counters:', error);
    // Don't throw error to avoid breaking the redirect
  }
}
