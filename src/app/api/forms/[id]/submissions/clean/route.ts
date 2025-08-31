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
  const getAll = searchParams.get("all") === "true";
  const getUnlimited = searchParams.get("unlimited") === "true";
  const limit = getUnlimited ? 999999 : (getAll ? 1000 : Math.min(Number(searchParams.get("limit") || 20), 500));
  const page = (getAll || getUnlimited) ? 1 : Math.max(Number(searchParams.get("page") || 1), 1);
  const offset = (getAll || getUnlimited) ? 0 : (page - 1) * limit;

  const pool = getDbPool();

  try {
    // Get all submissions with deduplication by email/phone
    const [submissionsResult] = await pool.query(`
      WITH RankedSubmissions AS (
        SELECT 
          fs.id,
          fs.timestamp,
          fs.entity_id,
          e.name as entity_name,
          phone.value as phone_value,
          email.value as email_value,
          CASE 
            WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
            WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
            ELSE CONCAT('unique_', fs.id)
          END as dedup_key,
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
        LEFT JOIN entity e ON fs.entity_id = e.entity_id
        LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
          AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
        LEFT JOIN form_responses email ON fs.id = email.submission_id 
          AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
        WHERE fs.form_id = ?
      )
      SELECT 
        id,
        timestamp,
        entity_id,
        entity_name,
        phone_value,
        email_value,
        dedup_key,
        rn
      FROM RankedSubmissions 
      WHERE rn = 1
      ORDER BY timestamp DESC
      ${(getAll || getUnlimited) ? '' : 'LIMIT ? OFFSET ?'}
    `, (getAll || getUnlimited) ? [formId, formId, formId] : [formId, formId, formId, limit, offset]);

    const submissions = Array.isArray(submissionsResult) ? submissionsResult : [];
    
    // Debug: Check dedup keys for emt.vietnam@aiesec.net
    console.log(`Debug - Checking dedup keys for submissions...`);
    submissions.forEach((sub: any) => {
      if (sub.email_value?.toLowerCase().trim() === 'emt.vietnam@aiesec.net') {
        console.log(`Debug - emt.vietnam@aiesec.net submission: ID=${sub.id}, Email=${sub.email_value}, Phone=${sub.phone_value}, DedupKey=${sub.dedup_key}, RN=${sub.rn}`);
      }
    });
    
    // Debug: Check ALL submissions before deduplication to see the full picture
    console.log(`Debug - Checking ALL submissions before deduplication...`);
    const [allSubmissionsWithKeys] = await pool.query(`
      SELECT 
        fs.id,
        fs.timestamp,
        phone.value as phone_value,
        email.value as email_value,
        CASE 
          WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
          WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
          ELSE CONCAT('unique_', fs.id)
        END as dedup_key
      FROM form_submissions fs
      LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
        AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
      LEFT JOIN form_responses email ON fs.id = email.submission_id 
        AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
      WHERE fs.form_id = ?
      ORDER BY fs.timestamp DESC
    `, [formId, formId, formId]);
    
    const allSubs = Array.isArray(allSubmissionsWithKeys) ? allSubmissionsWithKeys : [];
    console.log(`Debug - Total submissions before deduplication: ${allSubs.length}`);
    
    // Check for email duplicates before deduplication
    const emailGroups = new Map<string, any[]>();
    allSubs.forEach((sub: any) => {
      const email = sub.email_value?.toLowerCase().trim();
      if (email) {
        if (!emailGroups.has(email)) {
          emailGroups.set(email, []);
        }
        emailGroups.get(email)!.push(sub);
      }
    });
    
    emailGroups.forEach((subs, email) => {
      if (subs.length > 1) {
        console.log(`Debug - Email "${email}" has ${subs.length} submissions BEFORE deduplication:`);
        subs.forEach((sub, index) => {
          console.log(`  ${index + 1}. ID: ${sub.id}, Timestamp: ${sub.timestamp}, DedupKey: ${sub.dedup_key}`);
        });
      }
    });
    
    // Check for duplicate dedup keys
    const dedupKeyCounts = new Map<string, any[]>();
    submissions.forEach((sub: any) => {
      const key = sub.dedup_key;
      if (!dedupKeyCounts.has(key)) {
        dedupKeyCounts.set(key, []);
      }
      dedupKeyCounts.get(key)!.push(sub);
    });
    
    dedupKeyCounts.forEach((subs, key) => {
      if (subs.length > 1) {
        console.log(`Debug - Duplicate dedup key "${key}" has ${subs.length} submissions:`);
        subs.forEach((sub, index) => {
          console.log(`  ${index + 1}. ID: ${sub.id}, Email: ${sub.email_value}, Phone: ${sub.phone_value}, Timestamp: ${sub.timestamp}`);
        });
      }
    });
    
    // Debug: Check for duplicate emails in the result
    const emailCounts = new Map<string, number>();
    const debugSubmissionIds = submissions.map((s: any) => s.id);
    
    if (debugSubmissionIds.length > 0) {
      const [emailDebugResult] = await pool.query(`
        SELECT 
          fr.submission_id,
          fr.value as email
        FROM form_responses fr
        JOIN form_fields ff ON fr.field_id = ff.id
        WHERE fr.submission_id IN (${debugSubmissionIds.map(() => '?').join(',')})
          AND ff.field_name = 'email'
          AND fr.value IS NOT NULL
          AND TRIM(fr.value) != ''
      `, debugSubmissionIds);
      
      const emailDebug = Array.isArray(emailDebugResult) ? emailDebugResult : [];
      emailDebug.forEach((row: any) => {
        const email = row.email?.toLowerCase().trim();
        if (email) {
          emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
        }
      });
      
      // Log emails with duplicates
      emailCounts.forEach((count, email) => {
        if (count > 1) {
          console.log(`Debug - Clean data: Duplicate email found: ${email} (${count} times)`);
        }
      });
    }
    
    // Debug: Check ALL submissions for duplicates (before deduplication)
    console.log(`Debug - Checking ALL submissions for form ${formId} for duplicates...`);
    const [allSubmissionsDebug] = await pool.query(`
      SELECT 
        fs.id,
        fs.timestamp,
        fs.entity_id,
        e.name as entity_name,
        phone.value as phone,
        email.value as email
      FROM form_submissions fs
      LEFT JOIN entity e ON fs.entity_id = e.entity_id
      LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
        AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
      LEFT JOIN form_responses email ON fs.id = email.submission_id 
        AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
      WHERE fs.form_id = ?
      ORDER BY fs.timestamp DESC
    `, [formId, formId, formId]);
    
    const allSubmissions = Array.isArray(allSubmissionsDebug) ? allSubmissionsDebug : [];
    console.log(`Debug - Total submissions in database: ${allSubmissions.length}`);
    
    // Check for email duplicates
    const allEmailCounts = new Map<string, any[]>();
    allSubmissions.forEach((sub: any) => {
      const email = sub.email?.toLowerCase().trim();
      if (email) {
        if (!allEmailCounts.has(email)) {
          allEmailCounts.set(email, []);
        }
        allEmailCounts.get(email)!.push(sub);
      }
    });
    
    // Log all email duplicates
    allEmailCounts.forEach((subs, email) => {
      if (subs.length > 1) {
        console.log(`Debug - Email "${email}" has ${subs.length} submissions:`);
        subs.forEach((sub, index) => {
          console.log(`  ${index + 1}. ID: ${sub.id}, Timestamp: ${sub.timestamp}, Entity: ${sub.entity_name || 'null'}`);
        });
      }
    });
    
    // Check for phone duplicates
    const allPhoneCounts = new Map<string, any[]>();
    allSubmissions.forEach((sub: any) => {
      const phone = sub.phone?.toLowerCase().trim();
      if (phone) {
        if (!allPhoneCounts.has(phone)) {
          allPhoneCounts.set(phone, []);
        }
        allPhoneCounts.get(phone)!.push(sub);
      }
    });
    
    // Log all phone duplicates
    allPhoneCounts.forEach((subs, phone) => {
      if (subs.length > 1) {
        console.log(`Debug - Phone "${phone}" has ${subs.length} submissions:`);
        subs.forEach((sub, index) => {
          console.log(`  ${index + 1}. ID: ${sub.id}, Timestamp: ${sub.timestamp}, Entity: ${sub.entity_name || 'null'}`);
        });
      }
    });
    
    console.log(`Debug - Clean data submissions after deduplication: ${submissions.length}`);
    
    // Debug: Check which submissions were selected by deduplication
    if (submissions.length > 0) {
      console.log(`Debug - Submissions selected by deduplication:`);
      submissions.forEach((sub: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${sub.id}, Timestamp: ${sub.timestamp}, Entity: ${sub.entity_name || 'null'}, Email: ${sub.email_value || 'null'}, Phone: ${sub.phone_value || 'null'}`);
      });
    }
    
    // Final verification: Check for any remaining duplicates in the result
    console.log(`Debug - Final verification: Checking for duplicates in result...`);
    const finalEmailCounts = new Map<string, any[]>();
    const finalPhoneCounts = new Map<string, any[]>();
    
    submissions.forEach((sub: any) => {
      const email = sub.email_value?.toLowerCase().trim();
      const phone = sub.phone_value?.toLowerCase().trim();
      
      if (email) {
        if (!finalEmailCounts.has(email)) {
          finalEmailCounts.set(email, []);
        }
        finalEmailCounts.get(email)!.push(sub);
      }
      
      if (phone) {
        if (!finalPhoneCounts.has(phone)) {
          finalPhoneCounts.set(phone, []);
        }
        finalPhoneCounts.get(phone)!.push(sub);
      }
    });
    
    // Report any remaining duplicates
    let hasDuplicates = false;
    
    finalEmailCounts.forEach((subs, email) => {
      if (subs.length > 1) {
        console.log(`ERROR - Email "${email}" still has ${subs.length} submissions after deduplication!`);
        subs.forEach((sub, index) => {
          console.log(`  ${index + 1}. ID: ${sub.id}, Timestamp: ${sub.timestamp}`);
        });
        hasDuplicates = true;
      }
    });
    
    finalPhoneCounts.forEach((subs, phone) => {
      if (subs.length > 1) {
        console.log(`ERROR - Phone "${phone}" still has ${subs.length} submissions after deduplication!`);
        subs.forEach((sub, index) => {
          console.log(`  ${index + 1}. ID: ${sub.id}, Timestamp: ${sub.timestamp}`);
        });
        hasDuplicates = true;
      }
    });
    
    if (!hasDuplicates) {
      console.log(`SUCCESS - No duplicates found in final result!`);
    }
    
    // Debug: Check if emt.vietnam@aiesec.net is in the final result
    const emtInResult = submissions.find((s: any) => {
      // We need to check the email from responses since it's not in the main query
      return false; // This will be checked later when we get responses
    });
    
    console.log(`Debug - Checking for emt.vietnam@aiesec.net in final result...`);

    // Get total count for pagination (with deduplication)
    const [countResult] = await pool.query(`
      WITH RankedSubmissions AS (
        SELECT 
          fs.id,
          ROW_NUMBER() OVER (
            PARTITION BY 
              CASE 
                WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
                WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
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
      SELECT COUNT(*) as total
      FROM RankedSubmissions 
      WHERE rn = 1
    `, [formId, formId, formId]);

    const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult[0] as any).total : 0;

    // Get all responses for all submissions in one query
    const submissionIds = submissions.map((s: any) => s.id);
    let submissionsWithResponses = submissions.map((s: any) => ({
      id: s.id,
      timestamp: s.timestamp,
      entityId: s.entity_id,
      entityName: s.entity_name,
      responses: []
    }));

    if (submissionIds.length > 0) {
      const [allResponsesResult] = await pool.query(`
        SELECT 
          fr.submission_id,
          ff.field_name, 
          ff.field_label, 
          fr.value,
          CASE 
            WHEN fr.value = 'other--uni-2' THEN 'other--uni-2'
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

      const allResponses = Array.isArray(allResponsesResult) ? allResponsesResult : [];
      
      // Group responses by submission_id
      const responsesBySubmission = new Map();
      allResponses.forEach((response: any) => {
        if (!responsesBySubmission.has(response.submission_id)) {
          responsesBySubmission.set(response.submission_id, []);
        }
        responsesBySubmission.get(response.submission_id).push(response);
      });

      // Assign responses to submissions
      submissionsWithResponses = submissionsWithResponses.map((submission: any) => ({
        id: submission.id,
        timestamp: submission.timestamp,
        entityId: submission.entity_id,
        entityName: submission.entity_name,
        responses: responsesBySubmission.get(submission.id) || []
      }));
      
      // Debug: Check for emt.vietnam@aiesec.net in final result with responsess
      const emtSubmissions = submissionsWithResponses.filter(submission => {
        const emailResponse = submission.responses.find((r: any) => r.field_name === 'email') as any;
        return emailResponse && emailResponse.value?.toLowerCase().trim() === 'emt.vietnam@aiesec.net';
      });
      
      if (emtSubmissions.length > 0) {
        console.log(`Debug - emt.vietnam@aiesec.net found in final result: ${emtSubmissions.length} submission(s)`);
        emtSubmissions.forEach((sub, index) => {
          console.log(`  ${index + 1}. ID: ${sub.id}, Timestamp: ${sub.timestamp}, Entity: ${sub.entityName || 'null'}`);
        });
      } else {
        console.log(`Debug - emt.vietnam@aiesec.net NOT found in final result!`);
      }
    }

    const totalPages = (getAll || getUnlimited) ? 1 : Math.ceil(total / limit);

    return NextResponse.json({
      items: submissionsWithResponses,
      pagination: {
        page: (getAll || getUnlimited) ? 1 : page,
        limit: (getAll || getUnlimited) ? total : limit,
        total,
        totalPages,
        hasNext: (getAll || getUnlimited) ? false : page < totalPages,
        hasPrev: (getAll || getUnlimited) ? false : page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching clean submissions:", error);
    return NextResponse.json({ error: "Failed to fetch clean submissions" }, { status: 500 });
  }
}
