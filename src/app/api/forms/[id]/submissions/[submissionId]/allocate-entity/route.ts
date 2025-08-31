import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id, submissionId: submissionIdParam } = await params;
    const formId = parseInt(id);
    const submissionId = parseInt(submissionIdParam);
    
    if (isNaN(formId) || isNaN(submissionId)) {
      return NextResponse.json({ error: 'Invalid form ID or submission ID' }, { status: 400 });
    }

    const body = await request.json();
    const { entity_id } = body;

    if (!entity_id || isNaN(entity_id)) {
      return NextResponse.json({ error: 'Invalid entity_id' }, { status: 400 });
    }

    const pool = getDbPool();
    
    // Verify that the submission belongs to the form
    const verifyQuery = `
      SELECT id FROM form_submissions 
      WHERE id = ? AND form_id = ?
    `;
    
    const [verification] = await pool.query(verifyQuery, [submissionId, formId]);
    
    if (!verification || (verification as any[]).length === 0) {
      return NextResponse.json({ error: 'Submission not found or does not belong to this form' }, { status: 404 });
    }

    // Update the entity_id
    const updateQuery = `
      UPDATE form_submissions 
      SET entity_id = ? 
      WHERE id = ?
    `;

    await pool.query(updateQuery, [entity_id, submissionId]);

    return NextResponse.json({ 
      success: true,
      message: 'Entity allocated successfully'
    });

  } catch (error) {
    console.error('Error allocating entity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
