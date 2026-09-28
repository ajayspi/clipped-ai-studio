import { NextResponse } from "next/server"
import { videoOrchestrator } from "@/lib/engine/orchestrator"
import { imageOrchestrator } from "@/lib/engine/image-orchestrator"
import { supabaseAdmin as supabase } from "@/lib/db"
import { normalizeCameraMove, normalizeShotType } from "@/lib/engine/shot-planner"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      workflow, 
      script, 
      subject,
      tone,
      aspectRatio,
      beats,
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

    // The 5-step wizard builds a beat per scene, each with the asset the user picked
    // in the Scenes step. These used to be dropped on the floor: the destructure above
    // never named `beats`, and the route re-planned from `script` alone, so the whole
    // wizard's output was thrown away at the queue boundary.
    //
    // Normalise to the shape the render worker already understands. Per
    // scripts/render-worker.ts:502 a beat's media is resolved from
    // `selectedVideo.url || imageUrl || videoUrl || clipUrl || urls[0]`, and the
    // worker reads `text` and `duration` off the same object. The wizard sends
    // `urls` with the user's selection already ordered first, so `urls[0]` is the
    // chosen clip and we mirror it onto `clipUrl` so the two spellings agree.
    const submittedBeats = Array.isArray(beats)
      ? beats
          .filter((b: Record<string, unknown>) => b && typeof b === 'object')
          .map((b: Record<string, unknown>, idx: number) => {
            const urls = Array.isArray(b.urls) ? b.urls.filter((u: unknown) => typeof u === 'string' && u) : []
            return {
              id: typeof b.id === 'string' && b.id ? b.id : `beat-${idx + 1}`,
              text: typeof b.text === 'string' ? b.text : '',
              duration: typeof b.duration === 'number' && b.duration > 0 ? b.duration : 3,
              urls,
              clipUrl: urls[0] || '',
              // Shot direction has to survive this boundary for the same reason
              // `beats` did: this whitelist is the whole payload, so a field not
              // named here simply does not reach the worker. Normalised through
              // the planner's closed vocabulary rather than passed through, so a
              // hand-rolled API call cannot put an unrenderable camera
              // instruction into a job.
              ...(b.shotType ? { shotType: normalizeShotType(b.shotType) } : {}),
              ...(b.cameraMove ? { cameraMove: normalizeCameraMove(b.cameraMove) } : {}),
              ...(typeof b.imagePrompt === 'string' && b.imagePrompt.trim()
                ? { imagePrompt: b.imagePrompt.trim() }
                : {}),
            }
          })
          // A beat with no text renders as "Clipped Video Beat" placeholder copy.
          .filter((b: { text: string }) => b.text.trim().length > 0)
      : []

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

    // The wizard's voice choices live here too. The render worker prefers
    // `orchState.voice` (scripts/render-worker.ts:469) and only falls back to the
    // same fields merged out of `logs`, so both spellings must carry them.
    const voiceSettings = {
      voice: voice || null,
      voiceProvider: voiceProvider || null,
      voiceSpeed: voiceSpeed || 1.0,
      voiceVolume: voiceVolume || 100,
      musicSource: musicSource || 'Random Background Music',
      musicVolume: musicVolume || 20,
    }

    // `orchestration_state` is a TEXT column that `claim_render_job` matches against a
    // literal allow-list ('queued' / 'retryable', or an expired lease). This route used
    // to write a JS OBJECT here, which Postgres stores as a JSON string that is in
    // neither set — so every job the wizard queued was permanently unclaimable and the
    // render worker never saw it, despite the route answering 200 {"success":true}.
    //
    // It is a state machine, not a settings bag: 'planning' while we build the plan,
    // then 'queued' once beats exist and the worker may claim it. The settings belong
    // in `logs`, which the worker merges into its params (render-worker.ts:380-384).
    // The 'planning' -> 'queued' promotion is exactly what app/api/v1/generate does.
    const baseLogs = {
      message: "Job queued",
      workflow: workflow || 'footage',
      subject: subject || null,
      tone: tone || null,
      script,
      aspectRatio: aspectRatio || '9:16',
      beats: submittedBeats,
      subtitleSettings,
      ...voiceSettings,
      ...subtitleSettings,
    }

    // Beats supplied by the wizard already ARE the plan — re-planning from `script`
    // would discard the user's per-beat asset choices. So only run an orchestrator
    // when we have no beats to render (the generate-without-a-wizard path).
    const hasBeats = submittedBeats.length > 0

    // The single decision that determines whether this job is renderable.
    // `orchestration_state` is a TEXT column that claim_render_job matches against a
    // literal allow-list, so it must carry a plain state string — never an object, and
    // never left to the column DEFAULT, which is the CLAIMABLE 'queued'.
    const initialState: 'planning' | 'queued' = hasBeats ? 'queued' : 'planning'

    // 1. Create a job ID in our database (Supabase)
    const jobId = crypto.randomUUID()

    const initialLogs = {
      ...baseLogs,
      message: hasBeats ? "Job queued with wizard beats" : "Job queued",
    }

    // With beats there is nothing left to plan, so the job is claimable straight away.
    // Without them 'planning' keeps the worker away until beats are written below.
    const insertPayload: Record<string, unknown> = {
      id: jobId,
      status: hasBeats ? 'pending' : 'generating_plan',
      progress: hasBeats ? 10 : 0,
      orchestration_state: initialState,
      logs: JSON.stringify(initialLogs)
    }

    const { error: insertErr } = await supabase.from('render_jobs').insert(insertPayload)
    if (insertErr) {
      // The column may not exist on an un-migrated database. Never fall back to
      // omitting it: the column DEFAULTs to the CLAIMABLE 'queued', so a job with no
      // plan yet would be picked up by the render worker, build an empty concat.txt
      // and burn all 3 attempts. A beatless job must be explicitly unclaimable.
      console.warn(`[WorkflowGenerate] orchestration_state write failed, retrying as '${initialState}':`, insertErr)
      await supabase.from('render_jobs')
        .update({ orchestration_state: initialState })
        .eq('id', jobId)
    }

    // Nothing to plan: the wizard already produced the beats. Done.
    if (hasBeats) {
      return NextResponse.json({
        success: true,
        jobId,
        message: "Job started successfully",
        beatCount: submittedBeats.length,
      })
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
        
        // The orchestrator's plan comes back shaped `{ analysis: { scenes: [...] }, videos: [...] }`.
        // The render worker already knows how to read that shape (render-worker.ts:427-435:
        // it falls back to `analysis.scenes` when there are no `beats`), so hand the plan
        // over under the same key the worker looks for.
        const plan = (typeof result === 'object' && result !== null ? result : { result }) as Record<string, unknown>
        const plannedScenes = Array.isArray((plan.analysis as { scenes?: unknown[] } | undefined)?.scenes)
          ? ((plan.analysis as { scenes: unknown[] }).scenes)
          : Array.isArray(plan.scenes)
            ? (plan.scenes as unknown[])
            : []

        const plannedBeats = plannedScenes
          .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
          .map((s, idx) => {
            const selected = (s.selectedVideo as { url?: string } | undefined)?.url
            return {
              id: typeof s.id === 'string' && s.id ? s.id : `scene-${idx + 1}`,
              text: String(s.text || s.narration || s.prompt || s.script || ''),
              duration: typeof s.duration === 'number' && s.duration > 0 ? s.duration : 3,
              urls: selected ? [selected] : [],
              clipUrl: selected || '',
            }
          })
          .filter((b) => b.text.trim().length > 0)

        // Only promote to 'queued' when there is genuinely something to render. A plan
        // that yields no scenes must stay unclaimable, or the worker builds an empty
        // concat.txt and ffmpeg rejects it on every attempt.
        const renderable = plannedBeats.length > 0

        const mergedLogs = {
          ...plan,
          ...baseLogs,
          beats: renderable ? plannedBeats : submittedBeats,
          message: renderable ? "Plan ready" : "Planning produced no scenes; job is not renderable",
        }

        let updatePayload: Record<string, unknown>
        if (renderable) {
          updatePayload = {
            status: 'pending',
            progress: 10,
            orchestration_state: 'queued',
            logs: JSON.stringify(mergedLogs),
            error_message: result?.error || null,
          }
        } else {
          updatePayload = {
            status: 'failed',
            progress: 10,
            orchestration_state: 'failed',
            logs: JSON.stringify(mergedLogs),
            error_message: result?.error || 'Planning produced no renderable scenes',
          }
        }

        const { error: updateErr } = await supabase.from('render_jobs').update(updatePayload).eq('id', jobId)
        if (updateErr) {
          // Retrying without orchestration_state would leave the row at the 'planning'
          // default this route inserted, which is safe (unclaimable). Never leave it
          // claimable-but-beatless.
          console.warn(`[WorkflowGenerate] state update failed; leaving job unclaimable:`, updateErr)
        }
      } catch (err) {
        console.error("Background job failed", err)
        // The job is stuck in 'planning' (unclaimable) — correct, but surface it as
        // failed rather than leaving a job that looks alive forever.
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

    // Return immediately with the Job ID so the frontend can redirect
    return NextResponse.json({ 
      success: true, 
      jobId, 
      message: "Job started successfully" 
    })
    
  } catch (error) {
    console.error("Workflow trigger error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger workflow" },
      { status: 500 }
    )
  }
}
