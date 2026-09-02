import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

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

    // Map render_jobs to a UI-friendly format
    const mapped = (jobs || []).map((job: any) => ({
      id: job.id,
      video_id: job.id,
      title: job.title || job.topic || 'Untitled Video',
      status: job.status, // pending | generating_plan | processing | completed | failed
      progress: job.progress || 0,
      thumbnail: job.thumbnail_url || getThumbnailForWorkflow(job.workflow_type),
      workspace_id: job.workspace_id || null,
      workflow_type: job.workflow_type || 'Auto',
      created_at: job.created_at,
      updated_at: job.updated_at,
      error_message: job.error_message || null,
      output_url: job.output_url || null,
      clip_count: job.clip_count || 0,
    }));

    // Separate into queued (active) vs completed
    const queued = mapped.filter((j: any) => ['pending', 'generating_plan', 'processing'].includes(j.status));
    const completed = mapped.filter((j: any) => j.status === 'completed');
    const failed = mapped.filter((j: any) => j.status === 'failed');

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
  } catch (err: any) {
    console.error('[Jobs GET] Unexpected error:', err);
    return NextResponse.json({ jobs: [], error: err.message }, { status: 500 });
  }
}

function getThumbnailForWorkflow(type: string): string {
  const map: Record<string, string> = {
    'auto': '/images/workflows/auto_cover.jpg',
    'ai-videos': '/images/workflows/ai_videos_cover.jpg',
    'avatar': '/images/workflows/avatar_cover.jpg',
    'micro-drama': '/images/workflows/drama_cover.jpg',
    'drama': '/images/workflows/drama_cover.jpg',
    'whiteboard': '/images/workflows/whiteboard_cover.jpg',
    'stories': '/images/workflows/stories_cover.jpg',
    'bulk': '/images/workflows/bulk_cover.jpg',
    'extract-shorts': '/images/workflows/shorts_cover.jpg',
    'shorts': '/images/workflows/shorts_cover.jpg',
    'footage': '/images/workflows/footage_cover.jpg',
    'images': '/images/workflows/images_cover.jpg',
    'url': '/images/workflows/url_cover.jpg',
    'mission': '/images/workflows/mission_cover.jpg',
  };
  return map[(type || '').toLowerCase()] || '/images/workflows/auto_cover.jpg';
}
