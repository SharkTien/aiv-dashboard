import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/allocation-requests - Get allocation requests (admin can see all, lead can see their own)
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'lead')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const offset = (page - 1) * limit;
  const status = searchParams.get("status") || "";

  const pool = getDbPool();

  try {
    // Build WHERE clause
    let whereClause = "";
    const params: any[] = [];
    const conditions: string[] = [];

    // Lead users can only see their own requests
    if (user.role === 'lead') {
      conditions.push("ar.requested_by = ?");
      params.push(user.sub);
    }

    if (status) {
      conditions.push("ar.status = ?");
      params.push(status);
    }

    if (conditions.length > 0) {
      whereClause = "WHERE " + conditions.join(" AND ");
    }

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM allocation_requests ar ${whereClause}`,
      params
    );
    const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult[0] as any).total : 0;

    // Get allocation requests with related data
    const [requests] = await pool.query(
      `SELECT 
        ar.id,
        ar.submission_id,
        ar.requested_by,
        ar.requested_entity_id,
        ar.status,
        ar.admin_notes,
        ar.created_at,
        ar.updated_at,
        u.name as requester_name,
        u.email as requester_email,
        e.name as requested_entity_name,
        fs.timestamp as submission_timestamp,
        f.name as form_name,
        f.code as form_code
      FROM allocation_requests ar
      LEFT JOIN user u ON ar.requested_by = u.user_id
      LEFT JOIN entity e ON ar.requested_entity_id = e.entity_id
      LEFT JOIN form_submissions fs ON ar.submission_id = fs.id
      LEFT JOIN forms f ON fs.form_id = f.id
      ${whereClause}
      ORDER BY ar.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    const response = NextResponse.json({
      success: true,
      items: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

    // Cache for 30 seconds
    response.headers.set('Cache-Control', 'private, max-age=30');
    return response;

  } catch (error) {
    console.error('Error fetching allocation requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch allocation requests' },
      { status: 500 }
    );
  }
}

// POST /api/allocation-requests - Create allocation request
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only lead users can create allocation requests
  if (user.role !== 'lead') {
    return NextResponse.json({ error: "Only lead users can create allocation requests" }, { status: 403 });
  }

  const body = await request.json();
  const { submission_id, requested_entity_id } = body;

  if (!submission_id || !requested_entity_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Verify submission exists and is not already allocated
    const [submission] = await pool.query(
      `SELECT fs.id, fs.entity_id, f.name as form_name 
       FROM form_submissions fs
       LEFT JOIN forms f ON fs.form_id = f.id
       WHERE fs.id = ?`,
      [submission_id]
    );

    if (!Array.isArray(submission) || submission.length === 0) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const submissionData = submission[0] as any;
    if (submissionData.entity_id && submissionData.entity_id !== 0) {
      return NextResponse.json({ error: "Submission is already allocated" }, { status: 400 });
    }

    // Verify entity exists
    const [entity] = await pool.query(
      "SELECT entity_id, name FROM entity WHERE entity_id = ?",
      [requested_entity_id]
    );

    if (!Array.isArray(entity) || entity.length === 0) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Check if request already exists
    const [existing] = await pool.query(
      "SELECT id FROM allocation_requests WHERE submission_id = ? AND status = 'pending'",
      [submission_id]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ error: "Allocation request already exists for this submission" }, { status: 409 });
    }

    // Create allocation request
    const [result] = await pool.query(
      `INSERT INTO allocation_requests (submission_id, requested_by, requested_entity_id) 
       VALUES (?, ?, ?)`,
      [submission_id, user.sub, requested_entity_id]
    );

    const requestId = (result as any).insertId;

    // Create notification for admin
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data) 
       SELECT u.user_id, 'allocation_request', 'New Allocation Request', 
              CONCAT('User ', u.name, ' requested to allocate submission #', ?, ' to ', e.name),
              JSON_OBJECT('request_id', ?, 'submission_id', ?, 'entity_name', e.name, 'requester_name', u.name)
       FROM user u
       CROSS JOIN entity e
       WHERE u.role = 'admin' AND e.entity_id = ?`,
      [submission_id, requestId, submission_id, requested_entity_id]
    );

    return NextResponse.json({
      success: true,
      request: {
        id: requestId,
        submission_id,
        requested_entity_id,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error creating allocation request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create allocation request' },
      { status: 500 }
    );
  }
}
