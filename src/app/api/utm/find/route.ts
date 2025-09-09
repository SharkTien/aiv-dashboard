import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

// Find UTM link by UTM parameters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pool = getDbPool();
  
  try {
    // Extract UTM parameters
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');
    const utmContent = searchParams.get('utm_content');
    const utmTerm = searchParams.get('utm_term');
    const utmName = searchParams.get('utm_name');
    
    // Must have at least source, medium, and campaign
    if (!utmSource || !utmMedium || !utmCampaign) {
      return NextResponse.json(
        { error: "Missing required UTM parameters (source, medium, campaign)" },
        { status: 400 }
      );
    }
    
    // Build query to find matching UTM link
    let query = `
      SELECT ul.id as utm_link_id, ul.utm_name, ul.base_url, ul.shortened_url,
             ul.tracking_link, ul.tracking_short_url
      FROM utm_links ul
      JOIN utm_campaigns uc ON ul.campaign_id = uc.id
      JOIN utm_sources us ON ul.source_id = us.id  
      JOIN utm_mediums um ON ul.medium_id = um.id
      WHERE uc.code = ? AND us.code = ? AND um.code = ?
    `;
    
    const params = [utmCampaign, utmSource, utmMedium];
    
    // Add optional UTM name filter if provided
    if (utmName) {
      query += " AND ul.utm_name = ?";
      params.push(utmName);
    }
    
    // Add content and term filters if available
    if (utmContent) {
      query += " AND ul.utm_content = ?";
      params.push(utmContent);
    }
    
    if (utmTerm) {
      query += " AND ul.utm_term = ?";
      params.push(utmTerm);
    }
    
    query += " ORDER BY ul.created_at DESC LIMIT 1";
    
    const [results] = await pool.query(query, params);
    const links = Array.isArray(results) ? results : [];
    
    if (links.length === 0) {
      return NextResponse.json({
        success: false,
        message: "UTM link not found"
      });
    }
    
    const link = links[0] as any;
    
    return NextResponse.json({
      success: true,
      utm_link_id: link.utm_link_id,
      utm_name: link.utm_name,
      original_url: link.base_url,
      shortened_url: link.shortened_url,
      tracking_link: link.tracking_link,
      tracking_short_url: link.tracking_short_url
    });
    
  } catch (error) {
    console.error('Error finding UTM link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to find UTM link' },
      { status: 500 }
    );
  }
}

// Create or update UTM link tracking
export async function POST(req: NextRequest) {
  const pool = getDbPool();
  
  try {
    const body = await req.json();
    const { 
      utm_source, 
      utm_medium, 
      utm_campaign,
      utm_content,
      utm_term,
      utm_name,
      base_url,
      entity_id,
      auto_create = false
    } = body;
    
    // Validate required fields
    if (!utm_source || !utm_medium || !utm_campaign || !base_url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // First try to find existing link
    const existingLink = await findExistingUTMLink(pool, {
      utm_source,
      utm_medium, 
      utm_campaign,
      utm_content,
      utm_term,
      utm_name,
      base_url
    });
    
    if (existingLink) {
      return NextResponse.json({
        success: true,
        utm_link_id: existingLink.id,
        message: "Found existing UTM link"
      });
    }
    
    // If auto_create is enabled, create new UTM link
    if (auto_create && entity_id) {
      const newLinkId = await createUTMLink(pool, {
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        utm_name,
        base_url,
        entity_id
      });
      
      return NextResponse.json({
        success: true,
        utm_link_id: newLinkId,
        message: "Created new UTM link"
      });
    }
    
    return NextResponse.json({
      success: false,
      message: "UTM link not found and auto_create is disabled"
    });
    
  } catch (error) {
    console.error('Error creating/finding UTM link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process UTM link' },
      { status: 500 }
    );
  }
}

// Helper function to find existing UTM link
async function findExistingUTMLink(pool: any, params: any) {
  try {
    let query = `
      SELECT ul.* 
      FROM utm_links ul
      JOIN utm_campaigns uc ON ul.campaign_id = uc.id
      JOIN utm_sources us ON ul.source_id = us.id
      JOIN utm_mediums um ON ul.medium_id = um.id
      WHERE uc.code = ? AND us.code = ? AND um.code = ? AND ul.base_url = ?
    `;
    
    const queryParams = [
      params.utm_campaign,
      params.utm_source, 
      params.utm_medium,
      params.base_url
    ];
    
    if (params.utm_name) {
      query += " AND ul.utm_name = ?";
      queryParams.push(params.utm_name);
    }
    
    if (params.utm_content) {
      query += " AND ul.utm_content = ?";
      queryParams.push(params.utm_content);
    }
    
    if (params.utm_term) {
      query += " AND ul.utm_term = ?";
      queryParams.push(params.utm_term);
    }
    
    query += " LIMIT 1";
    
    const [results] = await pool.query(query, queryParams);
    const links = Array.isArray(results) ? results : [];
    
    return links.length > 0 ? links[0] : null;
  } catch (error) {
    console.error('Error finding existing UTM link:', error);
    return null;
  }
}

// Helper function to create new UTM link
async function createUTMLink(pool: any, params: any): Promise<number> {
  // This is a simplified version - in production you'd want to:
  // 1. Find or create campaign, source, medium records
  // 2. Handle proper validation and error checking
  // 3. Generate shortened URL if needed
  
  // Build UTM parameters for the base_url
  const utmParams = new URLSearchParams();
  utmParams.set('campaign_id', params.utm_campaign || '');
  utmParams.set('source_id', params.utm_source || '');
  utmParams.set('medium_id', params.utm_medium || '');
  if (params.utm_name && params.utm_name.trim() !== '') {
    utmParams.set('utm_name', params.utm_name.trim());
  }
  
  // Append UTM parameters to base_url
  const separator = params.base_url.includes('?') ? '&' : '?';
  const fullBaseUrl = `${params.base_url}${separator}${utmParams.toString()}`;
  
  const [result] = await pool.query(
    `INSERT INTO utm_links (
      entity_id, campaign_id, source_id, medium_id,
      utm_name, base_url,
      created_at
    ) VALUES (?, 1, 1, 1, ?, ?, NOW())`,
    [
      params.entity_id,
      params.utm_name || '',
      fullBaseUrl
    ]
  );
  
  return (result as any).insertId;
}
