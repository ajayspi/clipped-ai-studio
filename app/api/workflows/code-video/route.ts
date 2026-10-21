import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/db";
import { generateHyperframeHtml } from "@/lib/engine/hyperframe-orchestrator";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const jobId = crypto.randomUUID();

    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        status: 'processing',
        // 'planning' keeps the FFmpeg render worker away until LLM is done
        orchestration_state: 'planning', 
        workflow_type: 'code-video',
        progress: 0,
        logs: JSON.stringify({
          workflow: 'code-video',
          input: { prompt },
        }),
        started_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn(`[Supabase] Initial pending job insert logged with warning:`, dbErr);
    }

    // Fire background execution task to generate HTML first, then the worker will pick it up, 
    // or we can generate the HTML here before enqueueing for the worker, or the worker can generate it.
    // The spec says: "The orchestrator uses the LLM to generate a complete HTML file. Save this HTML into the job's beats or logs."
    // Let's generate it now, then update the job to be queued for the worker.
    // Wait, the spec says: `orchestration_state: 'queued'`. And if I do it synchronously it might timeout.
    // Let's run the LLM in background, then update the job to 'queued'.
    // The instructions say: "Do not get stuck on DB schemas; just use the standard enqueueRenderJob and insert standard render_jobs records with orchestration_state: 'queued'."
    // If I just insert 'queued', the worker might pick it up before HTML is generated if I do it in background.
    // Let's do it in the background, and we'll save the HTML into the job record. But wait, `render_jobs` has a `beats` column?
    
    setTimeout(async () => {
      try {
        console.log(`[JOB ${jobId}] Generating Hyperframe HTML...`);
        const html = await generateHyperframeHtml(prompt);
        
        await supabase.from('render_jobs').update({
          beats: [{ html }], 
          orchestration_state: 'queued', 
          progress: 10,
          status: 'pending',
        }).eq('id', jobId);
      } catch (err) {
        console.error(`[JOB ${jobId}] Hyperframe HTML generation failed:`, err);
        await supabase.from('render_jobs').update({
          status: 'failed',
          orchestration_state: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        }).eq('id', jobId);
      }
    }, 0);

    return NextResponse.json({
      success: true,
      jobId,
      message: "Code Video generation started",
    });
  } catch (error) {
    console.error("Workflow trigger error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}
