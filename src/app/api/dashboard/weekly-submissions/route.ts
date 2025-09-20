import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDbPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const formType = searchParams.get("form_type") || "TMR";
  const startWeek = searchParams.get("start_week");
  const weeksCount = parseInt(searchParams.get("weeks_count") || "5");

  const pool = getDbPool();

  try {
    // Calculate date range from start week
    let startDate: Date;
    if (startWeek) {
      const [year, week] = startWeek.split('-').map(Number);
      startDate = getDateFromWeek(year, week);
    } else {
      // Default to current week - 4 weeks (show last 5 weeks)
      const now = new Date();
      const currentWeek = getWeekNumber(now);
      startDate = getDateFromWeek(now.getFullYear(), currentWeek - 4);
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (weeksCount * 7));

    console.log('[Weekly Submissions] Query params:', {
      formType,
      startWeek,
      weeksCount,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });

    // Get forms of the specified type
    const [formsResult] = await pool.query(`
      SELECT id, name, code, type
      FROM forms 
      WHERE type = ?
      ORDER BY created_at DESC
    `, [formType]);

    const forms = Array.isArray(formsResult) ? formsResult : [];

    // Get weekly submissions for each form
    const weeklyData = await Promise.all(forms.map(async (form: any) => {
      const [submissionsResult] = await pool.query(`
        SELECT 
          MONTH(timestamp) as month,
          WEEK(timestamp, 1) as week_of_year,
          COUNT(*) as submissions_count
        FROM form_submissions 
        WHERE form_id = ? 
          AND duplicated = FALSE
          AND timestamp >= ? 
          AND timestamp < ?
        GROUP BY MONTH(timestamp), WEEK(timestamp, 1)
        ORDER BY month, week_of_year
      `, [form.id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

      const submissions = Array.isArray(submissionsResult) ? submissionsResult : [];
      
      // Create data points for all weeks in range
      const weeklyPoints = [];
      for (let i = 0; i < weeksCount; i++) {
        const weekDate = new Date(startDate);
        weekDate.setDate(startDate.getDate() + (i * 7));
        const month = weekDate.getMonth() + 1; // getMonth() returns 0-11
        const weekOfYear = getWeekOfYear(weekDate);
        
        const submission = submissions.find((s: any) => 
          s.month === month && s.week_of_year === weekOfYear
        );
        const submissionCount = submission ? (submission as any).submissions_count : 0;
        weeklyPoints.push({
          week: i + 1,
          month,
          weekOfYear,
          date: weekDate.toISOString().split('T')[0],
          submissions: submissionCount
        });
      }

      return {
        formId: form.id,
        formName: form.name,
        formCode: form.code,
        data: weeklyPoints
      };
    }));

    // Calculate total submissions per week across all forms
    const totalWeeklyData = [];
    for (let i = 0; i < weeksCount; i++) {
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + (i * 7));
      const month = weekDate.getMonth() + 1;
      const weekOfYear = getWeekOfYear(weekDate);
      
      const weekTotal = weeklyData.reduce((sum, formData) => {
        const weekData = formData.data.find(d => d.week === i + 1);
        return sum + (weekData ? weekData.submissions : 0);
      }, 0);

      totalWeeklyData.push({
        week: i + 1,
        month,
        weekOfYear,
        date: weekDate.toISOString().split('T')[0],
        submissions: weekTotal
      });
    }

    // Generate AI analysis
    const aiAnalysis = generateAIAnalysis(weeklyData, totalWeeklyData, formType);

    return NextResponse.json({
      success: true,
      data: {
        formType,
        startWeek: startWeek || getYearWeek(startDate),
        weeksCount,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        forms: weeklyData,
        total: totalWeeklyData,
        aiAnalysis
      }
    });

  } catch (error: any) {
    console.error('Error fetching weekly submissions:', error);
    return NextResponse.json(
      { error: "Failed to fetch weekly submissions data", details: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function getWeekNumber(date: Date): number {
  // Use ISO week number calculation
  const tempDate = new Date(date.getTime());
  const dayNum = (date.getDay() + 6) % 7;
  tempDate.setDate(tempDate.getDate() - dayNum + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
}

function getYearWeek(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-${week.toString().padStart(2, '0')}`;
}

function getWeekOfYear(date: Date): number {
  // Use ISO week number calculation
  const tempDate = new Date(date.getTime());
  const dayNum = (date.getDay() + 6) % 7;
  tempDate.setDate(tempDate.getDate() - dayNum + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
}

function getDateFromWeek(year: number, week: number): Date {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7;
  const date = new Date(firstDayOfYear);
  date.setDate(firstDayOfYear.getDate() + daysToAdd);
  
  // Adjust to Monday of the week
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setDate(date.getDate() + daysToMonday);
  
  return date;
}

function generateAIAnalysis(formsData: any[], totalData: any[], formType: string): string {
  if (formsData.length === 0) {
    return `No ${formType} forms found for analysis.`;
  }

  const totalSubmissions = totalData.reduce((sum, week) => sum + week.submissions, 0);
  const avgWeeklySubmissions = totalSubmissions / totalData.length;
  
  // Find best and worst performing weeks
  const bestWeek = totalData.reduce((max, week) => 
    week.submissions > max.submissions ? week : max, totalData[0]);
  const worstWeek = totalData.reduce((min, week) => 
    week.submissions < min.submissions ? week : min, totalData[0]);

  // Find best performing form
  const formTotals = formsData.map(form => ({
    name: form.formName,
    total: form.data.reduce((sum: number, week: any) => sum + week.submissions, 0)
  }));
  const bestForm = formTotals.reduce((max, form) => 
    form.total > max.total ? form : max, formTotals[0]);

  // Calculate trends
  const firstHalf = totalData.slice(0, Math.ceil(totalData.length / 2));
  const secondHalf = totalData.slice(Math.ceil(totalData.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, week) => sum + week.submissions, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, week) => sum + week.submissions, 0) / secondHalf.length;
  
  const trend = secondHalfAvg > firstHalfAvg ? 'increasing' : 
                secondHalfAvg < firstHalfAvg ? 'decreasing' : 'stable';

  let analysis = `**${formType} Weekly Submissions Analysis:**\n\n`;
  analysis += `• **Total submissions:** ${totalSubmissions.toLocaleString()} across ${totalData.length} weeks\n`;
  analysis += `• **Average per week:** ${avgWeeklySubmissions.toFixed(1)} submissions\n`;
  analysis += `• **Best week:** Week ${bestWeek.week} with ${bestWeek.submissions} submissions\n`;
  analysis += `• **Worst week:** Week ${worstWeek.week} with ${worstWeek.submissions} submissions\n`;
  analysis += `• **Top performing form:** ${bestForm.name} (${bestForm.total} total submissions)\n`;
  analysis += `• **Trend:** ${trend} (${trend === 'increasing' ? '↗️' : trend === 'decreasing' ? '↘️' : '➡️'})\n\n`;

  if (formsData.length > 1) {
    analysis += `**Form Performance Comparison:**\n`;
    formTotals.sort((a, b) => b.total - a.total).forEach((form, index) => {
      const percentage = ((form.total / totalSubmissions) * 100).toFixed(1);
      analysis += `${index + 1}. ${form.name}: ${form.total} submissions (${percentage}%)\n`;
    });
  }

  return analysis;
}
