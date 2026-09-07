import { NextResponse } from "next/server"
import { videoOrchestrator } from "@/lib/engine/orchestrator"
import { imageOrchestrator } from "@/lib/engine/image-orchestrator"
import { supabaseAdmin as supabase } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      workflow, 
      script, 
      voice,
      voiceProvider,
      voiceSpeed,
      voiceVolume,
      musicSource,
      musicVolume,
      burnSubtitles,
      subtitlePreset,
      subtitleUppercase,
      subtitleColor,
      subtitleHighlightColor,
      subtitleGlow,
      subtitleGlowColor,
      subtitleOutline,
      subtitleOutlineWidth,
      subtitleBox,
      subtitleBoxColor,
      subtitleSize,
      subtitleY,
    } = body

    if (!script) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 })
    }

    const subtitleSettings = {
      burnSubtitles: burnSubtitles !== undefined ? Boolean(burnSubtitles) : true,
      subtitlePreset: subtitlePreset || 'Hormozi Pop',
      subtitleUppercase: subtitleUppercase !== undefined ? Boolean(subtitleUppercase) : true,
      subtitleColor: subtitleColor || '#FFFFFF',
      subtitleHighlightColor: subtitleHighlightColor || '#FACC15',
      subtitleGlow: subtitleGlow !== undefined ? Boolean(subtitleGlow) : false,
      subtitleGlowColor: subtitleGlowColor || '#FACC15',
      subtitleOutlineColor: subtitleOutline || '#000000',
      subtitleOutlineWidth: typeof subtitleOutlineWidth === 'number' ? subtitleOutlineWidth : 2,
      subtitleBox: subtitleBox !== undefined ? Boolean(subtitleBox) : false,
      subtitleBoxColor: subtitleBoxColor || 'rgba(0, 0, 0, 0.7)',
      subtitleSize: typeof subtitleSize === 'number' ? subtitleSize : 4.5,
      subtitleY: typeof subtitleY === 'number' ? subtitleY : 75,
    }

    const orchestrationState = {
      workflow: workflow || 'footage',
      voice: voice || null,
      voiceProvider: voiceProvider || null,
      subtitleSettings,
    }

    const initialLogs = {
      message: "Job queued",
      workflow: workflow || 'footage',
      voice: voice || null,
      voiceProvider: voiceProvider || null,
      subtitleSettings,
      burnSubtitles: subtitleSettings.burnSubtitles,
      ...subtitleSettings,
    }

    // 1. Create a job ID in our database (Supabase)
    const jobId = crypto.randomUUID()
    
    // Insert a generating_plan record with orchestration_state and logs
    const insertPayload: Record<string, any> = {
      id: jobId,
      status: 'generating_plan',
      progress: 0,
      orchestration_state: orchestrationState,
      logs: JSON.stringify(initialLogs)
    }

    const { error: insertErr } = await supabase.from('render_jobs').insert(insertPayload)
    if (insertErr) {
      delete insertPayload.orchestration_state
      await supabase.from('render_jobs').insert(insertPayload)
    }
    
    // Fire and forget the orchestrator for this demo so we don't block the UI
    // In production, we'd use a queue (Inngest, Trigger.dev, etc.)
    setTimeout(async () => {
      try {
        console.log(`Starting job ${jobId} for workflow ${workflow}`)
        
        let result;
        if (workflow === 'images') {
          result = await imageOrchestrator.generateVideoPlan(script, ['pixabay', 'pexels'])
        } else {
          result = await videoOrchestrator.generateVideoPlan(script, ['pixabay', 'pexels'])
        }
        
        const mergedLogs = {
          ...(typeof result === 'object' && result !== null ? result : { result }),
          subtitleSettings,
          voice: voice || null,
          voiceProvider: voiceProvider || null,
          voiceSpeed: voiceSpeed || 1.0,
          voiceVolume: voiceVolume || 100,
          musicSource: musicSource || 'Random Background Music',
          musicVolume: musicVolume || 20,
          workflow: workflow || 'footage',
          burnSubtitles: subtitleSettings.burnSubtitles,
          ...subtitleSettings,
        }

        const updatePayload: Record<string, any> = {
          status: 'pending',
          progress: 10,
          orchestration_state: {
            ...orchestrationState,
            plan: result
          },
          logs: JSON.stringify(mergedLogs),
          error_message: result?.error || null
        }

        const { error: updateErr } = await supabase.from('render_jobs').update(updatePayload).eq('id', jobId)
        if (updateErr) {
          delete updatePayload.orchestration_state
          await supabase.from('render_jobs').update(updatePayload).eq('id', jobId)
        }
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
