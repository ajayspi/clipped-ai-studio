/**
 * Open Props Design Tokens & Easing Curves Integration for Clipped
 *
 * Standardized cubic-bezier curves and tokens derived from Adam Argyle's Open Props:
 * - Standard: ease-1..5
 * - In/Out/InOut: ease-in-1..5, ease-out-1..5, ease-in-out-1..5
 * - Physical & Expressive: ease-elastic-1..5 (bounce/overshoot), ease-squish-1..5 (anticipation)
 * - Steps: ease-step-1..3
 *
 * Includes analytical/Newton-Raphson cubic-bezier solver for Remotion frame-by-frame interpolation.
 */

import type { BrandDesignTokens } from './types';

export type OpenPropsEasingKey =
  | 'ease-1'
  | 'ease-2'
  | 'ease-3'
  | 'ease-4'
  | 'ease-5'
  | 'ease-in-1'
  | 'ease-in-2'
  | 'ease-in-3'
  | 'ease-in-4'
  | 'ease-in-5'
  | 'ease-out-1'
  | 'ease-out-2'
  | 'ease-out-3'
  | 'ease-out-4'
  | 'ease-out-5'
  | 'ease-in-out-1'
  | 'ease-in-out-2'
  | 'ease-in-out-3'
  | 'ease-in-out-4'
  | 'ease-in-out-5'
  | 'ease-elastic-1'
  | 'ease-elastic-2'
  | 'ease-elastic-3'
  | 'ease-elastic-4'
  | 'ease-elastic-5'
  | 'ease-squish-1'
  | 'ease-squish-2'
  | 'ease-squish-3'
  | 'ease-squish-4'
  | 'ease-squish-5'
  | 'ease-step-1'
  | 'ease-step-2'
  | 'ease-step-3';

export interface OpenPropsEasingDef {
  key: OpenPropsEasingKey;
  name: string;
  category: 'standard' | 'in' | 'out' | 'in-out' | 'elastic' | 'squish' | 'step';
  cssValue: string;
  points?: [number, number, number, number]; // [p1x, p1y, p2x, p2y]
  steps?: number;
}

export const OPEN_PROPS_EASINGS: Record<OpenPropsEasingKey, OpenPropsEasingDef> = {
  // Standard
  'ease-1': { key: 'ease-1', name: 'Ease 1 (Subtle)', category: 'standard', cssValue: 'cubic-bezier(.25, 0, .5, 1)', points: [0.25, 0, 0.5, 1] },
  'ease-2': { key: 'ease-2', name: 'Ease 2 (Gentle)', category: 'standard', cssValue: 'cubic-bezier(.25, 0, .4, 1)', points: [0.25, 0, 0.4, 1] },
  'ease-3': { key: 'ease-3', name: 'Ease 3 (Default Smooth)', category: 'standard', cssValue: 'cubic-bezier(.25, 0, .3, 1)', points: [0.25, 0, 0.3, 1] },
  'ease-4': { key: 'ease-4', name: 'Ease 4 (Dynamic)', category: 'standard', cssValue: 'cubic-bezier(.25, 0, .2, 1)', points: [0.25, 0, 0.2, 1] },
  'ease-5': { key: 'ease-5', name: 'Ease 5 (Aggressive)', category: 'standard', cssValue: 'cubic-bezier(.25, 0, .1, 1)', points: [0.25, 0, 0.1, 1] },

  // Ease Out
  'ease-out-1': { key: 'ease-out-1', name: 'Ease Out 1', category: 'out', cssValue: 'cubic-bezier(0, 0, .75, 1)', points: [0, 0, 0.75, 1] },
  'ease-out-2': { key: 'ease-out-2', name: 'Ease Out 2', category: 'out', cssValue: 'cubic-bezier(0, 0, .50, 1)', points: [0, 0, 0.5, 1] },
  'ease-out-3': { key: 'ease-out-3', name: 'Ease Out 3 (Decel)', category: 'out', cssValue: 'cubic-bezier(0, 0, .30, 1)', points: [0, 0, 0.3, 1] },
  'ease-out-4': { key: 'ease-out-4', name: 'Ease Out 4', category: 'out', cssValue: 'cubic-bezier(0, 0, .10, 1)', points: [0, 0, 0.1, 1] },
  'ease-out-5': { key: 'ease-out-5', name: 'Ease Out 5 (Snap)', category: 'out', cssValue: 'cubic-bezier(0, 0, 0, 1)', points: [0, 0, 0, 1] },

  // Ease In
  'ease-in-1': { key: 'ease-in-1', name: 'Ease In 1', category: 'in', cssValue: 'cubic-bezier(.25, 0, 1, 1)', points: [0.25, 0, 1, 1] },
  'ease-in-2': { key: 'ease-in-2', name: 'Ease In 2', category: 'in', cssValue: 'cubic-bezier(.50, 0, 1, 1)', points: [0.5, 0, 1, 1] },
  'ease-in-3': { key: 'ease-in-3', name: 'Ease In 3', category: 'in', cssValue: 'cubic-bezier(.70, 0, 1, 1)', points: [0.7, 0, 1, 1] },
  'ease-in-4': { key: 'ease-in-4', name: 'Ease In 4', category: 'in', cssValue: 'cubic-bezier(.90, 0, 1, 1)', points: [0.9, 0, 1, 1] },
  'ease-in-5': { key: 'ease-in-5', name: 'Ease In 5 (Launch)', category: 'in', cssValue: 'cubic-bezier(1, 0, 1, 1)', points: [1, 0, 1, 1] },

  // Ease In-Out
  'ease-in-out-1': { key: 'ease-in-out-1', name: 'Ease In-Out 1', category: 'in-out', cssValue: 'cubic-bezier(.1, 0, .9, 1)', points: [0.1, 0, 0.9, 1] },
  'ease-in-out-2': { key: 'ease-in-out-2', name: 'Ease In-Out 2', category: 'in-out', cssValue: 'cubic-bezier(.3, 0, .7, 1)', points: [0.3, 0, 0.7, 1] },
  'ease-in-out-3': { key: 'ease-in-out-3', name: 'Ease In-Out 3 (Balanced)', category: 'in-out', cssValue: 'cubic-bezier(.5, 0, .5, 1)', points: [0.5, 0, 0.5, 1] },
  'ease-in-out-4': { key: 'ease-in-out-4', name: 'Ease In-Out 4', category: 'in-out', cssValue: 'cubic-bezier(.7, 0, .3, 1)', points: [0.7, 0, 0.3, 1] },
  'ease-in-out-5': { key: 'ease-in-out-5', name: 'Ease In-Out 5', category: 'in-out', cssValue: 'cubic-bezier(.9, 0, .1, 1)', points: [0.9, 0, 0.1, 1] },

  // Elastic (Overshoot bounce)
  'ease-elastic-1': { key: 'ease-elastic-1', name: 'Elastic 1 (Gentle Bounce)', category: 'elastic', cssValue: 'cubic-bezier(.5, .75, .75, 1.25)', points: [0.5, 0.75, 0.75, 1.25] },
  'ease-elastic-2': { key: 'ease-elastic-2', name: 'Elastic 2 (Medium Bounce)', category: 'elastic', cssValue: 'cubic-bezier(.5, 1, .75, 1.25)', points: [0.5, 1.0, 0.75, 1.25] },
  'ease-elastic-3': { key: 'ease-elastic-3', name: 'Elastic 3 (Viral Pop)', category: 'elastic', cssValue: 'cubic-bezier(.5, 1.25, .75, 1.25)', points: [0.5, 1.25, 0.75, 1.25] },
  'ease-elastic-4': { key: 'ease-elastic-4', name: 'Elastic 4 (High Bounce)', category: 'elastic', cssValue: 'cubic-bezier(.5, 1.5, .75, 1.25)', points: [0.5, 1.5, 0.75, 1.25] },
  'ease-elastic-5': { key: 'ease-elastic-5', name: 'Elastic 5 (Extreme Overshoot)', category: 'elastic', cssValue: 'cubic-bezier(.5, 1.75, .75, 1.25)', points: [0.5, 1.75, 0.75, 1.25] },

  // Squish (Anticipation / Punch)
  'ease-squish-1': { key: 'ease-squish-1', name: 'Squish 1 (Light Punch)', category: 'squish', cssValue: 'cubic-bezier(.5, -.1, .1, 1.5)', points: [0.5, -0.1, 0.1, 1.5] },
  'ease-squish-2': { key: 'ease-squish-2', name: 'Squish 2 (Hormozi Punch)', category: 'squish', cssValue: 'cubic-bezier(.5, -.3, .1, 1.5)', points: [0.5, -0.3, 0.1, 1.5] },
  'ease-squish-3': { key: 'ease-squish-3', name: 'Squish 3 (Deep Anticipation)', category: 'squish', cssValue: 'cubic-bezier(.5, -.5, .1, 1.5)', points: [0.5, -0.5, 0.1, 1.5] },
  'ease-squish-4': { key: 'ease-squish-4', name: 'Squish 4', category: 'squish', cssValue: 'cubic-bezier(.5, -.7, .1, 1.5)', points: [0.5, -0.7, 0.1, 1.5] },
  'ease-squish-5': { key: 'ease-squish-5', name: 'Squish 5 (Cartoony Snap)', category: 'squish', cssValue: 'cubic-bezier(.5, -.9, .1, 1.5)', points: [0.5, -0.9, 0.1, 1.5] },

  // Step
  'ease-step-1': { key: 'ease-step-1', name: 'Step 1 (2 Steps)', category: 'step', cssValue: 'steps(2)', steps: 2 },
  'ease-step-2': { key: 'ease-step-2', name: 'Step 2 (4 Steps)', category: 'step', cssValue: 'steps(4)', steps: 4 },
  'ease-step-3': { key: 'ease-step-3', name: 'Step 3 (7 Steps)', category: 'step', cssValue: 'steps(7)', steps: 7 },
};

/**
 * Analytical Cubic-Bezier Evaluator for Unit Interval [0, 1]
 * Uses Newton-Raphson iteration with binary subdivision fallback.
 */
export function solveCubicBezier(p1x: number, p1y: number, p2x: number, p2y: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Bezier curve coordinate evaluation for parameter t
  function sampleX(t: number): number {
    return ((1 - 3 * p2x + 3 * p1x) * t + (3 * p2x - 6 * p1x)) * t * t + 3 * p1x * t;
  }
  function sampleY(t: number): number {
    return ((1 - 3 * p2y + 3 * p1y) * t + (3 * p2y - 6 * p1y)) * t * t + 3 * p1y * t;
  }
  function sampleDerivX(t: number): number {
    return (3 * (1 - 3 * p2x + 3 * p1x) * t + 2 * (3 * p2x - 6 * p1x)) * t + 3 * p1x;
  }

  // Newton-Raphson iteration to find t such that sampleX(t) == x
  let t = x;
  for (let i = 0; i < 8; i++) {
    const currentX = sampleX(t) - x;
    if (Math.abs(currentX) < 1e-6) return sampleY(t);
    const dX = sampleDerivX(t);
    if (Math.abs(dX) < 1e-6) break;
    t -= currentX / dX;
  }

  // Binary subdivision fallback (capped at 20 iterations to prevent thread lockup)
  let t0 = 0.0;
  let t1 = 1.0;
  t = x;
  let iter = 0;
  while (t0 < t1 && ++iter < 20) {
    const currentX = sampleX(t);
    if (Math.abs(currentX - x) < 1e-6) return sampleY(t);
    if (x > currentX) t0 = t;
    else t1 = t;
    t = (t1 + t0) / 2.0;
  }

  return sampleY(t);
}

/**
 * Sample easing curve for a given progress ratio [0, 1]
 */
export function sampleEasing(easingKeyOrCurve: string | undefined, progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  if (!easingKeyOrCurve) return p;

  // Check if known Open Props key
  const def = OPEN_PROPS_EASINGS[easingKeyOrCurve as OpenPropsEasingKey];
  if (def) {
    if (def.steps) {
      return Math.floor(p * def.steps) / def.steps;
    }
    if (def.points) {
      return solveCubicBezier(def.points[0], def.points[1], def.points[2], def.points[3], p);
    }
  }

  // Check if custom cubic-bezier string: "cubic-bezier(p1x, p1y, p2x, p2y)"
  const cbMatch = easingKeyOrCurve.match(/cubic-bezier\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i);
  if (cbMatch) {
    const p1x = parseFloat(cbMatch[1]);
    const p1y = parseFloat(cbMatch[2]);
    const p2x = parseFloat(cbMatch[3]);
    const p2y = parseFloat(cbMatch[4]);
    return solveCubicBezier(p1x, p1y, p2x, p2y, p);
  }

  // Step string fallback
  const stepMatch = easingKeyOrCurve.match(/steps\s*\(\s*(\d+)\s*\)/i);
  if (stepMatch) {
    const steps = parseInt(stepMatch[1], 10);
    return Math.floor(p * steps) / steps;
  }

  // Standard CSS fallbacks
  if (easingKeyOrCurve === 'linear') return p;
  if (easingKeyOrCurve === 'ease') return solveCubicBezier(0.25, 0.1, 0.25, 1.0, p);
  if (easingKeyOrCurve === 'ease-in') return solveCubicBezier(0.42, 0.0, 1.0, 1.0, p);
  if (easingKeyOrCurve === 'ease-out') return solveCubicBezier(0.0, 0.0, 0.58, 1.0, p);
  if (easingKeyOrCurve === 'ease-in-out') return solveCubicBezier(0.42, 0.0, 0.58, 1.0, p);

  return p;
}

export interface BrandPresetDefinition {
  id: string;
  name: string;
  subtitlePreset: string;
  description: string;
  badge: string;
  tokens: BrandDesignTokens;
}

export const BRAND_TOKEN_PRESETS: Record<string, BrandPresetDefinition> = {
  'cyber-neon': {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    subtitlePreset: 'Cyber Neon',
    description: 'High-voltage electric cyan & rose neon with elastic bouncy punch.',
    badge: 'Trending Sci-Fi',
    tokens: {
      typography: {
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 28,
        fontWeight: '900',
        textTransform: 'uppercase',
      },
      colors: {
        primary: '#38bdf8',
        accent: '#f43f5e',
        background: 'rgba(15, 23, 42, 0.85)',
        outlineColor: '#0284c7',
        shadow: '0 0 20px rgba(56, 189, 248, 0.6)',
      },
      geometry: {
        aspectRatio: '9:16',
      },
      motion: {
        easing: 'ease-elastic-3',
        easingCurve: 'cubic-bezier(.5, 1.25, .75, 1.25)',
        durationScale: 0.9,
        zoomPanEasing: 'ease-out-3',
      },
    },
  },
  'hormozi-viral': {
    id: 'hormozi-viral',
    name: 'Hormozi Viral',
    subtitlePreset: 'Hormozi Pop',
    description: 'High-retention bold yellow & green with punchy squish anticipation.',
    badge: 'Top Viral #1',
    tokens: {
      typography: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 32,
        fontWeight: '900',
        textTransform: 'uppercase',
      },
      colors: {
        primary: '#facc15',
        accent: '#22c55e',
        background: 'rgba(0, 0, 0, 0.85)',
        outlineColor: '#000000',
        shadow: '3px 3px 0px #000000',
      },
      geometry: {
        aspectRatio: '9:16',
      },
      motion: {
        easing: 'ease-squish-2',
        easingCurve: 'cubic-bezier(.5, -.3, .1, 1.5)',
        durationScale: 0.8,
        zoomPanEasing: 'ease-squish-1',
      },
    },
  },
  'cinematic-drama': {
    id: 'cinematic-drama',
    name: 'Cinematic Drama',
    subtitlePreset: 'Cinematic Boxed',
    description: 'Refined warm gold & soft serif elegance with smooth cinematic deceleration.',
    badge: 'Narrative & Docu',
    tokens: {
      typography: {
        fontFamily: 'Cinzel, Georgia, serif',
        fontSize: 24,
        fontWeight: '700',
        textTransform: 'capitalize',
      },
      colors: {
        primary: '#f8fafc',
        accent: '#f59e0b',
        background: 'rgba(0, 0, 0, 0.65)',
        outlineColor: '#18181b',
        shadow: '0 4px 14px rgba(0, 0, 0, 0.7)',
      },
      geometry: {
        aspectRatio: '16:9',
      },
      motion: {
        easing: 'ease-3',
        easingCurve: 'cubic-bezier(.25, 0, .3, 1)',
        durationScale: 1.2,
        zoomPanEasing: 'ease-in-out-3',
      },
    },
  },
  'minimalist-studio': {
    id: 'minimalist-studio',
    name: 'Minimalist Clean',
    subtitlePreset: 'Minimalist Clean',
    description: 'Crisp Swiss-style sans-serif typography with smooth modern ease-out.',
    badge: 'Corporate & Tech',
    tokens: {
      typography: {
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontSize: 22,
        fontWeight: '600',
        textTransform: 'none',
      },
      colors: {
        primary: '#ffffff',
        accent: '#6366f1',
        background: 'rgba(24, 24, 27, 0.75)',
        outlineColor: '#09090b',
        shadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
      },
      geometry: {
        aspectRatio: '9:16',
      },
      motion: {
        easing: 'ease-out-3',
        easingCurve: 'cubic-bezier(0, 0, .30, 1)',
        durationScale: 1.0,
        zoomPanEasing: 'ease-out-2',
      },
    },
  },
  'retro-arcade': {
    id: 'retro-arcade',
    name: 'Retro Synthwave',
    subtitlePreset: 'Retro Karaoke',
    description: '80s synthwave pink & cyan glowing retro aesthetic with stepped punch.',
    badge: 'Gaming & 80s',
    tokens: {
      typography: {
        fontFamily: 'Courier New, monospace',
        fontSize: 26,
        fontWeight: '800',
        textTransform: 'uppercase',
      },
      colors: {
        primary: '#ff71ce',
        accent: '#01cdfe',
        background: 'rgba(10, 5, 25, 0.90)',
        outlineColor: '#050514',
        shadow: '0 0 16px rgba(255, 113, 206, 0.7)',
      },
      geometry: {
        aspectRatio: '9:16',
      },
      motion: {
        easing: 'ease-elastic-2',
        easingCurve: 'cubic-bezier(.5, 1, .75, 1.25)',
        durationScale: 0.9,
        zoomPanEasing: 'ease-elastic-1',
      },
    },
  },
};

export function getBrandTokenPreset(id: string): BrandDesignTokens {
  const found = BRAND_TOKEN_PRESETS[id];
  if (found) return found.tokens;
  for (const p of Object.values(BRAND_TOKEN_PRESETS)) {
    if (p.subtitlePreset.toLowerCase() === id.toLowerCase() || p.name.toLowerCase() === id.toLowerCase()) {
      return p.tokens;
    }
  }
  return BRAND_TOKEN_PRESETS['minimalist-studio'].tokens;
}

export function listBrandTokenPresets(): BrandPresetDefinition[] {
  return Object.values(BRAND_TOKEN_PRESETS);
}
