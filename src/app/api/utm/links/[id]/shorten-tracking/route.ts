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

  const { shortenedUrl, shortIoId } = await req.json();
  if (!shortenedUrl) {
    return NextResponse.json({ error: "Shortened URL is required" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Check ownership for non-admin users
    const [rows] = await pool.query("SELECT entity_id FROM utm_links WHERE id = ?", [linkId]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "UTM link not found" }, { status: 404 });
    }
    const linkEntityId = (rows[0] as any).entity_id as number;
    if (user.role !== 'admin' && user.entity_id !== linkEntityId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update tracking_short_url and short_io_tracking_id
    await pool.query(
      "UPDATE utm_links SET tracking_short_url = ?, short_io_tracking_id = ? WHERE id = ?",
      [shortenedUrl, shortIoId || null, linkId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tracking shortened URL:", error);
    return NextResponse.json({ error: "Failed to update tracking shortened URL" }, { status: 500 });
  }
}
