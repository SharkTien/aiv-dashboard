import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const formId = Number(id);
  if (!formId || isNaN(formId)) {
    return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
  }

  const body = await req.json();
  const submissionIds: number[] = Array.isArray(body?.submissionIds) ? body.submissionIds : [];
  const updates: Record<string, string> = body?.updates || {};

  const allowedFields = ["utm_campaign", "utm_medium", "utm_source", "utm_content", "utm_id"] as const;
  const effectiveUpdates = Object.fromEntries(
    Object.entries(updates || {}).filter(([k, v]) => allowedFields.includes(k as any) && typeof v === "string")
  ) as Record<string, string>;

  if (submissionIds.length === 0 || Object.keys(effectiveUpdates).length === 0) {
    return NextResponse.json({ error: "submissionIds and at least one UTM field are required" }, { status: 400 });
  }

  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.query("START TRANSACTION");

    // Map field_name -> field_id for this form
    const names = Object.keys(effectiveUpdates);
    const [fieldRows] = await conn.query(
      `SELECT id, field_name FROM form_fields WHERE form_id = ? AND field_name IN (${names.map(() => "?").join(",")})`,
      [formId, ...names]
    );
    const fieldMap = new Map<string, number>();
    if (Array.isArray(fieldRows)) {
      for (const r of fieldRows as any[]) fieldMap.set(r.field_name, r.id);
    }

    // Ensure all missing fields exist? If a field is missing, skip it gracefully
    const entries = Object.entries(effectiveUpdates).filter(([fname]) => fieldMap.has(fname));
    if (entries.length === 0) {
      await conn.query("ROLLBACK");
      return NextResponse.json({ error: "No matching UTM fields found in this form" }, { status: 400 });
    }

    for (const submissionId of submissionIds) {
      for (const [fname, value] of entries) {
        const fieldId = fieldMap.get(fname)!;
        const [existing] = await conn.query(
          "SELECT id FROM form_responses WHERE submission_id = ? AND field_id = ? LIMIT 1",
          [submissionId, fieldId]
        );
        const list = Array.isArray(existing) ? (existing as any[]) : [];
        if (list.length > 0) {
          await conn.query("UPDATE form_responses SET value = ? WHERE id = ?", [value, list[0].id]);
        } else {
          await conn.query(
            "INSERT INTO form_responses (submission_id, field_id, value) VALUES (?, ?, ?)",
            [submissionId, fieldId, value]
          );
        }
      }
    }

    await conn.query("COMMIT");
    return NextResponse.json({ success: true, updated: submissionIds.length });
  } catch (error) {
    try { await conn.query("ROLLBACK"); } catch {}
    console.error("Bulk edit UTM failed:", error);
    return NextResponse.json({ error: "Failed to bulk edit UTM" }, { status: 500 });
  } finally {
    conn.release();
  }
}



