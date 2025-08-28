import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED: Record<string, { valueKey: string; labelKey: string }> = {
  entity: { valueKey: "entity_id", labelKey: "name" },
  user: { valueKey: "user_id", labelKey: "name" },
  uni_mapping: { valueKey: "uni_id", labelKey: "uni_name" },
};

export async function GET(
  req: NextRequest,
  { params }: { params: { table: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const table = params.table;
  const cfg = ALLOWED[table];
  if (!cfg) return NextResponse.json({ error: "Forbidden table" }, { status: 403 });

  const pool = getDbPool();
  const { valueKey, labelKey } = cfg;

  try {
    const [rows] = await pool.query(
      `SELECT ${valueKey} as value, ${labelKey} as label FROM ${table} ORDER BY ${labelKey} ASC`
    );
    const items = Array.isArray(rows) ? rows : [];
    const resp = NextResponse.json({ items });
    resp.headers.set("Content-Type", "application/json; charset=utf-8");
    return resp;
  } catch (error) {
    console.error("Error fetching datasource options:", error);
    return NextResponse.json({ error: "Failed to fetch datasource options" }, { status: 500 });
  }
}
