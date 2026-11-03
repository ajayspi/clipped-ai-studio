import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { extractJobPresentation, CanonicalJobPresentation } from '@/lib/engine/job-presentation';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // optional filter: pending, processing, completed, failed
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    let query = supabaseAdmin
      .from('render_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('[Jobs GET] Supabase error:', error);
      return NextResponse.json({ jobs: [], error: error.message }, { status: 500 });
    }

    // Map render_jobs to a UI-friendly format using canonical presentation extractor
    const mapped: CanonicalJobPresentation[] = (jobs || []).map((job) =>
      extractJobPresentation(job)
    );

    // Separate into queued (active) vs completed
    const activeStatuses = [
      'pending',
      'generating_plan',
      'processing',
      'queued',
      'claimed',
      'rendering',
      'planning',
      'in_progress',
      'retryable',
    ];
    const queued = mapped.filter((j) =>
      activeStatuses.includes(j.status) ||
      (j.orchestration_state ? activeStatuses.includes(j.orchestration_state) : false)
    );
    const completed = mapped.filter((j) => j.status === 'completed');
    const failed = mapped.filter((j) => j.status === 'failed');

    return NextResponse.json({
      success: true,
      jobs: mapped,
      queued,
      completed,
      failed,
      counts: {
        total: mapped.length,
        queued: queued.length,
        completed: completed.length,
        failed: failed.length,
      },
    });
  } catch (err) {
    console.error('[Jobs GET] Unexpected error:', err);
    return NextResponse.json({ jobs: [], error: err instanceof Error ? err.message : 'Failed to load jobs' }, { status: 500 });
  }
}
