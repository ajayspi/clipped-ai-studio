import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/db"
import { redditOrchestrator } from "@/lib/engine/reddit-orchestrator"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { threadUrl } = body

    if (!threadUrl || typeof threadUrl !== 'string') {
      return NextResponse.json({ error: "threadUrl is required", success: false }, { status: 400 })
    }

    const jobId = crypto.randomUUID()

    await supabase.from('render_jobs').insert({
      id: jobId,
      status: 'processing',
      orchestration_state: 'planning',
      progress: 0,
      logs: JSON.stringify({
        workflow: 'reddit',
        input: { threadUrl },
      }),
      started_at: new Date().toISOString(),
    })

    setTimeout(async () => {
      try {
        const result = await redditOrchestrator.generateVideo({ threadUrl })
        
        await supabase.from('render_jobs').update({
          status: 'completed',
          progress: 10,
          orchestration_state: 'queued',
          logs: JSON.stringify({
            workflow: 'reddit',
            beats: result.beats,
          }),
          completed_at: new Date().toISOString(),
        }).eq('id', jobId)
      } catch (err) {
        console.error(`[JOB ${jobId}] Reddit workflow failed:`, err)
        await supabase.from('render_jobs').update({
          status: 'failed',
          orchestration_state: 'failed',
          progress: 0,
          error_message: err instanceof Error ? err.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        }).eq('id', jobId)
      }
    }, 0)

    return NextResponse.json({
      success: true,
      jobId,
      message: "Reddit workflow started",
    })
  } catch (error) {
    console.error("Reddit workflow trigger error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed", success: false },
      { status: 500 }
    )
  }
}
