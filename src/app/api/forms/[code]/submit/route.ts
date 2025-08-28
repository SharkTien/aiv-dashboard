import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

const ALLOWED: Record<string, { valueKey: string; labelKey: string }> = {
  entity: { valueKey: "entity_id", labelKey: "name" },
  user: { valueKey: "user_id", labelKey: "name" },
  uni_mapping: { valueKey: "uni_id", labelKey: "uni_name" },
};

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Vary", "Origin");
  return res;
}

export async function OPTIONS() {
  const res = NextResponse.json({}, { status: 204 });
  return cors(res);
}

function stripCityPrefix(label: string) {
  const idx = label.indexOf(" - ");
  return idx >= 0 ? label.slice(idx + 3).trim() : label.trim();
}

function stripEnglishParen(label: string) {
  const idx = label.indexOf(" (");
  return idx >= 0 ? label.slice(0, idx).trim() : label.trim();
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const formCode = params.code;
  const body = await req.json();
  
  const pool = getDbPool();
  
  try {
    const [formRows] = await pool.query(
      "SELECT id FROM forms WHERE code = ?", 
      [formCode]
    );
    if (!Array.isArray(formRows) || (formRows as any).length === 0) {
      return cors(NextResponse.json({ error: "Form not found" }, { status: 404 }));
    }
    const formId = (formRows as any)[0].id;

    const [fieldRows] = await pool.query(
      "SELECT id, field_name, field_type, field_options FROM form_fields WHERE form_id = ? ORDER BY sort_order ASC",
      [formId]
    );
    const fields: Array<{ id: number; field_name: string; field_type: string; field_options: string | null }> = Array.isArray(fieldRows) ? (fieldRows as any) : [];
    const nameToField = new Map(fields.map(f => [f.field_name, f]));

    const [submissionResult] = await pool.query(
      "INSERT INTO form_submissions (form_id) VALUES (?)",
      [formId]
    );
    const submissionId = (submissionResult as any).insertId;

    for (const [key, rawValue] of Object.entries(body)) {
      const field = nameToField.get(key);
      if (!field) continue;
      let saveValue: any = rawValue;

      if (field.field_type === "database") {
        try {
          const cfg = field.field_options ? JSON.parse(field.field_options) : null;
          const source = cfg?.source as string | undefined;
          const ds = source ? ALLOWED[source] : undefined;
          const rawLabel = typeof rawValue === "string" ? rawValue.trim() : "";
          if (ds && rawLabel) {
            let [rows] = await pool.query(
              `SELECT ${ds.valueKey} AS value FROM ${source} WHERE ${ds.labelKey} = ? LIMIT 1`,
              [rawLabel]
            );
            let list = Array.isArray(rows) ? (rows as any) : [];
            if (list.length === 0) {
              [rows] = await pool.query(
                `SELECT ${ds.valueKey} AS value, ${ds.labelKey} AS label FROM ${source} WHERE ${ds.labelKey} LIKE ? ORDER BY CHAR_LENGTH(${ds.labelKey}) DESC LIMIT 1`,
                ["%" + rawLabel + "%"]
              );
              list = Array.isArray(rows) ? (rows as any) : [];
            }
            if (list.length === 0) {
              const noParen = stripEnglishParen(rawLabel);
              if (noParen && noParen !== rawLabel) {
                [rows] = await pool.query(
                  `SELECT ${ds.valueKey} AS value, ${ds.labelKey} AS label FROM ${source} WHERE ${ds.labelKey} LIKE ? ORDER BY CHAR_LENGTH(${ds.labelKey}) DESC LIMIT 1`,
                  ["%" + noParen + "%"]
                );
                list = Array.isArray(rows) ? (rows as any) : [];
              }
            }
            if (list.length === 0) {
              const noCity = stripCityPrefix(rawLabel);
              if (noCity && noCity !== rawLabel) {
                [rows] = await pool.query(
                  `SELECT ${ds.valueKey} AS value, ${ds.labelKey} AS label FROM ${source} WHERE ${ds.labelKey} LIKE ? ORDER BY CHAR_LENGTH(${ds.labelKey}) DESC LIMIT 1`,
                  ["%" + noCity + "%"]
                );
                list = Array.isArray(rows) ? (rows as any) : [];
              }
            }
            if (list.length > 0 && list[0].value != null) {
              saveValue = String(list[0].value);
            }
          }
        } catch {}
      }

      await pool.query(
        "INSERT INTO form_responses (submission_id, field_id, value) VALUES (?, ?, ?)",
        [submissionId, field.id, saveValue]
      );
    }

    const res = NextResponse.json({ success: true, submission_id: submissionId });
    return cors(res);
  } catch (error) {
    console.error("Error submitting form:", error);
    return cors(NextResponse.json({ error: "Failed to submit form" }, { status: 500 }));
  }
}
