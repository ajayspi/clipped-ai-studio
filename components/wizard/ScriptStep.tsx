"use client"

import { useState } from 'react'
import { useWizardStore, SUBTITLE_PRESETS } from './wizard-store'
import { Loader2, Settings2, Sparkles, Layout } from 'lucide-react'

export function ScriptStep() {
  const w = useWizardStore()
  const [generating, setGenerating] = useState(false)

  async function generateScript() {
    if (!w.subject.trim()) {
      w.setError("Please enter a subject to generate a script.")
      return
    }
    
    w.setError(null)
    setGenerating(true)
    try {
      const res = await fetch("/api/v1/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: w.subject,
          tone: w.tone,
          targetDuration: w.targetDuration,
          workflowType: w.workflowType
        })
      })
      
      if (!res.ok) throw new Error("Failed to generate script")
      
      const data = await res.json()
      w.set('narration', data.narration)
      w.set('keywords', data.keywords || [])
    } catch (err: any) {
      w.setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* 1-Click Setup Box */}
      <div className="bg-muted/50 border border-border/50 rounded-xl p-5 space-y-5">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" /> Initial Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Layout className="w-3.5 h-3.5" /> Video Format</label>
            <select 
              className="w-full rounded-lg border-input bg-background px-3 py-2.5 text-sm shadow-sm"
              value={w.aspectRatio}
              onChange={(e) => w.setAspectRatio(e.target.value as any)}
            >
              <option value="9:16">Portrait (9:16) - TikTok/Shorts</option>
              <option value="16:9">Landscape (16:9) - YouTube</option>
              <option value="1:1">Square (1:1) - Instagram</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Subtitle Style</label>
            <select 
              className="w-full rounded-lg border-input bg-background px-3 py-2.5 text-sm shadow-sm"
              value={w.subtitlePreset}
              onChange={(e) => w.applySubtitlePreset(e.target.value)}
            >
              {SUBTITLE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.tag})</option>
              ))}
              <option value="none">No Subtitles (Raw)</option>
            </select>
          </div>
          
          <div className="space-y-2 flex flex-col justify-end pb-1">
            <label className="relative inline-flex items-center cursor-pointer group">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={w.autoMode} 
                onChange={(e) => w.set('autoMode', e.target.checked)} 
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-500" />
                Auto-Pilot Mode
              </span>
            </label>
            <p className="text-[10px] text-muted-foreground mt-1 ml-14">Skips manual review steps</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Subject / Topic</label>
        <input
          type="text"
          className="w-full rounded-lg border border-input bg-transparent px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="e.g. 5 hidden features of iOS 18"
          value={w.subject}
          onChange={(e) => w.set('subject', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Tone</label>
          <select 
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={w.tone}
            onChange={(e) => w.set('tone', e.target.value)}
          >
            <option>Documentary</option>
            <option>Energetic</option>
            <option>Educational</option>
            <option>Humorous</option>
            <option>Dramatic</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Target Duration (seconds)</label>
          <input
            type="number"
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm shadow-sm"
            value={w.targetDuration}
            onChange={(e) => w.set('targetDuration', parseInt(e.target.value) || 30)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
           <label className="text-sm font-medium">Narration Script</label>
           <button 
             onClick={generateScript}
             disabled={generating}
             className="text-xs text-primary hover:underline font-bold flex items-center gap-1.5 disabled:opacity-50 px-3 py-1.5 bg-primary/10 rounded-lg transition-colors"
           >
             {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
             Generate Script
           </button>
        </div>
        <textarea
          className="min-h-[220px] w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-relaxed"
          placeholder="Write or paste your narration here..."
          value={w.narration}
          onChange={(e) => w.set('narration', e.target.value)}
        />
        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <span>{w.narration.trim().split(/\s+/).filter(Boolean).length} words</span>
          <span>~{Math.round(w.narration.trim().split(/\s+/).filter(Boolean).length / 2.5)}s estimated duration</span>
        </div>
      </div>
    </div>
  )
}
