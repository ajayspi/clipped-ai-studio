import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db";
import { videoGenerator } from "@/lib/engine/video-generator";
import { AIVideoModel, AspectRatio, CameraMotion } from "@/lib/engine/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      script,
      prompt,
      model,
      aspectRatio,
      duration,
      cameraMotion,
      negativePrompt,
      style,
      voice,
      mock,
      characterSheetUrl,
    } = body;

    const inputScript = script || prompt;
    if (!inputScript || typeof inputScript !== 'string' || !inputScript.trim()) {
      return NextResponse.json(
        { error: "Script or prompt is required" },
        { status: 400 }
      );
    }

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
          workflow: 'ai-videos',
          input: {
            script: inputScript,
            model: model || 'kling-v1',
            aspectRatio: aspectRatio || '16:9',
            duration: duration || 5,
            cameraMotion: cameraMotion || 'static',
            negativePrompt: negativePrompt || '',
            style: style || '',
            voice: voice || 'alloy',
            mock: Boolean(mock),
          },
        }),
        started_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn(`[Supabase] Initial pending job insert logged with warning:`, dbErr);
    }

    // 3. Fire background execution task
    setTimeout(async () => {
      try {
        console.log(`[JOB ${jobId}] Processing AI Videos workflow...`);

        const result = await videoGenerator.generateAIVideo({
          script: inputScript,
          prompt,
          model: model as AIVideoModel,
          aspectRatio: aspectRatio as AspectRatio,
          duration: duration ? Number(duration) : 5,
          cameraMotion: cameraMotion as CameraMotion,
          negativePrompt,
          style,
          voice,
          mock: Boolean(mock),
          characterSheetUrl,
        });

        await supabase.from('render_jobs').update({
          status: result.success ? 'completed' : 'failed',
          progress: result.success ? 100 : 0,
          logs: JSON.stringify({
            workflow: 'ai-videos',
            result,
          }),
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        }).eq('id', jobId);

        console.log(`[JOB ${jobId}] Completed AI Videos workflow with status: ${result.success ? 'completed' : 'failed'}`);
      } catch (err: any) {
        console.error(`[JOB ${jobId}] AI Videos workflow failed:`, err);
        try {
          await supabase.from('render_jobs').update({
            status: 'failed',
            progress: 0,
            error_message: err?.message || 'Unknown error occurred during video generation',
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
      message: "AI Video generation started",
    });
  } catch (error: any) {
    console.error("Workflow trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}
