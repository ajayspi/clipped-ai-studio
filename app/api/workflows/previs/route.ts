import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { script, aspectRatio } = body

    if (!script) {
      return NextResponse.json({ error: "Script/Prompt is required" }, { status: 400 })
    }

    const jobId = crypto.randomUUID()

    const initialLogs = {
      message: "Previs job queued",
      workflow: 'previs',
      script,
      aspectRatio: aspectRatio || '16:9',
    }

    const insertPayload: Record<string, unknown> = {
      id: jobId,
      status: 'pending',
      progress: 0,
      orchestration_state: 'queued',
      logs: JSON.stringify(initialLogs)
    }

    const { error: insertErr } = await supabase.from('render_jobs').insert(insertPayload)
    if (insertErr) {
      console.error(`[WorkflowPrevis] write failed:`, insertErr)
      return NextResponse.json({ error: "Failed to queue job" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      jobId, 
      message: "Previs job queued successfully" 
    })
    
  } catch (error) {
    console.error("Previs workflow error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger previs workflow" },
      { status: 500 }
    )
  }
}
