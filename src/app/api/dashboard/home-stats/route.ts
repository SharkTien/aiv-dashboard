import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const pool = getDbPool();
    
    // Get oGV forms count
    const [ogvFormsResult] = await pool.query(`
      SELECT COUNT(*) as total FROM forms WHERE type = 'oGV'
    `);
    const ogvForms = Array.isArray(ogvFormsResult) && ogvFormsResult.length > 0 ? (ogvFormsResult[0] as any).total : 0;
    
    // Get TMR forms count
    const [tmrFormsResult] = await pool.query(`
      SELECT COUNT(*) as total FROM forms WHERE type = 'TMR'
    `);
    const tmrForms = Array.isArray(tmrFormsResult) && tmrFormsResult.length > 0 ? (tmrFormsResult[0] as any).total : 0;
    
    // Get oGV submissions count (clean, non-duplicated)
    const [ogvSubmissionsResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM form_submissions fs
      JOIN forms f ON fs.form_id = f.id
      WHERE f.type = 'oGV' AND fs.duplicated = FALSE
    `);
    const ogvSubmissions = Array.isArray(ogvSubmissionsResult) && ogvSubmissionsResult.length > 0 ? (ogvSubmissionsResult[0] as any).total : 0;
    
    // Get TMR submissions count (clean, non-duplicated)
    const [tmrSubmissionsResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM form_submissions fs
      JOIN forms f ON fs.form_id = f.id
      WHERE f.type = 'TMR' AND fs.duplicated = FALSE
    `);
    const tmrSubmissions = Array.isArray(tmrSubmissionsResult) && tmrSubmissionsResult.length > 0 ? (tmrSubmissionsResult[0] as any).total : 0;
    
    // Get highest phase for oGV (form with most submissions)
    const [ogvHighestPhaseResult] = await pool.query(`
      SELECT f.id, f.name, f.code, COUNT(fs.id) as submission_count
      FROM forms f
      LEFT JOIN form_submissions fs ON f.id = fs.form_id AND fs.duplicated = FALSE
      WHERE f.type = 'oGV'
      GROUP BY f.id, f.name, f.code
      ORDER BY submission_count DESC
      LIMIT 1
    `);
    const ogvHighestPhase = Array.isArray(ogvHighestPhaseResult) && ogvHighestPhaseResult.length > 0 ? ogvHighestPhaseResult[0] : null;
    
    // Get highest phase for TMR (form with most submissions)
    const [tmrHighestPhaseResult] = await pool.query(`
      SELECT f.id, f.name, f.code, COUNT(fs.id) as submission_count
      FROM forms f
      LEFT JOIN form_submissions fs ON f.id = fs.form_id AND fs.duplicated = FALSE
      WHERE f.type = 'TMR'
      GROUP BY f.id, f.name, f.code
      ORDER BY submission_count DESC
      LIMIT 1
    `);
    const tmrHighestPhase = Array.isArray(tmrHighestPhaseResult) && tmrHighestPhaseResult.length > 0 ? tmrHighestPhaseResult[0] : null;

    const stats = {
      ogv: {
        totalForms: ogvForms,
        totalSubmissions: ogvSubmissions,
        highestPhase: ogvHighestPhase
      },
      tmr: {
        totalForms: tmrForms,
        totalSubmissions: tmrSubmissions,
        highestPhase: tmrHighestPhase
      }
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching home stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch home statistics' },
      { status: 500 }
    );
  }
}
