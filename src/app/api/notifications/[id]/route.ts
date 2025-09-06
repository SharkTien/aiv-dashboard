import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PUT /api/notifications/[id] - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const notificationId = Number(id);

  if (!notificationId || isNaN(notificationId)) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Verify notification belongs to user
    const [existing] = await pool.query(
      "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
      [notificationId, user.sub]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Mark as read
    await pool.query(
      "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?",
      [notificationId]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const notificationId = Number(id);

  if (!notificationId || isNaN(notificationId)) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Verify notification belongs to user
    const [existing] = await pool.query(
      "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
      [notificationId, user.sub]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Delete notification
    await pool.query("DELETE FROM notifications WHERE id = ?", [notificationId]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
