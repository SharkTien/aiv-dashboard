import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

const ALLOWED: Record<string, { valueKey: string; labelKey: string }> = {
  entity: { valueKey: "entity_id", labelKey: "name" },
  user: { valueKey: "user_id", labelKey: "name" },
  uni_mapping: { valueKey: "uni_id", labelKey: "uni_name" },
};

const ALLOWED_ORIGINS = new Set([
  "https://www.aiesec.vn",
  "https://aiv-dashboard-ten.vercel.app",
  "http://localhost:3000",
]);

function withCors(res: NextResponse, req?: NextRequest) {
  const origin = req?.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "*";
  const requestedHeaders = req?.headers.get("access-control-request-headers");
  res.headers.set("Access-Control-Allow-Origin", allowOrigin);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    requestedHeaders || "Content-Type, Authorization"
  );
  res.headers.set("Access-Control-Max-Age", "86400");
  res.headers.set("Vary", "Origin");
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const res = NextResponse.json({}, { status: 204 });
  return withCors(res, req);
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
  ctx: { params: Promise<{ code: string }> }
) {
  const { code: formCode } = await ctx.params;
  const body = await req.json();
  
  const pool = getDbPool();
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();

    const [formRows] = await conn.query(
      "SELECT id FROM forms WHERE code = ?",
      [formCode]
    );
    if (!Array.isArray(formRows) || (formRows as any).length === 0) {
      await conn.rollback();
      conn.release();
      return withCors(NextResponse.json({ error: "Form not found" }, { status: 404 }), req);
    }
    const formId = (formRows as any)[0].id as number;

    const [fieldRows] = await conn.query(
      "SELECT id, field_name, field_type, field_options FROM form_fields WHERE form_id = ? ORDER BY sort_order ASC",
      [formId]
    );
    const fields: Array<{ id: number; field_name: string; field_type: string; field_options: string | null }> = Array.isArray(fieldRows) ? (fieldRows as any) : [];
    const nameToField = new Map(fields.map(f => [f.field_name, f]));
    
    console.log("Form fields:", fields.map(f => ({ name: f.field_name, type: f.field_type, options: f.field_options })));
    console.log("Available field names:", Array.from(nameToField.keys()));

    // 1) Create submission row. If your schema has created_at default, omit explicit column
    const [submissionResult] = await conn.query(
      "INSERT INTO form_submissions (form_id) VALUES (?)",
      [formId]
    );
    const submissionId = (submissionResult as any).insertId as number;
    console.log(`Created submission with ID: ${submissionId}`);

    // Track uni value (uni_id) if provided
    let uniIdFromPayload: string | number | null = null;
    console.log("=== Starting form submission processing ===");
    console.log("Form body:", JSON.stringify(body, null, 2));

    // 2) Save responses
    console.log("=== Processing form fields ===");
    for (const [key, rawValue] of Object.entries(body)) {
      console.log(`Processing field: "${key}" = "${rawValue}"`);
      const field = nameToField.get(key);
      if (!field) {
        console.log(`Field "${key}" not found in form definition, skipping`);
        continue;
      }
      let saveValue: any = rawValue;
      
      // Debug logging for uni field
      if (key === "uni") {
        console.log(`Field "uni" details:`, {
          field_name: field.field_name,
          field_type: field.field_type,
          field_options: field.field_options,
          rawValue: rawValue
        });
      }

      if (field.field_type === "database") {
        try {
          const cfg = field.field_options ? JSON.parse(field.field_options) : null;
          const source = cfg?.source as string | undefined;
          const ds = source ? ALLOWED[source] : undefined;
          const rawLabel = typeof rawValue === "string" ? rawValue.trim() : "";
          if (ds && rawLabel) {
            let [rows] = await conn.query(
              `SELECT ${ds.valueKey} AS value FROM ${source} WHERE ${ds.labelKey} = ? LIMIT 1`,
              [rawLabel]
            );
            let list = Array.isArray(rows) ? (rows as any) : [];
            if (list.length === 0) {
              [rows] = await conn.query(
                `SELECT ${ds.valueKey} AS value, ${ds.labelKey} AS label FROM ${source} WHERE ${ds.labelKey} LIKE ? ORDER BY CHAR_LENGTH(${ds.labelKey}) DESC LIMIT 1`,
                ["%" + rawLabel + "%"]
              );
              list = Array.isArray(rows) ? (rows as any) : [];
            }
            if (list.length === 0) {
              const noParen = stripEnglishParen(rawLabel);
              if (noParen && noParen !== rawLabel) {
                [rows] = await conn.query(
                  `SELECT ${ds.valueKey} AS value, ${ds.labelKey} AS label FROM ${source} WHERE ${ds.labelKey} LIKE ? ORDER BY CHAR_LENGTH(${ds.labelKey}) DESC LIMIT 1`,
                  ["%" + noParen + "%"]
                );
                list = Array.isArray(rows) ? (rows as any) : [];
              }
            }
            if (list.length === 0) {
              const noCity = stripCityPrefix(rawLabel);
              if (noCity && noCity !== rawLabel) {
                [rows] = await conn.query(
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

      // Handle uni field - convert uni_name to uni_id (for all cases)
      if (key === "uni" && saveValue != null && saveValue !== "") {
        console.log(`Processing uni field: "${saveValue}" (field_type: ${field.field_type})`);
        
        // If it's already a number (uni_id), use it directly
        if (!isNaN(Number(saveValue)) && Number(saveValue) > 0) {
          console.log(`Value "${saveValue}" is already a uni_id, using directly`);
          uniIdFromPayload = Number(saveValue);
        } else {
          // It's a uni_name, need to map to uni_id
          const uniName = String(saveValue).trim();
          if (uniName) {
            // Try to find uni_id by uni_name
            const [uniRows] = await conn.query(
              "SELECT uni_id FROM uni_mapping WHERE uni_name = ? LIMIT 1",
              [uniName]
            );
            const uniList = Array.isArray(uniRows) ? (uniRows as any) : [];
            console.log(`Uni mapping query result for "${uniName}":`, uniList);
            
            if (uniList.length > 0 && uniList[0].uni_id != null) {
              // Found matching uni_name, save uni_id
              const originalValue = saveValue;
              saveValue = String(uniList[0].uni_id);
              uniIdFromPayload = uniList[0].uni_id;
              console.log(`Mapped "${originalValue}" to uni_id: ${saveValue}`);
            } else {
              // No matching uni_name found, save as "other--uni-2"
              const originalValue = saveValue;
              saveValue = "other--uni-2";
              uniIdFromPayload = null;
              console.log(`No mapping found for "${originalValue}", saved as: ${saveValue}`);
            }
          }
        }
      }



      // Debug logging for uni field
      if (key === "uni") {
        console.log(`Saving uni field value: "${saveValue}" for field_id: ${field.id}`);
      }
      
      await conn.query(
        "INSERT INTO form_responses (submission_id, field_id, value) VALUES (?, ?, ?)",
        [submissionId, field.id, saveValue]
      );
    }

    // 3-5) Map uni_id -> entity_id and update submission
    console.log(`Final uniIdFromPayload: ${uniIdFromPayload}`);
    if (uniIdFromPayload != null) {
      console.log(`Looking up entity_id for uni_id: ${uniIdFromPayload}`);
      const [mapRows] = await conn.query(
        "SELECT entity_id FROM uni_mapping WHERE uni_id = ? LIMIT 1",
        [uniIdFromPayload]
      );
      const list = Array.isArray(mapRows) ? (mapRows as any) : [];
      console.log(`Entity mapping result:`, list);
      if (list.length > 0 && list[0].entity_id != null) {
        console.log(`Updating submission ${submissionId} with entity_id: ${list[0].entity_id}`);
        await conn.query(
          "UPDATE form_submissions SET entity_id = ? WHERE id = ?",
          [list[0].entity_id, submissionId]
        );
        console.log(`Successfully updated entity_id for submission ${submissionId}`);
      } else {
        console.log(`No entity_id found for uni_id: ${uniIdFromPayload}`);
      }
    } else {
      console.log(`uniIdFromPayload is null, skipping entity mapping`);
    }

    await conn.commit();

    const res = NextResponse.json({ success: true, submission_id: submissionId });
    return withCors(res, req);
  } catch (error) {
    try { await conn.rollback(); } catch {}
    console.error("Error submitting form:", error);
    return withCors(NextResponse.json({ error: "Failed to submit form" }, { status: 500 }), req);
  } finally {
    conn.release();
  }
}
