import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { DEDUPLICATION_PARTITION } from '@/lib/deduplication';

export async function GET(request: NextRequest) {
  try {
    const pool = getDbPool();
    
    // Get total forms count
    const [formsResult] = await pool.query(`
      SELECT COUNT(*) as total FROM forms WHERE status = 'active'
    `);
    const totalForms = Array.isArray(formsResult) && formsResult.length > 0 ? (formsResult[0] as any).total : 0;
    
    // Get active users count (users who submitted forms in last 30 days)
    const [usersResult] = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as total FROM form_submissions 
      WHERE user_id IS NOT NULL AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    const activeUsers = Array.isArray(usersResult) && usersResult.length > 0 ? (usersResult[0] as any).total : 0;
    
    // Get total submissions after deduplication
    const [submissionsResult] = await pool.query(`
      WITH RankedSubmissions AS (
        SELECT 
          fs.id,
          ROW_NUMBER() OVER (${DEDUPLICATION_PARTITION}) as rn
        FROM form_submissions fs
        LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
          AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = fs.form_id AND field_name = 'phone')
        LEFT JOIN form_responses email ON fs.id = email.submission_id 
          AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = fs.form_id AND field_name = 'email')
      )
      SELECT COUNT(*) as total
      FROM RankedSubmissions 
      WHERE rn = 1
    `);
    const submissions = Array.isArray(submissionsResult) && submissionsResult.length > 0 ? (submissionsResult[0] as any).total : 0;
    
    // Calculate conversion rate (placeholder for now)
    const conversionRate = 72.1;

    const stats = {
      totalForms,
      activeUsers,
      submissions,
      conversionRate
    };

    // Example of how to implement real database queries:
    /*
    // Get total forms count
    const [formsResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM forms WHERE status = 'active'
    `);
    
    // Get active users count
    const [usersResult] = await pool.execute(`
      SELECT COUNT(DISTINCT user_id) as total FROM form_submissions 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    // Get total submissions
    const [submissionsResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM form_submissions
    `);
    
    // Calculate conversion rate (submissions / unique visitors)
    const [conversionResult] = await pool.execute(`
      SELECT 
        (COUNT(DISTINCT s.id) / COUNT(DISTINCT v.id)) * 100 as rate
      FROM form_visits v
      LEFT JOIN form_submissions s ON v.form_id = s.form_id AND v.session_id = s.session_id
    `);
    */

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching overview stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch overview statistics' },
      { status: 500 }
    );
  }
}
