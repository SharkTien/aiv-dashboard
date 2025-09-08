import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

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
    const isUnique = await checkUniqueVisitor(pool, utm_link_id, click_type, visitorInfo.sessionId);
    
    // Insert click log
    await insertClickLog(pool, {
      utm_link_id,
      click_type,
      ...visitorInfo,
      is_unique: isUnique
    });
    
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

  // Track the click
  try {
    const pool = getDbPool();
    const visitorInfo = await extractVisitorInfo(req);
    const isUnique = await checkUniqueVisitor(pool, parseInt(utm_link_id), click_type, visitorInfo.sessionId);
    
    await insertClickLog(pool, {
      utm_link_id: parseInt(utm_link_id),
      click_type,
      ...visitorInfo,
      is_unique: isUnique
    });
    
    await updateLinkCounters(pool, parseInt(utm_link_id), isUnique);
  } catch (error) {
    console.error('Error tracking click:', error);
    // Don't fail the redirect if tracking fails
  }
  
  // Redirect to original URL if provided
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

// Update link counters - skip for now since columns don't exist yet
async function updateLinkCounters(pool: any, utmLinkId: number, isUnique: boolean) {
  // TODO: Add total_clicks, unique_clicks, last_click_at columns to utm_links table
  // For now, we just track in click_logs and can calculate counts from there
  
  // Verify the UTM link exists
  const [linkCheck] = await pool.query(
    "SELECT id FROM utm_links WHERE id = ?",
    [utmLinkId]
  );
  
  if (!Array.isArray(linkCheck) || linkCheck.length === 0) {
    throw new Error(`UTM link with id ${utmLinkId} not found`);
  }
  
}
