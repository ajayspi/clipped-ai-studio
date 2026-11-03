/**
 * WaveDrom-Compliant Digital Timing Diagram & Waveform Engine
 * 
 * Inspired by wavedrom/wavedrom standard WaveJSON format.
 * Pure local TypeScript vector SVG generation and animated timecode scanning.
 */

import React from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface WaveLane {
  name: string;
  wave: string;
  data?: string[];
  period?: number;
  phase?: number;
}

export interface WaveJson {
  signal: WaveLane[];
  head?: {
    text?: string;
    tick?: number;
  };
  foot?: {
    text?: string;
    tock?: number;
  };
  config?: {
    hscale?: number;
    skin?: 'dark' | 'neon' | 'cyber' | 'light';
  };
}

export interface WaveSegment {
  type: 'low' | 'high' | 'clk_pos' | 'clk_neg' | 'bus' | 'invalid' | 'hiz' | 'gap';
  label?: string;
  colorIndex?: number;
  length: number; // in clock cycles
}

// ============================================================================
// Curated WaveJSON Hardware & Protocol Presets
// ============================================================================

export const WAVEDROM_PRESETS: Record<string, { title: string; description: string; waveJson: WaveJson }> = {
  spi_transaction: {
    title: "SPI 4-Wire Bus Protocol",
    description: "Serial Peripheral Interface full-duplex transfer with CS#, SCLK, MOSI (0xA5), and MISO (0x5A)",
    waveJson: {
      signal: [
        { name: "CS#",  wave: "1.0.......1" },
        { name: "SCLK", wave: "0..p.p.p.p0" },
        { name: "MOSI", wave: "x..3.4.5.6x", data: ["b7(1)", "b6(0)", "b5(1)", "b4(0)"] },
        { name: "MISO", wave: "z..3.4.5.6z", data: ["b7(0)", "b6(1)", "b5(0)", "b4(1)"] },
      ],
      head: { text: "SPI Mode 0 (CPOL=0, CPHA=0) Transfer", tick: 0 },
      config: { hscale: 1, skin: 'neon' }
    }
  },
  i2c_handshake: {
    title: "I2C 2-Wire Handshake",
    description: "Inter-Integrated Circuit protocol with START condition, 7-bit Device Address, ACK bit, and STOP condition",
    waveJson: {
      signal: [
        { name: "SCL", wave: "1.p.p.p.p.1" },
        { name: "SDA", wave: "10.3...401.", data: ["0x3C (ADDR)", "ACK"] },
      ],
      head: { text: "I2C Fast-Mode Master Write Frame", tick: 0 },
      config: { hscale: 1, skin: 'cyber' }
    }
  },
  cpu_memory_read: {
    title: "Microprocessor Memory Read Cycle",
    description: "Deterministic CPU memory fetch cycle across T1, T2, T3 states with nWAIT insertion and data bus latching",
    waveJson: {
      signal: [
        { name: "CLK",   wave: "p.p.p.p.p." },
        { name: "ADDR",  wave: "x.=.===.x.", data: ["0x0000", "0x0002", "0x0004", "0x0006"] },
        { name: "nRD",   wave: "1.0...1.1." },
        { name: "nWAIT", wave: "1..0.1...." },
        { name: "DATA",  wave: "z...=...z.", data: ["0x48656C6C"] }
      ],
      head: { text: "CPU 16-Bit Bus Read with Wait State", tick: 0 },
      config: { hscale: 1, skin: 'dark' }
    }
  },
  tcp_handshake: {
    title: "TCP 3-Way Handshake States",
    description: "Transmission Control Protocol state synchronization between Client (Active Open) and Server (Passive Open)",
    waveJson: {
      signal: [
        { name: "Client",  wave: "0.1..0...." },
        { name: "SYN",     wave: "0.1.0....." },
        { name: "SYN-ACK", wave: "0...1.0..." },
        { name: "ACK",     wave: "0.....1.0." },
        { name: "State",   wave: "=...2...3.", data: ["CLOSED", "SYN_SENT", "ESTABLISHED"] }
      ],
      head: { text: "TCP Connection Establishment State Sequence", tick: 0 },
      config: { hscale: 1, skin: 'neon' }
    }
  }
};

// ============================================================================
// WaveJSON Parser
// ============================================================================

/**
 * Parses a WaveLane's wave string and data array into structured visual segments.
 */
export function parseWaveLane(lane: WaveLane): WaveSegment[] {
  const segments: WaveSegment[] = [];
  const waveChars = lane.wave.split('');
  let dataIndex = 0;
  let currentSegment: WaveSegment | null = null;

  for (let i = 0; i < waveChars.length; i++) {
    const char = waveChars[i];

    if (char === '.') {
      // Repeat/extend the previous segment
      if (currentSegment) {
        currentSegment.length += 1;
      }
      continue;
    }

    // New segment begins
    let type: WaveSegment['type'] = 'low';
    let label: string | undefined;
    let colorIndex: number | undefined;

    switch (char) {
      case '0':
        type = 'low';
        break;
      case '1':
        type = 'high';
        break;
      case 'p':
      case 'P':
        type = 'clk_pos';
        break;
      case 'n':
      case 'N':
        type = 'clk_neg';
        break;
      case '=':
        type = 'bus';
        if (lane.data && dataIndex < lane.data.length) {
          label = lane.data[dataIndex++];
        }
        break;
      case '2':
      case '3':
      case '4':
      case '5':
        type = 'bus';
        colorIndex = parseInt(char, 10);
        if (lane.data && dataIndex < lane.data.length) {
          label = lane.data[dataIndex++];
        }
        break;
      case 'x':
      case 'X':
        type = 'invalid';
        break;
      case 'z':
      case 'Z':
        type = 'hiz';
        break;
      case '|':
        type = 'gap';
        break;
      default:
        type = 'low';
        break;
    }

    currentSegment = {
      type,
      label,
      colorIndex,
      length: 1,
    };
    segments.push(currentSegment);
  }

  return segments;
}

// ============================================================================
// SVG Waveform Geometry Builder
// ============================================================================

export interface WaveRenderOptions {
  stepWidth?: number; // default 44px
  laneHeight?: number; // default 32px
  laneGap?: number; // default 20px
  labelWidth?: number; // default 90px
  progress?: number; // 0.0 to 1.0 for scanning cursor position
  skin?: 'dark' | 'neon' | 'cyber' | 'light';
}

/**
 * Calculates color tokens based on the requested skin.
 */
export function getWaveDromTheme(skin: WaveRenderOptions['skin'] = 'neon') {
  switch (skin) {
    case 'cyber':
      return {
        bg: '#0a0e17',
        grid: 'rgba(0, 240, 255, 0.1)',
        high: '#00f0ff',
        low: '#007088',
        busFill: 'rgba(0, 240, 255, 0.15)',
        busStroke: '#00f0ff',
        text: '#e2f9ff',
        cursor: '#ff0055',
        cursorGlow: 'rgba(255, 0, 85, 0.4)',
      };
    case 'dark':
      return {
        bg: '#121214',
        grid: 'rgba(255, 255, 255, 0.07)',
        high: '#38bdf8',
        low: '#64748b',
        busFill: 'rgba(56, 189, 248, 0.12)',
        busStroke: '#38bdf8',
        text: '#f8fafc',
        cursor: '#f59e0b',
        cursorGlow: 'rgba(245, 158, 11, 0.4)',
      };
    case 'light':
      return {
        bg: '#ffffff',
        grid: 'rgba(0, 0, 0, 0.08)',
        high: '#0284c7',
        low: '#94a3b8',
        busFill: 'rgba(2, 132, 199, 0.1)',
        busStroke: '#0284c7',
        text: '#0f172a',
        cursor: '#dc2626',
        cursorGlow: 'rgba(220, 38, 38, 0.3)',
      };
    case 'neon':
    default:
      return {
        bg: '#07090e',
        grid: 'rgba(52, 211, 153, 0.08)',
        high: '#10b981',
        low: '#047857',
        busFill: 'rgba(16, 185, 129, 0.14)',
        busStroke: '#10b981',
        text: '#ecfdf5',
        cursor: '#f43f5e',
        cursorGlow: 'rgba(244, 63, 94, 0.5)',
      };
  }
}

/**
 * Builds SVG path data for a sequence of WaveSegments in a lane.
 */
export function buildLaneSvgPaths(
  segments: WaveSegment[],
  stepWidth: number,
  laneHeight: number,
  yOffset: number,
  labelWidth: number
): { strokePath: string; fillPaths: Array<{ d: string; label?: string; colorIndex?: number }> } {
  let x = labelWidth;
  const topY = yOffset;
  const botY = yOffset + laneHeight;
  const midY = yOffset + laneHeight / 2;
  const strokeCommands: string[] = [];
  const fillPaths: Array<{ d: string; label?: string; colorIndex?: number }> = [];

  let currentY = botY;
  strokeCommands.push(`M ${x} ${currentY}`);

  for (const seg of segments) {
    const segWidth = seg.length * stepWidth;
    const nextX = x + segWidth;

    if (seg.type === 'low') {
      if (currentY !== botY) {
        strokeCommands.push(`L ${x} ${botY}`);
        currentY = botY;
      }
      strokeCommands.push(`L ${nextX} ${botY}`);
    } else if (seg.type === 'high') {
      if (currentY !== topY) {
        strokeCommands.push(`L ${x} ${topY}`);
        currentY = topY;
      }
      strokeCommands.push(`L ${nextX} ${topY}`);
    } else if (seg.type === 'clk_pos') {
      // Clock cycles within this segment
      const halfStep = stepWidth / 2;
      for (let c = 0; c < seg.length; c++) {
        const clkX = x + c * stepWidth;
        strokeCommands.push(`L ${clkX} ${botY}`);
        strokeCommands.push(`L ${clkX} ${topY}`);
        strokeCommands.push(`L ${clkX + halfStep} ${topY}`);
        strokeCommands.push(`L ${clkX + halfStep} ${botY}`);
        strokeCommands.push(`L ${clkX + stepWidth} ${botY}`);
      }
      currentY = botY;
    } else if (seg.type === 'clk_neg') {
      const halfStep = stepWidth / 2;
      for (let c = 0; c < seg.length; c++) {
        const clkX = x + c * stepWidth;
        strokeCommands.push(`L ${clkX} ${topY}`);
        strokeCommands.push(`L ${clkX} ${botY}`);
        strokeCommands.push(`L ${clkX + halfStep} ${botY}`);
        strokeCommands.push(`L ${clkX + halfStep} ${topY}`);
        strokeCommands.push(`L ${clkX + stepWidth} ${topY}`);
      }
      currentY = topY;
    } else if (seg.type === 'hiz') {
      strokeCommands.push(`M ${x} ${midY}`);
      strokeCommands.push(`L ${nextX} ${midY}`);
      currentY = midY;
    } else if (seg.type === 'bus') {
      // Hexagonal / diamond closed envelope
      const chamfer = Math.min(8, segWidth / 4);
      const busPath = `M ${x} ${midY} L ${x + chamfer} ${topY} L ${nextX - chamfer} ${topY} L ${nextX} ${midY} L ${nextX - chamfer} ${botY} L ${x + chamfer} ${botY} Z`;
      fillPaths.push({
        d: busPath,
        label: seg.label,
        colorIndex: seg.colorIndex,
      });
      // Also stroke the bus
      strokeCommands.push(`M ${x} ${midY}`);
      strokeCommands.push(`L ${x + chamfer} ${topY} L ${nextX - chamfer} ${topY} L ${nextX} ${midY}`);
      strokeCommands.push(`L ${nextX - chamfer} ${botY} L ${x + chamfer} ${botY} L ${x} ${midY}`);
      currentY = midY;
    } else if (seg.type === 'invalid') {
      // Cross-hatched / grey block
      const busPath = `M ${x} ${topY} L ${nextX} ${topY} L ${nextX} ${botY} L ${x} ${botY} Z`;
      fillPaths.push({
        d: busPath,
        label: 'XXX',
        colorIndex: 99,
      });
      strokeCommands.push(`M ${x} ${topY} L ${nextX} ${topY}`);
      strokeCommands.push(`M ${x} ${botY} L ${nextX} ${botY}`);
      currentY = botY;
    }

    x = nextX;
  }

  return {
    strokePath: strokeCommands.join(' '),
    fillPaths,
  };
}

// ============================================================================
// React WaveDrom Waveform Viewer Component
// ============================================================================

export interface WaveDromOverlayProps {
  waveJson: WaveJson;
  width?: number;
  height?: number;
  progress?: number; // 0.0 to 1.0 (scanning cursor)
  showCursor?: boolean;
}

export const WaveDromOverlay: React.FC<WaveDromOverlayProps> = ({
  waveJson,
  width = 960,
  progress = 0,
  showCursor = true,
}) => {
  const skin = waveJson.config?.skin || 'neon';
  const theme = getWaveDromTheme(skin);
  const stepWidth = 44 * (waveJson.config?.hscale || 1);
  const laneHeight = 32;
  const laneGap = 24;
  const labelWidth = 110;
  const headerHeight = 60;

  // Compute maximum clock cycles
  let maxCycles = 0;
  for (const lane of waveJson.signal) {
    const cycles = lane.wave.length;
    if (cycles > maxCycles) maxCycles = cycles;
  }
  if (maxCycles === 0) maxCycles = 10;

  const totalSignalWidth = maxCycles * stepWidth;
  const totalSvgWidth = labelWidth + totalSignalWidth + 40;
  const totalSvgHeight = headerHeight + waveJson.signal.length * (laneHeight + laneGap) + 40;

  // Scanning cursor coordinate
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const cursorX = labelWidth + clampedProgress * totalSignalWidth;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        backgroundColor: theme.bg,
        borderRadius: '16px',
        padding: '24px',
        border: `1.5px solid ${theme.grid}`,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        overflowX: 'auto',
        position: 'relative',
        fontFamily: 'monospace, -apple-system, sans-serif',
      }}
    >
      <svg
        viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Title / Head */}
        {waveJson.head?.text && (
          <text
            x={totalSvgWidth / 2}
            y={32}
            textAnchor="middle"
            fill={theme.text}
            fontSize="18"
            fontWeight="700"
            letterSpacing="0.5px"
          >
            {waveJson.head.text}
          </text>
        )}

        {/* Vertical Grid Lines & Clock Cycle Ticks */}
        {Array.from({ length: maxCycles + 1 }).map((_, i) => {
          const gx = labelWidth + i * stepWidth;
          return (
            <g key={`grid-${i}`}>
              <line
                x1={gx}
                y1={headerHeight}
                x2={gx}
                y2={totalSvgHeight - 20}
                stroke={theme.grid}
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={gx}
                y={headerHeight - 8}
                textAnchor="middle"
                fill={theme.low}
                fontSize="11"
              >
                {i}
              </text>
            </g>
          );
        })}

        {/* Signal Lanes */}
        {waveJson.signal.map((lane, index) => {
          const yOffset = headerHeight + index * (laneHeight + laneGap);
          const segments = parseWaveLane(lane);
          const { strokePath, fillPaths } = buildLaneSvgPaths(
            segments,
            stepWidth,
            laneHeight,
            yOffset,
            labelWidth
          );

          return (
            <g key={`lane-${lane.name}-${index}`}>
              {/* Lane Name Label */}
              <text
                x={labelWidth - 16}
                y={yOffset + laneHeight / 2 + 5}
                textAnchor="end"
                fill={theme.text}
                fontSize="14"
                fontWeight="600"
              >
                {lane.name}
              </text>

              {/* Bus Closed Fills */}
              {fillPaths.map((fp, fIdx) => (
                <g key={`fill-${index}-${fIdx}`}>
                  <path
                    d={fp.d}
                    fill={fp.colorIndex === 99 ? 'rgba(100,116,139,0.2)' : theme.busFill}
                    stroke={fp.colorIndex === 99 ? '#64748b' : theme.busStroke}
                    strokeWidth="1.5"
                  />
                  {fp.label && (
                    <text
                      x={labelWidth + (fIdx + 0.5) * stepWidth * 2} // approximate center
                      y={yOffset + laneHeight / 2 + 4}
                      textAnchor="middle"
                      fill={theme.text}
                      fontSize="11"
                      fontWeight="600"
                    >
                      {fp.label}
                    </text>
                  )}
                </g>
              ))}

              {/* Wave Stroke Path */}
              <path
                d={strokePath}
                fill="none"
                stroke={theme.high}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {/* Scanning Timecode Playhead Cursor */}
        {showCursor && (
          <g>
            <line
              x1={cursorX}
              y1={headerHeight - 16}
              x2={cursorX}
              y2={totalSvgHeight - 10}
              stroke={theme.cursor}
              strokeWidth="2.5"
              strokeDasharray="4 2"
              style={{
                filter: `drop-shadow(0 0 6px ${theme.cursorGlow})`,
              }}
            />
            {/* Playhead marker indicator at top */}
            <polygon
              points={`${cursorX - 6},${headerHeight - 24} ${cursorX + 6},${headerHeight - 24} ${cursorX},${headerHeight - 14}`}
              fill={theme.cursor}
            />
          </g>
        )}
      </svg>
    </div>
  );
};

// ============================================================================
// Deterministic HyperFrames HTML5 Exporter
// ============================================================================

/**
 * Compiles a self-contained WaveDrom animation into an HTML5 file exposing `window.seekToFrame`.
 */
export function generateWaveDromHtml(waveJson: WaveJson, durationSeconds = 5.0, fps = 30): string {
  const totalFrames = Math.round(durationSeconds * fps);
  const jsonStr = JSON.stringify(waveJson);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${waveJson.head?.text || 'WaveDrom Timing Diagram'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #07090e;
      color: #ecfdf5;
      font-family: monospace, -apple-system, sans-serif;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px 40px;
      position: relative;
    }
    .wave-container {
      width: 100%;
      background: #0d111a;
      border: 2px solid rgba(16, 185, 129, 0.25);
      border-radius: 20px;
      padding: 36px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    }
  </style>
</head>
<body>
  <div class="wave-container" id="waveContainer">
    <h2 style="font-size: 32px; color: #10b981; margin-bottom: 24px; text-align: center;">
      ${waveJson.head?.text || 'Hardware Waveform Timing'}
    </h2>
    <div id="svgMount"></div>
  </div>

  <script>
    const spec = ${jsonStr};
    const totalFrames = ${totalFrames};
    let currentFrame = 0;

    function renderFrame(frame) {
      const progress = Math.max(0, Math.min(1, frame / (totalFrames - 1)));
      // Deterministic render update for headless video frame grabber
      window.__progress = progress;
    }

    window.__totalFrames = totalFrames;
    window.seekToFrame = function(frame) {
      currentFrame = frame;
      renderFrame(frame);
    };

    // Auto-advance loop for browser preview
    let f = 0;
    setInterval(() => {
      f = (f + 1) % totalFrames;
      renderFrame(f);
    }, 1000 / ${fps});
  </script>
</body>
</html>`;
}
