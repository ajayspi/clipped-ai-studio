// lib/engine/2d-studio/rig2d.ts
// Stick-figure character rig (2D canvas).
// Local space: feet on y=0, up is -y, the figure faces +x. Base height ≈ 240 units (s = 1).
// Points: head, sh (neck/shoulder), hip, eF/hF = near elbow/hand, eB/hB = far elbow/hand,
//         kF/fF = near knee/foot, kB/fB = far knee/foot.

import { S, seg, circle, ring, mix, shade, lerp, mixVal, ease, clamp } from './core';

export type Point2D = [number, number];

export interface PosePoints {
  head: Point2D;
  sh: Point2D;
  hip: Point2D;
  eF: Point2D;
  hF: Point2D;
  eB: Point2D;
  hB: Point2D;
  kF: Point2D;
  fF: Point2D;
  kB: Point2D;
  fB: Point2D;
}

export type PoseName =
  | 'stand'
  | 'relaxed'
  | 'shrug'
  | 'holdFront'
  | 'phone'
  | 'reach'
  | 'sad'
  | 'facepalm'
  | 'ready'
  | 'crouch'
  | 'sit'
  | 'sitBack'
  | 'kneel'
  | 'lie'
  | 'dive'
  | 'kick'
  | 'jump'
  | 'fall';

const P = (o: PosePoints): PosePoints => o;

export const POSES: Record<PoseName, PosePoints> = {
  stand: P({ head: [3, -208], sh: [0, -174], hip: [0, -100], eF: [9, -137], hF: [13, -101], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  relaxed: P({ head: [4, -207], sh: [1, -173], hip: [0, -100], eF: [12, -138], hF: [20, -106], eB: [-8, -137], hB: [-14, -104], kF: [8, -50], fF: [10, 0], kB: [-5, -50], fB: [-9, 0] }),
  shrug: P({ head: [3, -206], sh: [0, -172], hip: [0, -100], eF: [26, -156], hF: [40, -176], eB: [-24, -156], hB: [-38, -176], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  holdFront: P({ head: [5, -207], sh: [1, -173], hip: [0, -100], eF: [22, -140], hF: [36, -152], eB: [16, -142], hB: [30, -154], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  phone: P({ head: [6, -204], sh: [1, -172], hip: [0, -100], eF: [20, -138], hF: [28, -166], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  reach: P({ head: [8, -206], sh: [4, -172], hip: [0, -100], eF: [34, -186], hF: [62, -204], eB: [-6, -136], hB: [-10, -102], kF: [10, -50], fF: [12, 0], kB: [-6, -50], fB: [-18, 0] }),
  sad: P({ head: [12, -192], sh: [6, -166], hip: [0, -100], eF: [10, -132], hF: [12, -98], eB: [-2, -132], hB: [-2, -98], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  facepalm: P({ head: [8, -200], sh: [2, -170], hip: [0, -100], eF: [28, -160], hF: [26, -200], eB: [-7, -136], hB: [-9, -100], kF: [6, -50], fF: [3, 0], kB: [-6, -50], fB: [-11, 0] }),
  ready: P({ head: [12, -182], sh: [6, -148], hip: [0, -80], eF: [34, -132], hF: [56, -146], eB: [-26, -132], hB: [-46, -146], kF: [26, -44], fF: [22, 0], kB: [-24, -44], fB: [-24, 0] }),
  crouch: P({ head: [16, -150], sh: [8, -118], hip: [0, -58], eF: [28, -88], hF: [38, -60], eB: [18, -86], hB: [26, -58], kF: [34, -54], fF: [20, 0], kB: [20, -50], fB: [-8, 0] }),
  sit: P({ head: [4, -180], sh: [1, -146], hip: [0, -72], eF: [16, -110], hF: [38, -84], eB: [10, -110], hB: [30, -84], kF: [44, -74], fF: [46, 0], kB: [40, -72], fB: [38, 0] }),
  sitBack: P({ head: [-8, -176], sh: [-6, -144], hip: [0, -72], eF: [2, -108], hF: [26, -86], eB: [-14, -110], hB: [-24, -80], kF: [44, -78], fF: [54, -2], kB: [40, -76], fB: [44, 0] }),
  kneel: P({ head: [10, -168], sh: [5, -134], hip: [0, -62], eF: [24, -100], hF: [38, -76], eB: [-4, -100], hB: [-6, -66], kF: [36, -46], fF: [36, 0], kB: [-6, -4], fB: [-48, 0] }),
  lie: P({ head: [3, -208], sh: [0, -174], hip: [0, -100], eF: [14, -136], hF: [18, -100], eB: [-12, -138], hB: [-20, -104], kF: [4, -50], fF: [2, 0], kB: [-4, -50], fB: [-6, 0] }),
  dive: P({ head: [4, -212], sh: [0, -176], hip: [0, -100], eF: [8, -218], hF: [12, -256], eB: [-6, -218], hB: [-4, -254], kF: [8, -52], fF: [10, -2], kB: [-6, -54], fB: [-14, -8] }),
  kick: P({ head: [-4, -206], sh: [-6, -172], hip: [0, -100], eF: [8, -140], hF: [24, -124], eB: [-24, -140], hB: [-42, -128], kF: [36, -78], fF: [66, -70], kB: [-4, -50], fB: [-8, 0] }),
  jump: P({ head: [4, -232], sh: [1, -198], hip: [0, -124], eF: [24, -226], hF: [32, -266], eB: [-18, -226], hB: [-26, -266], kF: [16, -82], fF: [6, -48], kB: [-12, -84], fB: [-22, -50] }),
  fall: P({ head: [-10, -196], sh: [-8, -164], hip: [0, -100], eF: [24, -196], hF: [44, -222], eB: [-34, -186], hB: [-58, -204], kF: [24, -58], fF: [44, -28], kB: [-10, -54], fB: [-6, -8] }),
};

export const pose = (name: string): PosePoints => (POSES as Record<string, PosePoints>)[name] || POSES.stand;

export const blendPose = (a: string | PosePoints, b: string | PosePoints, k: number): PosePoints =>
  mixVal(typeof a === 'string' ? pose(a) : a, typeof b === 'string' ? pose(b) : b, ease.inOut(k)) as PosePoints;

export function posesAt(t: number, keys: Array<[number, string | PosePoints]>, blend = 0.35): PosePoints {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [ti, pi] = keys[i];
    if (t < ti) break;
    const k = clamp((t - ti) / blend);
    cur = k >= 1 ? pi : blendPose(cur, pi, k);
    if (k < 1) return typeof cur === 'string' ? pose(cur) : cur;
  }
  return typeof cur === 'string' ? pose(cur) : cur;
}

export function breathe(p: PosePoints, t: number, amt = 1, seed = 0): PosePoints {
  const b = Math.sin(t * 2.1 + seed) * 1.6 * amt;
  const s = Math.sin(t * 0.9 + seed * 2) * 1.2 * amt;
  const q: PosePoints = { ...p };
  for (const k of ['head', 'sh', 'eF', 'hF', 'eB', 'hB'] as const) {
    q[k] = [p[k][0] + s * (k === 'head' ? 1.2 : 0.6), p[k][1] + b];
  }
  return q;
}

function ik(a: Point2D, b: Point2D, L1: number, L2: number, dir = 1): Point2D {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(d, L1 + L2 - 0.01);
  const ang =
    Math.atan2(dy, dx) -
    dir * Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  return [a[0] + Math.cos(ang) * L1, a[1] + Math.sin(ang) * L1];
}

export interface WalkOptions {
  stride?: number;
  lift?: number;
  bob?: number;
  arm?: number;
  lean?: number;
  run?: boolean;
}

export function walkPose(phase: number, o: WalkOptions = {}): PosePoints {
  const { stride = 26, lift = 12, bob = 3, arm = 16, lean = 2, run = false } = o;
  const st = run ? 46 : stride;
  const li = run ? 34 : lift;
  const bb = run ? 7 : bob;
  const ar = run ? 30 : arm;
  const le = run ? 14 : lean;
  const hipY = -100 + (run ? 6 : 0) - bb * (1 - Math.abs(Math.sin(phase))) + bb * 0.5;
  const hip: Point2D = [0, hipY];
  const sh: Point2D = [le, hipY - 74];
  const head: Point2D = [le + 4, hipY - 108];
  const foot = (ph: number): Point2D => [st * Math.sin(ph), -li * Math.max(0, Math.cos(ph))];
  const fF = foot(phase);
  const fB = foot(phase + Math.PI);
  const kF = ik(hip, fF, 52, 52, 1);
  const kB = ik(hip, fB, 52, 52, 1);
  const hand = (ph: number): Point2D =>
    run ? [le + ar * Math.sin(ph) * 0.9 + 6, hipY - 46 - Math.cos(ph) * 10] : [le * 0.5 - ar * Math.sin(ph) + 4, hipY - 2];
  const hF = hand(phase + Math.PI);
  const hB = hand(phase);
  const elbow = (h: Point2D): Point2D =>
    run ? [lerp(sh[0], h[0], 0.5) - 14, lerp(sh[1], h[1], 0.5) + 6] : [lerp(sh[0], h[0], 0.5) - 3, sh[1] + 38];
  return { head, sh, hip, eF: elbow(hF), hF, eB: elbow(hB), hB, kF, fF, kB, fB };
}

// ---------- faces ----------
export interface ExpressionDef {
  eyes: 'dot' | 'happy' | 'ring' | 'wide' | 'closed' | 'narrow';
  brows: 'worried' | 'angry' | 'raised' | 'confused' | 'gentle' | null;
  mouth: 'smallSmile' | 'grin' | 'smile' | 'o' | 'oBig' | 'flat' | 'smallFlat' | 'frown' | 'smirk' | 'wavy' | 'scowl' | 'laugh';
  look?: Point2D;
  sweat?: boolean;
  tears?: boolean;
}

export const EXPR: Record<string, ExpressionDef> = {
  neutral: { eyes: 'dot', brows: null, mouth: 'smallSmile' },
  // The 5 Canonical Expressions
  smiling: { eyes: 'dot', brows: 'gentle', mouth: 'smile' },
  smile: { eyes: 'dot', brows: 'gentle', mouth: 'smile' },
  angry: { eyes: 'narrow', brows: 'angry', mouth: 'scowl' },
  shocked: { eyes: 'wide', brows: 'raised', mouth: 'oBig' },
  happy: { eyes: 'happy', brows: 'raised', mouth: 'grin' },
  laughing: { eyes: 'happy', brows: 'raised', mouth: 'laugh' },
  // Additional situational expressions
  joy: { eyes: 'happy', brows: 'raised', mouth: 'grin' },
  surprised: { eyes: 'ring', brows: 'raised', mouth: 'o' },
  scared: { eyes: 'ring', brows: 'worried', mouth: 'wavy' },
  worried: { eyes: 'dot', brows: 'worried', mouth: 'wavy' },
  nervous: { eyes: 'dot', brows: 'worried', mouth: 'flat', sweat: true },
  determined: { eyes: 'narrow', brows: 'angry', mouth: 'smallFlat' },
  sad: { eyes: 'dot', brows: 'worried', mouth: 'frown' },
  cry: { eyes: 'closed', brows: 'worried', mouth: 'frown', tears: true },
  smirk: { eyes: 'dot', brows: null, mouth: 'smirk' },
  sleepy: { eyes: 'closed', brows: null, mouth: 'flat' },
  thinking: { eyes: 'dot', brows: 'raised', mouth: 'smallFlat', look: [0.5, -0.6] },
  confused: { eyes: 'dot', brows: 'confused', mouth: 'wavy' },
  awe: { eyes: 'wide', brows: 'raised', mouth: 'o' },
};

export interface FaceOptions {
  expr?: string;
  talk?: number;
  blink?: boolean;
  look?: Point2D;
  front?: boolean;
  color?: string;
  animTime?: number;
  override?: Partial<ExpressionDef>;
}

export function face(g: CanvasRenderingContext2D, hx: number, hy: number, r: number, o: FaceOptions = {}): void {
  const ex = { ...(EXPR[o.expr || 'neutral'] || EXPR.neutral), ...(o.override || {}) };
  const col = o.color || S().feature;
  const ink = S().ink;
  const fx = hx + (o.front ? 0 : r * 0.34);
  const fy = hy - r * 0.08;
  const look = o.look || ex.look || [0, 0];
  const eyeX = o.front ? [fx - r * 0.34, fx + r * 0.34] : [fx - r * 0.26, fx + r * 0.32];
  const ey = fy - r * 0.08;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  eyeX.forEach((x, i) => {
    const s = o.front ? 1 : i === 0 ? 0.88 : 1;
    if (o.blink || ex.eyes === 'closed') {
      seg(g, [[x - r * 0.12 * s, ey], [x + r * 0.12 * s, ey]], r * 0.08, col);
      return;
    }
    switch (ex.eyes) {
      case 'happy':
        g.strokeStyle = col;
        g.lineWidth = r * 0.09;
        g.beginPath();
        g.arc(x, ey + r * 0.05, r * 0.13 * s, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
        break;
      case 'ring':
        ring(g, x, ey, r * 0.2 * s, r * 0.085, col);
        circle(g, x + look[0] * r * 0.06, ey + look[1] * r * 0.06, r * 0.075 * s, col);
        break;
      case 'wide':
        circle(g, x, ey, r * 0.2 * s, col);
        circle(g, x + look[0] * r * 0.08, ey + look[1] * r * 0.08, r * 0.085 * s, ink);
        break;
      case 'narrow': {
        const tilt = i === 0 ? -r * 0.05 : r * 0.05;
        seg(g, [[x - r * 0.14 * s, ey - tilt], [x + r * 0.14 * s, ey + tilt]], r * 0.09, col);
        break;
      }
      default:
        circle(g, x + look[0] * r * 0.05, ey + look[1] * r * 0.05, r * 0.125 * s, col);
    }
  });

  const by = ey - r * 0.3;
  const bw = r * 0.15;
  const brow = (x: number, a: number) => seg(g, [[x - bw, by + a], [x + bw, by - a]], r * 0.075, col);
  if (ex.brows === 'worried') {
    brow(eyeX[0], -r * 0.06);
    brow(eyeX[1], r * 0.06);
  }
  if (ex.brows === 'gentle') {
    brow(eyeX[0], -r * 0.03);
    brow(eyeX[1], r * 0.03);
  }
  if (ex.brows === 'angry') {
    // Left brow rotates negatively (-0.44 rad) and right brow positively (+0.44 rad) to form fierce V
    brow(eyeX[0], r * 0.09);
    brow(eyeX[1], -r * 0.09);
  }
  if (ex.brows === 'raised') {
    eyeX.forEach((x) => {
      g.strokeStyle = col;
      g.lineWidth = r * 0.07;
      g.beginPath();
      g.arc(x, by + r * 0.12, r * 0.15, Math.PI * 1.2, Math.PI * 1.8);
      g.stroke();
    });
  }
  if (ex.brows === 'confused') {
    brow(eyeX[0], r * 0.07);
    g.strokeStyle = col;
    g.lineWidth = r * 0.07;
    g.beginPath();
    g.arc(eyeX[1], by + r * 0.08, r * 0.15, Math.PI * 1.2, Math.PI * 1.8);
    g.stroke();
  }

  const mx = fx + (o.front ? 0 : r * 0.04);
  const my = fy + r * 0.42;
  const talk = o.talk || 0;
  if (talk > 0.05) {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(mx, my, r * 0.16, r * (0.05 + 0.2 * talk), 0, 0, Math.PI * 2);
    g.fill();
  } else {
    switch (ex.mouth) {
      case 'grin':
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(mx - r * 0.3, my - r * 0.06);
        g.quadraticCurveTo(mx, my + r * 0.42, mx + r * 0.3, my - r * 0.06);
        g.closePath();
        g.fill();
        break;
      case 'smile':
        g.strokeStyle = col;
        g.lineWidth = r * 0.09;
        g.beginPath();
        g.arc(mx, my - r * 0.2, r * 0.27, 0.35, Math.PI - 0.35);
        g.stroke();
        break;
      case 'smallSmile':
        g.strokeStyle = col;
        g.lineWidth = r * 0.085;
        g.beginPath();
        g.arc(mx, my - r * 0.14, r * 0.18, 0.4, Math.PI - 0.4);
        g.stroke();
        break;
      case 'o':
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(mx, my, r * 0.11, r * 0.15, 0, 0, Math.PI * 2);
        g.fill();
        break;
      case 'oBig':
        ring(g, mx, my + r * 0.04, r * 0.15, r * 0.08, col);
        break;
      case 'flat':
        seg(g, [[mx - r * 0.2, my], [mx + r * 0.2, my]], r * 0.085, col);
        break;
      case 'smallFlat':
        seg(g, [[mx - r * 0.12, my], [mx + r * 0.12, my]], r * 0.085, col);
        break;
      case 'frown':
        g.strokeStyle = col;
        g.lineWidth = r * 0.085;
        g.beginPath();
        g.arc(mx, my + r * 0.2, r * 0.2, Math.PI + 0.5, Math.PI * 2 - 0.5);
        g.stroke();
        break;
      case 'smirk':
        g.strokeStyle = col;
        g.lineWidth = r * 0.085;
        g.beginPath();
        g.moveTo(mx - r * 0.16, my);
        g.quadraticCurveTo(mx + r * 0.05, my + r * 0.06, mx + r * 0.22, my - r * 0.1);
        g.stroke();
        break;
      case 'scowl':
        g.strokeStyle = col;
        g.lineWidth = r * 0.09;
        g.beginPath();
        g.arc(mx, my + r * 0.22, r * 0.22, Math.PI + 0.35, Math.PI * 2 - 0.35);
        g.stroke();
        break;
      case 'laugh': {
        const pulse = o.animTime ? Math.sin(o.animTime * 18) * (r * 0.04) : 0;
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(mx - r * 0.28, my - r * 0.05);
        g.quadraticCurveTo(mx, my + r * 0.42 + pulse, mx + r * 0.28, my - r * 0.05);
        g.closePath();
        g.fill();
        break;
      }
      case 'scowl':
        g.strokeStyle = col;
        g.lineWidth = r * 0.09;
        g.beginPath();
        g.arc(mx, my + r * 0.22, r * 0.22, Math.PI + 0.35, Math.PI * 2 - 0.35);
        g.stroke();
        break;
      case 'laugh': {
        const pulse = o.animTime ? Math.sin(o.animTime * 18) * (r * 0.04) : 0;
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(mx - r * 0.28, my - r * 0.05);
        g.quadraticCurveTo(mx, my + r * 0.42 + pulse, mx + r * 0.28, my - r * 0.05);
        g.closePath();
        g.fill();
        break;
      }
      case 'wavy':
        g.strokeStyle = col;
        g.lineWidth = r * 0.085;
        g.beginPath();
        for (let i = 0; i <= 16; i++) {
          const u = i / 16;
          const px = mx - r * 0.24 + u * r * 0.48;
          const py = my + Math.sin(u * Math.PI * 2) * r * 0.06;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.stroke();
        break;
    }
  }

  if (ex.tears) {
    g.fillStyle = '#8fd0ff';
    for (const x of eyeX) {
      g.beginPath();
      g.ellipse(x, ey + r * 0.3, r * 0.05, r * 0.1, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (ex.sweat) {
    g.fillStyle = '#9fd8ff';
    g.beginPath();
    g.ellipse(hx - r * 0.6, hy - r * 0.45, r * 0.08, r * 0.13, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

// ---------- outfits ----------
export interface FigureOutfit {
  top?: 'hoodie' | 'labcoat' | 'trench' | 'jersey' | 'tshirt' | 'suit' | 'dress' | 'tracksuit' | 'none';
  color?: string;
  color2?: string;
  legs?: string | null;
  head?: 'cap' | 'capBack' | 'beanie' | 'fedora' | 'headband' | 'visor' | 'hood' | 'ponytail' | 'bun' | 'curly' | 'spiky' | 'none';
  headColor?: string;
  face?: 'glasses' | 'sunglasses' | null;
  gloves?: string | null;
  number?: string;
  kid?: boolean;
  _ink?: string;
  _sil?: string;
}

export interface DrawFigureOptions {
  x: number;
  y: number;
  s?: number;
  facing?: number;
  pose?: PosePoints;
  rot?: number;
  outfit?: FigureOutfit;
  expr?: string;
  talk?: number;
  blink?: boolean;
  look?: Point2D;
  rim?: false | { dir?: Point2D; color?: string; w?: number };
  dim?: boolean;
  alpha?: number;
  prop?: string | { type: string; hand?: 'F' | 'B'; glow?: string; rot?: number; color?: string };
  shadow?: boolean;
  trail?: { count?: number; dx?: number; dy?: number; a?: number } | null;
  ink?: string;
  inkFar?: string;
  face?: Partial<ExpressionDef>;
  animTime?: number;
}

export function drawFigure(g: CanvasRenderingContext2D, o: DrawFigureOptions): void {
  const st = S();
  const ink = o.ink || st.ink;
  const far = o.inkFar || st.inkFar;
  const p = o.pose || POSES.stand;
  const s = (o.s ?? 1) * (o.outfit?.kid ? 0.72 : 1);
  const f = o.facing ?? 1;
  const of: FigureOutfit = { ...(o.outfit || {}), _ink: ink };
  const rim =
    o.rim === false
      ? null
      : {
          dir: (o.rim?.dir || [-0.8, -0.5]) as Point2D,
          w: o.rim?.w ?? st.rimWidth,
          color: o.rim?.color || '#ffc68a',
        };

  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (o.shadow !== false && !o.rot) {
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.beginPath();
    g.ellipse(o.x, o.y + 2, 34 * s, 6 * s, 0, 0, Math.PI * 2);
    g.fill();
  }

  const tf = (dx = 0, dy = 0) => {
    g.translate(o.x + dx, o.y + dy);
    g.scale(f * s, s);
    if (o.rot) {
      g.translate(p.hip[0], p.hip[1]);
      g.rotate(o.rot);
      g.translate(-p.hip[0], -p.hip[1]);
    }
  };

  // Rim light pass
  if (rim) {
    g.save();
    tf(rim.dir[0] * rim.w, rim.dir[1] * rim.w);
    drawFigureSkeleton(g, o, p, { ...of, _sil: rim.color }, rim.color, rim.color, 'sil', 1.6);
    g.restore();
  }

  // Main pass
  g.save();
  tf();
  drawFigureSkeleton(g, o, p, of, o.dim ? mix(ink, far, 0.6) : ink, far, 'main');
  g.restore();

  g.restore();
}

function drawFigureSkeleton(
  g: CanvasRenderingContext2D,
  o: DrawFigureOptions,
  p: PosePoints,
  of: FigureOutfit,
  ink: string,
  far: string,
  pass: 'main' | 'sil',
  grow = 0
): void {
  const sil = pass === 'sil';
  const L = 12.5 + grow;
  const A = 11 + grow;
  const T = 15 + grow;
  const HR = 26 + grow * 0.6;

  // Far leg + far arm
  seg(g, [p.hip, p.kB, p.fB, [p.fB[0] + 12, p.fB[1]]], L - 1, sil ? ink : of.legs ? shade(of.legs, -0.35) : far);
  seg(g, [p.sh, p.eB, p.hB], A - 1, sil ? ink : far);

  // Torso
  seg(g, [p.sh, p.hip], T, ink);

  // Near leg
  seg(g, [p.hip, p.kF, p.fF, [p.fF[0] + 13, p.fF[1]]], L, sil ? ink : of.legs || ink);

  // Near arm
  seg(g, [p.sh, p.eF, p.hF], A, ink);

  // Head
  circle(g, p.head[0], p.head[1], HR, ink);

  if (sil) return;

  // Face details
  face(g, p.head[0], p.head[1], HR, {
    expr: o.expr,
    talk: o.talk,
    blink: o.blink,
    look: o.look,
    animTime: o.animTime,
    override: o.face,
  });
}
