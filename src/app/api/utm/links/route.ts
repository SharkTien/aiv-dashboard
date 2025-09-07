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

  const pool = getDbPool();
  
  try {
    let query = `
      SELECT 
        ul.id,
        ul.entity_id,
        ul.campaign_id,
        ul.source_id,
        ul.medium_id,
        ul.utm_name,
        ul.shortened_url,
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
    
    // Add base_url to each link based on form_type
    const linksWithBaseUrl = links.map((link: any) => {
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

    // Insert UTM link (without base_url - will be determined from config when needed)
    const [result] = await pool.query(
      "INSERT INTO utm_links (entity_id, campaign_id, source_id, medium_id, utm_name) VALUES (?, ?, ?, ?, ?)",
      [entity_id, campaign_id, source_id, medium_id, utm_name || null]
    );
    
    const linkId = (result as any).insertId;
    
    // Get the created link with all details
    const [linkRows] = await pool.query(`
      SELECT 
        ul.id,
        ul.entity_id,
        ul.campaign_id,
        ul.source_id,
        ul.medium_id,
        ul.utm_name,
        ul.shortened_url,
        ul.created_at,
        e.name as entity_name,
        uc.code as campaign_code,
        uc.name as campaign_name,
        us.code as source_code,
        us.name as source_name,
        um.code as medium_code,
        um.name as medium_name
      FROM utm_links ul
      JOIN entity e ON ul.entity_id = e.entity_id
      JOIN utm_campaigns uc ON ul.campaign_id = uc.id
      JOIN utm_sources us ON ul.source_id = us.id
      JOIN utm_mediums um ON ul.medium_id = um.id
      WHERE ul.id = ?
    `, [linkId]);
    
    const createdLink = Array.isArray(linkRows) && linkRows.length > 0 ? linkRows[0] : null;
    
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