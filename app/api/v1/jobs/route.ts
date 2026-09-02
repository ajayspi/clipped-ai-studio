import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { calculateJobCost } from '@/lib/engine/cost-estimator';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
    const status = searchParams.get('status');

    let query = supabase
      .from('render_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error || !jobs) {
      return NextResponse.json({ success: true, jobs: [], total: 0 });
    }

    const formattedJobs = jobs.map((job) => {
      let logs: any = {};
      try {
        logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : (job.logs || {});
      } catch {}

      const cost = calculateJobCost(job);

      return {
        jobId: job.id,
        videoId: job.video_id,
        status: job.status,
        progress: job.progress ?? (job.status === 'completed' ? 100 : 0),
        workflow: job.workflow || logs.workflowType || 'footage',
        duration: Number(logs.duration || 30),
        videoUrl: logs.finalVideoUrl || null,
        createdAt: job.created_at,
        costEstimation: {
          totalCostUsd: cost.totalCostUsd,
          llmTokens: cost.llmTokens,
          ttsCharacters: cost.ttsCharacters,
        },
      };
    });

    return NextResponse.json({
      success: true,
      jobs: formattedJobs,
      total: formattedJobs.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
