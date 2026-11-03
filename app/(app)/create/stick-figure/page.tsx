"use client";

import React, { useState } from "react";
import Link from "next/link";
import { StickFigureCanvas } from "@/components/2d-studio/StickFigureCanvas";
import { CharacterCreator } from "@/components/2d-studio/CharacterCreator";
import { ScriptToVideoStudio } from "@/components/2d-studio/ScriptToVideoStudio";
import { StrokeTracerCanvas } from "@/components/2d-studio/StrokeTracerCanvas";
import { Button } from "@/components/ui/button";
import {
  Film,
  PenTool,
  Sparkles,
  Layers,
  ArrowLeft,
  Volume2,
  Code,
  Zap,
  Info,
  CheckCircle2,
  UserCheck,
  Activity,
  FileText,
} from "lucide-react";

export default function StickFigureStudioPage() {
  const [activeMood, setActiveMood] = useState<string>("dusk");
  const [activeView, setActiveView] = useState<"script" | "creator" | "kinematics" | "tracing">("script");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/create"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200 bg-clip-text text-transparent">
                2D Stick Figure Animation & Character Studio
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Deterministic 11-point skeletal kinematics, multi-generational character design, companion animals, and mathematical audio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Zero GPU / $0 Compute Engine
          </span>
          <Link href="/create/whiteboard">
            <Button variant="outline" size="sm" className="border-slate-800 text-xs">
              Open Whiteboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Studio View Toggle */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveView("script")}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeView === "script"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            Script Auto-Director & Generative Props
          </button>

          <button
            type="button"
            onClick={() => setActiveView("creator")}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeView === "creator"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Character Wardrobe Studio
          </button>

          <button
            type="button"
            onClick={() => setActiveView("kinematics")}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeView === "kinematics"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            Kinematic Physics & Audio Canvas
          </button>

          <button
            type="button"
            onClick={() => setActiveView("tracing")}
            className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeView === "tracing"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <PenTool className="w-4 h-4" />
            Anime.js Vector Stroke Tracer
          </button>
        </div>

        <span className="text-xs font-mono text-slate-500 hidden sm:inline">
          lib/engine/2d-studio (TypeScript Native)
        </span>
      </div>

      {/* Main Studio Viewport */}
      <div className="max-w-7xl mx-auto">
        {activeView === "script" ? (
          <ScriptToVideoStudio />
        ) : activeView === "tracing" ? (
          <StrokeTracerCanvas />
        ) : activeView === "creator" ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Custom Character Designer & Scene Staging
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Design characters across all age groups (toddler to elderly), gender traits, vehicles, pets, and financial props.
                </p>
              </div>
            </div>
            <CharacterCreator />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Canvas Area (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                      Live Kinematic Canvas
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                    1920x1080 Native Canvas (24 FPS)
                  </span>
                </div>

                {/* Embedded Interactive Stick Figure Canvas */}
                <div className="w-full flex justify-center">
                  <StickFigureCanvas
                    initialStyle={activeMood}
                    initialPose="walk"
                    width={800}
                    height={450}
                    showControls={true}
                  />
                </div>
              </div>

              {/* Engine Architecture Callout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <Code className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wide">11-Point Kinematics</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Head, neck, chest, hips, shoulders, elbows, wrists, knees, and ankles calculated deterministically in real-time.
                  </p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-cyan-400 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wide">Dynamic Rim Light</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Atmospheric color grading and rim-lighting shaders simulate directional sunlight, neon glows, and moonlit skies.
                  </p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <Volume2 className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wide">Procedural Audio</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    35+ mathematical SFX presets synthesized with zero third-party audio downloads using pure NumPy/SciPy waveforms.
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar Info & Workflows (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Engine Status */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  Engine Specifications
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                    <span className="text-slate-400">Kinematic Solver</span>
                    <span className="font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      rig2d (Active)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                    <span className="text-slate-400">Screenplay Director</span>
                    <span className="font-mono text-amber-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                      Kaomei Choreo
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                    <span className="text-slate-400">Lighting Models</span>
                    <span className="text-slate-200">5 Cine Moods</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                    <span className="text-slate-400">Audio Synthesizer</span>
                    <span className="text-slate-200">NumPy / PCM Buffer</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
                    <span className="text-slate-400">Rendering Cost</span>
                    <span className="font-semibold text-emerald-400">$0.00 / 0 tokens</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-400">Antigravity Slash Cmds</span>
                    <span className="font-mono text-amber-400">/make-2d-video</span>
                  </div>
                </div>
              </div>

              {/* Quick Style Switcher */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Cinematic Atmosphere Presets
                </h3>
                <div className="space-y-2">
                  {[
                    { id: "dusk", name: "Cinematic Dusk", desc: "Purple twilight & golden horizon", color: "from-purple-900 to-amber-600" },
                    { id: "midnight", name: "Midnight Blue", desc: "Dark blue starry sky & rim glow", color: "from-blue-950 to-indigo-900" },
                    { id: "golden", name: "Golden Hour", desc: "Warm amber & blazing sunlight", color: "from-amber-600 to-yellow-500" },
                    { id: "noir", name: "Neon Noir", desc: "Cyberpunk shadows & neon highlights", color: "from-slate-950 to-pink-900" },
                    { id: "soft", name: "Soft Storybook", desc: "Pastel watercolor illustration", color: "from-sky-400 to-rose-300" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMood(m.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        activeMood === m.id
                          ? "bg-amber-500/15 border-amber-500/60 text-slate-100 shadow-md"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{m.name}</div>
                        <div className="text-[10px] text-slate-500">{m.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${m.color} border border-white/20`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
