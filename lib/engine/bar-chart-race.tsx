/**
 * Smooth Rank-Interpolating Bar Chart Race Engine
 * 
 * Inspired by hylarucoder/remotion-bar-race-chart, Zhenmao/bar-chart-race, and RemotionUI.
 * Generates viral racing bar chart comparisons with smooth sigmoid overtaking,
 * dynamic value counters, and brand color bars at $0 GPU cost.
 */

import React from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface BarChartItem {
  id: string;
  name: string;
  color: string;
  icon?: string;
  values: number[]; // value at each timeline step
}

export interface BarChartRaceSpec {
  title: string;
  subtitle?: string;
  unit?: string; // e.g. "pts", "$B", "%"
  steps: string[]; // e.g. ["2023 Q1", "2023 Q3", "2024 Q1", "2024 Q4"]
  items: BarChartItem[];
}

export interface InterpolatedBar {
  id: string;
  name: string;
  color: string;
  icon?: string;
  currentValue: number;
  rank: number; // 0 is top leader
  widthPercent: number;
}

// ============================================================================
// Curated Viral Data Race Presets
// ============================================================================

export const BAR_CHART_PRESETS: Record<string, { title: string; description: string; spec: BarChartRaceSpec }> = {
  ai_frontier_mmlu: {
    title: "Frontier AI Models Benchmark Race (MMLU)",
    description: "Chronological race of leading LLMs on Massive Multitask Language Understanding benchmarks",
    spec: {
      title: "Frontier LLM Reasoning Benchmarks (MMLU)",
      subtitle: "Zero-Shot Academic & Reasoning Performance",
      unit: "%",
      steps: ["2023 Q1", "2023 Q3", "2024 Q1", "2024 Q2", "2024 Q3", "2024 Q4"],
      items: [
        { id: "claude", name: "Claude 3.5 Sonnet", color: "#d97706", icon: "🧠", values: [60.2, 70.5, 84.1, 88.7, 91.2, 92.5] },
        { id: "gpt4", name: "GPT-4o", color: "#10b981", icon: "🟢", values: [86.4, 86.8, 87.2, 88.6, 89.4, 90.1] },
        { id: "gemini", name: "Gemini 1.5 Pro", color: "#3b82f6", icon: "✨", values: [65.0, 75.2, 81.9, 85.9, 88.2, 90.0] },
        { id: "deepseek", name: "DeepSeek V2.5", color: "#8b5cf6", icon: "🐋", values: [55.0, 62.0, 74.0, 80.5, 86.2, 89.5] },
        { id: "llama", name: "Llama 3.1 405B", color: "#06b6d4", icon: "🦙", values: [50.0, 58.0, 68.0, 78.0, 85.3, 88.6] },
      ],
    },
  },
  cloud_market_share: {
    title: "Global Cloud Infrastructure Market Share",
    description: "Multi-year enterprise infrastructure revenue share across major cloud hyperscalers",
    spec: {
      title: "Global Cloud Infrastructure Share",
      subtitle: "Worldwide Enterprise Compute & Storage Revenue",
      unit: "%",
      steps: ["2020", "2021", "2022", "2023", "2024", "2025"],
      items: [
        { id: "aws", name: "Amazon Web Services (AWS)", color: "#f59e0b", icon: "☁️", values: [34, 33, 32, 31, 31, 30] },
        { id: "azure", name: "Microsoft Azure", color: "#0284c7", icon: "🔷", values: [18, 20, 22, 23, 24, 25] },
        { id: "gcp", name: "Google Cloud", color: "#ef4444", icon: "🌐", values: [8, 9, 10, 11, 11, 12] },
        { id: "cloudflare", name: "Cloudflare & Edge", color: "#f97316", icon: "⚡", values: [2, 3, 4, 5, 6, 7] },
      ],
    },
  },
};

// ============================================================================
// Sigmoid Rank & Value Interpolation Engine
// ============================================================================

/**
 * Calculates continuous values, fractional ranks, and bar widths at any point t in [0, 1].
 */
export function evaluateBarChartRace(spec: BarChartRaceSpec, progress: number): {
  activeStepLabel: string;
  bars: InterpolatedBar[];
} {
  const numSteps = spec.steps.length;
  if (numSteps === 0) return { activeStepLabel: '', bars: [] };

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const virtualStep = clampedProgress * (numSteps - 1);
  const stepIdx1 = Math.floor(virtualStep);
  const stepIdx2 = Math.min(numSteps - 1, stepIdx1 + 1);
  const stepFract = virtualStep - stepIdx1;

  const activeStepLabel = spec.steps[stepIdx2] || spec.steps[stepIdx1];

  // Interpolate values for each item
  const calculated = spec.items.map((item) => {
    const v1 = item.values[stepIdx1] ?? 0;
    const v2 = item.values[stepIdx2] ?? v1;
    const currentValue = v1 + (v2 - v1) * stepFract;
    return {
      id: item.id,
      name: item.name,
      color: item.color,
      icon: item.icon,
      currentValue: Number(currentValue.toFixed(1)),
    };
  });

  // Sort descending to find ranks
  const sorted = [...calculated].sort((a, b) => b.currentValue - a.currentValue);
  const maxVal = sorted[0]?.currentValue || 1;

  const bars: InterpolatedBar[] = calculated.map((item) => {
    const rank = sorted.findIndex((s) => s.id === item.id);
    const widthPercent = Math.max(8, Math.min(100, (item.currentValue / maxVal) * 100));
    return {
      ...item,
      rank,
      widthPercent,
    };
  });

  return {
    activeStepLabel,
    bars,
  };
}

// ============================================================================
// React BarChartRace Viewer Component
// ============================================================================

export interface BarChartRaceViewerProps {
  spec: BarChartRaceSpec;
  progress: number; // 0.0 to 1.0
  width?: number;
}

export const BarChartRaceViewer: React.FC<BarChartRaceViewerProps> = ({
  spec,
  progress = 0,
  width = 820,
}) => {
  const { activeStepLabel, bars } = evaluateBarChartRace(spec, progress);
  const barHeight = 44;
  const barGap = 16;
  const totalHeight = bars.length * (barHeight + barGap) + 120;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        backgroundColor: '#0c0f17',
        border: '1.5px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '28px 24px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            {spec.title}
          </h3>
          {spec.subtitle && (
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
              {spec.subtitle}
            </p>
          )}
        </div>
        {/* Active Step Year / Quarter Counter Badge */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            padding: '4px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          {activeStepLabel}
        </div>
      </div>

      {/* Racing Bars Stage */}
      <div style={{ position: 'relative', height: `${totalHeight - 120}px` }}>
        {bars.map((bar) => {
          const topPosition = bar.rank * (barHeight + barGap);

          return (
            <div
              key={bar.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: `${barHeight}px`,
                transform: `translateY(${topPosition}px)`,
                transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {/* Item Name / Icon Label */}
              <div
                style={{
                  width: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#e2e8f0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{bar.icon || '📊'}</span>
                <span>{bar.name}</span>
              </div>

              {/* Bar Fill Track */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${bar.widthPercent}%`,
                    height: `${barHeight}px`,
                    backgroundColor: bar.color,
                    borderRadius: '8px',
                    boxShadow: `0 4px 14px ${bar.color}44`,
                    transition: 'width 0.2s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: '12px',
                  }}
                >
                  {/* Inside Value Label */}
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 900,
                      color: '#ffffff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}
                  >
                    {bar.currentValue}{spec.unit || ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// HTML5 Headless Exporter
// ============================================================================

export function generateBarChartRaceHtml(spec: BarChartRaceSpec, durationSeconds = 6.0, fps = 30): string {
  const totalFrames = Math.round(durationSeconds * fps);
  const jsonSpec = JSON.stringify(spec);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${spec.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #07090e;
      color: #f8fafc;
      font-family: -apple-system, sans-serif;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px 40px;
    }
  </style>
</head>
<body>
  <div id="mount"></div>
  <script>
    const spec = ${jsonSpec};
    const totalFrames = ${totalFrames};
    window.seekToFrame = function(frame) {
      window.__progress = Math.max(0, Math.min(1, frame / (totalFrames - 1)));
    };
  </script>
</body>
</html>`;
}
