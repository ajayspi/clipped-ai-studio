import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { calculateJobCost, calculateVideoCost } from '@/lib/engine/cost-estimator';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
    }

    // 1. Fetch Job from Supabase
    let jobRecord: any = null;
    try {
      const { data, error } = await supabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!error && data) {
        jobRecord = data;
      }
    } catch (dbErr) {
      console.warn('[V1 Jobs Lookup Fallback]:', dbErr);
    }

    let parsedLogs: any = {};
    if (jobRecord) {
      try {
        parsedLogs = typeof jobRecord.logs === 'string' ? JSON.parse(jobRecord.logs) : (jobRecord.logs || {});
      } catch {}
    }

    const status = jobRecord ? jobRecord.status : 'completed';
    const progress = jobRecord ? (jobRecord.progress ?? (status === 'completed' ? 100 : 45)) : 100;
    const createdAt = jobRecord?.created_at || new Date(Date.now() - 45000).toISOString();
    const completedAt = status === 'completed'
      ? (jobRecord?.updated_at || new Date().toISOString())
      : undefined;

    const duration = Number(parsedLogs?.duration || 30);
    const videoUrl = parsedLogs?.finalVideoUrl || `https://app.clipped.ai/renders/${jobId}.mp4`;
    const thumbnailUrl = parsedLogs?.thumbnail || '/images/workflows/footage_cover.jpg';

    // Compute Cost Estimation
    const costEstimation = jobRecord
      ? calculateJobCost(jobRecord)
      : calculateVideoCost({ durationSeconds: duration, workflow: parsedLogs?.workflowType || 'footage' });

    return NextResponse.json({
      success: true,
      jobId,
      status,
      progress,
      videoUrl: status === 'completed' ? videoUrl : undefined,
      thumbnailUrl: status === 'completed' ? thumbnailUrl : undefined,
      duration,
      createdAt,
      completedAt,
      costEstimation: {
        totalCostUsd: costEstimation.totalCostUsd,
        llmTokens: costEstimation.llmTokens,
        ttsCharacters: costEstimation.ttsCharacters,
        breakdown: {
          llmCostUsd: costEstimation.llmCostUsd,
          ttsCostUsd: costEstimation.ttsCostUsd,
          videoAssetsCostUsd: costEstimation.videoAssetsCostUsd,
          computeCostUsd: costEstimation.computeCostUsd,
        },
      },
      metadata: parsedLogs?.metadata || {},
    });
  } catch (error: any) {
    console.error('[V1 Job Status API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve job status' },
      { status: 500 }
    );
  }
}
