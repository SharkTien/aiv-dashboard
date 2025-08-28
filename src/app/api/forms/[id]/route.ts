import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: formId } = await ctx.params;
  const pool = getDbPool();
  
  try {
    const [rows] = await pool.query(
      "SELECT id, code, name, created_at, updated_at FROM forms WHERE id = ?",
      [formId]
    );
    
    if (!Array.isArray(rows) || (rows as any).length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    const form: any = (rows as any)[0];
    
    const response = NextResponse.json({ form });
    response.headers.set('Content-Type', 'application/json; charset=utf-8');
    return response;
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}
