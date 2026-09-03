import { NextResponse } from 'next/server';
import { whiteboardOrchestrator } from '@/lib/engine/whiteboard-orchestrator';
import { supabaseAdmin as supabase } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, script, characterArchetype, customCharacterDescription, style, markerColor, aspectRatio, voice, mock } = body;

    // 1. Validation
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required for whiteboard generation' },
        { status: 400 }
      );
    }

    const jobId = `wb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 2. Synchronous initial persistence to Supabase render_jobs
    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        user_id: 'default_user',
        status: 'pending',
        progress: 0,
        config: {
          workflow: 'whiteboard',
          prompt: prompt.trim(),
          characterArchetype: characterArchetype || 'stickman',
          style: style || 'monoline_marker',
          markerColor: markerColor || '#1E293B',
          aspectRatio: aspectRatio || '16:9',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('[API Whiteboard POST] Supabase initial insert note:', dbErr);
    }

    // 3. Launch background generation asynchronously
    const generationPromise = whiteboardOrchestrator.generateWhiteboard({
      prompt: prompt.trim(),
      script,
      characterArchetype,
      customCharacterDescription,
      style,
      markerColor,
      aspectRatio,
      voice,
      mock,
      jobId,
    });

    // If mock execution, await immediately for rapid feedback
    if (mock) {
      const result = await generationPromise;
      return NextResponse.json({
        success: true,
        jobId,
        status: 'completed',
        videoUrl: result.videoUrl,
        characterSheet: result.characterSheet,
        storyboard: result.storyboard,
        duration: result.duration,
        progressUrl: `/create/mission/${jobId}`,
      });
    }

    // Catch background errors
    generationPromise.catch((err) => {
      console.error(`[API Whiteboard POST] Background job ${jobId} failed:`, err);
    });

    // 4. Immediate HTTP 200 response with jobId
    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      progressUrl: `/create/mission/${jobId}`,
      message: 'Whiteboard animation workflow initiated successfully',
    });
  } catch (error: any) {
    console.error('[API Whiteboard POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate whiteboard generation' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = await whiteboardOrchestrator.getJob(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: job.jobId || id,
      status: job.status,
      progress: job.progress,
      videoUrl: job.videoUrl,
      characterSheet: job.characterSheet,
      storyboard: job.storyboard,
      duration: job.duration,
      metadata: job.metadata || {},
      error: job.error,
    });
  } catch (error: any) {
    console.error('[API Whiteboard GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve job status' },
      { status: 500 }
    );
  }
}
