import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: formId } = await ctx.params;
  const pool = getDbPool();
  
  try {
    // Verify form exists
    const [formRows] = await pool.query("SELECT id, name, type FROM forms WHERE id = ?", [formId]);
    if (!Array.isArray(formRows) || (formRows as any).length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const form = (formRows as any)[0];

    // Get all UTM campaigns for this form with submission counts
    const [campaignsResult] = await pool.query(`
      SELECT 
        uc.code,
        uc.name,
        uc.entity_id,
        e.name as entity_name,
        COUNT(fs.id) as submission_count
      FROM utm_campaigns uc
      LEFT JOIN entity e ON uc.entity_id = e.entity_id
      LEFT JOIN form_submissions fs ON fs.form_id = uc.form_id 
        AND fs.duplicated = FALSE
        AND EXISTS (
          SELECT 1 FROM form_responses fr
          JOIN form_fields ff ON fr.field_id = ff.id
          WHERE fr.submission_id = fs.id 
            AND ff.field_name = 'utm_campaign' 
            AND fr.value = uc.code
        )
      WHERE uc.form_id = ?
      GROUP BY uc.code, uc.name, uc.entity_id, e.name
      ORDER BY e.name, uc.name
    `, [formId]);

    const campaigns = Array.isArray(campaignsResult) ? campaignsResult : [];

    // Get all unique UTM values from form responses for additional options
    const [utmValuesResult] = await pool.query(`
      SELECT DISTINCT fr.value as utm_value
      FROM form_responses fr
      JOIN form_fields ff ON fr.field_id = ff.id
      JOIN form_submissions fs ON fr.submission_id = fs.id
      WHERE fs.form_id = ? 
        AND ff.field_name = 'utm_campaign' 
        AND fr.value IS NOT NULL 
        AND fr.value != ''
        AND fs.duplicated = FALSE
      ORDER BY fr.value
    `, [formId]);

    const utmValues = Array.isArray(utmValuesResult) ? utmValuesResult : [];

    // Combine campaigns and unique UTM values
    const allOptions = new Map();
    
    // Add campaigns
    campaigns.forEach((campaign: any) => {
      const key = campaign.code;
      if (!allOptions.has(key)) {
        allOptions.set(key, {
          value: campaign.code,
          label: `${campaign.name} (${campaign.entity_name || 'Unknown'})`,
          count: campaign.submission_count,
          entity_id: campaign.entity_id,
          entity_name: campaign.entity_name
        });
      }
    });

    // Add unique UTM values that aren't already in campaigns
    utmValues.forEach((utm: any) => {
      const key = utm.utm_value;
      if (!allOptions.has(key)) {
        allOptions.set(key, {
          value: utm.utm_value,
          label: utm.utm_value,
          count: 0,
          entity_id: null,
          entity_name: null
        });
      }
    });

    const options = Array.from(allOptions.values());

    return NextResponse.json({
      success: true,
      data: {
        form,
        options
      }
    });

  } catch (error) {
    console.error('Error fetching UTM campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UTM campaigns' },
      { status: 500 }
    );
  }
}
