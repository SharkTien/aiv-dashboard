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
    

    // Get EMT entity ID
    const [emtResult] = await pool.query(
      "SELECT entity_id FROM entity WHERE name = 'EMT' LIMIT 1"
    );
    const emtEntityId = Array.isArray(emtResult) && emtResult.length > 0 ? (emtResult[0] as any).entity_id : null;
    // Get EST entity ID
    const [estResult] = await pool.query(
      "SELECT entity_id FROM entity WHERE name = 'EST' LIMIT 1"
    );
    const estEntityId = Array.isArray(estResult) && estResult.length > 0 ? (estResult[0] as any).entity_id : null;

    // Get active UTM campaigns from utm_campaigns table for this form
    const [activeCampaignsResult] = await pool.query(`
      SELECT uc.entity_id, uc.code, uc.name, uc.form_id
      FROM utm_campaigns uc
      WHERE uc.form_id = ?
      ORDER BY uc.entity_id, uc.name
    `, [formId]);

    const activeCampaigns = Array.isArray(activeCampaignsResult) ? activeCampaignsResult : [];
    
    // Create map of active campaigns by entity
    // IMPORTANT: use UTM campaign CODE for matching with form_responses. Not the name.
    const activeCampaignsByEntity = new Map();
    activeCampaigns.forEach((campaign: any) => {
      activeCampaignsByEntity.set(campaign.entity_id, campaign.code);
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
        AND fs.duplicated = FALSE
      ORDER BY fr.value
    `, [formId]);

    const utmCampaigns = Array.isArray(utmCampaignsResult) ? utmCampaignsResult : [];


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
    


    
    // Calculate statistics for each entity
    const localEntityStats = await Promise.all(
      localEntities.map(async (entity: any) => {
        const entityId = entity.entity_id;
        const entityName = entity.name;
        const goal = goalsByEntity.get(entityId) || 0;
        const activeCampaign = activeCampaignsByEntity.get(entityId);

        // Get SUs (total submissions allocated to this entity) - non-duplicated only
        const [susResult] = await pool.query(`
          SELECT COUNT(*) as count
          FROM form_submissions fs
          WHERE fs.form_id = ? AND fs.entity_id = ? AND fs.duplicated = FALSE
        `, [formId, entityId]);
        const sus = Array.isArray(susResult) && susResult.length > 0 ? (susResult[0] as any).count : 0;

        // Get MSUs (submissions with active UTM campaign for this entity) - non-duplicated only
        let msus = 0;
        if (activeCampaign) {
          const [msusResult] = await pool.query(`
            SELECT COUNT(*) as count
            FROM form_submissions fs
            JOIN form_responses fr ON fs.id = fr.submission_id
            JOIN form_fields ff ON fr.field_id = ff.id
            JOIN utm_campaigns uc ON fr.value = uc.code
            WHERE fs.form_id = ? 
              AND fs.entity_id = ? 
              AND ff.field_name = 'utm_campaign' 
              AND fr.value = ?
              AND fs.duplicated = FALSE
          `, [formId, entityId, activeCampaign]);
          msus = Array.isArray(msusResult) && msusResult.length > 0 ? (msusResult[0] as any).count : 0;
        }

        // Get SUs | utm source (submissions with active UTM campaign, any entity) - non-duplicated only
        let susUtmSource = 0;
        if (activeCampaign) {
          const [susUtmResult] = await pool.query(`
            SELECT COUNT(*) as count
            FROM form_submissions fs
            JOIN form_responses fr ON fs.id = fr.submission_id
            JOIN form_fields ff ON fr.field_id = ff.id
            JOIN utm_campaigns uc ON fr.value = uc.code
            WHERE fs.form_id = ? 
              AND ff.field_name = 'utm_campaign' 
              AND fr.value = ?
              AND fs.duplicated = FALSE
          `, [formId, activeCampaign]);
          susUtmSource = Array.isArray(susUtmResult) && susUtmResult.length > 0 ? (susUtmResult[0] as any).count : 0;
        }

        // Get EMT+Organic (submissions allocated to this entity but utm_campaign from EMT entity or no utm_campaign) - using duplicated column
        let emtPlusOrganic = 0;
        if (emtEntityId) {
          const emtActiveCampaign = activeCampaignsByEntity.get(emtEntityId);
          
          if (emtActiveCampaign) {
            // Submissions allocated to this entity but with EMT utm_campaign - using duplicated column
            const [emtCampaignResult] = await pool.query(`
              SELECT COUNT(*) as count
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              WHERE fs.form_id = ? 
                AND fs.entity_id = ?
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
                AND fs.duplicated = FALSE
            `, [formId, entityId, emtActiveCampaign]);
            const emtCampaignCount = Array.isArray(emtCampaignResult) && emtCampaignResult.length > 0 ? (emtCampaignResult[0] as any).count : 0;

            // Submissions allocated to this entity but without ANY UTM parameters (organic) - using duplicated column
            const [organicResult] = await pool.query(`
              SELECT COUNT(*) as count
              FROM form_submissions fs
              WHERE fs.form_id = ? 
                AND fs.entity_id = ?
                AND fs.duplicated = FALSE
                AND NOT EXISTS (
                  SELECT 1 FROM form_responses fr2
                  JOIN form_fields ff2 ON fr2.field_id = ff2.id
                  WHERE fr2.submission_id = fs.id 
                    AND ff2.field_name IN ('utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_name', 'utm_term')
                    AND fr2.value IS NOT NULL 
                    AND TRIM(fr2.value) != ''
                )
            `, [formId, entityId]);
            const organicCount = Array.isArray(organicResult) && organicResult.length > 0 ? (organicResult[0] as any).count : 0;

            emtPlusOrganic = emtCampaignCount + organicCount;
          }
        }

        // Get Other Source (submissions that come from this entity's UTM campaign but entity_id is NOT FOUND) - with deduplication
        let otherSource = 0;
        if (activeCampaign) {
          // Submissions with this entity's active UTM campaign but entity_id is NULL (NOT FOUND) - with deduplication
          const [otherSourceResult] = await pool.query(`
            SELECT COUNT(*) as count
            FROM form_submissions fs
            JOIN form_responses fr ON fs.id = fr.submission_id
            JOIN form_fields ff ON fr.field_id = ff.id
            WHERE fs.form_id = ? 
              AND ff.field_name = 'utm_campaign' 
              AND fr.value = ?
              AND fs.entity_id IS NULL
              AND fs.duplicated = FALSE
          `, [formId, activeCampaign]);
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
          // EMT SUs = submissions that have utm_campaign = EMT's active campaign AND entity_id is NULL/0
          const emtActiveCampaign = activeCampaignsByEntity.get(emtEntityId);
          
          if (emtActiveCampaign) {
            // SUs | market = all submissions with EMT campaign (any entity), deduped
            const [emtMarketResult] = await pool.query(`
              SELECT COUNT(*) as count
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
                AND fs.duplicated = FALSE
            `, [formId, emtActiveCampaign]);
            susUtmSource = Array.isArray(emtMarketResult) && emtMarketResult.length > 0 ? (emtMarketResult[0] as any).count : 0;

            // Count EMT submissions with entity not found
            const [emtResult] = await pool.query(`
              SELECT COUNT(*) as count
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              JOIN utm_campaigns uc ON fr.value = uc.code
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
                AND (fs.entity_id IS NULL OR fs.entity_id = 0)
                AND fs.duplicated = FALSE
            `, [formId, emtActiveCampaign]);
            const emtNotFound = Array.isArray(emtResult) && emtResult.length > 0 ? (emtResult[0] as any).count : 0;
            // SUs for EMT = all submissions with EMT campaign (any entity)
            sus = susUtmSource;
            msus = susUtmSource;
            otherSource = emtNotFound;
            
          }
        } else if (entityName.toLowerCase() === 'est') {
          // EST SUs = submissions with EST active campaign AND entity_id is NULL/0
          const estActiveCampaign = activeCampaignsByEntity.get(estEntityId);

          if (estActiveCampaign) {
            // SUs | market = all submissions with EST campaign (any entity), deduped
            const [estMarketResult] = await pool.query(`
              SELECT COUNT(*) as count
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
                AND fs.duplicated = FALSE
            `, [formId, estActiveCampaign]);
            susUtmSource = Array.isArray(estMarketResult) && estMarketResult.length > 0 ? (estMarketResult[0] as any).count : 0;

            const [estCountResult] = await pool.query(`
              SELECT COUNT(*) as count
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              JOIN utm_campaigns uc ON fr.value = uc.code
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
                AND (fs.entity_id IS NULL OR fs.entity_id = 0)
                AND fs.duplicated = FALSE
            `, [formId, estActiveCampaign]);
            sus = Array.isArray(estCountResult) && estCountResult.length > 0 ? (estCountResult[0] as any).count : 0;
            msus = sus;
            otherSource = sus;
          }
        } else if (entityName.toLowerCase() === 'organic') {
          // Other Source (subset): submissions with entity not found AND utm_campaign not from the selected form
          const [organicNotFoundResult] = await pool.query(`
            SELECT COUNT(*) as count
            FROM form_submissions fs
            LEFT JOIN form_responses utm ON fs.id = utm.submission_id 
              AND utm.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'utm_campaign')
            LEFT JOIN utm_campaigns uc ON utm.value = uc.code
            WHERE fs.form_id = ? 
              AND (fs.entity_id IS NULL OR fs.entity_id = 0)
              AND (uc.form_id IS NULL OR uc.form_id <> ?)
              AND fs.duplicated = FALSE
          `, [formId, formId, formId]);
          const organicNotFound = Array.isArray(organicNotFoundResult) && organicNotFoundResult.length > 0 ? (organicNotFoundResult[0] as any).count : 0;
          otherSource = organicNotFound;
          msus = 0;

          // SUs and SUs | market for Organic = all submissions whose utm_campaign is not from this form (any entity), deduped
          const [organicMarketResult] = await pool.query(`
            SELECT COUNT(*) as count
            FROM form_submissions fs
            LEFT JOIN form_responses utm ON fs.id = utm.submission_id 
              AND utm.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'utm_campaign')
            LEFT JOIN utm_campaigns uc ON utm.value = uc.code
            WHERE fs.form_id = ? 
              AND (uc.form_id IS NULL OR uc.form_id <> ?)
              AND fs.duplicated = FALSE
          `, [formId, formId, formId]);
          susUtmSource = Array.isArray(organicMarketResult) && organicMarketResult.length > 0 ? (organicMarketResult[0] as any).count : 0;
          sus = susUtmSource;
        } else {
          // All other national entities (except EMT and Organic) are calculated like EMT
          // Get submissions with UTM campaign matching this entity's active campaign - with deduplication
          
          const entityActiveCampaign = activeCampaignsByEntity.get(entityId);
          
          if (entityActiveCampaign) {
            // SUs | market = all submissions with this national entity's campaign (any entity), deduped
            const [entityMarketResult] = await pool.query(`
              SELECT COUNT(*) as count
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
                AND fs.duplicated = FALSE
            `, [formId, entityActiveCampaign]);
            susUtmSource = Array.isArray(entityMarketResult) && entityMarketResult.length > 0 ? (entityMarketResult[0] as any).count : 0;

            
            const [entityResult] = await pool.query(`
              SELECT COUNT(*) as count
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              JOIN utm_campaigns uc ON fr.value = uc.code
              WHERE fs.form_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND fr.value = ?
                AND (fs.entity_id IS NULL OR fs.entity_id = 0)
                AND fs.duplicated = FALSE
            `, [formId, entityActiveCampaign]);
            
            sus = Array.isArray(entityResult) && entityResult.length > 0 ? (entityResult[0] as any).count : 0;
            msus = sus; // For these entities, MSUs = SUs (all submissions have UTM campaign)
            otherSource = sus;
            

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

    // Calculate Total Local "Not Found from your UTM source"
    // This counts submissions with UTM campaigns from local entities but entity_id is NULL/NOT FOUND
    const [totalLocalNotFoundResult] = await pool.query(`
      SELECT COUNT(*) as count
      FROM form_submissions fs
      JOIN form_responses fr ON fs.id = fr.submission_id
      JOIN form_fields ff ON fr.field_id = ff.id
      JOIN utm_campaigns uc ON fr.value = uc.code
      JOIN entity e ON uc.entity_id = e.entity_id
      WHERE fs.form_id = ? 
        AND ff.field_name = 'utm_campaign' 
        AND e.type = 'local'
        AND (fs.entity_id IS NULL OR fs.entity_id = 0)
        AND fs.duplicated = FALSE
    `, [formId]);
    
    const totalLocalNotFound = Array.isArray(totalLocalNotFoundResult) && totalLocalNotFoundResult.length > 0 ? (totalLocalNotFoundResult[0] as any).count : 0;
    

    // Calculate Total National "Not Found from your UTM source" as the sum of national rows' other_source
    const totalNationalNotFound = nationalEntityStats.reduce((sum: number, stat: any) => sum + (stat.other_source || 0), 0);

    // Calculate "Total of Total" = Total Local NOT FOUND + Total National NOT FOUND
    const totalOfTotal = totalLocalNotFound + totalNationalNotFound;
    

    // Calculate total submissions after deduplication for the entire form
    const [totalDeduplicatedSubmissionsResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM form_submissions fs
      WHERE fs.form_id = ? AND fs.duplicated = FALSE
    `, [formId]);
    
    const totalDeduplicatedSubmissions = Array.isArray(totalDeduplicatedSubmissionsResult) && totalDeduplicatedSubmissionsResult.length > 0 ? (totalDeduplicatedSubmissionsResult[0] as any).total : 0;
    

    // Combine all entity stats
    const entityStats = [...localEntityStats, ...nationalEntityStats];

    // Fetch comparison data if compare parameter is provided
    let compareData = null;
    if (compare) {
      try {
        // Get comparison form details
        const [compareFormResult] = await pool.query(
          "SELECT id, name, code FROM forms WHERE id = ?",
          [compare]
        );

        if (Array.isArray(compareFormResult) && compareFormResult.length > 0) {
          const compareForm = compareFormResult[0] as any;
          
          // Get comparison entity stats (MSUs from compare form)
          // Get all local entities that have submissions in the compare form
          const [compareEntitiesResult] = await pool.query(`
            SELECT DISTINCT fs.entity_id, e.name as entity_name
            FROM form_submissions fs
            JOIN entity e ON fs.entity_id = e.entity_id
            WHERE fs.form_id = ? 
              AND fs.entity_id IS NOT NULL 
              AND fs.entity_id != 0
              AND e.type = 'local'
              AND fs.duplicated = FALSE
            ORDER BY fs.entity_id
          `, [compare]);

          const compareEntities = Array.isArray(compareEntitiesResult) ? compareEntitiesResult : [];

          // Get MSUs for each local entity in compare form
          const compareLocalStats = [];
          for (const entity of compareEntities) {
            const entityId = (entity as any).entity_id;
            const entityName = (entity as any).entity_name;
            
            // Get MSUs for this entity in compare form
            // MSUs = submissions with utm_campaign that belongs to this entity AND comes from the compare form
            const [msusResult] = await pool.query(`
              SELECT COUNT(*) as count
              FROM form_submissions fs
              JOIN form_responses fr ON fs.id = fr.submission_id
              JOIN form_fields ff ON fr.field_id = ff.id
              JOIN utm_campaigns uc ON fr.value = uc.code
              WHERE fs.form_id = ? 
                AND fs.entity_id = ? 
                AND ff.field_name = 'utm_campaign' 
                AND uc.entity_id = ?
                AND uc.form_id = ?
                AND fs.duplicated = FALSE
            `, [compare, entityId, entityId, compare]);
            
            const msus = Array.isArray(msusResult) && msusResult.length > 0 ? (msusResult[0] as any).count : 0;
            compareLocalStats.push({ entity_id: entityId, msus: msus });
          }

          // Convert to plain object instead of Map for better serialization
          const compareLocalStatsObject: { [key: number]: number } = {};
          if (Array.isArray(compareLocalStats)) {
            compareLocalStats.forEach((stat: any) => {
              compareLocalStatsObject[stat.entity_id] = stat.msus;
            });
          }

          compareData = {
            form: compareForm,
            localMsus: compareLocalStatsObject
          };
        }
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        form,
        entityStats: entityStats,
        totalLocalNotFound,
        totalNationalNotFound,
        totalOfTotal,
        totalDeduplicatedSubmissions,
        compare: compare || null,
        compareData
      }
    });

  } catch (error) {
    console.error("Error fetching oGV stats:", error);
    return NextResponse.json({ error: "Failed to fetch oGV stats" }, { status: 500 });
  }
}
