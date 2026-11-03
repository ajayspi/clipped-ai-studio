// lib/engine/2d-studio/core.ts
// Shared runtime for 2D studio shots. Logical canvas units:
// 16:9 stage = 1920x1080, 9:16 stage = 1080x1920.

import { STYLES, BASE_MOODS, Studio2DStyle, MoodColors } from './styles';

export interface StudioWordTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface Studio2DContext {
  W: number;
  H: number;
  PX: number;
  fps: number;
  vertical: boolean;
  style: Studio2DStyle;
  styleId: string;
  cfg: Record<string, unknown>;
  words: StudioWordTiming[];
  shots: unknown[];
}

export const E: Studio2DContext = {
  W: 1920,
  H: 1080,
  PX: 1,
  fps: 24,
  vertical: false,
  style: STYLES.dusk,
  styleId: 'dusk',
  cfg: {},
  words: [],
  shots: [],
};

export const V = <T>(landscape: T, vertical: T): T => (E.vertical ? vertical : landscape);

// ---------- math / timing ----------
export const clamp = (x: number, a = 0, b = 1): number => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export const prog = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));

export const ease = {
  linear: (x: number): number => clamp(x),
  in: (x: number): number => clamp(x) ** 3,
  out: (x: number): number => 1 - (1 - clamp(x)) ** 3,
  inOut: (x: number): number => {
    const cx = clamp(x);
    return cx < 0.5 ? 4 * cx ** 3 : 1 - (-2 * cx + 2) ** 3 / 2;
  },
  sine: (x: number): number => -(Math.cos(Math.PI * clamp(x)) - 1) / 2,
  outBack: (x: number): number => {
    const cx = clamp(x);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (cx - 1) ** 3 + c1 * (cx - 1) ** 2;
  },
  outElastic: (x: number): number => {
    const cx = clamp(x);
    return cx === 0 || cx === 1
      ? cx
      : 2 ** (-10 * cx) * Math.sin((cx * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },
};

export type EasingFn = (x: number) => number;

export function key<T>(
  t: number,
  frames: Array<[number, T, EasingFn?]>,
  fn: EasingFn = ease.inOut
): T {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1] = frames[i];
    if (t <= t1) {
      const [t0, v0] = frames[i - 1];
      const easeFn = frames[i][2] || fn;
      return mixVal(v0, v1, easeFn((t - t0) / (t1 - t0))) as T;
    }
  }
  return frames[frames.length - 1][1];
}

export function mixVal(a: unknown, b: unknown, k: number): unknown {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, k);
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.map((v, i) => mixVal(v, b[i], k));
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const o: Record<string, unknown> = {};
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
    for (const kk of keys) {
      const va = (a as Record<string, unknown>)[kk];
      const vb = (b as Record<string, unknown>)[kk];
      o[kk] = typeof va === 'number' || Array.isArray(va) ? mixVal(va, vb ?? va, k) : k < 0.5 ? va : vb ?? va;
    }
    return o;
  }
  return k < 0.5 ? a : b;
}

export function rng(seed = 1): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function noise(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57), hash(i + 1 + seed * 57), u) * 2 - 1;
}

export const shake = (t: number, amp = 4, freq = 1.3, seed = 3): [number, number] => [
  noise(t * freq, seed) * amp,
  noise(t * freq, seed + 9) * amp,
];

export function talkAmount(globalT: number, from = -1, to = 1e9): number {
  if (globalT < from || globalT > to) return 0;
  const w = E.words.find((w) => globalT >= w.start && globalT <= w.end);
  if (!w && E.words.length) return 0;
  return clamp(0.25 + 0.75 * Math.abs(Math.sin(globalT * 17)) * (0.6 + 0.4 * Math.sin(globalT * 5.3)));
}

export function wordTime(match: string, after = 0): number | null {
  const m = match.toLowerCase().replace(/[^\w']/g, '');
  const w = E.words.find(
    (w) => w.start >= after - 0.05 && w.word.toLowerCase().replace(/[^\w']/g, '').startsWith(m)
  );
  return w ? w.start : null;
}

// ---------- colour ----------
export function rgb(c: string | number[]): number[] {
  if (Array.isArray(c)) return c;
  if (c.startsWith('rgb')) {
    const m = c.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 1];
    return [m[0], m[1], m[2], m[3] ?? 1];
  }
  let h = c.slice(1);
  if (h.length === 3) h = [...h].map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [n >> 16, (n >> 8) & 255, n & 255, h.length > 6 ? parseInt(h.slice(6), 16) / 255 : 1];
}

export const css = ([r, g, b, a = 1]: number[]): string =>
  `rgba(${r | 0},${g | 0},${b | 0},${+Number(a).toFixed(3)})`;

export const mix = (c1: string, c2: string, k: number): string => {
  const a = rgb(c1);
  const b = rgb(c2);
  return css(a.map((v, i) => lerp(v, b[i] ?? 1, k)));
};

export const alpha = (c: string, a: number): string => {
  const x = rgb(c);
  return css([x[0], x[1], x[2], a]);
};

export const shade = (c: string, k: number): string =>
  k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k);

// ---------- style / moods ----------
export function setStyle(id: string): void {
  E.styleId = STYLES[id] ? id : 'dusk';
  E.style = STYLES[E.styleId];
}

export function mood(name = 'dusk'): MoodColors {
  const base = BASE_MOODS[name] || BASE_MOODS.dusk;
  return { ...base, ...(E.style.moods?.[name] || {}) };
}

export const S = (): Studio2DStyle => E.style;

// ---------- canvas drawing primitives ----------
export function rr(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function seg(
  g: CanvasRenderingContext2D,
  pts: Array<[number, number]>,
  w: number,
  col: string,
  cap: CanvasLineCap = 'round'
): void {
  if (pts.length < 2) return;
  g.strokeStyle = col;
  g.lineWidth = w;
  g.lineCap = cap;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    g.lineTo(pts[i][0], pts[i][1]);
  }
  g.stroke();
}

export function poly(
  g: CanvasRenderingContext2D,
  pts: Array<[number, number]>,
  fill: string
): void {
  if (pts.length < 3) return;
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    g.lineTo(pts[i][0], pts[i][1]);
  }
  g.closePath();
  g.fill();
}

export function circle(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string
): void {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  g.fill();
}

export function ring(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  w: number,
  col: string
): void {
  g.strokeStyle = col;
  g.lineWidth = w;
  g.beginPath();
  g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  g.stroke();
}

export function linGrad(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: Array<string | [number, string]>
): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => {
    if (Array.isArray(c)) {
      gr.addColorStop(c[0], c[1]);
    } else {
      gr.addColorStop(i / Math.max(1, stops.length - 1), c);
    }
  });
  return gr;
}

export function radGrad(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r0: number,
  r1: number,
  stops: Array<string | [number, string]>
): CanvasGradient {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach((c, i) => {
    if (Array.isArray(c)) {
      gr.addColorStop(c[0], c[1]);
    } else {
      gr.addColorStop(i / Math.max(1, stops.length - 1), c);
    }
  });
  return gr;
}

export function glow(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  col: string,
  a = 1
): void {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = radGrad(g, x, y, 0, r, [
    alpha(col, a),
    alpha(col, a * 0.35),
    alpha(col, 0),
  ]);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function veil(
  g: CanvasRenderingContext2D,
  color = '#000',
  a = 0.3,
  op: GlobalCompositeOperation = 'source-over'
): void {
  g.save();
  g.globalCompositeOperation = op;
  g.fillStyle = alpha(color, a);
  g.fillRect(-E.W, -E.H, E.W * 3, E.H * 3);
  g.restore();
}

export function fillRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string
): void {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
}

export function backdrop(
  g: CanvasRenderingContext2D,
  colors: string[],
  area: [number, number, number, number] = [-E.W, -E.H, E.W * 3, E.H * 3]
): void {
  g.fillStyle = linGrad(g, 0, 0, 0, E.H, colors);
  g.fillRect(...area);
}

// ---------- camera & parallax ----------
export interface Studio2DCamera {
  x?: number;
  y?: number;
  z?: number; // zoom (1.0 = normal)
  r?: number; // roll in radians
}

export function layer(
  g: CanvasRenderingContext2D,
  cam: Studio2DCamera,
  depth: number,
  fn: (g: CanvasRenderingContext2D) => void
): void {
  g.save();
  const z = 1 + ((cam.z ?? 1) - 1) * depth;
  g.translate(E.W / 2, E.H / 2);
  if (cam.r) g.rotate(cam.r * Math.min(1, depth));
  g.scale(z, z);
  g.translate(-E.W / 2 - (cam.x || 0) * depth, -E.H / 2 - (cam.y || 0) * depth);
  fn(g);
  g.restore();
}
