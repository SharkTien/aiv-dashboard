import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const ALLOWED: Record<string, { valueKey: string; labelKey: string }> = {
  entity: { valueKey: "entity_id", labelKey: "name" },
  user: { valueKey: "user_id", labelKey: "name" },
  uni_mapping: { valueKey: "uni_id", labelKey: "uni_name" },
};

// Allowlist CORS origins; configurable via env: ALLOWED_ORIGINS="https://site1.com,https://site2.com"
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "https://www.aiesec.vn,https://aiv-dashboard-ten.vercel.app,http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

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
    

    // 1) Create submission row with duplicated flag
    const [submissionResult] = await conn.query(
      "INSERT INTO form_submissions (form_id, duplicated) VALUES (?, FALSE)",
      [formId]
    );
    const submissionId = (submissionResult as any).insertId as number;

    // Track uni value (uni_id) if provided
    let uniIdFromPayload: string | number | null = null;

    // 2) Save responses
    for (const [key, rawValue] of Object.entries(body)) {
      const field = nameToField.get(key);
      if (!field) {
        continue;
      }
      let saveValue: any = rawValue;
      
      // Debug logging for uni field
      if (key === "uni") {
        // no-op for now; keep hook for potential future logging
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
        
        // If it's already a number (uni_id), use it directly
        if (!isNaN(Number(saveValue)) && Number(saveValue) > 0) {
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
            
            if (uniList.length > 0 && uniList[0].uni_id != null) {
              // Found matching uni_name, save uni_id
              const originalValue = saveValue;
              saveValue = String(uniList[0].uni_id);
              uniIdFromPayload = uniList[0].uni_id;
            } else {
              // No matching uni_name found, save the original university name
              const originalValue = saveValue;
              saveValue = String(originalValue).trim();
              uniIdFromPayload = null;
            }
          }
        }
      }

      // Handle otheruni field from Webflow - preserve the value as-is for manual allocation
      if (key === "otheruni" && saveValue != null && saveValue !== "") {
        // Keep the original value for otheruni field
        // This field is used for manual allocation and should not be converted
        saveValue = String(saveValue).trim();
      }

      // Debug logging for uni field
      if (key === "uni") {
      }
      
      await conn.query(
        "INSERT INTO form_responses (submission_id, field_id, value) VALUES (?, ?, ?)",
        [submissionId, field.id, saveValue]
      );
    }

    // 3) Check for duplicates after saving responses
    let phone: string | null = null;
    let email: string | null = null;
    let displayName: string | null = null;
    
    // Get phone and email values from form_responses
    const [phoneResult] = await conn.query(`
      SELECT fr.value 
      FROM form_responses fr
      JOIN form_fields ff ON fr.field_id = ff.id
      WHERE fr.submission_id = ? AND ff.field_name = 'phone'
      LIMIT 1
    `, [submissionId]);
    
    const [emailResult] = await conn.query(`
      SELECT fr.value 
      FROM form_responses fr
      JOIN form_fields ff ON fr.field_id = ff.id
      WHERE fr.submission_id = ? AND ff.field_name = 'email'
      LIMIT 1
    `, [submissionId]);
    // Get name if present
    const [nameResult] = await conn.query(`
      SELECT fr.value 
      FROM form_responses fr
      JOIN form_fields ff ON fr.field_id = ff.id
      WHERE fr.submission_id = ? AND ff.field_name IN ('name','full_name')
      ORDER BY CASE ff.field_name WHEN 'name' THEN 0 ELSE 1 END
      LIMIT 1
    `, [submissionId]);
    
    if (Array.isArray(phoneResult) && phoneResult.length > 0) {
      phone = (phoneResult[0] as any).value;
    }
    if (Array.isArray(emailResult) && emailResult.length > 0) {
      email = (emailResult[0] as any).value;
    }
    if (Array.isArray(nameResult) && nameResult.length > 0) {
      displayName = String((nameResult[0] as any).value || '').trim() || null;
    }
    
    // Check for duplicates
    if (phone || email) {
      const duplicateConditions = [];
      const duplicateParams = [];
      
      if (phone) {
        duplicateConditions.push(`
          EXISTS (
            SELECT 1 FROM form_responses fr2
            JOIN form_fields ff2 ON fr2.field_id = ff2.id
            WHERE fr2.submission_id = fs2.id 
              AND ff2.field_name = 'phone' 
              AND fr2.value = ?
          )
        `);
        duplicateParams.push(phone);
      }
      if (email) {
        duplicateConditions.push(`
          EXISTS (
            SELECT 1 FROM form_responses fr2
            JOIN form_fields ff2 ON fr2.field_id = ff2.id
            WHERE fr2.submission_id = fs2.id 
              AND ff2.field_name = 'email' 
              AND fr2.value = ?
          )
        `);
        duplicateParams.push(email);
      }
      
      const [duplicateRows] = await conn.query(
        `SELECT fs2.id FROM form_submissions fs2
         WHERE fs2.form_id = ? AND fs2.id != ? AND (${duplicateConditions.join(' OR ')})`,
        [formId, submissionId, ...duplicateParams]
      );
      
      if (Array.isArray(duplicateRows) && (duplicateRows as any).length > 0) {
        const ids = (duplicateRows as any[]).map(r => r.id).filter((id: any) => id != null);
        if (ids.length > 0) {
          // Mark all older matching submissions as duplicated, keep newest (current) as not duplicated
          await conn.query(
            `UPDATE form_submissions SET duplicated = TRUE WHERE id IN (${ids.map(() => '?').join(',')})`,
            ids
          );
        }
      }
    }

    // 4) Map uni_id -> entity_id and update submission
    let entityId = null;
    
    if (uniIdFromPayload != null) {
      const [mapRows] = await conn.query(
        "SELECT entity_id FROM uni_mapping WHERE uni_id = ? LIMIT 1",
        [uniIdFromPayload]
      );
      const list = Array.isArray(mapRows) ? (mapRows as any) : [];
      if (list.length > 0 && list[0].entity_id != null) {
        entityId = list[0].entity_id;
      } else {
      }
    }
    
    // Do NOT assign organic automatically; leave entity_id as NULL when no mapping is found
    
    // Update submission with entity_id
    if (entityId != null) {
      await conn.query(
        "UPDATE form_submissions SET entity_id = ? WHERE id = ?",
        [entityId, submissionId]
      );
    } else {
    }

    await conn.commit();

    // Send confirmation email (best-effort, non-blocking for response)
    try {
      // Fetch email value from saved responses if not already available
      if (!email) {
        const [emailRows] = await pool.query(
          `SELECT fr.value 
           FROM form_responses fr
           JOIN form_fields ff ON fr.field_id = ff.id
           WHERE fr.submission_id = ? AND ff.field_name = 'email'
           LIMIT 1`,
          [submissionId]
        );
        if (Array.isArray(emailRows) && emailRows.length > 0) {
          email = (emailRows[0] as any).value;
        }
      }

      const toEmail = (email || "").trim();
      if (toEmail) {
        // Load per-form email settings
        const [settingsRows] = await pool.query(
          `SELECT enabled, subject, html FROM form_email_settings WHERE form_id = ? LIMIT 1`,
          [formId]
        );
        const settings = Array.isArray(settingsRows) && settingsRows.length > 0 ? (settingsRows as any)[0] : null;
        if (settings && settings.enabled) {
          // Build a map of all submission field values for placeholder replacement
          const [respRows] = await pool.query(`
            SELECT ff.field_name, COALESCE(fr.value, '') AS value
            FROM form_responses fr
            JOIN form_fields ff ON fr.field_id = ff.id
            WHERE fr.submission_id = ?
          `, [submissionId]);
          const values: Record<string, string> = {};
          if (Array.isArray(respRows)) {
            for (const r of respRows as any[]) {
              const key = String(r.field_name || '').trim();
              if (key) values[key] = String(r.value ?? '');
            }
          }
          // Backward compat shortcuts
          if (displayName && !values['name']) values['name'] = displayName;
          if (email && !values['email']) values['email'] = email;

          // Prepare subject/html and replace placeholders like [field_name]
          let subject = settings.subject || "AIESEC in Vietnam | We have received Your Application for Recruitment Event";
          let html = typeof settings.html === 'string' ? settings.html : "";

          const tokenRegex = /\[([a-zA-Z0-9_]+)\]/g;
          const replacer = (_match: string, key: string) => {
            const k = String(key || '').trim();
            return Object.prototype.hasOwnProperty.call(values, k) ? values[k] : _match;
          };
          subject = subject.replace(tokenRegex, replacer);
          html = html.replace(tokenRegex, replacer);

          await sendEmail({ to: toEmail, subject, html });
        }
      }
    } catch (e) {
      console.warn("[Submit] Failed to send confirmation email:", (e as any)?.message || e);
    }

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
