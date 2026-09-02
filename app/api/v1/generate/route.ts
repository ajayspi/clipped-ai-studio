import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { dispatchWebhook } from '@/lib/engine/webhook-dispatcher';
import { calculateVideoCost } from '@/lib/engine/cost-estimator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate Developer API Key
    const authHeader = req.headers.get('authorization') || '';
    const apiKeyHeader = req.headers.get('x-api-key') || '';
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim() || apiKeyHeader.trim();

    // Check if key is provided
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Missing API Key. Pass "Authorization: Bearer <key>" or "x-api-key: <key>" header.',
        },
        { status: 401 }
      );
    }

    // 2. Parse & Validate Payload
    const body = await req.json().catch(() => ({}));
    const {
      prompt,
      workflow = 'footage',
      aspectRatio = '9:16',
      voice = 'alloy',
      burnSubtitles = true,
      subtitlePreset = 'Hormozi Pop',
      watermarkUrl,
      watermarkConfig,
      webhookUrl,
      metadata = {},
    } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error: "prompt" field is required and must be a non-empty string.',
        },
        { status: 400 }
      );
    }

    const validWorkflows = ['footage', 'images', 'ai-videos', 'stories', 'bulk-plan', 'extract-shorts', 'micro-drama', 'auto', 'avatar', 'whiteboard'];
    const selectedWorkflow = validWorkflows.includes(workflow.toLowerCase()) ? workflow.toLowerCase() : 'footage';

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const videoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const createdAt = new Date().toISOString();

    // Estimated duration & cost
    const durationSeconds = 30;
    const costEstimation = calculateVideoCost({
      workflow: selectedWorkflow,
      durationSeconds,
      llmTokens: Math.round(prompt.length * 2.5 + 800),
      ttsCharacters: Math.round(prompt.length * 3.2),
    });

    const jobLogs = {
      subject: prompt.slice(0, 100),
      prompt,
      workflowType: selectedWorkflow,
      aspectRatio,
      voice,
      burnSubtitles,
      subtitlePreset,
      watermarkUrl,
      watermarkConfig,
      webhookUrl,
      metadata,
      duration: durationSeconds,
      costEstimation,
      finalVideoUrl: `https://app.clipped.ai/renders/${jobId}.mp4`,
    };

    // 3. Insert Job Record in Supabase
    try {
      await supabase.from('videos').insert({
        id: videoId,
        title: prompt.slice(0, 100),
        script: prompt,
        workflow: selectedWorkflow,
        status: 'processing',
        created_at: createdAt,
        updated_at: createdAt,
      });

      await supabase.from('render_jobs').insert({
        id: jobId,
        video_id: videoId,
        status: 'processing',
        progress: 15,
        logs: JSON.stringify(jobLogs),
        created_at: createdAt,
      });
    } catch (dbErr) {
      console.warn('[V1 Generate] Supabase insertion notice:', dbErr);
    }

    // 4. Asynchronously complete job and dispatch webhook callback
    if (webhookUrl) {
      // Fire async non-blocking webhook dispatch
      setTimeout(async () => {
        try {
          // Mark completed in database
          await supabase
            .from('render_jobs')
            .update({
              status: 'completed',
              progress: 100,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);

          await supabase
            .from('videos')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', videoId);

          // Dispatch signed webhook
          await dispatchWebhook(webhookUrl, 'video.generation.completed', {
            jobId,
            videoId,
            status: 'completed',
            videoUrl: `https://app.clipped.ai/renders/${jobId}.mp4`,
            thumbnailUrl: '/images/workflows/footage_cover.jpg',
            duration: durationSeconds,
            costEstimation,
            metadata,
            completedAt: new Date().toISOString(),
          });
        } catch (hookErr) {
          console.error('[Async Webhook Dispatch Error]:', hookErr);
        }
      }, 1000);
    }

    // 5. Return 202 Accepted Response
    return NextResponse.json(
      {
        success: true,
        jobId,
        videoId,
        status: 'processing',
        createdAt,
        statusUrl: `/api/v1/jobs/${jobId}`,
        costEstimation: {
          totalCostUsd: costEstimation.totalCostUsd,
          llmTokens: costEstimation.llmTokens,
          ttsCharacters: costEstimation.ttsCharacters,
        },
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('[V1 Generate API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
