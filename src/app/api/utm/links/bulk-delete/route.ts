import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let ids: number[] = [];
  try {
    const body = await req.json();
    ids = Array.isArray(body?.ids) ? body.ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : [];
  } catch {}

  if (!ids.length) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  const pool = getDbPool();
  const deleted: number[] = [];
  const failed: Array<{ id: number; error: string }> = [];

  for (const id of ids) {
    try {
      const [rows] = await pool.query("SELECT id, entity_id, short_io_id FROM utm_links WHERE id = ?", [id]);
      if (!Array.isArray(rows) || rows.length === 0) {
        failed.push({ id, error: "not_found" });
        continue;
      }
      const row = rows[0] as any;
      if (user.role !== 'admin' && user.entity_id !== row.entity_id) {
        failed.push({ id, error: "forbidden" });
        continue;
      }

      // Try to delete on Short.io if available
      try {
        const apiKey = process.env.SHORT_IO_API_KEY;
        const apiBase = process.env.SHORT_IO_API_BASE || 'https://api.short.io';
        const shortId = row.short_io_id;
        if (apiKey && shortId) {
          await fetch(`${apiBase}/links/${encodeURIComponent(shortId)}`, {
            method: 'DELETE',
            headers: { Authorization: apiKey },
          });
        }
      } catch {}

      await pool.query("DELETE FROM utm_links WHERE id = ?", [id]);
      deleted.push(id);
    } catch (e: any) {
      failed.push({ id, error: e?.message || 'delete_failed' });
    }
  }

  return NextResponse.json({ success: true, deleted, failed });
}


