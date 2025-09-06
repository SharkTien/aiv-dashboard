import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const linkId = Number(id);
  if (!linkId || isNaN(linkId)) {
    return NextResponse.json({ error: "Invalid link ID" }, { status: 400 });
  }

  const { alias } = await req.json();
  if (!alias) {
    return NextResponse.json({ error: "Alias is required" }, { status: 400 });
  }

  // Validate alias format (alphanumeric, hyphens, underscores only)
  if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
    return NextResponse.json({ 
      error: "Alias can only contain letters, numbers, hyphens, and underscores" 
    }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Check ownership for non-admin users
    const [rows] = await pool.query("SELECT entity_id, base_url FROM utm_links WHERE id = ?", [linkId]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "UTM link not found" }, { status: 404 });
    }
    const link = rows[0] as any;
    if (user.role !== 'admin' && user.entity_id !== link.entity_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate UTM URL (we need to reconstruct the full UTM URL)
    const [linkDetails] = await pool.query(`
      SELECT 
        ul.entity_id,
        ul.campaign_id,
        ul.source_id,
        ul.medium_id,
        ul.utm_name,
        ul.base_url,
        uc.code as campaign_code,
        us.code as source_code,
        um.code as medium_code,
        e.name as entity_name
      FROM utm_links ul
      JOIN utm_campaigns uc ON ul.campaign_id = uc.id
      JOIN utm_sources us ON ul.source_id = us.id
      JOIN utm_mediums um ON ul.medium_id = um.id
      JOIN entity e ON ul.entity_id = e.entity_id
      WHERE ul.id = ?
    `, [linkId]);

    if (!Array.isArray(linkDetails) || linkDetails.length === 0) {
      return NextResponse.json({ error: "Link details not found" }, { status: 404 });
    }

    const details = linkDetails[0] as any;
    
    // Build UTM URL
    const utmUrl = new URL(details.base_url);
    utmUrl.searchParams.set('utm_source', details.source_code);
    utmUrl.searchParams.set('utm_medium', details.medium_code);
    utmUrl.searchParams.set('utm_campaign', details.campaign_code);
    if (details.utm_name) {
      utmUrl.searchParams.set('utm_name', details.utm_name);
    }

    // First, try to delete the old shortened URL if it exists
    const shortApiKey = process.env.SHORT_IO_API_KEY;
    
    if (shortApiKey) {
      try {
        // Get short_io_id from database
        const [linkRows] = await pool.query("SELECT short_io_id FROM utm_links WHERE id = ?", [linkId]);
        if (Array.isArray(linkRows) && linkRows.length > 0) {
          const shortIoId = (linkRows[0] as any).short_io_id;
          
          if (shortIoId) {
            console.log(`Deleting old Short.io link with ID: ${shortIoId}`);
            
            // Delete the old link using short_io_id
            const deleteResponse = await fetch(`https://api.short.io/links/${shortIoId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': shortApiKey,
              },
            });
            
            if (deleteResponse.ok) {
              console.log(`Successfully deleted old Short.io link: ${shortIoId}`);
            } else {
              const errorData = await deleteResponse.json();
              console.warn(`Failed to delete old Short.io link ${shortIoId}:`, errorData);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to delete old shortened URL:', error);
        // Continue with creating new link even if deletion fails
      }
    }

    // Create new shortened URL with custom alias using Short.io API
    const shortDomain = process.env.SHORT_IO_DOMAIN || 'aiesecvn.short.gy';

    if (!shortApiKey) {
      return NextResponse.json(
        { error: 'Short.io API key not configured' },
        { status: 500 }
      );
    }

    const shortResponse = await fetch('https://api.short.io/links', {
      method: 'POST',
      headers: {
        'Authorization': shortApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalURL: utmUrl.toString(),
        domain: shortDomain,
        path: alias,
        allowDuplicates: false
      }),
    });

    if (!shortResponse.ok) {
      const errorData = await shortResponse.json();
      if (errorData.message && errorData.message.includes('already exists')) {
        return NextResponse.json({ 
          error: 'This alias is already taken. Please choose a different one.' 
        }, { status: 400 });
      }
      throw new Error(`Short.io API error: ${errorData.message || 'Unknown error'}`);
    }

    const shortData = await shortResponse.json();

    if (!shortData.shortURL) {
      throw new Error('Invalid response from Short.io API');
    }

    // Update shortened_url and short_io_id in database
    await pool.query(
      "UPDATE utm_links SET shortened_url = ?, short_io_id = ? WHERE id = ?",
      [shortData.shortURL, shortData.idString, linkId]
    );

    return NextResponse.json({ 
      success: true, 
      shortenedUrl: shortData.shortURL 
    });
  } catch (error) {
    console.error("Error updating alias:", error);
    return NextResponse.json({ 
      error: `Failed to update alias: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
