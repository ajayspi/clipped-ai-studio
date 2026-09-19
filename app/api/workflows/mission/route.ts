import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/db';
import type { MissionJobParams } from '@/scripts/lib/job-params';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, aspectRatio = '9:16', style = 'cinematic', voice = 'alloy', mock = false } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const cleanPrompt = prompt.trim();
    const jobId = crypto.randomUUID();

    const jobParams: MissionJobParams = {
      type: 'mission',
      prompt: cleanPrompt,
      aspectRatio,
      style,
      voice,
      mock: Boolean(mock),
    };

    // Enqueue-only: insert a pending render_jobs row that the render-worker
    // claims via its Realtime wake-up. The background mission pipeline must NOT
    // run inside this request handler — a serverless function is torn down the
    // moment it returns, so setTimeout fire-and-forget dies on Vercel.
    const { error: insertError } = await supabase.from('render_jobs').insert({
      id: jobId,
      status: 'pending',
      progress: 0,
      workflow_type: 'mission',
      logs: JSON.stringify(jobParams),
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[API /api/workflows/mission] Enqueue failed:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message || 'Failed to enqueue mission' },
        { status: 500 }
      );
    }

    // Return the exact same response shape as before: the UI polls progressUrl
    // and reads stage steps from the GET handler, which is DB-backed.
    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      progressUrl: `/create/mission/${jobId}`,
      message: 'Automatic mission initiated successfully',
    });
  } catch (error: any) {
    console.error('[API /api/workflows/mission POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate mission' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('jobId');

    if (!id || !id.trim()) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = await missionOrchestrator.getJob(id.trim());
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Mission job not found' },
        { status: 404 }
      );
    }

    const status = job.error
      ? 'failed'
      : job.overallProgress === 100
      ? 'completed'
      : 'processing';

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status,
      overallProgress: job.overallProgress,
      currentStage: job.currentStage,
      steps: job.steps,
      error: job.error,
      data: {
        prompt: job.prompt,
        aspectRatio: job.aspectRatio,
        style: job.style,
        voice: job.voice,
        script: job.script,
        scenes: job.scenes,
        audioUrl: job.audioUrl,
        videoUrl: job.videoUrl,
      },
    });
  } catch (error: any) {
    console.error('[API /api/workflows/mission GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch mission status' },
      { status: 500 }
    );
  }
}
