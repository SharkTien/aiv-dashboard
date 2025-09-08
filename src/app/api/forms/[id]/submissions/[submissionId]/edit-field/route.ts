import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id, submissionId: submissionIdParam } = await params;
    const formId = parseInt(id);
    const submissionId = parseInt(submissionIdParam);

    if (isNaN(formId) || isNaN(submissionId)) {
      return NextResponse.json({ error: 'Invalid form ID or submission ID' }, { status: 400 });
    }

    const { field_name, value } = await request.json();
    if (!field_name || typeof field_name !== 'string') {
      return NextResponse.json({ error: 'field_name is required' }, { status: 400 });
    }

    const pool = getDbPool();

    // Ensure field exists on this form
    const [fieldRows] = await pool.query(
      'SELECT id, field_name FROM form_fields WHERE form_id = ? AND field_name = ? LIMIT 1',
      [formId, field_name]
    );
    const field = Array.isArray(fieldRows) && fieldRows.length > 0 ? (fieldRows as any)[0] : null;
    if (!field) {
      return NextResponse.json({ error: 'Field not found in this form' }, { status: 404 });
    }

    // Ensure submission belongs to this form
    const [subRows] = await pool.query('SELECT id FROM form_submissions WHERE id = ? AND form_id = ? LIMIT 1', [submissionId, formId]);
    if (!Array.isArray(subRows) || subRows.length === 0) {
      return NextResponse.json({ error: 'Submission not found for this form' }, { status: 404 });
    }

    // Upsert response
    const [existingRes] = await pool.query(
      'SELECT id FROM form_responses WHERE submission_id = ? AND field_id = ? LIMIT 1',
      [submissionId, field.id]
    );
    const existing = Array.isArray(existingRes) && existingRes.length > 0 ? (existingRes as any)[0] : null;

    if (existing) {
      await pool.query('UPDATE form_responses SET value = ? WHERE id = ?', [value ?? null, existing.id]);
    } else {
      await pool.query('INSERT INTO form_responses (submission_id, field_id, value) VALUES (?, ?, ?)', [submissionId, field.id, value ?? null]);
    }

    // Compute value_label similar to other endpoints for known mappings
    let value_label: string | null = value ?? null;
    if (field.field_name === 'uni' && value && value !== 'other--uni-2') {
      const [umRows] = await pool.query('SELECT uni_name FROM uni_mapping WHERE uni_id = ? LIMIT 1', [value]);
      if (Array.isArray(umRows) && umRows.length > 0) {
        value_label = (umRows as any)[0].uni_name || value_label;
      }
    }

    return NextResponse.json({ success: true, field_name, value, value_label });

  } catch (error) {
    console.error('Error editing submission field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


