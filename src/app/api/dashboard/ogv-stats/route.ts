import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const formId = searchParams.get("formId");
  const compare = searchParams.get("compare");

  if (!formId) {
    return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Get form details
    const [formResult] = await pool.query(
      "SELECT id, name, code FROM forms WHERE id = ?",
      [formId]
    );

    if (!Array.isArray(formResult) || formResult.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const form = formResult[0];

    // Get all entities (both local and national)
    const [entitiesResult] = await pool.query(
      "SELECT entity_id, name, type FROM entity ORDER BY type, name"
    );

    const entities = Array.isArray(entitiesResult) ? entitiesResult : [];
    const localEntities = entities.filter((entity: any) => entity.type === 'local');
    const nationalEntities = entities.filter((entity: any) => entity.type === 'national');
    
    // Debug: Log all entities found
    console.log('Debug - All entities found:', entities);
    console.log('Debug - Local entities:', localEntities);
    console.log('Debug - National entities:', nationalEntities);
    
    // Debug: Check all national entities
    console.log('Debug - All national entities found:');
    nationalEntities.forEach((entity: any) => {
      console.log(`  - ${entity.name} (ID: ${entity.entity_id}, Type: ${entity.type})`);
    });
    
    // Debug: Check if EST entity exists
    const estEntity = entities.find((entity: any) => entity.name.toLowerCase() === 'est');
    if (estEntity) {
      console.log('Debug - EST entity found:', estEntity);
    } else {
      console.log('Debug - EST entity NOT found in database!');
    }

    // Get EMT entity ID
    const [emtResult] = await pool.query(
      "SELECT entity_id FROM entity WHERE name = 'EMT' LIMIT 1"
    );
    const emtEntityId = Array.isArray(emtResult) && emtResult.length > 0 ? (emtResult[0] as any).entity_id : null;

    // Get active UTM campaigns from utm_campaigns table for this form
    const [activeCampaignsResult] = await pool.query(`
      SELECT uc.entity_id, uc.code, uc.name, uc.form_id
      FROM utm_campaigns uc
      WHERE uc.form_id = ?
      ORDER BY uc.entity_id, uc.name
    `, [formId]);

    const activeCampaigns = Array.isArray(activeCampaignsResult) ? activeCampaignsResult : [];
    
    // Create map of active campaigns by entity
    const activeCampaignsByEntity = new Map();
    activeCampaigns.forEach((campaign: any) => {
      activeCampaignsByEntity.set(campaign.entity_id, campaign.name);
    });
    
    // Debug: Check active campaigns for all national entities
    console.log('Debug - Active campaigns by entity:');
    nationalEntities.forEach((entity: any) => {
      const activeCampaign = activeCampaignsByEntity.get(entity.entity_id);
      console.log(`  - ${entity.name} (ID: ${entity.entity_id}): ${activeCampaign || 'No active campaign'}`);
    });

    // Get all UTM campaigns from form responses for this form (for debug)
    const [utmCampaignsResult] = await pool.query(`
      SELECT DISTINCT fr.value as campaign_name
      FROM form_submissions fs
      JOIN form_responses fr ON fs.id = fr.submission_id
      JOIN form_fields ff ON fr.field_id = ff.id
      WHERE fs.form_id = ? 
        AND ff.field_name = 'utm_campaign' 
        AND fr.value IS NOT NULL
      ORDER BY fr.value
    `, [formId]);

    const utmCampaigns = Array.isArray(utmCampaignsResult) ? utmCampaignsResult : [];

    // Debug: Check EMT's active campaign
    if (emtEntityId) {
      const emtActiveCampaign = activeCampaignsByEntity.get(emtEntityId);
      console.log('Debug - EMT Entity ID:', emtEntityId);
      console.log('Debug - EMT Active Campaign:', emtActiveCampaign);
      console.log('Debug - All active campaigns from utm_campaigns table:', Object.fromEntries(activeCampaignsByEntity));
      console.log('Debug - All active campaigns data:', activeCampaigns);
      
      // Check if this campaign exists in form_responses
      if (emtActiveCampaign) {
        const [campaignCheckResult] = await pool.query(`
          SELECT COUNT(*) as count
          FROM form_submissions fs
          JOIN form_responses fr ON fs.id = fr.submission_id
          JOIN form_fields ff ON fr.field_id = ff.id
          WHERE fs.form_id = ? 
            AND ff.field_name = 'utm_campaign' 
            AND fr.value = ?
        `, [formId, emtActiveCampaign]);
        
        const campaignCount = Array.isArray(campaignCheckResult) && campaignCheckResult.length > 0 ? (campaignCheckResult[0] as any).count : 0;
        console.log('Debug - EMT Campaign exists in form_responses:', campaignCount, 'times');
        
        // List all unique utm_campaign values in this form
        const [allCampaignsResult] = await pool.query(`
          SELECT DISTINCT fr.value as campaign_name, COUNT(*) as count
          FROM form_submissions fs
          JOIN form_responses fr ON fs.id = fr.submission_id
          JOIN form_fields ff ON fr.field_id = ff.id
          WHERE fs.form_id = ? 
            AND ff.field_name = 'utm_campaign' 
            AND fr.value IS NOT NULL
          GROUP BY fr.value
          ORDER BY count DESC
        `, [formId]);
        
        console.log('Debug - All utm_campaign values in this form:', allCampaignsResult);
        
        // Debug: Show actual submissions with EMT's active campaign
        const [emtSubmissionsResult] = await pool.query(`
          SELECT 
            fs.id as submission_id,
            fs.timestamp,
            fs.entity_id,
            e.name as entity_name,
            fr.value as utm_campaign,
            phone.value as phone,
            email.value as email
          FROM form_submissions fs
          JOIN form_responses fr ON fs.id = fr.submission_id
          JOIN form_fields ff ON fr.field_id = ff.id
          LEFT JOIN entity e ON fs.entity_id = e.entity_id
          LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
            AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
          LEFT JOIN form_responses email ON fs.id = email.submission_id 
            AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
          WHERE fs.form_id = ? 
            AND ff.field_name = 'utm_campaign' 
            AND fr.value = ?
          ORDER BY fs.timestamp DESC
          LIMIT 10
        `, [formId, formId, formId, emtActiveCampaign]);
        
        console.log('Debug - EMT Submissions (first 10):', emtSubmissionsResult);
        
        // Debug: Show all submissions with any utm_campaign
        const [allUtmSubmissionsResult] = await pool.query(`
          SELECT 
            fs.id as submission_id,
            fs.timestamp,
            fs.entity_id,
            e.name as entity_name,
            fr.value as utm_campaign,
            phone.value as phone,
            email.value as email
          FROM form_submissions fs
          JOIN form_responses fr ON fs.id = fr.submission_id
          JOIN form_fields ff ON fr.field_id = ff.id
          LEFT JOIN entity e ON fs.entity_id = e.entity_id
          LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
            AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
          LEFT JOIN form_responses email ON fs.id = email.submission_id 
            AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
          WHERE fs.form_id = ? 
            AND ff.field_name = 'utm_campaign' 
            AND fr.value IS NOT NULL
          ORDER BY fs.timestamp DESC
          LIMIT 20
        `, [formId, formId, formId]);
        
        console.log('Debug - All UTM Submissions (first 20):', allUtmSubmissionsResult);
      }
    }

    // Get goals for the form (for all entities)
    const [goalsResult] = await pool.query(
      "SELECT entity_id, goal_value FROM goals WHERE form_id = ?",
      [formId]
    );
    const goals = Array.isArray(goalsResult) ? goalsResult : [];
    const goalsByEntity = new Map();
    goals.forEach((goal: any) => {
      goalsByEntity.set(goal.entity_id, goal.goal_value);
    });
    
    // Debug: Check all submissions for this form and their entity allocations
    const [allSubmissionsDebug] = await pool.query(`
      SELECT 
        fs.id as submission_id,
        fs.entity_id,
        e.name as entity_name,
        fs.timestamp
      FROM form_submissions fs
      LEFT JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ?
      ORDER BY fs.timestamp DESC
      LIMIT 20
    `, [formId]);
    
    console.log('Debug - All submissions for this form (first 20):', allSubmissionsDebug);
    
    // Debug: Check entity distribution
    const [entityDistribution] = await pool.query(`
      SELECT 
        fs.entity_id,
        e.name as entity_name,
        COUNT(*) as count
      FROM form_submissions fs
      LEFT JOIN entity e ON fs.entity_id = e.entity_id
      WHERE fs.form_id = ?
      GROUP BY fs.entity_id, e.name
      ORDER BY count DESC
    `, [formId]);
    
    console.log('Debug - Entity distribution for this form:', entityDistribution);


    
    // Calculate statistics for each entity
    const localEntityStats = await Promise.all(
      localEntities.map(async (entity: any) => {
        const entityId = entity.entity_id;
        const entityName = entity.name;
        const goal = goalsByEntity.get(entityId) || 0;
        const activeCampaign = activeCampaignsByEntity.get(entityId);

        // Get SUs (total submissions allocated to this entity) - with deduplication
        const [susResult] = await pool.query(`
          WITH RankedSubmissions AS (
            SELECT 
              fs.id,
              fs.entity_id,
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
            WHERE fs.form_id = ? AND fs.entity_id = ?
          )
          SELECT COUNT(*) as count
          FROM RankedSubmissions 
          WHERE rn = 1
        `, [formId, formId, formId, entityId]);
        const sus = Array.isArray(susResult) && susResult.length > 0 ? (susResult[0] as any).count : 0;

        // Get MSUs (submissions with active UTM campaign for this entity) - with deduplication
        let msus = 0;
        if (activeCampaign) {
          const [msusResult] = await pool.query(`
            WITH RankedSubmissions AS (
              SELECT 
                fs.id,
                fs.entity_id,
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
              LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
                AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
              LEFT JOIN form_responses email ON fs.id = email.submission_id 
                AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
              WHERE fs.form_id = ? 
                AND fs.entity_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
            )
            SELECT COUNT(*) as count
            FROM RankedSubmissions 
            WHERE rn = 1
          `, [formId, formId, formId, entityId, activeCampaign]);
          msus = Array.isArray(msusResult) && msusResult.length > 0 ? (msusResult[0] as any).count : 0;
        }

        // Get SUs | utm source (submissions with active UTM campaign, any entity) - with deduplication
        let susUtmSource = 0;
        if (activeCampaign) {
          const [susUtmResult] = await pool.query(`
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
              LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
                AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
              LEFT JOIN form_responses email ON fs.id = email.submission_id 
                AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
            )
            SELECT COUNT(*) as count
            FROM RankedSubmissions 
            WHERE rn = 1
          `, [formId, formId, formId, activeCampaign]);
          susUtmSource = Array.isArray(susUtmResult) && susUtmResult.length > 0 ? (susUtmResult[0] as any).count : 0;
        }

        // Get EMT+Organic (submissions allocated to this entity but utm_campaign from EMT entity or no utm_campaign) - with deduplication
        let emtPlusOrganic = 0;
        if (emtEntityId) {
          const emtActiveCampaign = activeCampaignsByEntity.get(emtEntityId);
          
          if (emtActiveCampaign) {
            // Submissions allocated to this entity but with EMT utm_campaign - with deduplication
            const [emtCampaignResult] = await pool.query(`
              WITH RankedSubmissions AS (
                SELECT 
                  fs.id,
                  fs.entity_id,
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
                LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
                  AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
                LEFT JOIN form_responses email ON fs.id = email.submission_id 
                  AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
                WHERE fs.form_id = ? 
                  AND fs.entity_id = ?
                  AND ff.field_name = 'utm_campaign' 
                  AND fr.value = ?
              )
              SELECT COUNT(*) as count
              FROM RankedSubmissions 
              WHERE rn = 1
            `, [formId, formId, formId, entityId, emtActiveCampaign]);
            const emtCampaignCount = Array.isArray(emtCampaignResult) && emtCampaignResult.length > 0 ? (emtCampaignResult[0] as any).count : 0;

            // Submissions allocated to this entity but without ANY UTM parameters (organic) - with deduplication
            const [organicResult] = await pool.query(`
              WITH RankedSubmissions AS (
                SELECT 
                  fs.id,
                  fs.entity_id,
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
                  AND fs.entity_id = ?
                  AND NOT EXISTS (
                    SELECT 1 FROM form_responses fr2
                    JOIN form_fields ff2 ON fr2.field_id = ff2.id
                    WHERE fr2.submission_id = fs.id 
                      AND ff2.field_name IN ('utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_name', 'utm_term')
                      AND fr2.value IS NOT NULL 
                      AND TRIM(fr2.value) != ''
                  )
              )
              SELECT COUNT(*) as count
              FROM RankedSubmissions 
              WHERE rn = 1
            `, [formId, formId, formId, entityId]);
            const organicCount = Array.isArray(organicResult) && organicResult.length > 0 ? (organicResult[0] as any).count : 0;

            emtPlusOrganic = emtCampaignCount + organicCount;
          }
        }

        // Get Other Source (submissions that come from this entity's UTM campaign but entity_id is NOT FOUND) - with deduplication
        let otherSource = 0;
        if (activeCampaign) {
          // Submissions with this entity's active UTM campaign but entity_id is NULL (NOT FOUND) - with deduplication
          const [otherSourceResult] = await pool.query(`
            WITH RankedSubmissions AS (
              SELECT 
                fs.id,
                fs.entity_id,
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
              LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
                AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
              LEFT JOIN form_responses email ON fs.id = email.submission_id 
                AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
                AND fs.entity_id IS NULL
            )
            SELECT COUNT(*) as count
            FROM RankedSubmissions 
            WHERE rn = 1
          `, [formId, formId, formId, activeCampaign]);
          otherSource = Array.isArray(otherSourceResult) && otherSourceResult.length > 0 ? (otherSourceResult[0] as any).count : 0;
        } else {
          // If no active campaign, no "other source" submissions
          otherSource = 0;
        }

        // Calculate percentages
        const progress = goal > 0 ? (sus / goal) * 100 : 0;
        const msuPercentage = sus > 0 ? (msus / sus) * 100 : 0;
        const msuUtmPercentage = susUtmSource > 0 ? (msus / susUtmSource) * 100 : 0;

        return {
          entity_id: entityId,
          entity_name: entityName,
          entity_type: 'local',
          goal,
          sus,
          msus,
          sus_utm_source: susUtmSource,
          emt_plus_organic: emtPlusOrganic,
          other_source: otherSource,
          progress: Math.round(progress * 100) / 100,
          msu_percentage: Math.round(msuPercentage * 100) / 100,
          msu_utm_percentage: Math.round(msuUtmPercentage * 100) / 100
        };
      })
    );

    // Calculate statistics for national entities
    const nationalEntityStats = await Promise.all(
      nationalEntities.map(async (entity: any) => {
        const entityId = entity.entity_id;
        const entityName = entity.name;
        const goal = goalsByEntity.get(entityId) || 0;

        // For national entities, we need different calculations with deduplication:
        // - EMT: Counts submissions with EMT's active UTM campaign (regardless of entity_id)
        // - Organic: Counts submissions without ANY UTM parameters (regardless of entity_id)
        // - All others: Count submissions with their active UTM campaign (like EMT)
        let sus = 0;
        let msus = 0;
        let susUtmSource = 0;
        let emtPlusOrganic = 0;
        let otherSource = 0;

        if (entityName.toLowerCase() === 'emt') {
          // Get EMT submissions (submissions with EMT active campaign) - with deduplication
          // EMT SUs = submissions that have utm_campaign = EMT's active campaign (regardless of submission's entity_id)
          const emtActiveCampaign = activeCampaignsByEntity.get(emtEntityId);
          console.log('Debug - EMT Entity Calculation - Active Campaign:', emtActiveCampaign);
          
          if (emtActiveCampaign) {
            // Debug: Show all submissions that will be counted for EMT
            const [emtDebugResult] = await pool.query(`
              SELECT 
                fs.id as submission_id,
                fs.timestamp,
                fs.entity_id,
                e.name as entity_name,
                fr.value as utm_campaign,
                phone.value as phone,
                email.value as email,
                CASE 
                  WHEN phone.value IS NOT NULL AND phone.value != '' AND LENGTH(TRIM(phone.value)) > 0 THEN LOWER(TRIM(phone.value))
                  WHEN email.value IS NOT NULL AND email.value != '' AND LENGTH(TRIM(email.value)) > 0 THEN LOWER(TRIM(email.value))
                  ELSE CONCAT('unique_', fs.id)
                END as dedup_key
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              LEFT JOIN entity e ON fs.entity_id = e.entity_id
              LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
                AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
              LEFT JOIN form_responses email ON fs.id = email.submission_id 
                AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
              ORDER BY fs.timestamp DESC
            `, [formId, formId, formId, emtActiveCampaign]);
            
            console.log('Debug - EMT Submissions to be counted (before deduplication):', emtDebugResult);
            
            const [emtResult] = await pool.query(`
              WITH RankedSubmissions AS (
                SELECT 
                  fs.id,
                  ROW_NUMBER() OVER (
                    PARTITION BY 
                      CASE 
                        WHEN phone.value IS NOT NULL AND phone.value != '' AND LENGTH(TRIM(phone.value)) > 0 THEN LOWER(TRIM(phone.value))
                        WHEN email.value IS NOT NULL AND email.value != '' AND LENGTH(TRIM(email.value)) > 0 THEN LOWER(TRIM(email.value))
                        ELSE CONCAT('unique_', fs.id)
                      END
                    ORDER BY fs.timestamp DESC
                  ) as rn
                FROM form_submissions fs
                JOIN form_responses fr ON fs.id = fr.submission_id
                JOIN form_fields ff ON fr.field_id = ff.id
                LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
                  AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
                LEFT JOIN form_responses email ON fs.id = email.submission_id 
                  AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
                WHERE fs.form_id = ? 
                  AND ff.field_name = 'utm_campaign' 
                  AND fr.value = ?
                  -- Note: We don't filter by fs.entity_id here - we count ALL submissions with EMT's active campaign
              )
              SELECT COUNT(*) as count
              FROM RankedSubmissions 
              WHERE rn = 1
            `, [formId, formId, formId, emtActiveCampaign]);
            sus = Array.isArray(emtResult) && emtResult.length > 0 ? (emtResult[0] as any).count : 0;
            msus = sus; // For EMT, MSUs = SUs (all EMT submissions have UTM campaign)
            
            console.log('Debug - EMT Final Count (after deduplication):', sus);
          } else {
            console.log('Debug - EMT Active Campaign not found!');
          }
        } else if (entityName.toLowerCase() === 'organic') {
          // Get organic submissions (submissions without ANY UTM parameters) - with deduplication
          // Organic SUs = submissions that have NO UTM parameters (regardless of submission's entity_id)
          const [organicResult] = await pool.query(`
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
                AND NOT EXISTS (
                  SELECT 1 FROM form_responses fr2
                  JOIN form_fields ff2 ON fr2.field_id = ff2.id
                  WHERE fr2.submission_id = fs.id 
                    AND ff2.field_name IN ('utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_name', 'utm_term')
                    AND fr2.value IS NOT NULL 
                    AND TRIM(fr2.value) != ''
                )
              -- Note: We don't filter by fs.entity_id here - we count ALL submissions without UTM parameters
            )
            SELECT COUNT(*) as count
            FROM RankedSubmissions 
            WHERE rn = 1
          `, [formId, formId, formId]);
          sus = Array.isArray(organicResult) && organicResult.length > 0 ? (organicResult[0] as any).count : 0;
          msus = 0; // Organic submissions don't have UTM campaigns
        } else {
          // All other national entities (except EMT and Organic) are calculated like EMT
          // Get submissions with UTM campaign matching this entity's active campaign - with deduplication
          console.log(`Debug - ${entityName} Entity Calculation - Entity ID: ${entityId}, Form ID: ${formId}`);
          
          const entityActiveCampaign = activeCampaignsByEntity.get(entityId);
          console.log(`Debug - ${entityName} Active Campaign:`, entityActiveCampaign);
          
          if (entityActiveCampaign) {
            // Debug: Check if there are any submissions with this entity's active campaign
            const [debugEntitySubmissions] = await pool.query(`
              SELECT 
                fs.id as submission_id,
                fs.entity_id,
                e.name as entity_name,
                fr.value as utm_campaign,
                fs.timestamp,
                phone.value as phone,
                email.value as email
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              LEFT JOIN entity e ON fs.entity_id = e.entity_id
              LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
                AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
              LEFT JOIN form_responses email ON fs.id = email.submission_id 
                AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
              ORDER BY fs.timestamp DESC
              LIMIT 10
            `, [formId, formId, formId, entityActiveCampaign]);
            
            console.log(`Debug - ${entityName} Submissions with active campaign (first 10):`, debugEntitySubmissions);
            console.log(`Debug - ${entityName} Total submissions with active campaign:`, Array.isArray(debugEntitySubmissions) ? debugEntitySubmissions.length : 0);
            
            const [entityResult] = await pool.query(`
              WITH RankedSubmissions AS (
                SELECT 
                  fs.id,
                  fs.entity_id,
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
                LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
                  AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
                LEFT JOIN form_responses email ON fs.id = email.submission_id 
                  AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
                WHERE fs.form_id = ? 
                  AND ff.field_name = 'utm_campaign' 
                  AND fr.value = ?
                  -- Note: We don't filter by fs.entity_id here - we count ALL submissions with this entity's active campaign
              )
              SELECT COUNT(*) as count
              FROM RankedSubmissions 
              WHERE rn = 1
            `, [formId, formId, formId, entityActiveCampaign]);
            
            sus = Array.isArray(entityResult) && entityResult.length > 0 ? (entityResult[0] as any).count : 0;
            msus = sus; // For these entities, MSUs = SUs (all submissions have UTM campaign)
            
            console.log(`Debug - ${entityName} Final Count (after deduplication):`, sus);

            // Get Other Source for national entities (submissions with this entity's UTM campaign but entity_id is NOT FOUND) - with deduplication
            const [otherSourceResult] = await pool.query(`
              WITH RankedSubmissions AS (
                SELECT 
                  fs.id,
                  fs.entity_id,
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
                LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
                  AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
                LEFT JOIN form_responses email ON fs.id = email.submission_id 
                  AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
                WHERE fs.form_id = ? 
                  AND ff.field_name = 'utm_campaign' 
                  AND fr.value = ?
                  AND fs.entity_id IS NULL
              )
              SELECT COUNT(*) as count
              FROM RankedSubmissions 
              WHERE rn = 1
            `, [formId, formId, formId, entityActiveCampaign]);
            otherSource = Array.isArray(otherSourceResult) && otherSourceResult.length > 0 ? (otherSourceResult[0] as any).count : 0;
          } else {
            console.log(`Debug - ${entityName} No active campaign found!`);
            sus = 0;
            msus = 0;
            otherSource = 0;
          }
        }

        // Calculate percentages
        const progress = goal > 0 ? (sus / goal) * 100 : 0;
        const msuPercentage = sus > 0 ? (msus / sus) * 100 : 0;
        const msuUtmPercentage = susUtmSource > 0 ? (msus / susUtmSource) * 100 : 0;

        return {
          entity_id: entityId,
          entity_name: entityName,
          entity_type: 'national',
          goal,
          sus,
          msus,
          sus_utm_source: susUtmSource,
          emt_plus_organic: emtPlusOrganic,
          other_source: otherSource,
          progress: Math.round(progress * 100) / 100,
          msu_percentage: Math.round(msuPercentage * 100) / 100,
          msu_utm_percentage: Math.round(msuUtmPercentage * 100) / 100
        };
      })
    );

    // Combine all entity stats
    const entityStats = [...localEntityStats, ...nationalEntityStats];

    return NextResponse.json({
      success: true,
      data: {
        form,
        entityStats: entityStats,
        compare: compare || null
      }
    });

  } catch (error) {
    console.error("Error fetching oGV stats:", error);
    return NextResponse.json({ error: "Failed to fetch oGV stats" }, { status: 500 });
  }
}
