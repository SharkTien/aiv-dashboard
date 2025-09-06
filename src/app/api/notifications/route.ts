import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const offset = (page - 1) * limit;
  const type = searchParams.get("type") || "";
  const unreadOnly = searchParams.get("unread_only") === "true";

  const pool = getDbPool();

  try {
    // Build WHERE clause
    let whereClause = "WHERE n.user_id = ?";
    const params: any[] = [user.sub];

    if (type) {
      whereClause += " AND n.type = ?";
      params.push(type);
    }

    if (unreadOnly) {
      whereClause += " AND n.is_read = 0";
    }

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM notifications n ${whereClause}`,
      params
    );
    const total = Array.isArray(countResult) && countResult.length > 0 ? (countResult[0] as any).total : 0;

    // Get notifications
    const [notifications] = await pool.query(
      `SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.is_read,
        n.created_at,
        n.read_at
      FROM notifications n 
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    const response = NextResponse.json({
      success: true,
      items: notifications,
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
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create notification (admin only)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { user_id, type, title, message, data } = body;

  if (!user_id || !type || !title || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data) 
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, type, title, message, data ? JSON.stringify(data) : null]
    );

    const notificationId = (result as any).insertId;

    return NextResponse.json({
      success: true,
      notification: {
        id: notificationId,
        user_id,
        type,
        title,
        message,
        data
      }
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete notifications by filter
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, data } = body;

  const pool = getDbPool();

  try {
    let whereClause = "WHERE user_id = ?";
    const params: any[] = [user.sub];

    if (type) {
      whereClause += " AND type = ?";
      params.push(type);
    }

    if (data && data.request_id) {
      whereClause += " AND JSON_EXTRACT(data, '$.request_id') = ?";
      params.push(data.request_id);
    }

    const [result] = await pool.query(
      `DELETE FROM notifications ${whereClause}`,
      params
    );

    const deletedCount = (result as any).affectedRows;

    return NextResponse.json({
      success: true,
      deletedCount
    });

  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
