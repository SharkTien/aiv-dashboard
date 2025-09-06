import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function ensureTable(pool: any) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS form_duplicate_settings (
      form_id INT NOT NULL,
      field_id INT NOT NULL,
      PRIMARY KEY (form_id, field_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: formId } = await ctx.params;
  const pool = getDbPool();
  try {
    await ensureTable(pool);
    const [rows] = await pool.query(
      `SELECT field_id FROM form_duplicate_settings WHERE form_id = ?`,
      [formId]
    );
    const fieldIds = Array.isArray(rows) ? (rows as any[]).map(r => r.field_id) : [];
    return NextResponse.json({ success: true, fieldIds });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: formId } = await ctx.params;
  const pool = getDbPool();
  try {
    const body = await req.json();
    const fieldIds: number[] = Array.isArray(body.fieldIds) ? body.fieldIds.filter((n: any) => Number.isFinite(n)) : [];
    await ensureTable(pool);
    await pool.query('START TRANSACTION');
    await pool.query(`DELETE FROM form_duplicate_settings WHERE form_id = ?`, [formId]);
    if (fieldIds.length > 0) {
      const values = fieldIds.map((fid) => [formId, fid]);
      await pool.query(`INSERT INTO form_duplicate_settings (form_id, field_id) VALUES ?`, [values]);
    }
    await pool.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (e) {
    try { await (getDbPool()).query('ROLLBACK'); } catch {}
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}


