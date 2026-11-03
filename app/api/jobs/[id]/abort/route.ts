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

    const { data: updatedJob, error: updateError } = await supabase
      .from('render_jobs')
      .update({
        orchestration_state: 'failed',
        status: 'failed',
        error_message: 'Job cancelled by user from Queue deck.',
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
    console.error('Failed to abort render job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
