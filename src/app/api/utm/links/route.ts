import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 500);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const offset = (page - 1) * limit;
  const typeFilter = searchParams.get("type"); // 'TMR' | 'oGV' | 'EWA' | null
  const entityFilter = searchParams.get("entity_id");

  const pool = getDbPool();
  
  try {
    // First, let's check total UTM links in database (raw count)
    const [totalUtmLinks] = await pool.query('SELECT COUNT(*) as total FROM utm_links');
    
    // Check how many have valid JOINs
    const [validJoins] = await pool.query(`
      SELECT COUNT(*) as total FROM utm_links ul
      JOIN entity e ON ul.entity_id = e.entity_id
      JOIN utm_campaigns uc ON ul.campaign_id = uc.id
      JOIN forms f ON uc.form_id = f.id
      JOIN utm_sources us ON ul.source_id = us.id
      JOIN utm_mediums um ON ul.medium_id = um.id
    `);
    
    let query = `
      SELECT 
        ul.id,
        ul.entity_id,
        ul.campaign_id,
        ul.source_id,
        ul.medium_id,
        ul.utm_name,
        ul.base_url,
        ul.shortened_url,
        ul.tracking_link,
        ul.tracking_short_url,
        ul.created_at,
        e.name as entity_name,
        uc.code as campaign_code,
        uc.name as campaign_name,
        us.code as source_code,
        us.name as source_name,
        um.code as medium_code,
        um.name as medium_name,
        f.type as form_type
      FROM utm_links ul
      JOIN entity e ON ul.entity_id = e.entity_id
      JOIN utm_campaigns uc ON ul.campaign_id = uc.id
      JOIN forms f ON uc.form_id = f.id
      JOIN utm_sources us ON ul.source_id = us.id
      JOIN utm_mediums um ON ul.medium_id = um.id
    `;

    const params: any[] = [];
    const whereClauses: string[] = [];
    
    // If user is not admin, only show their entity's UTM links
    if (user.role !== 'admin') {
      whereClauses.push("ul.entity_id = ?");
      params.push(user.entity_id);
    } else if (entityFilter) {
      whereClauses.push("ul.entity_id = ?");
      params.push(Number(entityFilter));
    }

    if (typeFilter && ["oGV","TMR","EWA"].includes(typeFilter)) {
      whereClauses.push("f.type = ?");
      params.push(typeFilter);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }
    
    query += " ORDER BY ul.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    
    const [rows] = await pool.query(query, params);
    const links = Array.isArray(rows) ? rows : [];
    

    // Get base URLs from config and add to each link
    const [baseUrlRows] = await pool.query(
      `SELECT hub_type, base_url FROM utm_base_urls`
    );
    const baseUrls = Array.isArray(baseUrlRows) ? baseUrlRows as any[] : [];
    
    // Default URLs
    const defaultUrls = {
      oGV: "https://www.aiesec.vn/globalvolunteer/home",
      TMR: "https://www.aiesec.vn/join-aiesec-fall-2025"
    };
    
    // Use base_url from utm_links if available, otherwise fall back to config
    const linksWithBaseUrl = links.map((link: any) => {
      // If link already has base_url saved, use that (snapshot)
      if (link.base_url) {
        return link;
      }
      
      // Otherwise fall back to current config (for legacy links)
      const hubType = link.form_type === 'TMR' ? 'TMR' : 'oGV';
      const configUrl = baseUrls.find((url: any) => url.hub_type === hubType)?.base_url;
      return {
        ...link,
        base_url: configUrl || defaultUrls[hubType as keyof typeof defaultUrls]
      };
    });

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total FROM utm_links ul
      JOIN utm_campaigns uc ON ul.campaign_id = uc.id
      JOIN forms f ON uc.form_id = f.id
    `;
    const countParams: any[] = [];
    const countWhere: string[] = [];

    if (user.role !== 'admin') {
      countWhere.push("ul.entity_id = ?");
      countParams.push(user.entity_id);
    } else if (entityFilter) {
      countWhere.push("ul.entity_id = ?");
      countParams.push(Number(entityFilter));
    }
    if (typeFilter && ["oGV","TMR","EWA"].includes(typeFilter)) {
      countWhere.push("f.type = ?");
      countParams.push(typeFilter);
    }
    if (countWhere.length > 0) {
      countQuery += " WHERE " + countWhere.join(" AND ");
    }

    
    const [countRows] = await pool.query(countQuery, countParams);
    const total = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).total : 0;
    
    
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      items: linksWithBaseUrl,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching UTM links:", error);
    return NextResponse.json({ error: "Failed to fetch UTM links" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  const { entity_id, campaign_id, source_id, medium_id, utm_name, hub_type } = body || {};
  
  if (!entity_id || !campaign_id || !source_id || !medium_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // If user is not admin, they can only create UTM links for their own entity
  if (user.role !== 'admin' && user.entity_id !== entity_id) {
    return NextResponse.json({ error: "You can only create UTM links for your own entity" }, { status: 403 });
  }

  const pool = getDbPool();
  
  try {
    // Check if medium requires name
    const [mediumRows] = await pool.query(
      "SELECT name_required FROM utm_mediums WHERE id = ?",
      [medium_id]
    );
    
    if (Array.isArray(mediumRows) && mediumRows.length > 0) {
      const medium = mediumRows[0] as any;
      if (medium.name_required && !utm_name) {
        return NextResponse.json({ error: "UTM name is required for this medium" }, { status: 400 });
      }
    }

    // Get base_url from utm_base_urls based on campaign type first
    const [campaignRows] = await pool.query(`
      SELECT f.type 
      FROM utm_campaigns uc 
      JOIN forms f ON uc.form_id = f.id 
      WHERE uc.id = ?
    `, [campaign_id]);
    
    const campaignData = Array.isArray(campaignRows) && campaignRows.length > 0 ? campaignRows[0] as any : null;
    const hubType = campaignData?.type === 'TMR' ? 'TMR' : 'oGV';
    
    // Get current base_url from config
    const [baseUrlRows] = await pool.query(
      "SELECT base_url FROM utm_base_urls WHERE hub_type = ?",
      [hubType]
    );
    
    const defaultUrls = {
      oGV: "https://www.aiesec.vn/globalvolunteer/home",
      TMR: "https://www.aiesec.vn/join-aiesec-fall-2025"
    };
    
    const configUrl = Array.isArray(baseUrlRows) && baseUrlRows.length > 0 ? (baseUrlRows[0] as any).base_url : null;
    const snapshotBaseUrl = configUrl || defaultUrls[hubType as keyof typeof defaultUrls];
    
    
    // Insert UTM link WITH base_url snapshot
    const [result] = await pool.query(
      "INSERT INTO utm_links (entity_id, campaign_id, source_id, medium_id, utm_name, base_url) VALUES (?, ?, ?, ?, ?, ?)",
      [entity_id, campaign_id, source_id, medium_id, utm_name || null, snapshotBaseUrl]
    );
    
    const linkId = (result as any).insertId;
    
    // Generate tracking link
    const trackingLink = generateTrackingLink(linkId, snapshotBaseUrl);
    
    // Update UTM link with tracking_link
    await pool.query(
      "UPDATE utm_links SET tracking_link = ? WHERE id = ?",
      [trackingLink, linkId]
    );
    
    // Auto-shorten the tracking link
    try {
      const baseUrl = process.env.BACKEND_HOST || process.env.NEXT_PUBLIC_APP_URL || 'https://aiv-dashboard-ten.vercel.app';
      const shortResponse = await fetch(`${baseUrl}/api/url-shortener`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: trackingLink,
          alias: `utm-${linkId}`
        })
      });
      
      if (shortResponse.ok) {
        const shortData = await shortResponse.json();
        await pool.query(
          "UPDATE utm_links SET tracking_short_url = ? WHERE id = ?",
          [shortData.shortenedUrl, linkId]
        );
      }
    } catch (error) {
      // silent
      // Continue without shortened URL
    }
    
    // Get the created link with all details including base_url
    const [linkRows] = await pool.query(`
      SELECT 
        ul.id,
        ul.entity_id,
        ul.campaign_id,
        ul.source_id,
        ul.medium_id,
        ul.utm_name,
        ul.base_url,
        ul.shortened_url,
        ul.tracking_link,
        ul.tracking_short_url,
        ul.created_at,
        e.name as entity_name,
        uc.code as campaign_code,
        uc.name as campaign_name,
        us.code as source_code,
        us.name as source_name,
        um.code as medium_code,
        um.name as medium_name,
        f.type as form_type
      FROM utm_links ul
      JOIN entity e ON ul.entity_id = e.entity_id
      JOIN utm_campaigns uc ON ul.campaign_id = uc.id
      JOIN forms f ON uc.form_id = f.id
      JOIN utm_sources us ON ul.source_id = us.id
      JOIN utm_mediums um ON ul.medium_id = um.id
      WHERE ul.id = ?
    `, [linkId]);
    
    const createdLinkRaw = Array.isArray(linkRows) && linkRows.length > 0 ? linkRows[0] : null;
    
    if (!createdLinkRaw) {
      return NextResponse.json({ error: "Failed to retrieve created link" }, { status: 500 });
    }

    // Link already has base_url from the snapshot we saved
    const createdLink = createdLinkRaw;
    
    return NextResponse.json({ 
      success: true, 
      link: createdLink
    });
  } catch (error) {
    console.error("Error creating UTM link:", error);
    return NextResponse.json({ error: "Failed to create UTM link" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");
  const id = Number(idParam);
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const pool = getDbPool();
  try {
    // Check ownership for non-admin users
    const [rows] = await pool.query("SELECT entity_id FROM utm_links WHERE id = ?", [id]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "UTM link not found" }, { status: 404 });
    }
    const linkEntityId = (rows[0] as any).entity_id as number;
    if (user.role !== 'admin' && user.entity_id !== linkEntityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await pool.query("DELETE FROM utm_links WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting UTM link:", error);
    return NextResponse.json({ error: "Failed to delete UTM link" }, { status: 500 });
  }
}

// Helper function to generate tracking link
function generateTrackingLink(utmLinkId: number, originalUrl: string): string {
  const baseUrl = process.env.BACKEND_HOST || process.env.NEXT_PUBLIC_APP_URL || 'https://aiv-dashboard-ten.vercel.app';
  const trackingUrl = `${baseUrl}/api/utm/track?id=${utmLinkId}&url=${encodeURIComponent(originalUrl)}`;
  return trackingUrl;
}