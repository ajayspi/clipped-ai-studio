"use client"

import { useWizardStore } from './wizard-store'

export function VoiceStep() {
  const w = useWizardStore()

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Voiceover</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <select 
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={w.voiceService}
              onChange={(e) => w.set('voiceService', e.target.value)}
            >
              <option>OpenAI TTS</option>
              <option>ElevenLabs</option>
              <option>Google Cloud</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Voice Model</label>
            <select 
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={w.voice}
              onChange={(e) => w.set('voice', e.target.value)}
            >
              <option value="alloy">Alloy (Neutral)</option>
              <option value="echo">Echo (Warm)</option>
              <option value="fable">Fable (Expressive)</option>
              <option value="onyx">Onyx (Deep)</option>
              <option value="nova">Nova (Energetic)</option>
              <option value="shimmer">Shimmer (Clear)</option>
            </select>
          </div>
        </div>
      </div>

      <hr />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Background Music</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Music Source</label>
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={w.musicSource}
            onChange={(e) => w.set('musicSource', e.target.value)}
          >
            <option>Random Background Music</option>
            <option>Epic / Cinematic</option>
            <option>Lo-Fi / Chill</option>
            <option>None</option>
          </select>
        </div>
      </div>
    </div>
  )
}
