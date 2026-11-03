"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Send,
  Sparkles,
  Layers,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  VISOTALK_PRESETS,
  parseVisoDocument,
  evaluateActiveWordAndCues,
  generateVisoTalkHtml,
} from '@/lib/engine/visotalk-orchestrator';

export function VisoTalkStudio() {
  const router = useRouter();
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('python_tooling');
  const [rawMarkup, setRawMarkup] = useState<string>(VISOTALK_PRESETS.python_tooling.markup);
  const [duration, setDuration] = useState<number>(VISOTALK_PRESETS.python_tooling.duration);
  const doc = useMemo(() => {
    return parseVisoDocument(rawMarkup, duration);
  }, [rawMarkup, duration]);

  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Audio Playback simulation ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeMs((prev) => {
        const next = prev + 50;
        return next > duration * 1000 ? 0 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const activeBeat = doc.beats[0];
  const activeState = evaluateActiveWordAndCues(activeBeat, currentTimeMs);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawMarkup);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const html = generateVisoTalkHtml(doc);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPresetKey}_visotalk.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToQueue = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/workflows/code-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `VisoTalk Explainer: ${activeBeat.narrationText.slice(0, 100)}` }),
      });
      const data = await res.json();
      if (data.jobId) {
        router.push('/queue');
      } else {
        alert(data.error || 'Failed to submit VisoTalk explainer');
      }
    } catch {
      alert('Network error while enqueueing job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-background text-foreground">
      {/* Studio Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-sm">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">VisoTalk Word-Anchored Explainer Studio</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30">
                Narration is the Timeline
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Anchor visual badges, callouts, and code diagrams directly to spoken words. Visuals never drift across voice swaps or dubbing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy Markup'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export HTML5
          </Button>
          <Button
            size="sm"
            onClick={handleSendToQueue}
            disabled={submitting}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5 shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? 'Enqueueing...' : 'Send to Queue'}
          </Button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
        {/* Left Column: Preset Shelf & Script Markup Editor (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Preset Buttons */}
          <div className="p-4 rounded-xl border border-border bg-card/50 shadow-sm flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Curated Explainer Presets
            </span>
            <div className="flex flex-col gap-2">
              {Object.entries(VISOTALK_PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedPresetKey(key);
                    setRawMarkup(item.markup);
                    setDuration(item.duration);
                    setCurrentTimeMs(0);
                  }}
                  className={`text-left p-3 rounded-lg border text-xs transition-all ${
                    selectedPresetKey === key
                      ? 'border-violet-500/50 bg-violet-500/10 text-violet-300 font-semibold'
                      : 'border-border bg-background/50 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="font-semibold text-foreground">{item.title}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Declarative doc.tsx Markup Editor */}
          <div className="p-4 rounded-xl border border-border bg-card/50 shadow-sm flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-violet-400" />
                Declarative Markup (doc.tsx)
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">{duration.toFixed(1)}s</span>
            </div>
            <textarea
              value={rawMarkup}
              onChange={(e) => setRawMarkup(e.target.value)}
              className="w-full flex-1 min-h-[160px] p-3 rounded-lg border border-border bg-zinc-950 font-mono text-xs text-violet-200 resize-none focus:outline-none focus:border-violet-500"
            />
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span>Use <code className="text-violet-400">&lt;Appear on=&quot;id&quot; motion=&quot;pop&quot;&gt;word&lt;/Appear&gt;</code> to anchor visuals.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Word-Scrubber & Visual Stage (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Visual Stage Canvas */}
          <div className="flex-1 min-h-[440px] rounded-2xl border border-border bg-zinc-950 p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden">
            {/* Background Mesh Accent */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
              }}
            />

            {/* Top Word-Highlighting Display */}
            <div className="z-10 flex flex-wrap gap-x-2 gap-y-3 text-2xl font-medium leading-relaxed">
              {activeBeat.words.map((w, idx) => {
                const isCurrent = idx === activeState.activeWordIndex;
                const isPast = idx < activeState.activeWordIndex;
                return (
                  <span
                    key={idx}
                    className={`transition-all duration-150 rounded px-1.5 py-0.5 ${
                      isCurrent
                        ? 'bg-violet-500 text-white font-bold shadow-[0_0_15px_rgba(139,92,246,0.8)] scale-105'
                        : isPast
                        ? 'text-white'
                        : 'text-zinc-600'
                    }`}
                  >
                    {w.word}
                  </span>
                );
              })}
            </div>

            {/* Bottom Anchored Visual Cues Shelf */}
            <div className="z-10 border-t border-zinc-800/80 pt-6 mt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-violet-400" />
                Triggered Visual Elements ({activeState.activeCues.length} / {activeBeat.cues.length})
              </div>
              <div className="flex flex-wrap gap-3 min-h-[50px]">
                {activeBeat.cues.map((cue) => {
                  const isVisible = activeState.activeWordIndex >= cue.targetWordIndex;
                  return (
                    <div
                      key={cue.id}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                        isVisible
                          ? 'border-violet-500/80 bg-violet-500/20 text-violet-200 shadow-[0_0_15px_rgba(139,92,246,0.3)] translate-y-0 scale-100 opacity-100'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-600 translate-y-2 scale-95 opacity-20'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                      {cue.label || cue.id}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Word-by-Word Timeline Scrubber */}
          <div className="p-4 rounded-xl border border-border bg-card/50 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span>Timeline Scrubber</span>
                <span className="font-mono text-violet-400">
                  {(currentTimeMs / 1000).toFixed(2)}s / {duration.toFixed(2)}s
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Word {activeState.activeWordIndex + 1} of {activeBeat.words.length}: &ldquo;{activeState.activeWord}&rdquo;
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={duration * 1000}
              step="20"
              value={currentTimeMs}
              onChange={(e) => {
                setCurrentTimeMs(parseFloat(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full accent-violet-500 cursor-pointer"
            />

            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-xs gap-1.5"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isPlaying ? 'Pause Simulation' : 'Play Narration'}
              </Button>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Zero Audio Drift Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
