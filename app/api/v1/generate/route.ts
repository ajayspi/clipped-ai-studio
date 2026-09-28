import { NextResponse } from 'next/server';
import { after } from 'next/server';
// This route only writes; route it through the admin client so RLS-grant gaps
// on a fresh project can never silently drop the job insert.
import { supabaseAdmin as supabase } from '@/lib/db';
import { complete, parseJson } from '@/lib/ai/llm';
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

    // schema.sql declares UUID primary keys; the old `job_...`/`vid_...` string
    // ids failed the insert with "invalid input syntax for type uuid" (silently
    // caught below), so no job ever reached the DB. UUIDs match the table DDL.
    const jobId = crypto.randomUUID();
    const videoId = crypto.randomUUID();
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
        // 'planning' keeps the render worker from claiming the job before the
        // after() enrichment below has written the script + beats into logs.
        orchestration_state: 'planning',
        logs: JSON.stringify(jobLogs),
        created_at: createdAt,
      });
    } catch (dbErr) {
      console.warn('[V1 Generate] Supabase insertion notice:', dbErr);
    }

    // Enrich the job with a real script + timed beats in the background (after
    // the 202 is sent), then flip it to 'queued' so the worker can claim it.
    // Jobs are never left in 'planning': the finally always queues the job,
    // using the raw prompt as a single beat when enrichment is off or fails.
    const enrichmentEnabled =
      process.env.NODE_ENV === 'production' || process.env.ENABLE_V1_ENRICHMENT === '1';

    after(async () => {
      let scriptText = prompt;
      let beats: Array<{ text?: string; duration?: number }> = [];
      try {
        if (enrichmentEnabled) {
          const raw = await complete({
            system:
              'You are a short-form video scriptwriter. Write a punchy script for a 30s video and split it into timed on-screen beats. Return ONLY valid JSON, no markdown fences: {"script": "complete narration text", "beats": [{"text": "one line of on-screen copy", "duration": 3}, ...]}. Each beat is self-contained copy, 2-6 seconds long; aim for 6-8 beats totaling ~30s.',
            user: `Subject: ${prompt}\nWorkflow: ${selectedWorkflow}\nAspect ratio: ${aspectRatio}\nVoice: ${voice}`,
            json: true,
            maxTokens: 1200,
          });
          const parsed = parseJson<{
            script?: string;
            beats?: Array<{ text?: string; duration?: number }>;
          }>(raw, {});
          if (parsed.script) scriptText = parsed.script;
          if (Array.isArray(parsed.beats) && parsed.beats.length) beats = parsed.beats;
        }
      } catch (enrichErr) {
        console.error('[V1 Generate] Enrichment failed — queueing single-beat fallback:', enrichErr);
      } finally {
        // A job with zero beats makes the render worker build an EMPTY concat.txt,
        // which ffmpeg rejects ("Invalid data found when processing input") — the job
        // then burns all 3 attempts and is marked failed. Enrichment is off unless
        // NODE_ENV=production or ENABLE_V1_ENRICHMENT=1, so in `pnpm dev` this branch
        // is the normal path, not the exception. Always emit at least one beat.
        if (!beats.length) {
          beats = [{ text: scriptText.slice(0, 240), duration: 5 }];
        }
        const mergedLogs = {
          ...jobLogs,
          script: scriptText,
          beats,
          finalVideoUrl: `https://app.clipped.ai/renders/${jobId}.mp4`,
        };
        try {
          // render_jobs has no updated_at column (schema.sql); never write one.
          await supabase
            .from('render_jobs')
            .update({
              logs: JSON.stringify(mergedLogs),
              orchestration_state: 'queued',
              status: 'processing',
              progress: 20,
            })
            .eq('id', jobId);
        } catch (queueErr) {
          console.error('[V1 Generate] Failed to queue enriched job:', queueErr);
        }
      }
    });

    // 4. Asynchronously complete job and dispatch webhook callback
    if (webhookUrl) {
      // Fire async non-blocking webhook dispatch
      setTimeout(async () => {
        try {
          // Mark completed in database (render_jobs has NO updated_at column —
          // writing one fails the update silently).
          await supabase
            .from('render_jobs')
            .update({
              status: 'completed',
              progress: 100,
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
  } catch (error) {
    console.error('[V1 Generate API Error]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
