import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const pool = getDbPool();
    const { id } = await params;
    const goalId = parseInt(id);

    if (isNaN(goalId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal ID' },
        { status: 400 }
      );
    }

    // Check if goal exists
    const [existingRows] = await pool.query(
      'SELECT id FROM goals WHERE id = ?',
      [goalId]
    );

    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Delete goal from database
    await pool.query('DELETE FROM goals WHERE id = ?', [goalId]);

    return NextResponse.json({
      success: true,
      message: 'Goal deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
