import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const pool = getDbPool();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const haveRange = Boolean(startDate && endDate);

    // Build query with optional date filter on submissions
    let query = `
      SELECT 
        f.type,
        f.id as form_id,
        f.name as form_name,
        f.code as form_code,
        COALESCE(COUNT(CASE WHEN fs.duplicated = FALSE AND (__DATE_FILTER__) THEN 1 END), 0) as form_submissions
      FROM forms f
      LEFT JOIN form_submissions fs ON f.id = fs.form_id
      WHERE f.type IN ('oGV', 'TMR')
      GROUP BY f.type, f.id, f.name, f.code
      ORDER BY f.type, form_submissions DESC`;
    

    // Replace date filter placeholders
    const params: any[] = [];
    if (haveRange) {
      const dateExpr = `DATE(fs.timestamp) BETWEEN ? AND ?`;
      query = query.replace(/__DATE_FILTER__/g, dateExpr);
      params.push(startDate, endDate);
    } else {
      query = query.replace(/__DATE_FILTER__/g, '1=1');
    }

    const [statsResult] = await pool.query(query, params);

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
      
      // Count total forms (each row represents one form)
      stats.totalForms += 1;
      
      // Sum all submissions for this form type
      stats.totalSubmissions += row.form_submissions;
      
      // Track highest phase (first row for each type due to ORDER BY DESC)
      if (row.form_submissions > stats.highestPhaseSubmissions) {
        stats.highestPhase = {
          id: row.form_id,
          name: row.form_name,
          code: row.form_code,
          submission_count: row.form_submissions
        };
        stats.highestPhaseSubmissions = row.form_submissions;
      }
    });
    
    const ogvStats = statsByType.get('oGV') || { totalForms: 0, totalSubmissions: 0, highestPhase: null };
    const tmrStats = statsByType.get('TMR') || { totalForms: 0, totalSubmissions: 0, highestPhase: null };
    

    const stats = {
      ogv: {
        totalForms: Number(ogvStats.totalForms),
        totalSubmissions: Number(ogvStats.totalSubmissions),
        highestPhase: ogvStats.highestPhase
      },
      tmr: {
        totalForms: Number(tmrStats.totalForms),
        totalSubmissions: Number(tmrStats.totalSubmissions),
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
