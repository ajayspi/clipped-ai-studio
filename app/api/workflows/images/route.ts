/**
 * WORKFLOW ROUTE — images
 *   KIND:          terminal
 *   UI CALLER:     NONE (API only)
 *   WRITES QUEUE:  yes
 *   CLAIMABLE:     no
 *   DISTINCT FROM: generate?workflow=images (this one generates images and never renders, generate queues a video)
 */
import { NextResponse } from "next/server"
import { sceneMatcher } from "@/lib/engine/scene-matcher"
import { imageGenerator } from "@/lib/engine/image-generator"
import { AspectRatio } from "@/lib/engine/types"
import { enqueueRenderJob } from "@/lib/jobs/enqueue"
import { supabaseAdmin as supabase } from "@/lib/db"


export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { script, style, aspectRatio } = body

    if (!script) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 })
    }

    // 1. Create a job ID in our database (Supabase)
    const jobId = crypto.randomUUID()

    // 2. Insert the job immediately so the UI can navigate to it
    // Using a terminal state because this workflow runs inline and never renders a video.
    const insertPayload = {
      id: jobId,
      status: 'generating_plan',
      progress: 0,
      orchestration_state: 'completed',
      logs: JSON.stringify({ message: "Job queued" })
    }

    const { error: insertErr } = await supabase.from('render_jobs').insert(insertPayload)
    if (insertErr) {
      console.warn(`[WorkflowImages] initial insert failed:`, insertErr)
    }
    
    // Fire and forget the orchestrator
    setTimeout(async () => {
      try {
        console.log(`[JOB ${jobId}] Starting AI Images workflow...`)
        
        // Step 1: Break script into scenes
        const analysis = await sceneMatcher.analyzeScript(script);
        
        // Step 2: Generate images for each scene
        const scenesWithImages = await imageGenerator.generateForScenes(analysis.scenes, {
          style: style,
          aspectRatio: aspectRatio as AspectRatio
        });
        
        // Step 3: (Future) Generate TTS & Render FFmpeg
        
        await enqueueRenderJob({
          id: jobId,
          intent: 'terminal',
          status: 'completed',
          progress: 100,
          logs: {
            workflow: 'ai-images',
            analysis: {
              ...analysis,
              scenes: scenesWithImages
            }
          }
        });
      } catch (err) {
        console.error(`[JOB ${jobId}] Failed:`, err)
        await enqueueRenderJob({
          id: jobId,
          intent: 'terminal',
          status: 'failed',
          progress: 0,
          logs: { error_message: err instanceof Error ? err.message : 'Unknown error during image generation' }
        });
      }
    }, 0)

    // Return immediately with the Job ID so the frontend can redirect
    return NextResponse.json({ 
      success: true, 
      jobId, 
      message: "AI Image generation started" 
    })
    
  } catch (error) {
    console.error("Workflow trigger error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger workflow" },
      { status: 500 }
    )
  }
}
