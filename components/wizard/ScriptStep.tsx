"use client"

import { useState } from 'react'
import { useWizardStore } from './wizard-store'
import { Loader2 } from 'lucide-react'

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
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Subject / Topic</label>
        <input
          type="text"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="e.g. 5 hidden features of iOS 18"
          value={w.subject}
          onChange={(e) => w.set('subject', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tone</label>
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          <label className="text-sm font-medium">Target Duration (seconds)</label>
          <input
            type="number"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
            value={w.targetDuration}
            onChange={(e) => w.set('targetDuration', parseInt(e.target.value) || 30)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
           <label className="text-sm font-medium">Narration Script</label>
           <button 
             onClick={generateScript}
             disabled={generating}
             className="text-xs text-primary hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
           >
             {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
             Generate with AI
           </button>
        </div>
        <textarea
          className="min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Write or paste your narration here..."
          value={w.narration}
          onChange={(e) => w.set('narration', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {w.narration.trim().split(/\s+/).filter(Boolean).length} words
        </p>
      </div>
    </div>
  )
}
