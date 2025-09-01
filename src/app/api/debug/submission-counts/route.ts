import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const formId = searchParams.get("formId");

  if (!formId) {
    return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // 1. Total submissions without any filtering
    const [totalSubmissionsResult] = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM form_submissions 
      WHERE form_id = ?
    `, [formId]);
    const totalSubmissions = Array.isArray(totalSubmissionsResult) && totalSubmissionsResult.length > 0 ? (totalSubmissionsResult[0] as any).total_count : 0;

    // 2. Submissions with UTM campaigns (any)
    const [utmSubmissionsResult] = await pool.query(`
      SELECT COUNT(DISTINCT fs.id) as utm_count
      FROM form_submissions fs
      JOIN form_responses fr ON fs.id = fr.submission_id
      JOIN form_fields ff ON fr.field_id = ff.id
      WHERE fs.form_id = ? 
        AND ff.field_name = 'utm_campaign' 
        AND fr.value IS NOT NULL 
        AND TRIM(fr.value) != ''
    `, [formId]);
    const utmSubmissions = Array.isArray(utmSubmissionsResult) && utmSubmissionsResult.length > 0 ? (utmSubmissionsResult[0] as any).utm_count : 0;

         // 3. Submissions without UTM campaigns OR UTM campaigns not in database (organic)
     const [organicSubmissionsResult] = await pool.query(`
       SELECT COUNT(DISTINCT fs.id) as organic_count
       FROM form_submissions fs
       LEFT JOIN form_responses utm ON fs.id = utm.submission_id 
         AND utm.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'utm_campaign')
       LEFT JOIN utm_campaigns uc ON utm.value = uc.code
       WHERE fs.form_id = ? 
         AND (utm.value IS NULL OR utm.value = '' OR uc.code IS NULL)
     `, [formId, formId]);
    const organicSubmissions = Array.isArray(organicSubmissionsResult) && organicSubmissionsResult.length > 0 ? (organicSubmissionsResult[0] as any).organic_count : 0;

    // 4. Clean submissions (with deduplication)
    const [cleanSubmissionsResult] = await pool.query(`
      WITH RankedSubmissions AS (
        SELECT 
          fs.id,
          ROW_NUMBER() OVER (
            PARTITION BY 
              CASE 
                WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
                WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
                ELSE CONCAT('unique_', fs.id)
              END
            ORDER BY fs.timestamp DESC
          ) as rn
        FROM form_submissions fs
        LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
          AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
        LEFT JOIN form_responses email ON fs.id = email.submission_id 
          AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
        WHERE fs.form_id = ?
      )
      SELECT COUNT(*) as clean_count
      FROM RankedSubmissions 
      WHERE rn = 1
    `, [formId, formId, formId]);
    const cleanSubmissions = Array.isArray(cleanSubmissionsResult) && cleanSubmissionsResult.length > 0 ? (cleanSubmissionsResult[0] as any).clean_count : 0;

         // 5. Clean submissions with valid UTM campaigns (in database)
     const [cleanUtmSubmissionsResult] = await pool.query(`
       WITH RankedSubmissions AS (
         SELECT 
           fs.id,
           ROW_NUMBER() OVER (
             PARTITION BY 
               CASE 
                 WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
                 WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
                 ELSE CONCAT('unique_', fs.id)
               END
             ORDER BY fs.timestamp DESC
           ) as rn
         FROM form_submissions fs
         JOIN form_responses fr ON fs.id = fr.submission_id
         JOIN form_fields ff ON fr.field_id = ff.id
         JOIN utm_campaigns uc ON fr.value = uc.code
         LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
           AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
         LEFT JOIN form_responses email ON fs.id = email.submission_id 
           AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
         WHERE fs.form_id = ? 
           AND ff.field_name = 'utm_campaign' 
           AND fr.value IS NOT NULL 
           AND TRIM(fr.value) != ''
       )
       SELECT COUNT(*) as clean_utm_count
       FROM RankedSubmissions 
       WHERE rn = 1
     `, [formId, formId, formId]);
    const cleanUtmSubmissions = Array.isArray(cleanUtmSubmissionsResult) && cleanUtmSubmissionsResult.length > 0 ? (cleanUtmSubmissionsResult[0] as any).clean_utm_count : 0;

         // 6. Clean submissions without UTM campaigns OR UTM campaigns not in database (organic)
     const [cleanOrganicSubmissionsResult] = await pool.query(`
       WITH RankedSubmissions AS (
         SELECT 
           fs.id,
           ROW_NUMBER() OVER (
             PARTITION BY 
               CASE 
                 WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
                 WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
                 ELSE CONCAT('unique_', fs.id)
               END
             ORDER BY fs.timestamp DESC
           ) as rn
         FROM form_submissions fs
         LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
           AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
         LEFT JOIN form_responses email ON fs.id = email.submission_id 
           AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
         LEFT JOIN form_responses utm ON fs.id = utm.submission_id 
           AND utm.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'utm_campaign')
         LEFT JOIN utm_campaigns uc ON utm.value = uc.code
         WHERE fs.form_id = ? 
           AND (utm.value IS NULL OR utm.value = '' OR uc.code IS NULL)
       )
       SELECT COUNT(*) as clean_organic_count
       FROM RankedSubmissions 
       WHERE rn = 1
     `, [formId, formId, formId, formId]);
    const cleanOrganicSubmissions = Array.isArray(cleanOrganicSubmissionsResult) && cleanOrganicSubmissionsResult.length > 0 ? (cleanOrganicSubmissionsResult[0] as any).clean_organic_count : 0;

    // 7. Duplicate submissions (submissions that would be removed by deduplication)
    const [duplicateSubmissionsResult] = await pool.query(`
      WITH RankedSubmissions AS (
        SELECT 
          fs.id,
          ROW_NUMBER() OVER (
            PARTITION BY 
              CASE 
                WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
                WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
                ELSE CONCAT('unique_', fs.id)
              END
            ORDER BY fs.timestamp DESC
          ) as rn
        FROM form_submissions fs
        LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
          AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
        LEFT JOIN form_responses email ON fs.id = email.submission_id 
          AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
        WHERE fs.form_id = ?
      )
      SELECT COUNT(*) as duplicate_count
      FROM RankedSubmissions 
      WHERE rn > 1
    `, [formId, formId, formId]);
         const duplicateSubmissions = Array.isArray(duplicateSubmissionsResult) && duplicateSubmissionsResult.length > 0 ? (duplicateSubmissionsResult[0] as any).duplicate_count : 0;

     // 8. Submissions with UTM campaigns but not in database
     const [invalidUtmSubmissionsResult] = await pool.query(`
       SELECT COUNT(DISTINCT fs.id) as invalid_utm_count
       FROM form_submissions fs
       JOIN form_responses fr ON fs.id = fr.submission_id
       JOIN form_fields ff ON fr.field_id = ff.id
       LEFT JOIN utm_campaigns uc ON fr.value = uc.code
       WHERE fs.form_id = ? 
         AND ff.field_name = 'utm_campaign' 
         AND fr.value IS NOT NULL 
         AND TRIM(fr.value) != ''
         AND uc.code IS NULL
     `, [formId]);
     const invalidUtmSubmissions = Array.isArray(invalidUtmSubmissionsResult) && invalidUtmSubmissionsResult.length > 0 ? (invalidUtmSubmissionsResult[0] as any).invalid_utm_count : 0;

     return NextResponse.json({
      success: true,
      data: {
        formId: Number(formId),
        totalSubmissions,
        utmSubmissions,
        organicSubmissions,
        cleanSubmissions,
        cleanUtmSubmissions,
        cleanOrganicSubmissions,
                 duplicateSubmissions,
         invalidUtmSubmissions,
         calculations: {
           totalVsClean: totalSubmissions - cleanSubmissions,
           utmVsCleanUtm: utmSubmissions - cleanUtmSubmissions,
           organicVsCleanOrganic: organicSubmissions - cleanOrganicSubmissions,
           expectedOrganic: totalSubmissions - utmSubmissions,
           actualOrganic: organicSubmissions,
           cleanOrganicExpected: cleanSubmissions - cleanUtmSubmissions,
           actualCleanOrganic: cleanOrganicSubmissions,
           organicBreakdown: {
             noUtmCampaign: organicSubmissions - invalidUtmSubmissions,
             invalidUtmCampaign: invalidUtmSubmissions
           }
         }
      }
    });

  } catch (error) {
    console.error('Error fetching submission counts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submission counts' },
      { status: 500 }
    );
  }
}
