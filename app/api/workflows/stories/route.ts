import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { storiesOrchestrator } from "@/lib/engine/stories-orchestrator";
import { AspectRatio } from "@/lib/engine/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      topic,
      storyType,
      partsCount,
      visualStyle,
      voice,
      aspectRatio,
      includeHooks,
      mock,
    } = body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json(
        { error: "Topic is required", success: false },
        { status: 400 }
      );
    }

    const inputTopic = topic.trim();
    const inputPartsCount = partsCount ? Number(partsCount) : 3;

    // 1. Generate unique Job ID
    const jobId = crypto.randomUUID();

    // 2. Synchronous Supabase render_jobs insert
    // Using 'processing' instead of 'pending' so the separate Remotion render-worker ignores it.
    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        status: 'processing',
        progress: 0,
        logs: JSON.stringify({
          workflow: 'stories',
          input: {
            topic: inputTopic,
            storyType: storyType || 'mystery',
            partsCount: inputPartsCount,
            visualStyle: visualStyle || 'cinematic',
            voice: voice || 'nova',
            aspectRatio: aspectRatio || '9:16',
            includeHooks: includeHooks !== false,
            mock: Boolean(mock),
          },
        }),
        started_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn(`[Supabase] Initial pending stories job insert warning:`, dbErr);
    }

    // 3. Fire background execution task
    setTimeout(async () => {
      try {
        console.log(`[JOB ${jobId}] Processing Stories workflow for topic: "${inputTopic}"...`);

        const result = await storiesOrchestrator.generateStorySeries({
          topic: inputTopic,
          storyType: storyType || 'mystery',
          partsCount: inputPartsCount,
          visualStyle: visualStyle || 'cinematic, 8k, atmospheric lighting',
          voice: voice || 'nova',
          aspectRatio: (aspectRatio as AspectRatio) || '9:16',
          includeHooks: includeHooks !== false,
        });

        await supabase.from('render_jobs').update({
          status: result.success ? 'completed' : 'failed',
          progress: result.success ? 100 : 0,
          logs: JSON.stringify({
            workflow: 'stories',
            result,
          }),
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        }).eq('id', jobId);

        console.log(`[JOB ${jobId}] Completed Stories workflow with status: ${result.success ? 'completed' : 'failed'}`);
      } catch (err: any) {
        console.error(`[JOB ${jobId}] Stories workflow failed:`, err);
        try {
          await supabase.from('render_jobs').update({
            status: 'failed',
            progress: 0,
            error_message: err?.message || 'Unknown error occurred during stories generation',
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
      message: "Stories generation started",
    });
  } catch (error: any) {
    console.error("Stories workflow trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger stories workflow", success: false },
      { status: 500 }
    );
  }
}
