import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Check if campaign exists
    const [rows] = await pool.query(
      "SELECT id FROM utm_campaigns WHERE id = ?",
      [id]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Delete the campaign
    await pool.query("DELETE FROM utm_campaigns WHERE id = ?", [id]);
    
    return NextResponse.json({ 
      success: true, 
      message: "Campaign deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting UTM campaign:", error);
    return NextResponse.json({ error: "Failed to delete UTM campaign" }, { status: 500 });
  }
}
