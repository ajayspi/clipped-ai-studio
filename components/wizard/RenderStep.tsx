"use client"

import { useWizardStore } from './wizard-store'
import { Layout, CheckCircle2 } from 'lucide-react'

export function RenderStep() {
  const w = useWizardStore()

  const ready =
    w.beats.length > 0 &&
    w.narration.trim().length > 0 &&
    w.beats.every((beat) => beat.candidates?.length)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="space-y-2">
          <label className="text-sm font-medium">Aspect Ratio</label>
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={w.aspectRatio}
            onChange={(e) => w.setAspectRatio(e.target.value as any)}
          >
            <option value="9:16">Portrait (9:16)</option>
            <option value="16:9">Landscape (16:9)</option>
            <option value="1:1">Square (1:1)</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Auto Publish</label>
          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-primary" 
              checked={w.autoPublish} 
              onChange={(e) => w.set('autoPublish', e.target.checked)} 
            />
            <span className="text-sm">Publish to connected accounts</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-4 bg-muted/50 border-b flex justify-between items-center">
           <h3 className="font-semibold flex items-center gap-2"><Layout className="w-4 h-4" /> Final Review</h3>
           {!ready && <span className="text-xs font-medium text-destructive px-2 py-1 bg-destructive/10 rounded">Incomplete</span>}
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Workflow Type</span>
            <span className="font-medium capitalize">{w.workflowType.replace('-', ' ')}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Scenes / Beats</span>
            <span className="font-medium">{w.beats.length}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Target Duration</span>
            <span className="font-medium">{w.beats.reduce((sum, b) => sum + b.duration, 0).toFixed(1)}s</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Voiceover</span>
            <span className="font-medium capitalize">{w.voice}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">Subtitles</span>
            <span className="font-medium">{w.burnSubtitles ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      {ready && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Ready to generate</p>
            <p className="opacity-90 mt-0.5">All steps are completed. Click the generate button below to send this job to the render queue.</p>
          </div>
        </div>
      )}
    </div>
  )
}
