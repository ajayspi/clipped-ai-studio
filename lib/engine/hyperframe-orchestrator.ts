/**
 * HyperFrames Motion Graphics & 3-Second Retention Pacing Engine
 * 
 * Inspired by heygen-com/hyperframes, cclank/lanshu-animated-architecture-diagram,
 * and pycodebr/heditor vertical video pacing principles.
 */

import { complete, parseJson } from "@/lib/ai/llm";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface RetentionBeatCue {
  id?: string;
  duration: number; // in seconds
  cameraMove?: string; // push-in, pan-left, etc.
  transition?: string; // accordion_h, diagonal_fold, etc.
  soundEffect?: string; // whoosh, pop, marker, click
  kineticCallout?: string; // metric_ticker, circling_ellipse, highlighter
  text?: string;
}

export interface RetentionPacingReport {
  compliant: boolean; // true if no gap > 3.0 seconds
  maxGapSeconds: number;
  totalDurationSeconds: number;
  flaggedIntervals: Array<{
    startSecond: number;
    endSecond: number;
    gapSeconds: number;
    beatIndex: number;
  }>;
  recommendations: string[];
}

export interface HyperframeSceneSpec {
  title: string;
  theme?: 'dark_neon' | 'cyber_slate' | 'excalidraw_dark' | 'clean_minimal';
  durationSeconds?: number;
  fps?: number;
  variables?: Record<string, string | number>;
  cards?: Array<{
    heading: string;
    body: string;
    highlight?: string;
    icon?: string;
  }>;
}

export interface LanshuDiagramSpec {
  signature?: string;
  title: {
    prefix: string;
    highlight: string;
    subtitle?: string;
  };
  inputs?: Array<{
    icon: string;
    label: string;
  }>;
  core: {
    cards: Array<{
      title: string;
      description: string;
    }>;
    decision?: {
      label: string;
    };
  };
  left_panel?: {
    title: string;
    items: string[];
  };
  center_panel?: {
    title: string;
    items: string[];
  };
  right_panel?: {
    title: string;
    items: string[];
  };
}

// ============================================================================
// 3-Second Retention Pacing Validator (The 3-Second Hook Rule)
// ============================================================================

/**
 * Validates that every <= 3.0 seconds has an active visual transition, camera move,
 * kinetic callout, or foley sound effect to maximize retention on vertical video formats.
 */
export function validateRetentionPacing(
  beats: RetentionBeatCue[],
  maxAllowedGapSeconds: number = 3.0
): RetentionPacingReport {
  let currentTime = 0;
  let lastEventTime = 0;
  let maxGap = 0;
  const flaggedIntervals: RetentionPacingReport['flaggedIntervals'] = [];
  const recommendations: string[] = [];

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const beatStart = currentTime;
    const beatEnd = currentTime + beat.duration;

    // Check if beat has an active retention trigger
    const hasCameraMove = beat.cameraMove && beat.cameraMove !== 'static';
    const hasTransition = !!beat.transition && beat.transition !== 'cut';
    const hasSFX = !!beat.soundEffect;
    const hasCallout = !!beat.kineticCallout;

    const hasRetentionTrigger = hasCameraMove || hasTransition || hasSFX || hasCallout;

    if (hasRetentionTrigger) {
      const gap = beatStart - lastEventTime;
      if (gap > maxGap) maxGap = gap;

      if (gap > maxAllowedGapSeconds) {
        flaggedIntervals.push({
          startSecond: Number(lastEventTime.toFixed(2)),
          endSecond: Number(beatStart.toFixed(2)),
          gapSeconds: Number(gap.toFixed(2)),
          beatIndex: i,
        });
        recommendations.push(
          `Beat ${i + 1} ("${beat.text?.slice(0, 30) || 'scene'}..."): Gap of ${gap.toFixed(1)}s exceeds ${maxAllowedGapSeconds}s threshold. Insert a camera push, kinetic highlight, or SFX.`
        );
      }
      lastEventTime = beatStart;
    }

    // If a beat itself is longer than maxAllowedGapSeconds without internal cuts
    if (beat.duration > maxAllowedGapSeconds && !hasRetentionTrigger) {
      const gap = beatEnd - lastEventTime;
      if (gap > maxGap) maxGap = gap;

      if (gap > maxAllowedGapSeconds) {
        flaggedIntervals.push({
          startSecond: Number(lastEventTime.toFixed(2)),
          endSecond: Number(beatEnd.toFixed(2)),
          gapSeconds: Number(gap.toFixed(2)),
          beatIndex: i,
        });
        recommendations.push(
          `Beat ${i + 1}: Duration ${beat.duration.toFixed(1)}s has no visual motion or sound trigger. Add dynamic zoom or kinetic marker.`
        );
      }
      lastEventTime = beatEnd;
    }

    currentTime = beatEnd;
  }

  // Check tail gap
  const tailGap = currentTime - lastEventTime;
  if (tailGap > maxGap) maxGap = tailGap;
  if (tailGap > maxAllowedGapSeconds) {
    flaggedIntervals.push({
      startSecond: Number(lastEventTime.toFixed(2)),
      endSecond: Number(currentTime.toFixed(2)),
      gapSeconds: Number(tailGap.toFixed(2)),
      beatIndex: beats.length - 1,
    });
  }

  return {
    compliant: flaggedIntervals.length === 0,
    maxGapSeconds: Number(maxGap.toFixed(2)),
    totalDurationSeconds: Number(currentTime.toFixed(2)),
    flaggedIntervals,
    recommendations,
  };
}

// ============================================================================
// Parameterized HyperFrames Motion Graphics Compiler
// ============================================================================

/**
 * Compiles a parameterized HTML5/GSAP motion graphics scene with seekable timeline contracts.
 * Inspired by heygen-com/hyperframes deterministic browser-to-video workflow.
 */
export function compileHyperframeScene(spec: HyperframeSceneSpec): string {
  const duration = spec.durationSeconds || 5.0;
  const fps = spec.fps || 30;
  const totalFrames = Math.round(duration * fps);
  const vars = spec.variables || {};

  // Replace variable placeholders like {{headline}}
  const interpolate = (str: string): string => {
    return str.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
      return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
    });
  };

  const title = interpolate(spec.title);
  const cards = spec.cards || [
    { heading: 'Stage 1', body: 'Initialization & Vector Framing', highlight: 'Fast' },
    { heading: 'Stage 2', body: 'Audio Normalization & -14 LUFS Mastering', highlight: 'Pure' },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #090a0f;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 80px 60px;
      position: relative;
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 60px 60px;
      z-index: 1;
    }
    .header {
      z-index: 10;
      text-align: center;
      margin-bottom: 80px;
      opacity: 0;
      transform: translateY(-30px);
    }
    .header h1 {
      font-size: 64px;
      font-weight: 800;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -1.5px;
    }
    .cards-container {
      z-index: 10;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .card {
      background: rgba(30, 41, 59, 0.7);
      border: 2px solid rgba(148, 163, 184, 0.2);
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      opacity: 0;
      transform: translateY(40px) scale(0.95);
    }
    .card-title {
      font-size: 36px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-badge {
      font-size: 20px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 16px;
      border-radius: 9999px;
    }
    .card-body {
      font-size: 26px;
      color: #94a3b8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="grid-bg"></div>

  <div class="header" id="header">
    <h1>${title}</h1>
  </div>

  <div class="cards-container">
    ${cards.map((c, i) => `
      <div class="card" id="card-${i}">
        <div class="card-title">
          <span>${interpolate(c.heading)}</span>
          ${c.highlight ? `<span class="card-badge">${interpolate(c.highlight)}</span>` : ''}
        </div>
        <div class="card-body">
          ${interpolate(c.body)}
        </div>
      </div>
    `).join('')}
  </div>

  <script>
    // Master Seekable GSAP Timeline
    const tl = gsap.timeline({ paused: true });

    tl.to("#header", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" })
      .to(".card", {
        opacity: 1,
        y: 0,
        scale: 1,
        stagger: 0.25,
        duration: 0.8,
        ease: "back.out(1.4)"
      }, "-=0.2");

    // Deterministic Frame Stepper for Headless Renderers
    window.__totalFrames = ${totalFrames};
    window.seekToFrame = function(frame) {
      const progress = Math.max(0, Math.min(1, frame / (${totalFrames} - 1)));
      tl.progress(progress);
    };

    // Auto-play for interactive browser preview
    tl.play();
  </script>
</body>
</html>`;
}

// ============================================================================
// Lanshu Hand-Drawn Animated Architecture Diagram Generator
// ============================================================================

/**
 * Generates an Excalidraw-style dark mode animated system architecture diagram.
 * Inspired by cclank/lanshu-animated-architecture-diagram.
 */
export function generateLanshuDiagramHtml(spec: LanshuDiagramSpec): string {
  const title = spec.title;
  const cards = spec.core.cards;
  const decision = spec.core.decision;
  const inputs = spec.inputs || [{ icon: 'file', label: 'Client Event' }];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title.prefix} ${title.highlight}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #121212;
      color: #e0e0e0;
      font-family: 'Comic Sans MS', 'Segoe UI', cursive, sans-serif;
      width: 1080px;
      height: 1920px;
      padding: 60px 40px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    .title-banner {
      border-bottom: 2px dashed #444;
      padding-bottom: 24px;
      margin-bottom: 48px;
    }
    .title-banner h1 {
      font-size: 52px;
      color: #fff;
    }
    .highlight {
      color: #f59e0b;
      text-decoration: underline wavy #f59e0b;
    }
    .inputs-strip {
      display: flex;
      gap: 20px;
      margin-bottom: 40px;
    }
    .input-node {
      background: #1e1e1e;
      border: 2px solid #555;
      border-radius: 12px;
      padding: 16px 24px;
      font-size: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .core-pipeline {
      display: flex;
      flex-direction: column;
      gap: 36px;
      position: relative;
    }
    .pipeline-card {
      background: #1a1a1a;
      border: 2.5px solid #3b82f6;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 4px 6px 0px rgba(59, 130, 246, 0.4);
      position: relative;
    }
    .pipeline-card h3 {
      font-size: 32px;
      color: #60a5fa;
      margin-bottom: 12px;
    }
    .pipeline-card p {
      font-size: 22px;
      color: #aaa;
    }
    .connector-wire {
      width: 4px;
      height: 36px;
      background: #555;
      margin: 0 auto;
      position: relative;
    }
    .pulse-packet {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #f59e0b;
      box-shadow: 0 0 12px #f59e0b;
      position: absolute;
      left: -5px;
      animation: packetFlow 1.6s infinite ease-in-out;
    }
    @keyframes packetFlow {
      0% { top: 0; opacity: 0; }
      20% { opacity: 1; }
      80% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    .decision-diamond {
      width: 240px;
      height: 120px;
      border: 2.5px solid #ec4899;
      background: #20131a;
      margin: 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 20px;
      color: #f472b6;
      border-radius: 12px;
      transform: rotate(0deg);
      box-shadow: 4px 4px 0px rgba(236, 72, 153, 0.3);
    }
  </style>
</head>
<body>
  <div class="title-banner">
    <h1>${title.prefix} <span class="highlight">${title.highlight}</span></h1>
    ${title.subtitle ? `<p style="font-size: 24px; color: #888; margin-top: 8px;">${title.subtitle}</p>` : ''}
  </div>

  <div class="inputs-strip">
    ${inputs.map(inp => `<div class="input-node">📥 ${inp.label}</div>`).join('')}
  </div>

  <div class="core-pipeline">
    ${cards.map((c, i) => `
      <div class="pipeline-card">
        <h3>${c.title}</h3>
        <p>${c.description}</p>
      </div>
      ${i < cards.length - 1 ? `
        <div class="connector-wire">
          <div class="pulse-packet" style="animation-delay: ${i * 0.4}s"></div>
        </div>
      ` : ''}
    `).join('')}

    ${decision ? `
      <div class="connector-wire">
        <div class="pulse-packet" style="animation-delay: 0.8s"></div>
      </div>
      <div class="decision-diamond">
        💎 ${decision.label}
      </div>
    ` : ''}
  </div>
</body>
</html>`;
}

// ============================================================================
// Original LLM Generator (Backward-Compatible)
// ============================================================================

export async function generateHyperframeHtml(prompt: string): Promise<string> {
  const sys = `You are an expert HTML/CSS/GSAP developer. Your goal is to write a single self-contained HTML file that plays a motion graphics animation.
You MUST include GSAP via CDN (e.g. <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>).
You MUST write all CSS inline or in a <style> block.
The animation should run automatically when the page loads, using a master GSAP timeline.
Return a JSON object with a single field 'html' containing the raw HTML string.
Do not use markdown blocks for the JSON. Just return the JSON object.
`;
  
  const userPrompt = `Create a motion graphics video HTML for the following prompt: "${prompt}"`;
  
  const response = await complete({
    system: sys,
    user: userPrompt,
    json: true
  });
  const data = parseJson<{html?: string}>(response);
  if (!data || !data.html) {
    throw new Error("Failed to generate HTML from LLM");
  }
  return data.html;
}
