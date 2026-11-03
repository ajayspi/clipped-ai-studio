import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await props.params;
  const { id } = resolvedParams;

  if (!id) {
    return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Verify job exists
    const { data: job, error: fetchError } = await supabase
      .from('render_jobs')
      .select('id, orchestration_state, status, logs')
      .eq('id', id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Set orchestration_state to 'retryable' to release worker lease locks cleanly
    const { data: updatedJob, error: updateError } = await supabase
      .from('render_jobs')
      .update({
        orchestration_state: 'retryable',
        status: 'pending',
        progress: 0,
        error_message: null,
        lease_holder: null,
        lease_expires_at: null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error) {
    console.error('Failed to retry render job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
