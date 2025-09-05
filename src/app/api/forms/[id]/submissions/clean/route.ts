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
    // Get all submissions with duplicated = false
    const [submissionsResult] = await pool.query(`
      SELECT 
        fs.id,
        fs.timestamp,
        fs.entity_id,
        e.name as entity_name,
        f.code as form_code,
        phone.value as phone_value,
        email.value as email_value,
        utm.value as utm_campaign_value,
        uc.name as utm_campaign_name
      FROM form_submissions fs
      LEFT JOIN entity e ON fs.entity_id = e.entity_id
      LEFT JOIN forms f ON fs.form_id = f.id
      LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
        AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
      LEFT JOIN form_responses email ON fs.id = email.submission_id 
        AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
      LEFT JOIN form_responses utm ON fs.id = utm.submission_id 
        AND utm.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'utm_campaign')
      LEFT JOIN utm_campaigns uc ON utm.value = uc.code
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
      ORDER BY fs.timestamp DESC
      ${getUnlimited ? '' : 'LIMIT ? OFFSET ?'}
    `, getUnlimited ? [formId, formId, formId, formId] : [formId, formId, formId, formId, limit, offset]);

    const submissions = Array.isArray(submissionsResult) ? submissionsResult : [];

    // Get total count of non-duplicated submissions
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM form_submissions fs
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
    `, [formId]);

    const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult[0] as any).total : 0;

    // Get responses for each submission
    const submissionIds = submissions.map((s: any) => s.id);
    let submissionsWithResponses: Array<{
      id: any;
      timestamp: any;
      entityId: any;
      entityName: any;
      formCode: any;
      utmCampaign: any;
      utmCampaignName: any;
      responses: Record<string, string>;
    }> = submissions.map((s: any) => ({
      id: s.id,
      timestamp: s.timestamp,
      entityId: s.entity_id,
      entityName: s.entity_name,
      formCode: s.form_code,
      utmCampaign: s.utm_campaign_value,
      utmCampaignName: s.utm_campaign_name,
      responses: {}
    }));

    if (submissionIds.length > 0) {
      const [responsesResult] = await pool.query(`
        SELECT 
          fr.submission_id,
          ff.field_name, 
          ff.field_label, 
          ff.field_type,
          fr.value,
          CASE 
            WHEN fr.value = 'other--uni-2' THEN NULL
            WHEN fr.value = 'other--uni' THEN 'uni'
            WHEN um.uni_name IS NOT NULL THEN um.uni_name
            ELSE fr.value
          END AS value_label
        FROM form_responses fr
        JOIN form_fields ff ON fr.field_id = ff.id
        LEFT JOIN uni_mapping um
          ON ff.field_name = 'uni'
          AND fr.value = um.uni_id
        WHERE fr.submission_id IN (${submissionIds.map(() => '?').join(',')})
        ORDER BY fr.submission_id, ff.sort_order ASC
      `, submissionIds);

      const responses = Array.isArray(responsesResult) ? responsesResult : [];
      
      // Group responses by submission_id into a field_name -> value map
      const responsesBySubmission = new Map<number, Record<string, string>>();
      responses.forEach((response: any) => {
        const subId = response.submission_id as number;
        if (!responsesBySubmission.has(subId)) {
          responsesBySubmission.set(subId, {});
        }
        const bucket = responsesBySubmission.get(subId)!;
        bucket[response.field_name] = response.value_label ?? response.value ?? "";
      });

      // Assign responses to submissions
      submissionsWithResponses = submissionsWithResponses.map((submission: any) => ({
        id: submission.id,
        timestamp: submission.timestamp,
        entityId: submission.entityId,
        entityName: submission.entityName,
        formCode: submission.formCode,
        utmCampaign: submission.utmCampaign,
        utmCampaignName: submission.utmCampaignName,
        responses: responsesBySubmission.get(submission.id) || {}
      }));
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
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

  } catch (error) {
    console.error("Error fetching clean submissions:", error);
    return NextResponse.json({ error: "Failed to fetch clean submissions" }, { status: 500 });
  }
}
