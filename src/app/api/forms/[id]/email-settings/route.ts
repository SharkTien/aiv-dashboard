import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function ensureTable(pool: any) {
  // Create table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS form_email_settings (
      form_id INT NOT NULL PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      subject VARCHAR(255) NULL,
      html LONGTEXT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_form_email_settings_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  
  // Add missing columns if table exists but is missing columns
  try {
    await pool.query(`ALTER TABLE form_email_settings ADD COLUMN IF NOT EXISTS html LONGTEXT NULL`);
  } catch (e) {
    // Column might already exist, ignore error
  }
  
  try {
    await pool.query(`ALTER TABLE form_email_settings ADD COLUMN IF NOT EXISTS subject VARCHAR(255) NULL`);
  } catch (e) {
    // Column might already exist, ignore error
  }
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
      `SELECT enabled, subject, html FROM form_email_settings WHERE form_id = ? LIMIT 1`,
      [formId]
    );
    const row = Array.isArray(rows) && rows.length > 0 ? (rows as any)[0] : { enabled: 0, subject: null, html: null };
    return NextResponse.json({ success: true, settings: row });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load email settings' }, { status: 500 });
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
    const enabled = !!body.enabled;
    const subject = typeof body.subject === 'string' ? body.subject.slice(0, 255) : null;
    const html = typeof body.html === 'string' ? body.html : null;

    await ensureTable(pool);
    await pool.query(
      `INSERT INTO form_email_settings (form_id, enabled, subject, html)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), subject = VALUES(subject), html = VALUES(html)`,
      [formId, enabled ? 1 : 0, subject, html]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Email Settings] PUT error:', e);
    return NextResponse.json({ success: false, error: 'Failed to save email settings', details: (e as any)?.message || String(e) }, { status: 500 });
  }
}


