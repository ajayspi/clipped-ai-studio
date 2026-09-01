import { NextResponse } from 'next/server';
import { missionOrchestrator } from '@/lib/engine/mission-orchestrator';

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

    // 1. Initialize Job State
    await missionOrchestrator.createJob(jobId, {
      prompt: cleanPrompt,
      aspectRatio,
      style,
      voice,
      mock: Boolean(mock),
    });

    // 2. Fire Background Orchestration Task
    setTimeout(async () => {
      try {
        await missionOrchestrator.executeMission(jobId, {
          prompt: cleanPrompt,
          aspectRatio,
          style,
          voice,
          mock: Boolean(mock),
        });
      } catch (err) {
        console.error(`[API /api/workflows/mission] Background mission error for ${jobId}:`, err);
      }
    }, 0);

    // 3. Return immediate response
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
