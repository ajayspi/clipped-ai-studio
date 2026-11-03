"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PAPERCRAFT_STYLE_PRESETS,
  ORIGAMI_FOLD_PRESETS,
  PAPERCRAFT_DOCUMENTARY_PRESETS,
  calculateOrigamiFoldTransform,
  computeStopMotionJitter,
  PaperFastener,
  type PaperStyleId,
  type OrigamiFoldType,
  type FastenerType,
  type PapercraftScriptPreset,
} from "@/lib/engine/papercraft-studio";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  RotateCcw,
  Layers,
  Sliders,
  Send,
  CheckCircle2,
  Bookmark,
  Newspaper,
  Compass,
  Coins,
} from "lucide-react";

export function PapercraftStudio() {
  // Preset & Editor State
  const [selectedPresetId, setSelectedPresetId] = useState<string>("printing_press");
  const [activeBeatIndex, setActiveBeatIndex] = useState<number>(0);
  const [activeStyle, setActiveStyle] = useState<PaperStyleId>("vintage_newsprint");
  const [activeFold, setActiveFold] = useState<OrigamiFoldType>("accordion_h");
  const [activeFastener, setActiveFastener] = useState<FastenerType>("masking_tape");
  
  // Animation & Timeline State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [foldProgress, setFoldProgress] = useState<number>(1.0); // 0 (folded) to 1 (flat/open)
  const [enableJitter, setEnableJitter] = useState<boolean>(true);
  const [animFrame, setAnimFrame] = useState<number>(0);

  const currentPreset: PapercraftScriptPreset =
    PAPERCRAFT_DOCUMENTARY_PRESETS.find((p) => p.id === selectedPresetId) ||
    PAPERCRAFT_DOCUMENTARY_PRESETS[0];

  const currentBeat = currentPreset.beats[activeBeatIndex] || currentPreset.beats[0];
  const styleConfig = PAPERCRAFT_STYLE_PRESETS[activeStyle];

  // RequestAnimationFrame loop for preview animation
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        setAnimFrame((prev) => prev + 1);
        setFoldProgress((prev) => {
          // Smooth bounce cycle between 0 and 1
          const next = prev + delta * 0.8;
          return next > 1 ? 0 : next;
        });
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  // Load preset defaults when preset changes
  const handleSelectPreset = (preset: PapercraftScriptPreset) => {
    setSelectedPresetId(preset.id);
    setActiveBeatIndex(0);
    setActiveStyle(preset.style);
    setActiveFold(preset.defaultFold);
    setActiveFastener(preset.beats[0].fastener);
    setFoldProgress(0);
  };

  // 3D Origami Transform
  const foldTransforms = calculateOrigamiFoldTransform(activeFold, foldProgress, 'enter');

  // 12 FPS Stop-Motion Jitter
  const jitter = enableJitter
    ? computeStopMotionJitter(animFrame, 30, 1.2)
    : { rotateDeg: 0, translateX: 0, translateY: 0 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Interactive 3D Origami & Papercraft Viewport */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
          {/* Viewport Top Bar */}
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-semibold text-slate-200">
                3D Origami Viewport (12 FPS Stop-Motion)
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono">
                {ORIGAMI_FOLD_PRESETS[activeFold].name}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono">
                Fold: {(foldProgress * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* 3D Paper Stage Container */}
          <div
            className="relative w-full h-[360px] sm:h-[420px] rounded-xl flex items-center justify-center overflow-hidden border border-slate-800/60 shadow-inner"
            style={{
              backgroundColor: styleConfig.backgroundColor,
              perspective: "1200px",
            }}
          >
            {/* Background Texture Overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25 mix-blend-multiply"
              style={{
                backgroundImage:
                  "radial-gradient(#000 1px, transparent 1px), radial-gradient(#000 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 10px 10px",
              }}
            />

            {/* 3D Origami Hinged Container */}
            <div
              style={{
                width: "82%",
                height: "76%",
                position: "relative",
                transformStyle: "preserve-3d",
                transform: foldTransforms.leftTransform,
                opacity: foldTransforms.leftOpacity,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                transition: isPlaying ? "none" : "transform 0.15s ease-out",
              }}
            >
              {/* The Tactile Paper Card */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  transform: `rotate(${jitter.rotateDeg}deg) translate(${jitter.translateX}px, ${jitter.translateY}px)`,
                  backgroundColor: styleConfig.cardColor,
                  boxShadow: styleConfig.dropShadow,
                  border: `2px solid ${styleConfig.borderColor}`,
                  borderRadius: "6px",
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px 24px",
                  overflow: "hidden",
                }}
              >
                {/* Fasteners */}
                <PaperFastener type={activeFastener} position="top-left" />
                <PaperFastener type={activeFastener} position="top-right" />

                {/* Card Header & Vintage Stamp */}
                <div className="flex items-center justify-between mb-3 border-b border-black/10 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] uppercase tracking-widest font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: styleConfig.accentColor,
                        color: "#fff",
                      }}
                    >
                      BEAT {activeBeatIndex + 1}/{currentPreset.beats.length}
                    </span>
                    <span
                      className="text-[11px] font-serif italic text-black/60 truncate max-w-[200px]"
                    >
                      {currentPreset.title}
                    </span>
                  </div>

                  <div
                    className="border border-red-700/60 text-red-700 text-[9px] font-mono font-black uppercase px-2 py-0.5 rotate-[-4deg] tracking-wider"
                    style={{ borderRadius: "2px" }}
                  >
                    CONFIDENTIAL
                  </div>
                </div>

                {/* Visual Hint Illustration Slot */}
                <div className="flex-1 rounded border border-black/15 bg-black/[0.04] p-3 flex flex-col justify-center items-center text-center relative overflow-hidden">
                  <div className="text-3xl mb-1.5">
                    {activeFold === "accordion_h" && "📖"}
                    {activeFold === "accordion_v" && "📜"}
                    {activeFold === "diagonal_fold" && "📐"}
                    {activeFold === "envelope_reveal" && "✉️"}
                    {activeFold === "pop_up_book" && "🏛️"}
                  </div>
                  <p
                    className="text-xs font-serif font-medium leading-relaxed max-w-[320px]"
                    style={{ color: styleConfig.textColor }}
                  >
                    &ldquo;{currentBeat.visualHint}&rdquo;
                  </p>
                  <span className="mt-2 text-[10px] font-mono text-black/50">
                    Duration: {currentBeat.duration}s • Fastener: {activeFastener}
                  </span>
                </div>

                {/* Subtitle / Script Box */}
                <div className="mt-3 pt-2.5 border-t border-black/15 text-center">
                  <p
                    className="text-xs sm:text-sm font-serif font-bold leading-snug"
                    style={{ color: styleConfig.textColor }}
                  >
                    {currentBeat.text}
                  </p>
                </div>

                {/* Origami Crease Shading Shadow */}
                {foldTransforms.shadingOpacity > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      background:
                        "linear-gradient(90deg, rgba(0,0,0,0.3) 0%, transparent 42%, rgba(0,0,0,0.55) 50%, transparent 58%, rgba(0,0,0,0.3) 100%)",
                      opacity: foldTransforms.shadingOpacity,
                      zIndex: 25,
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs gap-1.5"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? "Pause Fold" : "Play Fold"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-slate-400 hover:text-slate-200 text-xs gap-1"
                onClick={() => {
                  setFoldProgress(0);
                  setAnimFrame(0);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableJitter}
                  onChange={(e) => setEnableJitter(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                12 FPS Jitter
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Scrub:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={foldProgress}
                  disabled={isPlaying}
                  onChange={(e) => setFoldProgress(parseFloat(e.target.value))}
                  className="w-24 sm:w-32 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Beats Stepper Bar */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Documentary Scene Beats ({currentPreset.beats.length} total)
            </span>
            <span className="text-[11px] text-amber-400">
              Total: {currentPreset.beats.reduce((acc, b) => acc + b.duration, 0).toFixed(1)}s
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {currentPreset.beats.map((beat, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveBeatIndex(idx);
                  if (beat.foldType) setActiveFold(beat.foldType);
                  if (beat.fastener) setActiveFastener(beat.fastener);
                  setFoldProgress(0);
                }}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  activeBeatIndex === idx
                    ? "bg-amber-500/15 border-amber-500/50 text-slate-100 shadow-sm"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="font-bold">BEAT {idx + 1}</span>
                  <span>{beat.duration}s</span>
                </div>
                <p className="text-[11px] line-clamp-2 leading-relaxed">
                  {beat.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Customization Controls & Presets */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Curated Documentary Topics */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 mb-2.5 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-500" />
            Curated Documentary Presets
          </h3>
          <div className="space-y-2">
            {PAPERCRAFT_DOCUMENTARY_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              const Icon =
                preset.id === "printing_press"
                  ? Newspaper
                  : preset.id === "mercator_maps"
                  ? Compass
                  : Coins;

              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-500/15 to-orange-500/5 border-amber-500/50 shadow-sm"
                      : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {preset.title}
                      </h4>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {preset.topic}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D Origami Fold Mechanics */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 mb-2.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            3D Origami Fold Transitions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(ORIGAMI_FOLD_PRESETS) as OrigamiFoldType[]).map((foldKey) => {
              const fold = ORIGAMI_FOLD_PRESETS[foldKey];
              const isSelected = activeFold === foldKey;

              return (
                <button
                  key={foldKey}
                  onClick={() => {
                    setActiveFold(foldKey);
                    setFoldProgress(0);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500/50 text-slate-100"
                      : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-200">{fold.name}</div>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {fold.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paper Textures & Fasteners */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              Paper & Fastener Styling
            </h3>
          </div>

          <div className="space-y-3">
            {/* Paper Theme */}
            <div>
              <span className="text-xs text-slate-400 mb-1.5 block">Paper Material:</span>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PAPERCRAFT_STYLE_PRESETS) as PaperStyleId[]).map((styleKey) => {
                  const s = PAPERCRAFT_STYLE_PRESETS[styleKey];
                  const isSelected = activeStyle === styleKey;

                  return (
                    <button
                      key={styleKey}
                      onClick={() => setActiveStyle(styleKey)}
                      className={`p-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500/50 text-slate-100"
                          : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: s.backgroundColor }}
                      />
                      <span className="text-xs font-medium truncate">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fastener Selector */}
            <div>
              <span className="text-xs text-slate-400 mb-1.5 block">Corner Fastener:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["masking_tape", "washi_tape", "paperclip", "pushpin"] as FastenerType[]).map(
                  (fastenerKey) => {
                    const isSelected = activeFastener === fastenerKey;
                    const labels: Record<FastenerType, string> = {
                      masking_tape: "Masking Tape",
                      washi_tape: "Washi Tape",
                      paperclip: "Paperclip",
                      pushpin: "Pushpin",
                    };

                    return (
                      <button
                        key={fastenerKey}
                        onClick={() => setActiveFastener(fastenerKey)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isSelected
                            ? "bg-amber-500/15 border-amber-500/50 text-slate-100"
                            : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span className="text-xs font-medium">{labels[fastenerKey]}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button: Send to Remotion */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-300">
              Ready for Remotion & FFmpeg Production
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              $0 Compute / Pure CSS
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Exports high-retention papercraft documentary timeline with 3D origami folding matrices and 12 FPS stop-motion tactile physics.
          </p>
          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-semibold text-xs h-9 gap-2 shadow-md cursor-pointer"
            onClick={() => {
              alert(`Ready! "${currentPreset.title}" queued for 1080p papercraft video generation with ${activeFold} transitions.`);
            }}
          >
            <Send className="w-3.5 h-3.5" />
            Send Papercraft Timeline to Queue
          </Button>
        </div>
      </div>
    </div>
  );
}
