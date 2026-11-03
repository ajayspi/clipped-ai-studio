'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  drawFigure,
  POSES,
  walkPose,
  breathe,
  PoseName,
  STYLES,
  setStyle,
  mood,
  E,
  PROCEDURAL_SFX_CATALOG,
} from '@/lib/engine/2d-studio';
import { Button } from '@/components/ui/button';
import { Play, Pause, Sparkles, Volume2, RotateCcw, Palette, Smile } from 'lucide-react';

interface StickFigureCanvasProps {
  initialStyle?: string;
  initialPose?: PoseName | 'walk';
  width?: number;
  height?: number;
  showControls?: boolean;
  className?: string;
}

export function StickFigureCanvas({
  initialStyle = 'dusk',
  initialPose = 'stand',
  width = 720,
  height = 405,
  showControls = true,
  className = '',
}: StickFigureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(initialStyle);
  const [selectedPose, setSelectedPose] = useState<PoseName | 'walk'>(initialPose);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [hasRimLight, setHasRimLight] = useState<boolean>(true);
  const [hasBreathing, setHasBreathing] = useState<boolean>(true);
  const [expression, setExpression] = useState<string>('smiling');
  const [selectedSfx, setSelectedSfx] = useState<string>('whoosh');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Set style in engine
  useEffect(() => {
    setStyle(selectedStyle);
  }, [selectedStyle]);

  // Animation render method
  const render = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentMood = mood(
        selectedStyle === 'midnight' ? 'night' : selectedStyle === 'golden' ? 'golden' : 'dusk'
      );
      const styleObj = STYLES[selectedStyle] || STYLES.dusk;

      // Set logical dimensions
      E.W = 1920;
      E.H = 1080;
      E.style = styleObj;

      ctx.save();
      // Scale canvas to match logical units
      const scale = canvas.width / E.W;
      ctx.scale(scale, scale);

      // 1. Draw atmospheric background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, E.H);
      const sky = currentMood.sky || ['#1e142e', '#3a2042', '#e8956b'];
      sky.forEach((col, i) => {
        bgGrad.addColorStop(i / Math.max(1, sky.length - 1), col);
      });
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, E.W, E.H);

      // 2. Horizon and floor
      const horizonY = E.H * 0.72;
      ctx.fillStyle = currentMood.floor || '#2a1a2e';
      ctx.fillRect(0, horizonY, E.W, E.H - horizonY);

      // Subtle horizon fog glow
      const fogGrad = ctx.createLinearGradient(0, horizonY - 120, 0, horizonY + 80);
      fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
      fogGrad.addColorStop(0.5, currentMood.fog ? `${currentMood.fog}33` : 'rgba(255,180,140,0.18)');
      fogGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, horizonY - 120, E.W, 200);

      // 3. Compute pose
      let currentPosePoints = POSES.stand;
      if (selectedPose === 'walk') {
        const walkPhase = t * 2.8 * Math.PI;
        currentPosePoints = walkPose(walkPhase);
      } else {
        const base = POSES[selectedPose] || POSES.stand;
        currentPosePoints = hasBreathing ? breathe(base, t * 1.5, 0.4) : base;
      }

      // Figure position in 1920x1080 frame
      const figureX = E.W * 0.5;
      const figureY = horizonY + 40;

      // 4. Draw character
      drawFigure(ctx, {
        x: figureX,
        y: figureY,
        s: 1.5,
        facing: 1,
        pose: currentPosePoints,
        expr: expression,
        talk: isPlaying ? Math.abs(Math.sin(t * 8)) * 0.4 : 0,
        animTime: t,
        rim: hasRimLight
          ? {
              dir: [-0.8, -0.6],
              w: styleObj.rimWidth * 1.2,
              color: currentMood.rim || styleObj.feature || '#ffc68a',
            }
          : false,
        outfit: {
          top: 'hoodie',
          color: selectedStyle === 'neon' ? '#ff3388' : selectedStyle === 'midnight' ? '#3366cc' : '#d64a33',
          head: 'none',
        },
      });

      // 5. Cinematic letterbox bars
      const barHeight = E.H * 0.06;
      ctx.fillStyle = '#08060c';
      ctx.fillRect(0, 0, E.W, barHeight);
      ctx.fillRect(0, E.H - barHeight, E.W, barHeight);

      ctx.restore();
    },
    [selectedStyle, selectedPose, isPlaying, hasRimLight, hasBreathing, expression]
  );

  // RAF loop cleanly managed in useEffect
  useEffect(() => {
    let animId: number;
    let startTime: number | null = null;

    const frameLoop = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      render(elapsed);
      if (isPlaying) {
        animId = requestAnimationFrame(frameLoop);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(frameLoop);
    } else {
      render(0);
    }

    return () => {
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [isPlaying, render]);

  // Audio auditioning
  const playSfx = async (sfxName: string) => {
    try {
      setIsPlayingAudio(true);
      const res = await fetch('/api/audio/procedural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sfx', name: sfxName }),
      });
      const data = await res.json();
      if (data.success && (data.audioUrl || data.audioBase64)) {
        const audio = new Audio(data.audioUrl || `data:audio/wav;base64,${data.audioBase64}`);
        audio.play();
      }
    } catch (e) {
      console.error('Failed to play procedural SFX:', e);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 max-w-full ${className}`}>
      {/* Canvas Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-slate-950 shadow-2xl flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-auto max-w-full block aspect-video object-contain"
        />

        {/* Floating Overlay Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-8 px-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
            <span className="text-xs">{isPlaying ? 'Pause' : 'Play'}</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedPose('stand');
              setHasRimLight(true);
              setHasBreathing(true);
              setExpression('smile');
            }}
            className="h-8 px-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10"
            title="Reset Pose"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Zero-Cost Engine Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-emerald-400">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Procedural 2D Rig</span>
        </div>

        {/* Subtitle / Timestamp */}
        <div className="absolute bottom-2 left-3 text-[11px] font-mono text-white/60 pointer-events-none drop-shadow">
          Code-Rendered: Canvas2D · 24 FPS · Zero Server Compute
        </div>
      </div>

      {/* Controls Drawer */}
      {showControls && (
        <div className="flex flex-col gap-3 pt-1">
          {/* Style Selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Palette className="w-3.5 h-3.5" />
              <span>Cinematic Lighting Moods:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {Object.keys(STYLES).map((styleKey) => {
                const s = STYLES[styleKey];
                const active = selectedStyle === styleKey;
                return (
                  <button
                    key={styleKey}
                    type="button"
                    onClick={() => setSelectedStyle(styleKey)}
                    className={`flex flex-col p-2 rounded-lg border text-left transition-all ${
                      active
                        ? 'border-violet-500 bg-violet-500/10 text-violet-500 shadow-sm'
                        : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <span className="text-xs font-semibold leading-tight">{s.name}</span>
                    <span className="text-[10px] opacity-70 truncate">{styleKey}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pose Selector & Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Pose:</span>
              {(['stand', 'relaxed', 'shrug', 'reach', 'ready', 'kick', 'jump', 'walk'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPose(p)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    selectedPose === p
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Expression */}
              <div className="flex items-center gap-1">
                <Smile className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Mood:</span>
                {(['smiling', 'angry', 'shocked', 'happy', 'laughing', 'neutral'] as const).map((expr) => (
                  <button
                    key={expr}
                    type="button"
                    onClick={() => setExpression(expr)}
                    className={`text-[11px] px-2 py-0.5 rounded transition-all ${
                      expression === expr
                        ? 'bg-amber-500/20 text-amber-500 font-semibold border border-amber-500/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {expr}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasRimLight}
                  onChange={(e) => setHasRimLight(e.target.checked)}
                  className="rounded border-border text-violet-600 focus:ring-violet-500 w-3.5 h-3.5"
                />
                <span>Rim Light</span>
              </label>

              <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasBreathing}
                  onChange={(e) => setHasBreathing(e.target.checked)}
                  className="rounded border-border text-violet-600 focus:ring-violet-500 w-3.5 h-3.5"
                />
                <span>Breathing</span>
              </label>
            </div>
          </div>

          {/* Procedural Sound Effects Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-medium">Procedural SFX Synthesizer:</span>
              <select
                value={selectedSfx}
                onChange={(e) => setSelectedSfx(e.target.value)}
                className="bg-background text-foreground border border-border rounded-md px-2 py-1 text-xs"
              >
                {PROCEDURAL_SFX_CATALOG.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} - {s.desc}
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => playSfx(selectedSfx)}
              disabled={isPlayingAudio}
              className="h-7 text-xs border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
            >
              <Volume2 className="w-3.5 h-3.5 mr-1" />
              {isPlayingAudio ? 'Synthesizing...' : `Audition '${selectedSfx}.wav'`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
