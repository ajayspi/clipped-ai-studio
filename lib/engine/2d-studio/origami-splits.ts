// lib/engine/2d-studio/origami-splits.ts
// Dynamic Multi-Pane Screen Partitioning Engine for 9:16 Shorts & Technical Explainers.
// Extracted and ported from aitrends-2d-studio engine/origami_splits.js.

import { rr } from './core';

export interface PaneBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export type SplitDirection = 'right' | 'down' | 'left' | 'up';

export class OrigamiLayout {
  cols: number[];
  rows: number[];
  cells: [number, number, number, number][];

  constructor(
    cols: number[] = [0, 1],
    rows: number[] = [0, 1],
    cells: [number, number, number, number][] = [[0, 0, 1, 1]]
  ) {
    this.cols = [...cols];
    this.rows = [...rows];
    this.cells = cells.map(c => [...c]);
  }

  getPaneBounds(index: number, totalW: number, totalH: number, padding = 0): PaneBounds | null {
    if (index >= this.cells.length) return null;
    const [c0, r0, c1, r1] = this.cells[index];
    const left = this.cols[c0] * totalW + padding;
    const top = this.rows[r0] * totalH + padding;
    const right = this.cols[c1] * totalW - padding;
    const bottom = this.rows[r1] * totalH - padding;
    return {
      x: left,
      y: top,
      w: Math.max(0, right - left),
      h: Math.max(0, bottom - top),
      cx: (left + right) / 2,
      cy: (top + bottom) / 2
    };
  }

  split(cellIndex: number, direction: SplitDirection = 'down', ratio = 0.5): number {
    const [c0, r0, c1, r1] = this.cells[cellIndex];

    if (direction === 'down' || direction === 'up') {
      const topY = this.rows[r0];
      const botY = this.rows[r1];
      const splitY = topY + (botY - topY) * (direction === 'down' ? (1 - ratio) : ratio);

      this.rows.splice(r1, 0, splitY);
      for (const c of this.cells) {
        if (c[1] >= r1) c[1] += 1;
        if (c[3] >= r1) c[3] += 1;
      }
      this.cells[cellIndex] = [c0, r0, c1, r1];
      this.cells.push([c0, r1, c1, r1 + 1]);
    } else if (direction === 'right' || direction === 'left') {
      const leftX = this.cols[c0];
      const rightX = this.cols[c1];
      const splitX = leftX + (rightX - leftX) * (direction === 'right' ? (1 - ratio) : ratio);

      this.cols.splice(c1, 0, splitX);
      for (const c of this.cells) {
        if (c[0] >= c1) c[0] += 1;
        if (c[2] >= c1) c[2] += 1;
      }
      this.cells[cellIndex] = [c0, r0, c1, r1];
      this.cells.push([c1, r0, c1 + 1, r1]);
    }
    return this.cells.length - 1;
  }
}

export const SHORT_LAYOUTS = {
  single: () => new OrigamiLayout([0, 1], [0, 1], [[0, 0, 1, 1]]),
  topBottom: (splitRatio = 0.5) => new OrigamiLayout(
    [0, 1],
    [0, splitRatio, 1],
    [[0, 0, 1, 1], [0, 1, 1, 2]]
  ),
  leftRight: (splitRatio = 0.5) => new OrigamiLayout(
    [0, splitRatio, 1],
    [0, 1],
    [[0, 0, 1, 1], [1, 0, 2, 1]]
  ),
  quadGrid: () => new OrigamiLayout(
    [0, 0.5, 1],
    [0, 0.5, 1],
    [
      [0, 0, 1, 1],
      [1, 0, 2, 1],
      [0, 1, 1, 2],
      [1, 1, 2, 2]
    ]
  ),
  triHero: (topRatio = 0.6) => new OrigamiLayout(
    [0, 0.5, 1],
    [0, topRatio, 1],
    [
      [0, 0, 2, 1],
      [0, 1, 1, 2],
      [1, 1, 2, 2]
    ]
  )
};

export interface OrigamiRenderOptions {
  gap?: number;
  borderColor?: string;
  borderWidth?: number;
  cornerBrackets?: boolean;
  cornerColor?: string;
  labels?: string[];
}

export function renderOrigamiLayout(
  g: CanvasRenderingContext2D,
  totalW: number,
  totalH: number,
  layout: OrigamiLayout,
  paneDrawCallbacks: ((g: CanvasRenderingContext2D, bounds: PaneBounds) => void)[],
  options: OrigamiRenderOptions = {}
): void {
  if (!g) return;
  const {
    gap = 4,
    borderColor = '#1e293b',
    borderWidth = 2.0,
    cornerBrackets = true,
    cornerColor = '#38bdf8',
    labels = []
  } = options;

  for (let i = 0; i < layout.cells.length; i++) {
    const bounds = layout.getPaneBounds(i, totalW, totalH, gap / 2);
    if (!bounds) continue;

    if (typeof paneDrawCallbacks[i] === 'function') {
      g.save();
      g.beginPath();
      rr(g, bounds.x, bounds.y, bounds.w, bounds.h, 6);
      g.clip();
      paneDrawCallbacks[i](g, bounds);
      g.restore();
    }

    g.save();
    g.lineWidth = borderWidth;
    g.strokeStyle = borderColor;
    g.beginPath();
    rr(g, bounds.x, bounds.y, bounds.w, bounds.h, 6);
    g.stroke();

    if (cornerBrackets) {
      const len = 14;
      g.strokeStyle = cornerColor;
      g.lineWidth = 2.0;

      // Top-Left
      g.beginPath(); g.moveTo(bounds.x, bounds.y + len); g.lineTo(bounds.x, bounds.y); g.lineTo(bounds.x + len, bounds.y); g.stroke();
      // Top-Right
      g.beginPath(); g.moveTo(bounds.x + bounds.w - len, bounds.y); g.lineTo(bounds.x + bounds.w, bounds.y); g.lineTo(bounds.x + bounds.w, bounds.y + len); g.stroke();
      // Bottom-Left
      g.beginPath(); g.moveTo(bounds.x, bounds.y + bounds.h - len); g.lineTo(bounds.x, bounds.y + bounds.h); g.lineTo(bounds.x + len, bounds.y + bounds.h); g.stroke();
      // Bottom-Right
      g.beginPath(); g.moveTo(bounds.x + bounds.w - len, bounds.y + bounds.h); g.lineTo(bounds.x + bounds.w, bounds.y + bounds.h); g.lineTo(bounds.x + bounds.w, bounds.y + bounds.h - len); g.stroke();
    }

    if (labels[i]) {
      g.fillStyle = 'rgba(7, 10, 20, 0.75)';
      rr(g, bounds.x + 8, bounds.y + 8, 140, 22, 4);
      g.fill();
      g.fillStyle = cornerColor;
      g.font = '700 10px monospace';
      g.fillText(labels[i], bounds.x + 14, bounds.y + 22);
    }

    g.restore();
  }
}
