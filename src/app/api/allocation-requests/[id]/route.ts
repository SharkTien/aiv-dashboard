import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PUT /api/allocation-requests/[id] - Approve/Reject allocation request (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const requestId = Number(id);

  if (!requestId || isNaN(requestId)) {
    return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
  }

  const body = await request.json();
  const { action, admin_notes } = body; // action: 'approve' or 'reject'

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Get allocation request details
    const [requestData] = await pool.query(
      `SELECT 
        ar.id,
        ar.submission_id,
        ar.requested_by,
        ar.requested_entity_id,
        ar.status,
        u.name as requester_name,
        u.email as requester_email,
        e.name as requested_entity_name
      FROM allocation_requests ar
      LEFT JOIN user u ON ar.requested_by = u.user_id
      LEFT JOIN entity e ON ar.requested_entity_id = e.entity_id
      WHERE ar.id = ?`,
      [requestId]
    );

    if (!Array.isArray(requestData) || requestData.length === 0) {
      return NextResponse.json({ error: "Allocation request not found" }, { status: 404 });
    }

    const request = requestData[0] as any;

    if (request.status !== 'pending') {
      return NextResponse.json({ error: "Request has already been processed" }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Start transaction
    await pool.query('START TRANSACTION');

    try {
      // Update allocation request
      await pool.query(
        `UPDATE allocation_requests 
         SET status = ?, admin_notes = ?, updated_at = NOW() 
         WHERE id = ?`,
        [newStatus, admin_notes || null, requestId]
      );

      if (action === 'approve') {
        // Update submission entity
        await pool.query(
          `UPDATE form_submissions 
           SET entity_id = ? 
           WHERE id = ?`,
          [request.requested_entity_id, request.submission_id]
        );
      }

      // Create notification for requester
      const notificationTitle = action === 'approve' 
        ? 'Allocation Request Approved' 
        : 'Allocation Request Rejected';
      
      const notificationMessage = action === 'approve'
        ? `Your request to allocate submission #${request.submission_id} to ${request.requested_entity_name} has been approved.`
        : `Your request to allocate submission #${request.submission_id} to ${request.requested_entity_name} has been rejected.`;

      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, data) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          request.requested_by,
          action === 'approve' ? 'allocation_approved' : 'allocation_rejected',
          notificationTitle,
          notificationMessage,
          JSON.stringify({
            request_id: requestId,
            submission_id: request.submission_id,
            entity_name: request.requested_entity_name,
            admin_notes
          })
        ]
      );

      // Commit transaction
      await pool.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Allocation request ${action}d successfully`,
        request: {
          id: requestId,
          status: newStatus,
          admin_notes
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error processing allocation request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process allocation request' },
      { status: 500 }
    );
  }
}

// GET /api/allocation-requests/[id] - Get specific allocation request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const requestId = Number(id);

  if (!requestId || isNaN(requestId)) {
    return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Get allocation request with submission details
    const [requestData] = await pool.query(
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
      WHERE ar.id = ?`,
      [requestId]
    );

    if (!Array.isArray(requestData) || requestData.length === 0) {
      return NextResponse.json({ error: "Allocation request not found" }, { status: 404 });
    }

    const request = requestData[0] as any;

    // Check permissions
    if (user.role !== 'admin' && request.requested_by !== user.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get submission responses
    const [responses] = await pool.query(
      `SELECT 
        ff.field_name,
        ff.field_label,
        ff.field_type,
        fr.value,
        CASE 
          WHEN fr.value = 'other--uni-2' THEN 'other--uni-2'
          WHEN um.uni_name IS NOT NULL THEN um.uni_name
          ELSE fr.value
        END AS value_label
      FROM form_responses fr
      JOIN form_fields ff ON fr.field_id = ff.id
      LEFT JOIN uni_mapping um
        ON ff.field_name = 'uni'
        AND fr.value = um.uni_id
      WHERE fr.submission_id = ?
      ORDER BY ff.sort_order ASC`,
      [request.submission_id]
    );

    return NextResponse.json({
      success: true,
      request: {
        ...request,
        responses: responses || []
      }
    });

  } catch (error) {
    console.error('Error fetching allocation request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch allocation request' },
      { status: 500 }
    );
  }
}

// DELETE /api/allocation-requests/[id] - Delete allocation request (only by requester)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const requestId = Number(id);

  if (!requestId || isNaN(requestId)) {
    return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
  }

  const pool = getDbPool();

  try {
    // Get allocation request details
    const [requestData] = await pool.query(
      `SELECT id, requested_by, status FROM allocation_requests WHERE id = ?`,
      [requestId]
    );

    if (!Array.isArray(requestData) || requestData.length === 0) {
      return NextResponse.json({ error: "Allocation request not found" }, { status: 404 });
    }

    const request = requestData[0] as any;

    // Check permissions - only the requester or admin can delete
    if (user.role !== 'admin' && request.requested_by !== user.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow deletion of pending requests
    if (request.status !== 'pending') {
      return NextResponse.json({ error: "Can only delete pending requests" }, { status: 400 });
    }

    // Delete the request
    await pool.query("DELETE FROM allocation_requests WHERE id = ?", [requestId]);

    // Delete related notifications
    await pool.query(
      `DELETE FROM notifications 
       WHERE type = 'allocation_request' 
       AND JSON_EXTRACT(data, '$.request_id') = ?`,
      [requestId]
    );

    return NextResponse.json({ success: true, message: "Allocation request deleted successfully" });

  } catch (error) {
    console.error('Error deleting allocation request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete allocation request' },
      { status: 500 }
    );
  }
}
