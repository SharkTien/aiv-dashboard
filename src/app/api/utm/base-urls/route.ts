import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pool = getDbPool();
  
  try {
    const [rows] = await pool.query(
      `SELECT hub_type, base_url, updated_at 
       FROM utm_base_urls 
       ORDER BY hub_type`
    );
    
    const baseUrls = Array.isArray(rows) ? rows as any[] : [];
    
    // Default config values
    const defaultUrls = {
      oGV: "https://www.aiesec.vn/globalvolunteer/home",
      TMR: "https://www.aiesec.vn/join-aiesec-fall-2025"
    };
    
    // Return current config values
    const result = {
      oGV: baseUrls.find((url: any) => url.hub_type === 'oGV')?.base_url || defaultUrls.oGV,
      TMR: baseUrls.find((url: any) => url.hub_type === 'TMR')?.base_url || defaultUrls.TMR
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching base URLs:", error);
    return NextResponse.json({ error: "Failed to fetch base URLs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { hub_type, base_url } = await req.json();
    
    if (!hub_type || !base_url) {
      return NextResponse.json({ error: "Hub type and base URL are required" }, { status: 400 });
    }
    
    if (!['oGV', 'TMR'].includes(hub_type)) {
      return NextResponse.json({ error: "Invalid hub type. Must be 'oGV' or 'TMR'" }, { status: 400 });
    }
    
    // Validate URL format
    try {
      new URL(base_url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }
    
    const pool = getDbPool();
    
    // Update config value (hub_type is primary key)
    const [result] = await pool.query(
      `INSERT INTO utm_base_urls (hub_type, base_url) 
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE 
       base_url = VALUES(base_url), 
       updated_at = NOW()`,
      [hub_type, base_url]
    );
    
    return NextResponse.json({ 
      success: true, 
      message: `Base URL for ${hub_type} updated successfully` 
    });
  } catch (error) {
    console.error("Error updating base URL:", error);
    return NextResponse.json({ error: "Failed to update base URL" }, { status: 500 });
  }
}
