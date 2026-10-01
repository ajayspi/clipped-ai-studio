import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/db"
import { triviaOrchestrator } from "@/lib/engine/trivia-orchestrator"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { topic, questionsCount } = body

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: "topic is required", success: false }, { status: 400 })
    }

    const jobId = crypto.randomUUID()

    await supabase.from('render_jobs').insert({
      id: jobId,
      status: 'processing',
      orchestration_state: 'planning',
      progress: 0,
      logs: JSON.stringify({
        workflow: 'trivia',
        input: { topic, questionsCount },
      }),
      started_at: new Date().toISOString(),
    })

    setTimeout(async () => {
      try {
        const result = await triviaOrchestrator.generateVideo({ topic, questionsCount })
        
        await supabase.from('render_jobs').update({
          status: 'completed',
          progress: 10,
          orchestration_state: 'queued',
          logs: JSON.stringify({
            workflow: 'trivia',
            beats: result.beats,
          }),
          completed_at: new Date().toISOString(),
        }).eq('id', jobId)
      } catch (err) {
        console.error(`[JOB ${jobId}] Trivia workflow failed:`, err)
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
      message: "Trivia workflow started",
    })
  } catch (error) {
    console.error("Trivia workflow trigger error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed", success: false },
      { status: 500 }
    )
  }
}
