import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db";
import { shortsExtractor } from "@/lib/engine/shorts-extractor";
import { AspectRatio } from "@/lib/engine/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      sourceType,
      videoUrl,
      transcript,
      clipCount,
      strategy,
      captionStyle,
      aspectRatio,
    } = body;

    // 1. Validation: sourceType is required
    if (!sourceType || typeof sourceType !== 'string' || !sourceType.trim()) {
      return NextResponse.json(
        { error: "sourceType is required", success: false },
        { status: 400 }
      );
    }

    const hasTranscript = typeof transcript === 'string' && transcript.trim().length > 0;
    const hasVideoUrl = typeof videoUrl === 'string' && videoUrl.trim().length > 0;

    if (!hasTranscript && !hasVideoUrl) {
      return NextResponse.json(
        { error: "Either transcript or videoUrl is required for extraction", success: false },
        { status: 400 }
      );
    }

    // 2. Generate unique Job ID
    const jobId = crypto.randomUUID();

    // 2. Synchronous Supabase render_jobs insert
    // Using 'processing' instead of 'pending' so the separate Remotion render-worker ignores it.
    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        status: 'processing',
        progress: 0,
        logs: JSON.stringify({
          workflow: 'extract-shorts',
          input: {
            sourceType,
            videoUrl: videoUrl || '',
            transcript: transcript || '',
            clipCount: clipCount || 3,
            strategy: strategy || 'highest_virality',
            captionStyle: captionStyle || 'bold-yellow-stroke',
            aspectRatio: aspectRatio || '9:16',
          },
        }),
        started_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn(`[Supabase] Initial pending job insert logged with warning:`, dbErr);
    }

    // 4. Fire background execution task
    setTimeout(async () => {
      try {
        console.log(`[JOB ${jobId}] Processing Extract Shorts workflow from source: ${sourceType}...`);

        const result = await shortsExtractor.extractShorts({
          sourceType: sourceType as 'url' | 'transcript' | 'file',
          videoUrl,
          transcript,
          clipCount: clipCount ? Number(clipCount) : 3,
          strategy,
          captionStyle,
          aspectRatio: aspectRatio as AspectRatio,
        });

        await supabase.from('render_jobs').update({
          status: result.success ? 'completed' : 'failed',
          progress: result.success ? 100 : 0,
          logs: JSON.stringify({
            workflow: 'extract-shorts',
            result,
          }),
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        }).eq('id', jobId);

        console.log(`[JOB ${jobId}] Completed Extract Shorts workflow with status: ${result.success ? 'completed' : 'failed'}`);
      } catch (err: any) {
        console.error(`[JOB ${jobId}] Extract Shorts workflow failed:`, err);
        try {
          await supabase.from('render_jobs').update({
            status: 'failed',
            progress: 0,
            error_message: err?.message || 'Unknown error occurred during shorts extraction',
            completed_at: new Date().toISOString(),
          }).eq('id', jobId);
        } catch (updateErr) {
          console.error(`[JOB ${jobId}] Failed to update error status in DB:`, updateErr);
        }
      }
    }, 0);

    // 5. Return immediate 200 response with jobId
    return NextResponse.json({
      success: true,
      jobId,
      message: "Extract Shorts generation started",
    });
  } catch (error: any) {
    console.error("Workflow trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger workflow", success: false },
      { status: 500 }
    );
  }
}
