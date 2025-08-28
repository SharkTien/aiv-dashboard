import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  res.headers.set("Vary", "Origin");
  return res;
}

export async function OPTIONS() {
  return cors(NextResponse.json({}, { status: 204 }));
}

export async function GET() {
  const pool = getDbPool();
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    return cors(NextResponse.json({ ok: true, rows }));
  } catch (err: any) {
    console.error("[HealthDB] Error:", err?.message || err);
    return cors(NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 }));
  }
}
