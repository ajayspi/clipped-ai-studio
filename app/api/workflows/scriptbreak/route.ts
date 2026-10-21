import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/db"
import { scriptBreakOrchestrator } from "@/lib/engine/scriptbreak-orchestrator"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { script } = body

    if (!script) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 })
    }

    const jobId = crypto.randomUUID()

    const initialLogs = {
      message: "Job queued for script breakdown",
      script,
    }

    const insertPayload = {
      id: jobId,
      status: 'generating_plan',
      progress: 0,
      orchestration_state: 'planning',
      logs: JSON.stringify(initialLogs)
    }

    const { error: insertErr } = await supabase.from('render_jobs').insert(insertPayload)
    if (insertErr) {
      console.warn(`[WorkflowScriptBreak] orchestration_state write failed:`, insertErr)
      await supabase.from('render_jobs')
        .update({ orchestration_state: 'planning' })
        .eq('id', jobId)
    }

    // Fire and forget the orchestrator
    setTimeout(async () => {
      try {
        console.log(`Starting script breakdown for job ${jobId}`)
        
        const scenes = await scriptBreakOrchestrator.breakdownScript(script)
        
        // Map scenes to tension curve and beats
        const tensionCurve = scenes.map(s => s.tensionScore)
        const beats = scenes.flatMap(s => 
          s.shots.map((shot, idx) => ({
            id: `${s.id}-${idx}`,
            text: shot,
            keywords: [],
            description: shot,
            duration: 3, // Default duration
            urls: [],
            clipUrl: '',
          }))
        )

        const mergedLogs = {
          ...initialLogs,
          beats,
          tensionCurve,
          message: "Plan ready"
        }

        const updatePayload = {
          status: 'completed',
          progress: 100,
          orchestration_state: 'completed',
          logs: JSON.stringify(mergedLogs)
        }

        const { error: updateErr } = await supabase.from('render_jobs').update(updatePayload).eq('id', jobId)
        if (updateErr) {
          console.warn(`[WorkflowScriptBreak] state update failed:`, updateErr)
        }
      } catch (err) {
        console.error("Background job failed", err)
        await supabase
          .from('render_jobs')
          .update({
            status: 'failed',
            orchestration_state: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown planning error',
          })
          .eq('id', jobId)
      }
    }, 0)

    return NextResponse.json({ 
      success: true, 
      jobId, 
      message: "Script breakdown started successfully" 
    })
    
  } catch (error) {
    console.error("Workflow trigger error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger workflow" },
      { status: 500 }
    )
  }
}
