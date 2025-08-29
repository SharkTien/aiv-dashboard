import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getDbPool();

  try {
    // Get total submissions for oGV forms only
    const [submissionsResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM form_submissions fs 
      JOIN forms f ON fs.form_id = f.id 
      WHERE f.type = 'oGV'
    `);
    const totalSubmissions = Array.isArray(submissionsResult) && submissionsResult.length > 0 
      ? (submissionsResult[0] as any).total : 0;

    // Get total oGV forms
    const [formsResult] = await pool.query("SELECT COUNT(*) as total FROM forms WHERE type = 'oGV'");
    const totalForms = Array.isArray(formsResult) && formsResult.length > 0 
      ? (formsResult[0] as any).total : 0;

    // Get total users (from entity table)
    const [usersResult] = await pool.query("SELECT COUNT(*) as total FROM entity");
    const totalUsers = Array.isArray(usersResult) && usersResult.length > 0 
      ? (usersResult[0] as any).total : 0;

    // Get submissions this month for oGV forms only
    const [monthlyResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM form_submissions fs 
      JOIN forms f ON fs.form_id = f.id 
      WHERE f.type = 'oGV' 
      AND MONTH(fs.timestamp) = MONTH(CURRENT_DATE()) 
      AND YEAR(fs.timestamp) = YEAR(CURRENT_DATE())
    `);
    const submissionsThisMonth = Array.isArray(monthlyResult) && monthlyResult.length > 0 
      ? (monthlyResult[0] as any).total : 0;

    // Get submissions last month for growth calculation (oGV forms only)
    const [lastMonthResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM form_submissions fs 
      JOIN forms f ON fs.form_id = f.id 
      WHERE f.type = 'oGV' 
      AND MONTH(fs.timestamp) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) 
      AND YEAR(fs.timestamp) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);
    const submissionsLastMonth = Array.isArray(lastMonthResult) && lastMonthResult.length > 0 
      ? (lastMonthResult[0] as any).total : 0;

    // Calculate growth percentages
    const submissionsGrowth = submissionsLastMonth > 0 
      ? ((submissionsThisMonth - submissionsLastMonth) / submissionsLastMonth) * 100 
      : 0;

    // Mock data for other growth metrics (in real app, you'd calculate these from historical data)
    const formsGrowth = 8.2;
    const usersGrowth = 15.7;

    // Count active oGV projects (forms with submissions in last 30 days)
    const [activeProjectsResult] = await pool.query(`
      SELECT COUNT(DISTINCT f.id) as total 
      FROM forms f 
      JOIN form_submissions fs ON f.id = fs.form_id 
      WHERE f.type = 'oGV' 
      AND fs.timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `);
    const activeProjects = Array.isArray(activeProjectsResult) && activeProjectsResult.length > 0 
      ? (activeProjectsResult[0] as any).total : 0;

    const stats = {
      totalSubmissions,
      totalForms,
      totalUsers,
      activeProjects,
      submissionsThisMonth,
      submissionsGrowth: Math.round(submissionsGrowth * 10) / 10, // Round to 1 decimal
      formsGrowth,
      usersGrowth
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
