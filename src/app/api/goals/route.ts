import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalType = searchParams.get('goal_type') || 'sus';
    
    const pool = getDbPool();

    // Fetch goals with entity and form information
    const [goals] = await pool.execute(`
      SELECT 
        g.id,
        g.entity_id,
        g.form_id,
        g.goal_type,
        g.goal_value,
        g.created_at,
        g.updated_at,
        e.name as entity_name,
        e.type as entity_type,
        f.name as form_name,
        f.code as form_code,
        f.type as form_type
      FROM goals g
      JOIN entity e ON g.entity_id = e.entity_id
      JOIN forms f ON g.form_id = f.id
      WHERE g.goal_type = ?
      ORDER BY e.type, e.name, f.name
    `, [goalType]);

    return NextResponse.json({
      success: true,
      items: goals
    });

  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
  const body = await req.json();
  const { entity_id, form_id, goal_type, goal_value } = body || {};
  
  if (!entity_id || !form_id || !goal_type || goal_value === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const pool = getDbPool();
    
    // Check if goal already exists for this entity, form and goal_type
    const [existing] = await pool.execute(
      "SELECT id FROM goals WHERE entity_id = ? AND form_id = ? AND goal_type = ?",
      [entity_id, form_id, goal_type]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ error: "Goal already exists for this entity, form and goal type" }, { status: 400 });
    }

    // Insert new goal
    await pool.execute(
      "INSERT INTO goals (entity_id, form_id, goal_type, goal_value) VALUES (?, ?, ?, ?)",
      [entity_id, form_id, goal_type, goal_value]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
  const body = await req.json();
  const { id, entity_id, form_id, goal_type, goal_value } = body || {};
  
  if (!id) {
    return NextResponse.json({ error: "Missing goal ID" }, { status: 400 });
  }

  try {
    const pool = getDbPool();
    
    // Update goal
    await pool.execute(
      "UPDATE goals SET entity_id = COALESCE(?, entity_id), form_id = COALESCE(?, form_id), goal_type = COALESCE(?, goal_type), goal_value = COALESCE(?, goal_value) WHERE id = ?",
      [entity_id ?? null, form_id ?? null, goal_type ?? null, goal_value ?? null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "Missing goal ID" }, { status: 400 });
  }

  try {
    const pool = getDbPool();
    
    // Delete goal
    await pool.execute("DELETE FROM goals WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
