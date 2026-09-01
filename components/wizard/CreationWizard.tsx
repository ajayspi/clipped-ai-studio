"use client"

import { useState, useEffect } from 'react'
import { STEPS, useWizardStore } from './wizard-store'
import { ScriptStep } from './ScriptStep'
import { ScenesStep } from './ScenesStep'
import { VoiceStep } from './VoiceStep'
import { SubtitlesStep } from './SubtitlesStep'
import { RenderStep } from './RenderStep'
import { LivePlayer } from './LivePlayer'
import { Loader2, ArrowRight, Play, Layout, Mic, Type, FileVideo, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const LEDE: Record<string, string> = {
  script: 'Give the episode a subject. The AI writes the narration, then breaks it into scenes in the next step.',
  scenes: 'The AI splits the narration into shot-length beats and proposes footage keywords for each. Edit any beat.',
  voice: 'The voiceover sets the master timing — scene durations stretch to fit it.',
  subs: 'Burn-in subtitle styling for the final video.',
  render: 'Review your configured settings before sending to the render queue.',
}

const STEP_ICONS = [Layout, Sparkles, Mic, Type, FileVideo]

export function CreationWizard({ workflowType }: { workflowType: string }) {
  const router = useRouter()
  const w = useWizardStore()
  const step = STEPS[w.step]
  const [submitting, setSubmitting] = useState(false)
  const StepIcon = STEP_ICONS[w.step]

  // Initialize the workflow type in the store
  useEffect(() => {
    if (w.workflowType !== workflowType) {
      w.reset()
      w.set('workflowType', workflowType)
    }
  }, [workflowType])

  const ready =
    w.beats.length > 0 &&
    w.narration.trim().length > 0 &&
    w.beats.every((beat) => beat.candidates?.length)

  async function runAutoMode() {
    w.set('autoMode', true)
    
    try {
      // 1. Generate Script if empty
      if (!w.narration.trim()) {
        w.setBusy('Auto-Pilot: Generating script...')
        const scriptRes = await fetch("/api/v1/script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: w.subject || 'Random engaging topic', tone: w.tone, workflowType: w.workflowType })
        })
        if (!scriptRes.ok) throw new Error("Failed to generate script")
        const scriptData = await scriptRes.json()
        w.set('narration', scriptData.narration)
        w.set('keywords', scriptData.keywords || [])
      }

      // 2. Break down scenes
      w.setBusy('Auto-Pilot: Breaking down scenes...')
      const currentNarration = useWizardStore.getState().narration
      const analyzeRes = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narration: currentNarration || 'Fallback narration', workflowType: w.workflowType })
      })
      if (!analyzeRes.ok) throw new Error("Failed to analyze scenes")
      const analyzeData = await analyzeRes.json()
      
      const beats = (analyzeData.scenes ?? []).map((scene: any, index: number) => ({
        id: scene.id ?? `beat-${index}`,
        text: scene.text,
        keywords: scene.keywords ?? [],
        duration: scene.duration ?? 0,
        candidates: []
      }))
      w.set('beats', beats)
      
      // 3. Source Assets
      w.setBusy('Auto-Pilot: Sourcing assets...')
      for (const beat of beats) {
        try {
          const sourceRes = await fetch("/api/v1/source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ beatId: beat.id, keywords: beat.keywords, workflowType: w.workflowType })
          })
          if (sourceRes.ok) {
            const sourceData = await sourceRes.json()
            beat.candidates = sourceData.candidates
            beat.selectedId = sourceData.candidates?.[0]?.id
          }
        } catch (e) {
          console.error('Failed to source beat', beat.id, e)
        }
      }
      w.set('beats', [...beats])

      // Navigate to the final review step
      w.setBusy(null)
      w.goToStep(4)
      w.set('furthestStep', 4)

    } catch (error: any) {
      w.setError(`Auto-Pilot failed: ${error.message}`)
      w.setBusy(null)
      w.set('autoMode', false)
    }
  }

  async function sendToQueue() {
    if (!ready || submitting) return
    w.setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          workflow: w.workflowType,
          script: w.narration,
          subject: w.subject,
          aspectRatio: w.aspectRatio,
          voice: w.voice,
          voiceoverMode: w.voiceoverMode,
          burnSubtitles: w.burnSubtitles,
          subtitleColor: w.subtitleColor,
          subtitleSize: w.subtitleSize,
          subtitleY: w.subtitleY,
          musicSource: w.musicSource,
          tone: w.tone,
          beats: w.beats.map((beat) => {
            const candidates = beat.candidates ?? []
            const selected = candidates.find((c) => c.id === beat.selectedId) ?? candidates[0]
            const rest = candidates.filter((c) => c.id !== selected?.id)
            const ordered = selected ? [selected, ...rest] : rest
            return {
              id: beat.id,
              text: beat.text,
              duration: beat.duration,
              urls: ordered.map((c) => c.url).filter(Boolean),
            }
          }),
        }),
      })

      if (!res.ok) throw new Error("Failed to start generation job")
      const data = await res.json()
      router.push(`/dashboard?job=${data.jobId}`)
    } catch (error: any) {
      w.setError(error.message || 'Could not start the render')
    } finally {
      setSubmitting(false)
    }
  }

  async function runBreakdown() {
    if (!w.narration.trim()) {
      w.setError('Write or paste narration first.')
      return
    }
    w.setError(null)
    w.setBusy('AI is breaking the narration into beats…')
    try {
      const res = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narration: w.narration, provider: w.provider, model: w.model, workflowType: w.workflowType })
      })
      if (!res.ok) throw new Error("Failed to analyze script")
      const result = await res.json()
      
      const beats = (result.scenes ?? []).map((scene: any, index: number) => ({
        id: scene.id ?? `beat-${index}`,
        text: scene.text,
        keywords: scene.keywords ?? [],
        duration: scene.duration ?? 0,
        candidates: []
      }))

      w.set('beats', beats)
      w.setBusy('Sourcing assets for scenes…')

      // Source assets for each beat
      for (const beat of beats) {
        try {
          const sourceRes = await fetch("/api/v1/source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ beatId: beat.id, keywords: beat.keywords, workflowType: w.workflowType })
          })
          if (sourceRes.ok) {
            const sourceData = await sourceRes.json()
            beat.candidates = sourceData.candidates
            beat.selectedId = sourceData.candidates?.[0]?.id
          }
        } catch (e) {
          console.error('Failed to source beat', beat.id, e)
        }
      }

      // Update store with sourced beats
      w.set('beats', [...beats])
    } catch (error: any) {
      w.setError(error.message || 'Unknown error')
    } finally {
      w.setBusy(null)
    }
  }

  const primaryAction =
    w.step === 1 ? { label: 'Re-break with AI', run: runBreakdown } : null

  return (
    <div className="flex flex-col flex-1 gap-4 lg:gap-6 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-8rem)] pb-8 lg:pb-0">
      {/* Top Navigation Bar */}
      <nav className="w-full bg-card border rounded-xl shadow-sm p-3 flex items-center justify-between overflow-x-auto shrink-0 z-20">
         <div className="flex items-center gap-1 sm:gap-2 px-2">
            {STEPS.map((item, index) => {
              const Icon = STEP_ICONS[index]
              const isActive = index === w.step
              const isCompleted = index <= w.furthestStep
              
              return (
                <div key={item.key} className="flex items-center">
                  <button
                    type="button"
                    disabled={!isCompleted && !isActive}
                    onClick={() => w.goToStep(index)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : isCompleted 
                        ? 'hover:bg-muted text-foreground' 
                        : 'opacity-50 cursor-not-allowed text-muted-foreground'
                    }`}
                  >
                    <div className={`rounded-full p-1 border ${isActive ? 'bg-primary-foreground/20 border-transparent' : isCompleted ? 'bg-background border-border' : 'bg-muted border-transparent'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="hidden sm:inline-block">{index + 1}. {item.name}</span>
                    <span className="sm:hidden">{index + 1}</span>
                  </button>
                  
                  {index < STEPS.length - 1 && (
                    <div className="w-4 sm:w-8 h-px mx-1 sm:mx-2 bg-border" />
                  )}
                </div>
              )
            })}
         </div>

         <div className="flex items-center px-2 shrink-0 border-l ml-2 pl-4">
            <button 
              onClick={runAutoMode}
              className="flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-sm font-medium shadow transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Auto-Pilot
            </button>
         </div>
      </nav>

      {/* Workspace & Preview Layout */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 lg:gap-6 min-h-0 relative">
        {/* Main Work Area */}
        <main className="flex-1 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden relative overflow-y-auto">
        {w.autoMode && (
          <div className="absolute inset-x-0 top-0 bg-indigo-500/10 border-b border-indigo-500/20 px-4 py-2 flex items-center gap-2">
             <Sparkles className="w-4 h-4 text-indigo-500" />
             <span className="text-sm font-medium text-indigo-500">Auto-Pilot Mode Active — Generating content automatically...</span>
             <button onClick={() => w.set('autoMode', false)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Cancel Auto</button>
          </div>
        )}
        
        <div className={`p-6 border-b bg-muted/20 ${w.autoMode ? 'mt-9' : ''}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium tracking-wider uppercase mb-1">
            Step {w.step + 1} of {STEPS.length}
          </div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <StepIcon className="w-6 h-6 text-primary" /> {step.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{LEDE[step.key]}</p>
        </div>

        <div className="p-6 relative overflow-hidden">
          {w.error && (
            <div className="mb-6 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {w.error}
            </div>
          )}
          {w.busy ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">{w.busy}</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={w.step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {w.step === 0 && <ScriptStep />}
                {w.step === 1 && <ScenesStep />}
                {w.step === 2 && <VoiceStep />}
                {w.step === 3 && <SubtitlesStep />}
                {w.step === 4 && <RenderStep />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted disabled:opacity-50"
            disabled={w.step === 0 || w.autoMode}
            onClick={w.back}
          >
            Back
          </motion.button>

          {primaryAction && !w.autoMode && (
             <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="px-4 py-2 text-sm font-medium border rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-50"
              disabled={Boolean(w.busy)}
              onClick={primaryAction.run}
            >
              {primaryAction.label}
            </motion.button>
          )}

          {w.step < STEPS.length - 1 ? (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button" 
              disabled={w.autoMode}
              className="px-4 py-2 text-sm font-medium border rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 shadow-sm" 
              onClick={w.next}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="px-4 py-2 text-sm font-medium border rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 shadow-sm"
              disabled={!ready || submitting || w.autoMode}
              onClick={sendToQueue}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Play className="w-4 h-4" /> Send to Queue</>
              )}
            </motion.button>
          )}
        </div>
      </main>

      {/* Live Preview Rail (Right Side) */}
      <aside className="w-full lg:w-[320px] flex flex-col shrink-0 order-first lg:order-last mb-6 lg:mb-0 z-10">
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden lg:sticky lg:top-6">
          <div className="p-4 border-b bg-muted/20">
            <h3 className="font-semibold flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" /> Live Preview
            </h3>
          </div>
          <div className="p-4 bg-black/5 flex justify-center">
            {w.beats.length > 0 ? (
              <LivePlayer />
            ) : (
              <div className="w-full aspect-[9/16] bg-black/10 rounded-lg flex items-center justify-center border-2 border-dashed">
                <span className="text-sm text-muted-foreground px-6 text-center">Add scenes to see live preview</span>
              </div>
            )}
          </div>
          {w.beats.length > 0 && (
            <div className="p-4 text-xs text-muted-foreground border-t flex justify-between">
              <span>{w.beats.length} beats</span>
              <span>{w.beats.reduce((acc, b) => acc + b.duration, 0).toFixed(1)}s total</span>
            </div>
          )}
        </div>
      </aside>
      </div>
    </div>
  )
}
