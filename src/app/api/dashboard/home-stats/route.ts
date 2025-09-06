import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const pool = getDbPool();
    
    // Get all stats in a single optimized query
    const [statsResult] = await pool.query(`
      SELECT 
        f.type,
        COUNT(DISTINCT f.id) as total_forms,
        COUNT(DISTINCT CASE WHEN fs.duplicated = FALSE THEN fs.id END) as total_submissions,
        f.id as highest_phase_id,
        f.name as highest_phase_name,
        f.code as highest_phase_code,
        COUNT(CASE WHEN fs.duplicated = FALSE THEN fs.id END) as highest_phase_submissions
      FROM forms f
      LEFT JOIN form_submissions fs ON f.id = fs.form_id
      WHERE f.type IN ('oGV', 'TMR')
      GROUP BY f.type, f.id, f.name, f.code
      ORDER BY f.type, highest_phase_submissions DESC
    `);

    const rows = Array.isArray(statsResult) ? statsResult : [];
    
    // Process results
    const statsByType = new Map();
    
    rows.forEach((row: any) => {
      const type = row.type;
      if (!statsByType.has(type)) {
        statsByType.set(type, {
          totalForms: 0,
          totalSubmissions: 0,
          highestPhase: null,
          highestPhaseSubmissions: 0
        });
      }
      
      const stats = statsByType.get(type);
      stats.totalForms = Math.max(stats.totalForms, row.total_forms);
      stats.totalSubmissions += row.total_submissions;
      
      // Track highest phase (first row for each type due to ORDER BY)
      if (row.highest_phase_submissions > stats.highestPhaseSubmissions) {
        stats.highestPhase = {
          id: row.highest_phase_id,
          name: row.highest_phase_name,
          code: row.highest_phase_code,
          submission_count: row.highest_phase_submissions
        };
        stats.highestPhaseSubmissions = row.highest_phase_submissions;
      }
    });
    
    const ogvStats = statsByType.get('oGV') || { totalForms: 0, totalSubmissions: 0, highestPhase: null };
    const tmrStats = statsByType.get('TMR') || { totalForms: 0, totalSubmissions: 0, highestPhase: null };

    const stats = {
      ogv: {
        totalForms: ogvStats.totalForms,
        totalSubmissions: ogvStats.totalSubmissions,
        highestPhase: ogvStats.highestPhase
      },
      tmr: {
        totalForms: tmrStats.totalForms,
        totalSubmissions: tmrStats.totalSubmissions,
        highestPhase: tmrStats.highestPhase
      }
    };

    const response = NextResponse.json({
      success: true,
      data: stats
    });
    
    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return response;

  } catch (error) {
    console.error('Error fetching home stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch home statistics' },
      { status: 500 }
    );
  }
}
