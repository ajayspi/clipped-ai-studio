import { NextResponse } from "next/server"
import { supabase } from "@/lib/db"
import { sceneMatcher } from "@/lib/engine/scene-matcher"
import { imageGenerator } from "@/lib/engine/image-generator"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { script, style, aspectRatio, voice } = body

    if (!script) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 })
    }

    // 1. Create a job ID in our database (Supabase)
    const jobId = crypto.randomUUID()
    
    // Fire and forget the orchestrator
    setTimeout(async () => {
      try {
        console.log(`[JOB ${jobId}] Starting AI Images workflow...`)
        
        // Step 1: Break script into scenes
        const analysis = await sceneMatcher.analyzeScript(script);
        
        // Step 2: Generate images for each scene
        const scenesWithImages = await imageGenerator.generateForScenes(analysis.scenes, {
          style: style,
          aspectRatio: aspectRatio as any
        });
        
        // Step 3: (Future) Generate TTS & Render FFmpeg
        
        // Log the result to Supabase
        await supabase.from('render_jobs').insert({
          id: jobId,
          status: 'completed',
          progress: 100,
          logs: {
            workflow: 'ai-images',
            analysis: {
              ...analysis,
              scenes: scenesWithImages
            }
          }
        })
      } catch (err: any) {
        console.error(`[JOB ${jobId}] Failed:`, err)
        await supabase.from('render_jobs').insert({
          id: jobId,
          status: 'failed',
          progress: 0,
          error_message: err.message
        })
      }
    }, 0)

    // Return immediately with the Job ID so the frontend can redirect
    return NextResponse.json({ 
      success: true, 
      jobId, 
      message: "AI Image generation started" 
    })
    
  } catch (error: any) {
    console.error("Workflow trigger error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to trigger workflow" },
      { status: 500 }
    )
  }
}
