import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ hubType: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { hubType } = await ctx.params;
  
  if (!['oGV', 'TMR'].includes(hubType)) {
    return NextResponse.json({ error: "Invalid hub type. Must be 'oGV' or 'TMR'" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    const [rows] = await pool.query(
      `SELECT base_url FROM utm_base_urls WHERE hub_type = ?`,
      [hubType]
    );
    
    // Get config value or use default
    const baseUrl = Array.isArray(rows) && rows.length > 0 
      ? (rows[0] as any).base_url 
      : hubType === 'oGV' 
        ? "https://www.aiesec.vn/globalvolunteer/home"
        : "https://www.aiesec.vn/join-aiesec-fall-2025";
    
    return NextResponse.json({ base_url: baseUrl });
  } catch (error) {
    console.error("Error fetching base URL config:", error);
    // Return default URLs if database query fails
    const defaultUrl = hubType === 'oGV' 
      ? "https://www.aiesec.vn/globalvolunteer/home"
      : "https://www.aiesec.vn/join-aiesec-fall-2025";
    return NextResponse.json({ base_url: defaultUrl });
  }
}
