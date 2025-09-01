import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const pool = getDbPool();
    
    const [campaigns] = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        created_at,
        updated_at
      FROM utm_campaigns 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      items: campaigns
    });

  } catch (error) {
    console.error('Error fetching UTM campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UTM campaigns' },
      { status: 500 }
    );
  }
}
