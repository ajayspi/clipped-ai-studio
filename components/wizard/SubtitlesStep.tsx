"use client"

import { useWizardStore } from './wizard-store'

export function SubtitlesStep() {
  const w = useWizardStore()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
        <div>
          <h3 className="font-medium">Burn-in Subtitles</h3>
          <p className="text-sm text-muted-foreground">Hardcode animated subtitles into the video.</p>
        </div>
        <input 
          type="checkbox" 
          className="w-5 h-5 accent-primary" 
          checked={w.burnSubtitles} 
          onChange={(e) => w.set('burnSubtitles', e.target.checked)} 
        />
      </div>

      {w.burnSubtitles && (
        <div className="grid grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/20">
          <div className="space-y-2">
            <label className="text-sm font-medium">Font Preset</label>
            <select 
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={w.subtitlePreset}
              onChange={(e) => w.set('subtitlePreset', e.target.value)}
            >
              <option>Clean (Hormozi style)</option>
              <option>Bold Pop</option>
              <option>Minimalist</option>
              <option>Cinematic</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Position</label>
            <select 
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={w.subtitlePosition}
              onChange={(e) => w.set('subtitlePosition', e.target.value)}
            >
              <option>Bottom (Recommended)</option>
              <option>Center</option>
              <option>Top</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Color</label>
            <div className="flex gap-2 items-center">
              <input 
                type="color" 
                className="w-8 h-8 rounded border p-0 cursor-pointer" 
                value={w.subtitleColor}
                onChange={(e) => w.set('subtitleColor', e.target.value)}
              />
              <span className="text-sm font-mono text-muted-foreground">{w.subtitleColor}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
