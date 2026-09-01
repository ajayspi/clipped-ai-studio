import { NextResponse } from "next/server"
import { videoOrchestrator } from "@/lib/engine/orchestrator"
import { supabase } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { workflow, script, voice } = body

    if (!script) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 })
    }

    // 1. Create a job ID in our database (Supabase)
    const jobId = crypto.randomUUID()
    
    // Insert a generating_plan record so the worker doesn't pick it up until the plan is ready
    await supabase.from('render_jobs').insert({
      id: jobId,
      status: 'generating_plan',
      progress: 0,
      logs: JSON.stringify({ message: "Job queued" })
    })
    
    // Fire and forget the orchestrator for this demo so we don't block the UI
    // In production, we'd use a queue (Inngest, Trigger.dev, etc.)
    setTimeout(async () => {
      try {
        console.log(`Starting job ${jobId} for workflow ${workflow}`)
        const result = await videoOrchestrator.generateVideoPlan(script, ['pixabay', 'pexels'])
        
        // Update the result in Supabase and set to pending so the render-worker can process it
        await supabase.from('render_jobs').update({
          status: 'pending',
          progress: 10,
          logs: JSON.stringify(result),
          error_message: result.error || null
        }).eq('id', jobId)
      } catch (err) {
        console.error("Background job failed", err)
      }
    }, 0)

    // Return immediately with the Job ID so the frontend can redirect
    return NextResponse.json({ 
      success: true, 
      jobId, 
      message: "Job started successfully" 
    })
    
  } catch (error: any) {
    console.error("Workflow trigger error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to trigger workflow" },
      { status: 500 }
    )
  }
}
