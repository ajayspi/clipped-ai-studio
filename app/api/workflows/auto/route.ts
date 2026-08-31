import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { autoPilot } from "@/lib/engine/auto-pilot";
import { AspectRatio } from "@/lib/engine/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      pipelineName,
      niche,
      schedule,
      sourceStrategy,
      visualPipeline,
      autoPublish,
      targetPlatforms,
      voice,
      visualStyle,
      aspectRatio,
      mock,
    } = body;

    if (!pipelineName || typeof pipelineName !== 'string' || !pipelineName.trim()) {
      return NextResponse.json(
        { error: "pipelineName is required", success: false },
        { status: 400 }
      );
    }

    if (!niche || typeof niche !== 'string' || !niche.trim()) {
      return NextResponse.json(
        { error: "niche is required", success: false },
        { status: 400 }
      );
    }

    const inputPipelineName = pipelineName.trim();
    const inputNiche = niche.trim();

    // 1. Generate unique Job ID
    const jobId = crypto.randomUUID();

    // 2. Synchronous Supabase render_jobs pending insert
    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        status: 'pending',
        progress: 0,
        logs: JSON.stringify({
          workflow: 'auto',
          input: {
            pipelineName: inputPipelineName,
            niche: inputNiche,
            schedule: schedule || 'daily',
            sourceStrategy: sourceStrategy || 'trending-rss',
            visualPipeline: visualPipeline || 'ai-videos',
            autoPublish: Boolean(autoPublish),
            targetPlatforms: Array.isArray(targetPlatforms) && targetPlatforms.length > 0 ? targetPlatforms : ['youtube'],
            voice: voice || 'alloy',
            visualStyle: visualStyle || 'modern',
            aspectRatio: aspectRatio || '9:16',
            mock: Boolean(mock),
          },
        }),
        started_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn(`[Supabase] Initial pending auto-pilot job insert warning:`, dbErr);
    }

    // 3. Fire background execution task
    setTimeout(async () => {
      try {
        console.log(`[JOB ${jobId}] Processing Auto-Pilot pipeline "${inputPipelineName}" for niche: "${inputNiche}"...`);

        const result = await autoPilot.executePipeline({
          pipelineName: inputPipelineName,
          niche: inputNiche,
          schedule: schedule || 'daily',
          sourceStrategy: sourceStrategy || 'trending-rss',
          visualPipeline: visualPipeline || 'ai-videos',
          autoPublish: Boolean(autoPublish),
          targetPlatforms: Array.isArray(targetPlatforms) && targetPlatforms.length > 0 ? targetPlatforms : ['youtube'],
          voice: voice || 'alloy',
          visualStyle: visualStyle || 'modern, dynamic, high engagement, 4k',
          aspectRatio: (aspectRatio as AspectRatio) || '9:16',
        });

        await supabase.from('render_jobs').update({
          status: result.success ? 'completed' : 'failed',
          progress: result.success ? 100 : 0,
          logs: JSON.stringify({
            workflow: 'auto',
            result,
          }),
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        }).eq('id', jobId);

        console.log(`[JOB ${jobId}] Completed Auto-Pilot pipeline with status: ${result.success ? 'completed' : 'failed'}`);
      } catch (err: any) {
        console.error(`[JOB ${jobId}] Auto-Pilot pipeline failed:`, err);
        try {
          await supabase.from('render_jobs').update({
            status: 'failed',
            progress: 0,
            error_message: err?.message || 'Unknown error occurred during auto-pilot pipeline execution',
            completed_at: new Date().toISOString(),
          }).eq('id', jobId);
        } catch (updateErr) {
          console.error(`[JOB ${jobId}] Failed to update error status in DB:`, updateErr);
        }
      }
    }, 0);

    // 4. Return immediate 200 response with jobId
    return NextResponse.json({
      success: true,
      jobId,
      message: "Auto-pilot pipeline configured and scheduled",
    });
  } catch (error: any) {
    console.error("Auto-Pilot workflow trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger auto-pilot workflow", success: false },
      { status: 500 }
    );
  }
}
