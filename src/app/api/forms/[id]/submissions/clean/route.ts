import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const formId = Number(id);
  if (!formId || isNaN(formId)) {
    return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const getUnlimited = searchParams.get("unlimited") === "true";
  const limit = getUnlimited ? 999999 : Math.min(Number(searchParams.get("limit") || 20), 500);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const offset = (page - 1) * limit;

  const pool = getDbPool();

  try {
    // Get total count of non-duplicated submissions
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM form_submissions fs
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
    `, [formId]);

    const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult[0] as any).total : 0;

    // Get all submissions with responses in a single optimized query
    const [submissionsResult] = await pool.query(`
      SELECT 
        fs.id,
        fs.timestamp,
        fs.entity_id,
        e.name as entity_name,
        f.code as form_code,
        ff.field_name,
        fr.value,
        ff.field_label,
        ff.field_type,
        ff.sort_order,
        CASE 
          WHEN fr.value = 'other--uni-2' THEN NULL
          WHEN fr.value = 'other--uni' THEN 'uni'
          WHEN um.uni_name IS NOT NULL THEN um.uni_name
          ELSE fr.value
        END AS value_label,
        utm_campaign.value as utm_campaign_value,
        uc.name as utm_campaign_name
      FROM form_submissions fs
      LEFT JOIN entity e ON fs.entity_id = e.entity_id
      LEFT JOIN forms f ON fs.form_id = f.id
      LEFT JOIN form_responses fr ON fs.id = fr.submission_id
      LEFT JOIN form_fields ff ON fr.field_id = ff.id
      LEFT JOIN uni_mapping um
        ON ff.field_name = 'uni'
        AND fr.value = um.uni_id
      LEFT JOIN form_responses utm_campaign ON fs.id = utm_campaign.submission_id 
        AND utm_campaign.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'utm_campaign')
      LEFT JOIN utm_campaigns uc ON utm_campaign.value = uc.code
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
      ORDER BY fs.timestamp DESC, ff.sort_order ASC
      ${getUnlimited ? '' : 'LIMIT ? OFFSET ?'}
    `, getUnlimited ? [formId, formId] : [formId, formId, limit, offset]);

    const rows = Array.isArray(submissionsResult) ? submissionsResult : [];
    
    // Group submissions and responses
    const submissionsMap = new Map();
    
    rows.forEach((row: any) => {
      if (!submissionsMap.has(row.id)) {
        submissionsMap.set(row.id, {
          id: row.id,
          timestamp: row.timestamp,
          entityId: row.entity_id,
          entityName: row.entity_name,
          formCode: row.form_code,
          utmCampaign: row.utm_campaign_value,
          utmCampaignName: row.utm_campaign_name,
          responses: []
        });
      }
      
      // Add response if field data exists
      if (row.field_name) {
        const existingResponse = submissionsMap.get(row.id).responses.find((r: any) => r.field_name === row.field_name);
        if (!existingResponse) {
          submissionsMap.get(row.id).responses.push({
            field_name: row.field_name,
            field_label: row.field_label,
            value: row.value ?? "",
            value_label: row.value_label
          });
        }
      }
    });
    
    const submissionsWithResponses = Array.from(submissionsMap.values());

    const totalPages = Math.ceil(total / limit);

    const response = NextResponse.json({
      items: submissionsWithResponses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
    // Cache for 1 minute
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
    
    return response;

  } catch (error) {
    console.error("Error fetching clean submissions:", error);
    return NextResponse.json({ error: "Failed to fetch clean submissions" }, { status: 500 });
  }
}
