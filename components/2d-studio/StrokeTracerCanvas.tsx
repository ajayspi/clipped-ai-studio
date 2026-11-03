"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { animate } from "animejs";
import {
  Play,
  RotateCcw,
  Sparkles,
  PenTool,
  CheckCircle2,
  Copy,
  Sliders,
  Smile,
  Layers,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type ExpressionKey = "smiling" | "angry" | "shocked" | "happy" | "laughing";
export type PoseKey = "stand" | "walk" | "reach" | "shrug" | "jump" | "kick";
export type PropKey = "none" | "laptop" | "coffee" | "smartphone" | "trophy" | "car";

interface StrokeTracerProps {
  className?: string;
}

export function StrokeTracerCanvas({ className = "" }: StrokeTracerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [expression, setExpression] = useState<ExpressionKey>("smiling");
  const [pose, setPose] = useState<PoseKey>("stand");
  const [prop, setProp] = useState<PropKey>("coffee");
  const [drawSpeed, setDrawSpeed] = useState<number>(1.2);
  const [strokeColor, setStrokeColor] = useState<string>("#fbbf24"); // Amber/Gold
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [scrubProgress, setScrubProgress] = useState<number>(100);

  // Trigger Anime.js stroke tracing
  const traceAnimation = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const paths = svgEl.querySelectorAll<SVGGeometryElement>(".trace-path");
    if (!paths || paths.length === 0) return;

    setIsPlaying(true);

    paths.forEach((path) => {
      try {
        const length = path.getTotalLength ? path.getTotalLength() : 200;
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
      } catch {
        // Fallback for non-standard geometry
        path.style.strokeDasharray = "300";
        path.style.strokeDashoffset = "300";
      }
    });

    const duration = Math.max(400, Math.round(1800 / drawSpeed));

    paths.forEach((path, idx) => {
      try {
        const length = path.getTotalLength ? path.getTotalLength() : 200;
        animate(path, {
          strokeDashoffset: [length, 0],
          duration,
          delay: idx * (80 / drawSpeed),
          ease: "inOutSine",
          onComplete: () => {
            if (idx === paths.length - 1) {
              setIsPlaying(false);
              setScrubProgress(100);
            }
          },
        });
      } catch (err) {
        console.warn("Anime.js animation fallback:", err);
        path.style.strokeDashoffset = "0";
        setIsPlaying(false);
      }
    });
  }, [drawSpeed]);

  // Run on mount or configuration changes
  useEffect(() => {
    traceAnimation();
  }, [expression, pose, prop, traceAnimation]);

  // Handle manual scrub
  const handleScrub = (percent: number) => {
    setScrubProgress(percent);
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const paths = svgEl.querySelectorAll<SVGGeometryElement>(".trace-path");
    paths.forEach((path) => {
      try {
        const length = path.getTotalLength ? path.getTotalLength() : 200;
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length * (1 - percent / 100)}`;
      } catch {
        // Fallback
      }
    });
  };

  const copySvg = () => {
    if (!svgRef.current) return;
    navigator.clipboard.writeText(svgRef.current.outerHTML);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Skeletons path definitions for poses (centered around x=300, y=280 in 600x450 viewport)
  const getPosePaths = () => {
    switch (pose) {
      case "walk":
        return {
          torso: "M 300 170 L 295 270",
          nearArm: "M 300 180 L 330 220 L 350 250",
          farArm: "M 300 180 L 270 215 L 255 240",
          nearLeg: "M 295 270 L 335 340 L 360 400 L 380 400",
          farLeg: "M 295 270 L 265 330 L 240 385 L 225 385",
        };
      case "reach":
        return {
          torso: "M 300 170 L 305 270",
          nearArm: "M 300 180 L 360 140 L 410 110",
          farArm: "M 300 180 L 280 220 L 270 260",
          nearLeg: "M 305 270 L 325 340 L 330 405 L 350 405",
          farLeg: "M 305 270 L 285 335 L 280 400 L 265 400",
        };
      case "shrug":
        return {
          torso: "M 300 170 L 300 270",
          nearArm: "M 300 180 L 350 160 L 380 135",
          farArm: "M 300 180 L 250 160 L 220 135",
          nearLeg: "M 300 270 L 315 340 L 320 405 L 340 405",
          farLeg: "M 300 270 L 285 340 L 280 405 L 260 405",
        };
      case "jump":
        return {
          torso: "M 300 140 L 300 230",
          nearArm: "M 300 150 L 360 110 L 400 80",
          farArm: "M 300 150 L 240 110 L 200 80",
          nearLeg: "M 300 230 L 350 280 L 330 340 L 350 345",
          farLeg: "M 300 230 L 250 280 L 270 340 L 250 345",
        };
      case "kick":
        return {
          torso: "M 300 170 L 285 270",
          nearArm: "M 300 180 L 340 210 L 370 190",
          farArm: "M 300 180 L 260 190 L 230 210",
          nearLeg: "M 285 270 L 350 250 L 420 230 L 435 220",
          farLeg: "M 285 270 L 275 340 L 270 405 L 250 405",
        };
      case "stand":
      default:
        return {
          torso: "M 300 170 L 300 275",
          nearArm: "M 300 180 L 325 225 L 330 270",
          farArm: "M 300 180 L 275 225 L 270 270",
          nearLeg: "M 300 275 L 315 345 L 320 410 L 338 410",
          farLeg: "M 300 275 L 285 345 L 280 410 L 262 410",
        };
    }
  };

  const posePaths = getPosePaths();

  // Head center is around (300, 125), Radius = 42
  const headCenter = { x: 300, y: 125, r: 42 };

  // 5 Canonical Expression Geometries
  const getExpressionElements = () => {
    const { x, y } = headCenter;
    switch (expression) {
      case "angry":
        // Fierce downward V-furrow: left brow angle -0.44 rad, right brow +0.44 rad
        // Narrowed glare eye slits, downturned scowl arc
        return (
          <>
            {/* Angry Brows: V-Furrow */}
            <path d={`M ${x - 22} ${y - 12} L ${x - 5} ${y - 4}`} strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            <path d={`M ${x + 5} ${y - 4} L ${x + 22} ${y - 12}`} strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            {/* Narrowed glare eyes */}
            <path d={`M ${x - 18} ${y + 2} L ${x - 8} ${y + 5}`} strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            <path d={`M ${x + 8} ${y + 5} L ${x + 18} ${y + 2}`} strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            {/* Downturned Scowl Arc (cap) */}
            <path d={`M ${x - 14} ${y + 24} Q ${x} ${y + 14} ${x + 14} ${y + 24}`} strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
          </>
        );
      case "shocked":
        // High alert arched brows, giant circular wide eyes, open circular "O" gasp
        return (
          <>
            {/* High arched brows */}
            <path d={`M ${x - 22} ${y - 18} Q ${x - 14} ${y - 28} ${x - 6} ${y - 20}`} strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            <path d={`M ${x + 6} ${y - 20} Q ${x + 14} ${y - 28} ${x + 22} ${y - 18}`} strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            {/* Giant wide eyes */}
            <circle cx={x - 13} cy={y - 2} r="6.5" strokeWidth="2.5" className="trace-path" fill="none" stroke="currentColor" />
            <circle cx={x + 13} cy={y - 2} r="6.5" strokeWidth="2.5" className="trace-path" fill="none" stroke="currentColor" />
            {/* Open "O" Gasp mouth */}
            <ellipse cx={x} cy={y + 20} rx="8" ry="12" strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" />
          </>
        );
      case "happy":
        // Cheerful crescent eyes, raised joyful brows, wide cheerful smile
        return (
          <>
            {/* Raised joyful brows */}
            <path d={`M ${x - 20} ${y - 16} Q ${x - 13} ${y - 22} ${x - 6} ${y - 16}`} strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            <path d={`M ${x + 6} ${y - 16} Q ${x + 13} ${y - 22} ${x + 20} ${y - 16}`} strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            {/* Cheerful crescent eyes */}
            <path d={`M ${x - 19} ${y} Q ${x - 13} ${y - 8} ${x - 7} ${y}`} strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            <path d={`M ${x + 7} ${y} Q ${x + 13} ${y - 8} ${x + 19} ${y}`} strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            {/* Wide smiling grin */}
            <path d={`M ${x - 18} ${y + 14} Q ${x} ${y + 28} ${x + 18} ${y + 14}`} strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
          </>
        );
      case "laughing":
        // Crescent squint eyes, raised joy brows, wide open laughing mouth with chuckling pulse
        return (
          <>
            {/* High joy brows */}
            <path d={`M ${x - 21} ${y - 18} Q ${x - 14} ${y - 25} ${x - 7} ${y - 18}`} strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            <path d={`M ${x + 7} ${y - 18} Q ${x + 14} ${y - 25} ${x + 21} ${y - 18}`} strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            {/* Squint laughing eyes */}
            <path d={`M ${x - 18} ${y + 1} Q ${x - 13} ${y - 6} ${x - 8} ${y + 1}`} strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            <path d={`M ${x + 8} ${y + 1} Q ${x + 13} ${y - 6} ${x + 18} ${y + 1}`} strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            {/* Open laughing mouth shape */}
            <path d={`M ${x - 18} ${y + 12} Q ${x} ${y + 32} ${x + 18} ${y + 12} Z`} strokeWidth="3" className="trace-path" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeLinejoin="round" />
          </>
        );
      case "smiling":
      default:
        // Gentle brow lift, friendly round dots, curved upturned smile arc
        return (
          <>
            {/* Gentle relaxed brows */}
            <path d={`M ${x - 18} ${y - 12} Q ${x - 12} ${y - 16} ${x - 6} ${y - 13}`} strokeWidth="2.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            <path d={`M ${x + 6} ${y - 13} Q ${x + 12} ${y - 16} ${x + 18} ${y - 12}`} strokeWidth="2.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            {/* Friendly round eyes */}
            <circle cx={x - 12} cy={y} r="3.5" className="trace-path" fill="currentColor" />
            <circle cx={x + 12} cy={y} r="3.5" className="trace-path" fill="currentColor" />
            {/* Upturned smile arc */}
            <path d={`M ${x - 14} ${y + 14} Q ${x} ${y + 24} ${x + 14} ${y + 14}`} strokeWidth="3.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
          </>
        );
    }
  };

  // Preset Props paths (positioned near character hands or ground)
  const getPropElements = () => {
    switch (prop) {
      case "coffee":
        return (
          <g transform="translate(330, 240)">
            {/* Mug body */}
            <path d="M 0 0 L 2 28 Q 12 34 22 28 L 24 0 Z" strokeWidth="2.5" className="trace-path" fill="none" stroke="currentColor" />
            {/* Handle */}
            <path d="M 24 5 C 34 5, 34 22, 22 22" strokeWidth="2.5" className="trace-path" fill="none" stroke="currentColor" />
            {/* Steam trails */}
            <path d="M 6 -6 Q 4 -14 8 -20" strokeWidth="2" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            <path d="M 16 -6 Q 18 -14 14 -20" strokeWidth="2" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
          </g>
        );
      case "laptop":
        return (
          <g transform="translate(325, 245)">
            {/* Screen lid */}
            <path d="M 0 0 L 35 -15 L 65 -5 L 30 10 Z" strokeWidth="2.5" className="trace-path" fill="none" stroke="currentColor" />
            {/* Base keyboard */}
            <path d="M 0 0 L 30 10 L 55 5 L 25 -5 Z" strokeWidth="2.5" className="trace-path" fill="none" stroke="currentColor" />
          </g>
        );
      case "smartphone":
        return (
          <g transform="translate(328, 235)">
            <rect x="0" y="0" width="16" height="30" rx="3" strokeWidth="2" className="trace-path" fill="none" stroke="currentColor" />
            <line x1="4" y1="24" x2="12" y2="24" strokeWidth="1.5" className="trace-path" stroke="currentColor" strokeLinecap="round" />
          </g>
        );
      case "trophy":
        return (
          <g transform="translate(340, 220)">
            {/* Cup */}
            <path d="M 0 0 L 30 0 L 26 24 Q 15 32 4 24 Z" strokeWidth="2.5" className="trace-path" fill="none" stroke="currentColor" />
            {/* Stem & base */}
            <path d="M 15 28 L 15 40 M 4 40 L 26 40" strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
            {/* Handles */}
            <path d="M 0 5 C -10 5, -10 20, 4 20" strokeWidth="2" className="trace-path" fill="none" stroke="currentColor" />
            <path d="M 30 5 C 40 5, 40 20, 26 20" strokeWidth="2" className="trace-path" fill="none" stroke="currentColor" />
          </g>
        );
      case "car":
        return (
          <g transform="translate(380, 320)">
            {/* Roof & body */}
            <path d="M 0 40 L 20 20 L 70 20 L 95 40 L 140 40 L 140 60 L 0 60 Z" strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" />
            {/* Wheels */}
            <circle cx="35" cy="62" r="14" strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" />
            <circle cx="110" cy="62" r="14" strokeWidth="3" className="trace-path" fill="none" stroke="currentColor" />
          </g>
        );
      case "none":
      default:
        return null;
    }
  };

  return (
    <div className={`bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-2xl flex flex-col gap-6 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Anime.js Procedural Vector Stroke Tracer
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  Anime.js v4
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Procedural vector path tracing for stickman characters, 5 canonical expressions, and scene props with zero pixelation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={copySvg}
            className="h-8 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? "SVG Copied" : "Copy SVG"}
          </Button>

          <Button
            size="sm"
            onClick={traceAnimation}
            disabled={isPlaying}
            className="h-8 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md hover:opacity-90"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isPlaying ? "animate-spin" : ""}`} />
            Re-Trace
          </Button>
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div className="relative aspect-[16/9] max-h-[460px] w-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800/90 overflow-hidden flex items-center justify-center shadow-inner">
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#fbbf24 0.75px, transparent 0.75px)",
            backgroundSize: "24px 24px"
          }}
        />

        {/* Dynamic SVG canvas animated by Anime.js */}
        <svg
          ref={svgRef}
          viewBox="0 0 600 450"
          className="w-full h-full max-h-full drop-shadow-[0_0_15px_rgba(251,191,36,0.25)] select-none"
          style={{ color: strokeColor }}
        >
          {/* Floor baseline */}
          <path
            d="M 60 412 L 540 412"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 6"
            className="trace-path opacity-40"
            fill="none"
          />

          {/* Stick Figure Head Circle */}
          <circle
            cx={headCenter.x}
            cy={headCenter.y}
            r={headCenter.r}
            strokeWidth="4"
            className="trace-path"
            fill="none"
            stroke="currentColor"
          />

          {/* Facial Features (The 5 Expressions) */}
          {getExpressionElements()}

          {/* Skeleton Body Lines */}
          <path d={posePaths.torso} strokeWidth="5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
          <path d={posePaths.farArm} strokeWidth="4" className="trace-path opacity-60" fill="none" stroke="currentColor" strokeLinecap="round" />
          <path d={posePaths.farLeg} strokeWidth="4.5" className="trace-path opacity-60" fill="none" stroke="currentColor" strokeLinecap="round" />
          <path d={posePaths.nearLeg} strokeWidth="4.5" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />
          <path d={posePaths.nearArm} strokeWidth="4" className="trace-path" fill="none" stroke="currentColor" strokeLinecap="round" />

          {/* Scene Props */}
          {getPropElements()}
        </svg>

        {/* Floating Format Pill */}
        <div className="absolute bottom-3 left-4 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 text-[10px] font-mono text-slate-300 backdrop-blur-md">
            Pose: {pose.toUpperCase()} | Expr: {expression.toUpperCase()} | Prop: {prop.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Scrubbing & Speed Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Stroke Scrub:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={scrubProgress}
            onChange={(e) => handleScrub(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="text-xs font-mono text-amber-400 w-12 text-right">{scrubProgress}%</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">Trace Speed:</span>
          {[0.8, 1.2, 1.8].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDrawSpeed(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                drawSpeed === s
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Expression & Pose Customizer Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* 1. The 5 Facial Expressions */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Smile className="w-4 h-4 text-amber-400" />
            <span>The 5 Canonical Facial Expressions:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(["smiling", "angry", "shocked", "happy", "laughing"] as const).map((exprKey) => (
              <button
                key={exprKey}
                type="button"
                onClick={() => setExpression(exprKey)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  expression === exprKey
                    ? "border-amber-500 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/10"
                    : "border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-xs font-bold capitalize">{exprKey}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  {exprKey === "angry"
                    ? "V-Furrow"
                    : exprKey === "shocked"
                    ? "O-Gasp"
                    : exprKey === "laughing"
                    ? "Pulse"
                    : exprKey === "happy"
                    ? "Crescent"
                    : "Gentle"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Kinematic Poses */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Kinematic Character Poses:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["stand", "walk", "reach", "shrug", "jump", "kick"] as const).map((poseKey) => (
              <button
                key={poseKey}
                type="button"
                onClick={() => setPose(poseKey)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold capitalize text-center transition-all ${
                  pose === poseKey
                    ? "border-amber-500 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/10"
                    : "border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {poseKey}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Scene Props & Ink Colors */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Generative Vector Props & Ink:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["coffee", "laptop", "smartphone", "trophy", "car", "none"] as const).map((propKey) => (
              <button
                key={propKey}
                type="button"
                onClick={() => setProp(propKey)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold capitalize text-center transition-all ${
                  prop === propKey
                    ? "border-amber-500 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/10"
                    : "border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {propKey}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">Ink Color:</span>
            <div className="flex items-center gap-2">
              {[
                { name: "Gold", hex: "#fbbf24" },
                { name: "Cyan", hex: "#38bdf8" },
                { name: "Pink", hex: "#f472b6" },
                { name: "White", hex: "#f8fafc" },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setStrokeColor(c.hex)}
                  title={c.name}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    strokeColor === c.hex ? "scale-110 border-white ring-2 ring-amber-500" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
