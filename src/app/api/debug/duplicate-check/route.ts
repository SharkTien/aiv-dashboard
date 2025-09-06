import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const formId = searchParams.get('formId');

  if (!formId) {
    return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // 1. Check duplicate settings for this form
    const [dupSettingsRows] = await pool.query(
      `SELECT fds.field_id, ff.field_name, ff.field_label
       FROM form_duplicate_settings fds
       JOIN form_fields ff ON fds.field_id = ff.id
       WHERE fds.form_id = ?`,
      [formId]
    );
    const duplicateSettings = Array.isArray(dupSettingsRows) ? dupSettingsRows : [];

    // 2. Get all submissions with their responses
    const [submissionRows] = await pool.query(
      `SELECT fs.id, fs.timestamp, fs.duplicated, fs.entity_id, e.name as entity_name
       FROM form_submissions fs
       LEFT JOIN entity e ON fs.entity_id = e.entity_id
       WHERE fs.form_id = ?
       ORDER BY fs.timestamp DESC`,
      [formId]
    );
    const submissions = Array.isArray(submissionRows) ? submissionRows : [];

    // 3. Get responses for duplicate fields
    let duplicateFieldResponses: any[] = [];
    if (duplicateSettings.length > 0) {
      const fieldIds = duplicateSettings.map((s: any) => s.field_id);
      const [responseRows] = await pool.query(
        `SELECT fr.submission_id, fr.field_id, fr.value, ff.field_name
         FROM form_responses fr
         JOIN form_fields ff ON fr.field_id = ff.id
         WHERE fr.field_id IN (${fieldIds.map(() => '?').join(',')})
         ORDER BY fr.submission_id, fr.field_id`,
        fieldIds
      );
      duplicateFieldResponses = Array.isArray(responseRows) ? responseRows : [];
    }

    // 4. Analyze duplicates
    const duplicateAnalysis: any = {
      totalSubmissions: submissions.length,
      duplicatedSubmissions: submissions.filter((s: any) => s.duplicated === 1).length,
      duplicateSettings: duplicateSettings,
      potentialDuplicates: []
    };

    if (duplicateSettings.length > 0) {
      // Group responses by submission
      const submissionResponses = new Map();
      duplicateFieldResponses.forEach((resp: any) => {
        if (!submissionResponses.has(resp.submission_id)) {
          submissionResponses.set(resp.submission_id, {});
        }
        submissionResponses.get(resp.submission_id)[resp.field_name] = resp.value;
      });

      // Find potential duplicates
      const groups: { [key: string]: any[] } = {};
      submissions.forEach((sub: any) => {
        const responses = submissionResponses.get(sub.id) || {};
        const key = duplicateSettings.map((setting: any) => {
          const fieldName = setting.field_name;
          return String(responses[fieldName] || '').trim();
        }).join('|');
        
        if (key && !key.includes('||')) { // Only if not all empty
          if (!groups[key]) groups[key] = [];
          groups[key].push(sub);
        }
      });

      // Identify groups with multiple submissions
      Object.entries(groups).forEach(([key, groupSubmissions]) => {
        if (groupSubmissions.length > 1) {
          const sorted = groupSubmissions.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          duplicateAnalysis.potentialDuplicates.push({
            key,
            totalCount: groupSubmissions.length,
            submissions: sorted.map((s: any) => ({
              id: s.id,
              timestamp: s.timestamp,
              duplicated: s.duplicated,
              entity_name: s.entity_name
            }))
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      formId: parseInt(formId),
      analysis: duplicateAnalysis
    });

  } catch (error) {
    console.error('Error analyzing duplicates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze duplicates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId, fieldIds } = await request.json();

  if (!formId || !Array.isArray(fieldIds)) {
    return NextResponse.json({ error: "Form ID and field IDs are required" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Update duplicate settings
    await pool.query('START TRANSACTION');
    
    // Clear existing settings
    await pool.query('DELETE FROM form_duplicate_settings WHERE form_id = ?', [formId]);
    
    // Insert new settings
    if (fieldIds.length > 0) {
      const values = fieldIds.map((fieldId: number) => [formId, fieldId]);
      await pool.query(
        'INSERT INTO form_duplicate_settings (form_id, field_id) VALUES ?',
        [values]
      );
    }
    
    await pool.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Updated duplicate settings for form ${formId} with ${fieldIds.length} fields`
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating duplicate settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update duplicate settings' },
      { status: 500 }
    );
  }
}
