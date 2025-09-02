import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const offset = (page - 1) * limit;
    const search = searchParams.get("q") || "";
    const type = searchParams.get("type") || "";
    
    const pool = getDbPool();

    // Build WHERE clause
    let whereClause = "";
    const params: any[] = [];
    
    if (search.trim()) {
      whereClause += " WHERE (name LIKE ? OR code LIKE ?)";
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    
    if (type && type !== 'all') {
      whereClause += whereClause ? " AND" : " WHERE";
      whereClause += " type = ?";
      params.push(type);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM forms ${whereClause}`,
      params
    );
    const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult[0] as any).total : 0;

    // Fetch paginated forms
    const [forms] = await pool.execute(
      `SELECT 
        id,
        code,
        name,
        type,
        created_at,
        updated_at
      FROM forms 
      ${whereClause}
      ORDER BY type, name
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      items: forms,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  const { name, type = 'oGV' } = body || {};
  
  if (!name) {
    return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
  }

  if (!['oGV', 'TMR', 'EWA'].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Must be one of: oGV, TMR, EWA" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Start transaction
    await pool.query('START TRANSACTION');
    
    // Generate unique code based on name and timestamp
    const timestamp = Date.now();
    const code = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;
    
    console.log('Creating form with code:', code, 'name:', name, 'type:', type);
    
    const [result] = await pool.query(
      "INSERT INTO forms (code, name, type) VALUES (?, ?, ?)",
      [code, name, type]
    );
    
    const formId = (result as any).insertId;
    console.log('Form created with ID:', formId);
    
    // Commit transaction
    await pool.query('COMMIT');
    console.log('Form created successfully');
    
    return NextResponse.json({ 
      success: true, 
      form: { id: formId, code, name, type }
    });
  } catch (error) {
    // Rollback transaction on error
    try {
      await pool.query('ROLLBACK');
      console.log('Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error("Error rolling back transaction:", rollbackError);
    }
    
    console.error("Error creating form:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  const { id, code, name, type } = body || {};
  
  if (!id) {
    return NextResponse.json({ error: "Missing form id" }, { status: 400 });
  }

  if (type && !['oGV', 'TMR', 'EWA'].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Must be one of: oGV, TMR, EWA" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Verify form exists
    const [existingRows] = await pool.query("SELECT id FROM forms WHERE id = ?", [id]);
    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    // Check if code already exists (if updating code)
    if (code) {
      const [codeRows] = await pool.query("SELECT id FROM forms WHERE code = ? AND id != ?", [code, id]);
      if (Array.isArray(codeRows) && codeRows.length > 0) {
        return NextResponse.json({ error: "Form code already exists" }, { status: 409 });
      }
    }
    
    await pool.query(
      "UPDATE forms SET code = COALESCE(?, code), name = COALESCE(?, name), type = COALESCE(?, type) WHERE id = ?",
      [code ?? null, name ?? null, type ?? null, id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "Missing form id" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    const [result] = await pool.query("DELETE FROM forms WHERE id = ?", [id]);
    // @ts-expect-error mysql2 types
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
}
