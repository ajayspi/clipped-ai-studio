import { NextResponse } from 'next/server';
import { avatarOrchestrator } from '@/lib/engine/avatar-orchestrator';
import { supabaseAdmin as supabase } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      script,
      avatarType,
      avatarId,
      customImageUrl,
      layout,
      voice,
      speed,
      aspectRatio,
      backgroundVideoUrl,
      backgroundMusicUrl,
      mock,
    } = body;

    // 1. Validation
    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Script is required for avatar generation' },
        { status: 400 }
      );
    }

    const jobId = `av_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 2. Synchronous initial persistence to Supabase render_jobs
    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        user_id: 'default_user',
        status: 'pending',
        progress: 0,
        config: {
          workflow: 'avatar',
          script: script.trim(),
          avatarType: avatarType || 'preset',
          avatarId: avatarId || 'sarah_presenter',
          customImageUrl: customImageUrl || null,
          layout: layout || 'pip_bottom_right',
          voice: voice || 'nova',
          aspectRatio: aspectRatio || '9:16',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('[API Avatar POST] Supabase initial insert note:', dbErr);
    }

    // 3. Launch background generation asynchronously
    const generationPromise = avatarOrchestrator.generateAvatarVideo({
      script: script.trim(),
      avatarType,
      avatarId,
      customImageUrl,
      layout,
      voice,
      speed,
      aspectRatio,
      backgroundVideoUrl,
      backgroundMusicUrl,
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
        avatarId: result.avatarId,
        duration: result.duration,
        layout: result.layout,
        providerUsed: result.providerUsed,
        progressUrl: `/create/mission/${jobId}`,
      });
    }

    // Catch background errors
    generationPromise.catch((err) => {
      console.error(`[API Avatar POST] Background job ${jobId} failed:`, err);
    });

    // 4. Immediate HTTP 200 response with jobId
    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      progressUrl: `/create/mission/${jobId}`,
      message: 'Avatar video workflow initiated successfully',
    });
  } catch (error: any) {
    console.error('[API Avatar POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate avatar generation' },
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

    const job = await avatarOrchestrator.getJob(id);
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
      avatarId: job.avatarId,
      duration: job.duration,
      layout: job.layout,
      providerUsed: job.providerUsed,
      metadata: job.metadata || {},
      error: job.error,
    });
  } catch (error: any) {
    console.error('[API Avatar GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve job status' },
      { status: 500 }
    );
  }
}
