import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

console.log('[Forms API] Module loaded');

export async function GET(request: NextRequest) {
  console.log('[Forms API] GET request received');
  try {
    const { searchParams } = new URL(request.url);
    console.log('[Forms API] Search params:', Object.fromEntries(searchParams.entries()));
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const offset = (page - 1) * limit;
    const search = searchParams.get("q") || "";
    const type = searchParams.get("type") || "";
    
    const pool = getDbPool();
    console.log('[Forms API] Database pool obtained');
    
    // Test database connection
    try {
      await pool.query("SELECT 1");
      console.log('[Forms API] Database connection test successful');
    } catch (dbError) {
      console.error('[Forms API] Database connection test failed:', dbError);
      throw dbError;
    }

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
    
    console.log('[Forms API] WHERE clause:', whereClause);
    console.log('[Forms API] WHERE params:', params);

    // Get total count
    console.log('[Forms API] Executing count query:', `SELECT COUNT(*) as total FROM forms ${whereClause}`, params);
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM forms ${whereClause}`,
      params
    );
    console.log('[Forms API] Count result:', countResult);
    const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult[0] as any).total : 0;

    // Fetch paginated forms - Simplified approach
    console.log('[Forms API] Executing forms query with params:', [...params, limit, offset]);
    let formsQuery = `SELECT 
        id,
        code,
        name,
        type,
        is_default,
        created_at,
        updated_at
      FROM forms 
      ${whereClause}
      ORDER BY type, is_default DESC, name
      LIMIT ${limit} OFFSET ${offset}`;
    
    console.log('[Forms API] Final query:', formsQuery);
    const [forms] = await pool.query(formsQuery, params);
    console.log('[Forms API] Forms query result:', forms);

    const totalPages = Math.ceil(total / limit);

    const response = NextResponse.json({
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
    
    // Cache for 2 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    
    return response;

  } catch (error) {
    console.error('Error fetching forms:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forms', details: error instanceof Error ? error.message : String(error) },
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
    
    
    const [result] = await pool.query(
      "INSERT INTO forms (code, name, type) VALUES (?, ?, ?)",
      [code, name, type]
    );
    
    const formId = (result as any).insertId;
    
    // Commit transaction
    await pool.query('COMMIT');
    
    return NextResponse.json({ 
      success: true, 
      form: { id: formId, code, name, type }
    });
  } catch (error) {
    // Rollback transaction on error
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
    }
    
    console.error("Error creating form:", error);
    
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

// PATCH endpoint to set form as default
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  const { id, is_default } = body || {};
  
  if (!id) {
    return NextResponse.json({ error: "Missing form id" }, { status: 400 });
  }

  const pool = getDbPool();
  
  try {
    // Start transaction
    await pool.query('START TRANSACTION');
    
    // Get form type first
    const [formRows] = await pool.query("SELECT type FROM forms WHERE id = ?", [id]);
    if (!Array.isArray(formRows) || formRows.length === 0) {
      await pool.query('ROLLBACK');
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    const formType = (formRows[0] as any).type;
    
    if (is_default) {
      // Remove default flag from all other forms of the same type
      await pool.query("UPDATE forms SET is_default = FALSE WHERE type = ? AND id != ?", [formType, id]);
    }
    
    // Set the specified form as default
    await pool.query("UPDATE forms SET is_default = ? WHERE id = ?", [is_default ? 1 : 0, id]);
    
    // Commit transaction
    await pool.query('COMMIT');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Rollback transaction on error
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
    }
    
    console.error("Error setting form as default:", error);
    return NextResponse.json({ error: "Failed to set form as default" }, { status: 500 });
  }
}
