import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const pool = getDbPool();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const termFilter = searchParams.get('term') || '';
    const phaseFilter = searchParams.get('phase') || '';
    const comparePhase = searchParams.get('compare') || '';

    // Mock data for now - replace with actual database queries
    // This would typically involve complex SQL queries to aggregate data from forms, submissions, and UTM tracking
    
    // All local entities (including those with no signups)
    const allLocalEntities = [
      'HCMC', 'Hanoi', 'Danang', 'Cantho', 'Hue', 'Nhatrang', 'Vungtau', 'Binhduong', 'Dongnai'
    ];
    
    // Mock signup data (only some entities have data)
    const signupData = {
      'HCMC': { total: 13, msu: 19, yourUtm: 6, emtPlusOrganic: 7, otherSource: 0, notFound: 0 },
      'Hanoi': { total: 8, msu: 11, yourUtm: 4, emtPlusOrganic: 4, otherSource: 0, notFound: 0 },
      'Danang': { total: 5, msu: 12, yourUtm: 3, emtPlusOrganic: 2, otherSource: 0, notFound: 0 },
      'Cantho': { total: 3, msu: 4, yourUtm: 2, emtPlusOrganic: 1, otherSource: 0, notFound: 0 }
    };
    
    const mockLocalData = allLocalEntities.map(entity => {
      const data = signupData[entity as keyof typeof signupData];
      return {
        entity,
        goal: 0, // Will be updated from goals API
        total: data ? data.total : 0,
        msu: data ? data.msu : 0,
        yourUtm: data ? data.yourUtm : 0,
        emtPlusOrganic: data ? data.emtPlusOrganic : 0,
        otherSource: data ? data.otherSource : 0,
        notFound: data ? data.notFound : 0
      };
    });

    const mockLocalTotals = {
      entity: 'LOCAL',
      goal: 0,
      total: 29,
      msu: 46,
      yourUtm: 15,
      emtPlusOrganic: 14,
      otherSource: 0,
      notFound: 0
    };

    const mockNationalData = [
      { label: 'EMT', count: 8 },
      { label: 'Organic', count: 17 },
    ];

    // Example of how to implement real database queries:
    /*
    // Get local committee data
    const [localResults] = await pool.execute(`
      SELECT 
        lc.entity_code as entity,
        COALESCE(lc.goal, 0) as goal,
        COUNT(DISTINCT s.id) as total,
        COUNT(DISTINCT CASE WHEN s.utm_source = lc.entity_code THEN s.id END) as yourUtm,
        COUNT(DISTINCT CASE WHEN s.utm_source IN ('EMT', 'Organic') THEN s.id END) as emtPlusOrganic,
        COUNT(DISTINCT CASE WHEN s.utm_source NOT IN ('EMT', 'Organic') AND s.utm_source IS NOT NULL THEN s.id END) as otherSource
      FROM local_committees lc
      LEFT JOIN submissions s ON s.entity_code = lc.entity_code
      WHERE s.created_at BETWEEN ? AND ?
      GROUP BY lc.entity_code, lc.goal
      ORDER BY total DESC
    `, [startDate, endDate]);

    // Get MSU data (unique by phone/email)
    const [msuResults] = await pool.execute(`
      SELECT 
        lc.entity_code as entity,
        COUNT(DISTINCT CONCAT(s.phone, s.email)) as msu
      FROM local_committees lc
      LEFT JOIN submissions s ON s.entity_code = lc.entity_code
      WHERE s.created_at BETWEEN ? AND ?
      GROUP BY lc.entity_code
    `, [startDate, endDate]);
    */

    return NextResponse.json({
      success: true,
      data: {
        local: mockLocalData,
        localTotals: mockLocalTotals,
        national: mockNationalData,
        filters: {
          term: termFilter,
          phase: phaseFilter,
          compare: comparePhase
        }
      }
    });

  } catch (error) {
    console.error('Error fetching signup summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch signup summary data' },
      { status: 500 }
    );
  }
}
