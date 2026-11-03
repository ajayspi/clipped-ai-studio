/**
 * lib/engine/kinetic-callouts.tsx
 *
 * High-Retention Kinetic Callouts & Metric Tickers Engine.
 * Inspired by Abdul Nafay's (Nafay 3D) Style Library & transitions.dev micro-interactions.
 *
 * Provides:
 * 1. Marker Highlighter Swipes (SVG hand-drawn marker highlight with physical sweep)
 * 2. Circling Callout Ellipses (Hand-drawn imperfect loops around keywords)
 * 3. Directional Arrow Pointers (Animated curved arrows emphasizing key elements)
 * 4. Rolling Metric Tickers (Animated counter ticking up from 0 with directional blur and scale pop)
 * 5. Automatic keyword & metric detection heuristics
 */

import React from 'react';
import { sampleEasing } from './brand-tokens-presets';

export type CalloutType =
  | 'highlighter'
  | 'circling_ellipse'
  | 'arrow_pointer'
  | 'metric_ticker';

export interface KineticCalloutCue {
  id: string;
  type: CalloutType;
  targetText: string;
  color?: string;
  startFrameOffset: number;
  durationInFrames: number;
  position?: { x: number; y: number }; // Percentage 0-100
  metricValue?: {
    prefix?: string;
    targetNumber: number;
    suffix?: string;
  };
}

// ============================================================================
// AUTOMATIC KEYWORD & METRIC DETECTOR
// ============================================================================

const EMPHASIS_WORDS = [
  'warning', 'secret', 'never', 'must', 'huge', 'insane', 'proven',
  'critical', 'stop', 'mistake', 'danger', 'key', 'rule', 'hack'
];

export function detectKineticCallouts(text: string, beatDurationFrames: number = 90): KineticCalloutCue[] {
  if (!text) return [];
  const cues: KineticCalloutCue[] = [];
  const clean = text.trim();

  // 1. Detect Financial & Metric Patterns (e.g. $1,000,000, $500K, 95%, 10x, 3.5M)
  const metricRegex = /([$€£¥])?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|m|b|x|%|\+)?/gi;
  let match: RegExpExecArray | null;

  while ((match = metricRegex.exec(clean)) !== null) {
    const rawMatch = match[0].trim();
    const prefix = match[1] || '';
    const numStr = match[2].replace(/,/g, '');
    const num = parseFloat(numStr);
    const suffix = match[3] || '';

    if (!isNaN(num) && num > 0) {
      cues.push({
        id: `callout_metric_${cues.length + 1}`,
        type: 'metric_ticker',
        targetText: rawMatch,
        color: '#facc15', // Vibrant Gold
        startFrameOffset: 4,
        durationInFrames: Math.min(30, Math.floor(beatDurationFrames * 0.45)),
        position: { x: 50, y: 35 },
        metricValue: {
          prefix,
          targetNumber: num,
          suffix: suffix.toUpperCase(),
        },
      });
      break; // One primary metric ticker per beat
    }
  }

  // 2. Detect Warning / Critical Emphasis Words -> Circling Ellipse
  const words = clean.toLowerCase().split(/\s+/);
  for (const w of words) {
    const stripped = w.replace(/[^a-z]/g, '');
    if (EMPHASIS_WORDS.includes(stripped)) {
      cues.push({
        id: `callout_circle_${cues.length + 1}`,
        type: 'circling_ellipse',
        targetText: w,
        color: '#ef4444', // Red emphasis
        startFrameOffset: 8,
        durationInFrames: Math.min(24, Math.floor(beatDurationFrames * 0.35)),
        position: { x: 50, y: 72 },
      });
      break;
    }
  }

  // 3. Fallback: Marker Highlighter on the first impactful keyword if no metric detected
  if (cues.length === 0 && words.length > 3) {
    const candidate = words.find((w) => w.length > 5) || words[1];
    cues.push({
      id: `callout_highlight_${cues.length + 1}`,
      type: 'highlighter',
      targetText: candidate,
      color: '#38bdf8', // Neon Sky Blue
      startFrameOffset: 6,
      durationInFrames: Math.min(20, Math.floor(beatDurationFrames * 0.3)),
      position: { x: 50, y: 75 },
    });
  }

  return cues;
}

// ============================================================================
// SVG KINETIC OVERLAYS
// ============================================================================

interface HighlighterProps {
  progress: number; // 0.0 to 1.0
  color?: string;
  width?: number;
  height?: number;
}

export const MarkerHighlighter: React.FC<HighlighterProps> = ({
  progress,
  color = '#facc15',
  width = 240,
  height = 42,
}) => {
  const eased = sampleEasing('ease-out-3', progress);
  const currentW = Math.max(0, width * eased);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        transform: 'rotate(-1.2deg)',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          overflow: 'visible',
          opacity: 0.85,
          mixBlendMode: 'screen',
        }}
      >
        <defs>
          <linearGradient id="marker-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="0.95" />
          </linearGradient>
        </defs>
        {/* Physical rough marker swipe path */}
        <rect
          x={0}
          y={4}
          width={currentW}
          height={height - 8}
          rx={6}
          ry={6}
          fill="url(#marker-glow)"
          style={{
            filter: 'blur(1.5px)',
          }}
        />
      </svg>
    </div>
  );
};

interface CirclingEllipseProps {
  progress: number;
  color?: string;
  width?: number;
  height?: number;
}

export const CirclingEllipse: React.FC<CirclingEllipseProps> = ({
  progress,
  color = '#ef4444',
  width = 280,
  height = 90,
}) => {
  const eased = sampleEasing('ease-out-2', progress);
  // Total stroke length for hand-drawn oval with overlapping tail
  const pathLength = 700;
  const strokeDashoffset = pathLength * (1 - eased);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 280 90"
      style={{
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      {/* Hand-drawn double loop oval path */}
      <path
        d="M 25,48 C 22,22 80,10 150,12 C 220,14 265,30 262,55 C 258,80 190,84 130,82 C 60,80 15,65 24,42 C 30,28 75,18 140,16"
        fill="none"
        stroke={color}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={strokeDashoffset}
        style={{
          filter: `drop-shadow(0 0 6px ${color}88)`,
        }}
      />
    </svg>
  );
};

interface ArrowPointerProps {
  progress: number;
  color?: string;
}

export const ArrowPointer: React.FC<ArrowPointerProps> = ({
  progress,
  color = '#38bdf8',
}) => {
  const eased = sampleEasing('ease-elastic-2', progress);
  const pathLength = 320;
  const strokeDashoffset = pathLength * (1 - Math.min(1, eased));
  const scale = 0.8 + 0.2 * eased;

  return (
    <svg
      width={120}
      height={120}
      viewBox="0 0 120 120"
      style={{
        overflow: 'visible',
        pointerEvents: 'none',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Curved pointing arrow */}
      <path
        d="M 15,15 Q 65,25 75,75 L 85,62 M 75,75 L 60,70"
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={strokeDashoffset}
        style={{
          filter: `drop-shadow(0 0 8px ${color}aa)`,
        }}
      />
    </svg>
  );
};

interface MetricTickerProps {
  progress: number; // 0.0 to 1.0
  targetNumber: number;
  prefix?: string;
  suffix?: string;
  color?: string;
}

export const MetricTicker: React.FC<MetricTickerProps> = ({
  progress,
  targetNumber,
  prefix = '$',
  suffix = '',
  color = '#facc15',
}) => {
  // Transitions.dev inspired directional blur and physical ease
  const eased = sampleEasing('ease-out-4', progress);
  const currentVal = Math.round(targetNumber * eased);
  const isFinal = progress >= 0.95;
  const popScale = isFinal ? 1.05 : 1.0;
  const blurPx = isFinal ? 0 : Math.max(0, (1 - progress) * 2.5);

  const formatted = currentVal.toLocaleString('en-US');

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '2px',
        padding: '8px 18px',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        border: `2px solid ${color}`,
        borderRadius: '16px',
        boxShadow: `0 0 25px ${color}55, 0 8px 30px rgba(0,0,0,0.6)`,
        transform: `scale(${popScale})`,
        transformOrigin: 'center center',
        transition: 'transform 0.15s ease-out',
        fontFamily: 'monospace, sans-serif',
        filter: `blur(${blurPx}px)`,
      }}
    >
      <span
        style={{
          fontSize: '2.5vw',
          fontWeight: 900,
          color,
          lineHeight: 1,
        }}
      >
        {prefix}
      </span>
      <span
        style={{
          fontSize: '4.2vw',
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '-1px',
          lineHeight: 1,
        }}
      >
        {formatted}
      </span>
      {suffix && (
        <span
          style={{
            fontSize: '2.8vw',
            fontWeight: 900,
            color,
            lineHeight: 1,
            marginLeft: '2px',
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// REMOTION KINETIC CALLOUTS OVERLAY COMPONENT
// ============================================================================

interface KineticCalloutsOverlayProps {
  beatText: string;
  frameInBeat: number;
  durationInFrames: number;
  highlightColor?: string;
}

export const KineticCalloutsOverlay: React.FC<KineticCalloutsOverlayProps> = ({
  beatText,
  frameInBeat,
  durationInFrames,
  highlightColor,
}) => {
  const cues = React.useMemo(
    () => detectKineticCallouts(beatText, durationInFrames),
    [beatText, durationInFrames]
  );

  if (cues.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      {cues.map((cue) => {
        const localFrame = frameInBeat - cue.startFrameOffset;
        if (localFrame < 0) return null;

        const progress = Math.min(1.0, localFrame / cue.durationInFrames);
        const posX = cue.position?.x ?? 50;
        const posY = cue.position?.y ?? 50;

        return (
          <div
            key={cue.id}
            style={{
              position: 'absolute',
              top: `${posY}%`,
              left: `${posX}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {cue.type === 'metric_ticker' && cue.metricValue && (
              <MetricTicker
                progress={progress}
                targetNumber={cue.metricValue.targetNumber}
                prefix={cue.metricValue.prefix}
                suffix={cue.metricValue.suffix}
                color={highlightColor || cue.color}
              />
            )}

            {cue.type === 'circling_ellipse' && (
              <CirclingEllipse
                progress={progress}
                color={highlightColor || cue.color}
              />
            )}

            {cue.type === 'arrow_pointer' && (
              <ArrowPointer
                progress={progress}
                color={highlightColor || cue.color}
              />
            )}

            {cue.type === 'highlighter' && (
              <MarkerHighlighter
                progress={progress}
                color={highlightColor || cue.color}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
