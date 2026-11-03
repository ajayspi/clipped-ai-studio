// lib/engine/2d-studio/characters.ts
// Comprehensive character catalog across ages, genders, and roles.
// Supports: toddler, children (boys/girls), teens, adults (men/women), and elderly (grandpa/grandma).
// Seamlessly integrates with rig2d.ts and core.ts.

import { shade, circle, seg, poly, rr, ring } from './core';
import { drawFigure, POSES, PosePoints, FigureOutfit, DrawFigureOptions } from './rig2d';

// ============================================================================
// 1. AGE & GENDER PRESET DEFINITIONS
// ============================================================================

export type AgeTier = 'toddler' | 'child' | 'teen' | 'adult' | 'elderly';

export interface CharacterConfig extends FigureOutfit {
  age?: AgeTier;
  gender?: 'male' | 'female' | 'neutral';
  scale?: number;
  headRatio?: number;
  eyelashes?: boolean;
  backpack?: boolean;
  backpackColor?: string;
  cane?: boolean;
  shawl?: boolean;
  wildHair?: boolean;
  mustache?: boolean;
  goggles?: boolean;
  fedora?: boolean;
  tie?: boolean;
  policeCap?: boolean;
  badge?: boolean;
  judgeWig?: boolean;
  eyeMask?: boolean;
  tricorn?: boolean;
  eyepatch?: boolean;
  beard?: boolean;
  knightHelmet?: boolean;
  hardhat?: boolean;
  stethoscope?: boolean;
}

export const CHARACTERS: Record<string, CharacterConfig> = {
  // --- TODDLERS (Age 2-4) ---
  toddler_boy: {
    age: 'toddler',
    gender: 'male',
    scale: 0.48,
    headRatio: 1.25,
    top: 'tshirt',
    color: '#38bdf8',
    legs: '#0284c7',
    head: 'spiky',
    headColor: '#0e0b12',
  },
  toddler_girl: {
    age: 'toddler',
    gender: 'female',
    scale: 0.48,
    headRatio: 1.25,
    top: 'dress',
    color: '#f472b6',
    head: 'bun',
    headColor: '#f472b6',
    eyelashes: true,
  },

  // --- CHILDREN (Age 7-10) ---
  child_boy: {
    age: 'child',
    gender: 'male',
    scale: 0.68,
    top: 'tshirt',
    color: '#fbbf24',
    legs: '#1e293b',
    head: 'cap',
    headColor: '#ef4444',
  },
  child_girl: {
    age: 'child',
    gender: 'female',
    scale: 0.68,
    top: 'dress',
    color: '#a855f7',
    head: 'ponytail',
    headColor: '#ec4899',
    eyelashes: true,
  },
  school_boy: {
    age: 'child',
    gender: 'male',
    scale: 0.7,
    top: 'tshirt',
    color: '#3b82f6',
    legs: '#1e293b',
    head: 'none',
    backpack: true,
  },
  school_girl: {
    age: 'child',
    gender: 'female',
    scale: 0.7,
    top: 'dress',
    color: '#10b981',
    head: 'ponytail',
    headColor: '#10b981',
    eyelashes: true,
    backpack: true,
  },

  // --- TEENS (Age 14-17) ---
  teen_boy: {
    age: 'teen',
    gender: 'male',
    scale: 0.86,
    top: 'hoodie',
    color: '#6366f1',
    legs: '#0f172a',
    head: 'headband',
    headColor: '#818cf8',
  },
  teen_girl: {
    age: 'teen',
    gender: 'female',
    scale: 0.84,
    top: 'hoodie',
    color: '#ec4899',
    legs: '#1e1b4b',
    head: 'ponytail',
    headColor: '#f43f5e',
    eyelashes: true,
  },

  // --- ADULT MEN (Age 25-50) ---
  man_casual: {
    age: 'adult',
    gender: 'male',
    scale: 1.0,
    top: 'tshirt',
    color: '#475569',
    legs: '#1e293b',
    head: 'spiky',
  },
  man_business: {
    age: 'adult',
    gender: 'male',
    scale: 1.0,
    top: 'suit',
    color: '#1e293b',
    color2: '#dc2626',
    legs: '#0f172a',
    head: 'none',
  },
  man_athletic: {
    age: 'adult',
    gender: 'male',
    scale: 1.02,
    top: 'jersey',
    color: '#ef4444',
    color2: '#fff',
    number: '7',
    legs: '#18181b',
    head: 'headband',
    headColor: '#ef4444',
  },
  man_doctor: {
    age: 'adult',
    gender: 'male',
    scale: 1.0,
    top: 'labcoat',
    color: '#ffffff',
    legs: '#334155',
    head: 'none',
    face: 'glasses',
  },
  man_worker: {
    age: 'adult',
    gender: 'male',
    scale: 1.0,
    top: 'tshirt',
    color: '#f59e0b',
    legs: '#1e293b',
    head: 'cap',
    headColor: '#fbbf24',
  },

  // --- ADULT WOMEN (Age 25-50) ---
  woman_casual: {
    age: 'adult',
    gender: 'female',
    scale: 0.96,
    top: 'hoodie',
    color: '#f59e0b',
    legs: '#1e1e24',
    head: 'ponytail',
    headColor: '#f59e0b',
    eyelashes: true,
  },
  woman_dress: {
    age: 'adult',
    gender: 'female',
    scale: 0.96,
    top: 'dress',
    color: '#ef4444',
    head: 'ponytail',
    headColor: '#ef4444',
    eyelashes: true,
  },
  woman_business: {
    age: 'adult',
    gender: 'female',
    scale: 0.96,
    top: 'suit',
    color: '#0f172a',
    color2: '#06b6d4',
    legs: '#0f172a',
    head: 'bun',
    eyelashes: true,
  },
  woman_doctor: {
    age: 'adult',
    gender: 'female',
    scale: 0.96,
    top: 'labcoat',
    color: '#ffffff',
    legs: '#0284c7',
    head: 'ponytail',
    headColor: '#0284c7',
    eyelashes: true,
    face: 'glasses',
  },
  woman_athletic: {
    age: 'adult',
    gender: 'female',
    scale: 0.96,
    top: 'tracksuit',
    color: '#8b5cf6',
    color2: '#ede9fe',
    legs: '#4c1d95',
    head: 'headband',
    headColor: '#c084fc',
    eyelashes: true,
  },

  // --- ELDERLY (Age 65-80) ---
  elderly_man: {
    age: 'elderly',
    gender: 'male',
    scale: 0.92,
    top: 'hoodie',
    color: '#78716c',
    legs: '#44403c',
    head: 'cap',
    headColor: '#57534e',
    face: 'glasses',
    cane: true,
  },
  elderly_woman: {
    age: 'elderly',
    gender: 'female',
    scale: 0.88,
    top: 'dress',
    color: '#5b21b6',
    head: 'bun',
    headColor: '#d8b4fe',
    face: 'glasses',
    eyelashes: true,
    shawl: true,
  },

  // --- SCIENCE & ACTION ---
  scientist_einstein: {
    age: 'elderly',
    gender: 'male',
    scale: 0.95,
    top: 'hoodie',
    color: '#57534e',
    legs: '#292524',
    wildHair: true,
    mustache: true,
  },
  detective_noir: {
    age: 'adult',
    gender: 'male',
    scale: 1.0,
    top: 'trench',
    color: '#334155',
    legs: '#1e293b',
    fedora: true,
    tie: true,
  },
  pirate_captain: {
    age: 'adult',
    gender: 'male',
    scale: 1.02,
    top: 'trench',
    color: '#991b1b',
    legs: '#18181b',
    tricorn: true,
    eyepatch: true,
    beard: true,
  },
  medieval_knight: {
    age: 'adult',
    gender: 'male',
    scale: 1.04,
    top: 'suit',
    color: '#94a3b8',
    color2: '#cbd5e1',
    legs: '#475569',
    knightHelmet: true,
  },
};

// ============================================================================
// 2. SPECIALIZED AGE & ACTION POSES
// ============================================================================

export const AGE_POSES = {
  elderlyStand: {
    head: [8, -192] as [number, number],
    sh: [6, -158] as [number, number],
    hip: [0, -96] as [number, number],
    eF: [26, -130] as [number, number],
    hF: [38, -98] as [number, number],
    eB: [-6, -132] as [number, number],
    hB: [-8, -98] as [number, number],
    kF: [10, -48] as [number, number],
    fF: [6, 0] as [number, number],
    kB: [-4, -48] as [number, number],
    fB: [-10, 0] as [number, number],
  },
  elderlyWalk: (t: number): PosePoints => {
    const sw = Math.sin(t * 3) * 8;
    return {
      head: [10, -190 + Math.abs(sw) * 0.3],
      sh: [8, -156],
      hip: [0, -96],
      eF: [28, -130],
      hF: [40, -98],
      eB: [-4, -130],
      hB: [-6, -98],
      kF: [12 + sw, -48],
      fF: [8 + sw, 0],
      kB: [-4 - sw, -48],
      fB: [-10 - sw, 0],
    };
  },
  childSkip: (t: number): PosePoints => {
    const jump = Math.sin(t * 6) * 12;
    const kick = Math.cos(t * 6) * 16;
    return {
      head: [4, -208 - jump],
      sh: [2, -174 - jump],
      hip: [0, -100 - jump],
      eF: [20 + kick, -140 - jump],
      hF: [35 + kick, -165 - jump],
      eB: [-15 - kick, -140 - jump],
      hB: [-25 - kick, -165 - jump],
      kF: [12 + kick, -50 - jump],
      fF: [8 + kick * 1.5, Math.min(0, -jump)],
      kB: [-8 - kick, -50 - jump],
      fB: [-12 - kick * 1.5, Math.min(0, -jump)],
    };
  },
  toddlerCrawl: {
    head: [35, -70] as [number, number],
    sh: [15, -60] as [number, number],
    hip: [-25, -55] as [number, number],
    eF: [22, -30] as [number, number],
    hF: [24, 0] as [number, number],
    eB: [5, -30] as [number, number],
    hB: [6, 0] as [number, number],
    kF: [-15, -28] as [number, number],
    fF: [-22, 0] as [number, number],
    kB: [-35, -28] as [number, number],
    fB: [-42, 0] as [number, number],
  },
};

// ============================================================================
// 3. MASTER CHARACTER DRAWING WITH ACCESSORY ENGINE
// ============================================================================

export interface DrawCharacterOptions extends Omit<DrawFigureOptions, 'outfit'> {
  char?: string | CharacterConfig;
  age?: 'toddler' | 'child' | 'teen' | 'adult' | 'elderly';
  gender?: 'male' | 'female' | 'neutral';
  cane?: boolean;
  backpack?: boolean;
  backpackColor?: string;
}

export function drawCharacter(g: CanvasRenderingContext2D, o: DrawCharacterOptions = { x: 0, y: 0 }) {
  const cfg: CharacterConfig =
    typeof o.char === 'string' ? CHARACTERS[o.char] || CHARACTERS.man_casual : o.char || CHARACTERS.man_casual;
  const age = o.age || cfg.age || 'adult';
  const gender = o.gender || cfg.gender || 'male';
  const scale = (o.s ?? 1) * (cfg.scale || 1.0);
  const facing = o.facing ?? 1;

  const p = o.pose || (age === 'elderly' ? AGE_POSES.elderlyStand : POSES.stand);

  const rim =
    o.rim !== undefined
      ? o.rim
      : {
          color: gender === 'female' ? '#ffcf8f' : '#94a3b8',
          dir: [facing * 0.8, -0.6] as [number, number],
          w: gender === 'female' ? 4.5 : 3.8,
        };

  // Base stick rig
  drawFigure(g, {
    ...o,
    s: scale,
    facing,
    pose: p,
    outfit: cfg,
    rim,
  });

  // Additional detail overlay in character-local coordinate space
  g.save();
  g.translate(o.x, o.y);
  g.scale(facing * scale, scale);

  const [hx, hy] = p.head;
  const [sx, sy] = p.sh;
  const [hipx, hipy] = p.hip;
  const HR = 26 * (cfg.headRatio || 1.0);

  // A. FEMALE DETAILS: Eyelashes, Hairstyles, and Dress Trim
  if (gender === 'female' || cfg.eyelashes) {
    const eyeX = hx + HR * 0.35;
    const eyeY = hy - HR * 0.15;
    g.lineWidth = 2.0;
    g.strokeStyle = '#f4efe6';
    g.lineCap = 'round';
    seg(g, [[eyeX, eyeY - 4], [eyeX + 5, eyeY - 8]], 1.8, '#f4efe6');
    seg(g, [[eyeX + 3, eyeY - 2], [eyeX + 8, eyeY - 5]], 1.8, '#f4efe6');

    // Flared dress / skirt mesh
    if (cfg.top === 'dress') {
      poly(
        g,
        [
          [hipx - 15, hipy - 4],
          [hipx + 15, hipy - 4],
          [hipx + 34, hipy + 52],
          [hipx - 34, hipy + 52],
        ],
        cfg.color || '#ef4444'
      );
      seg(g, [[hipx - 34, hipy + 52], [hipx + 34, hipy + 52]], 2.5, shade(cfg.color || '#ef4444', 0.4));
    }

    // Ponytail volume & ribbon
    if (cfg.head === 'ponytail') {
      g.lineWidth = 9;
      g.strokeStyle = '#0e0b12';
      g.beginPath();
      g.moveTo(hx - HR * 0.5, hy - HR * 0.4);
      g.quadraticCurveTo(hx - HR * 1.6, hy + HR * 0.1, hx - HR * 1.3, hy + HR * 1.4);
      g.stroke();
      circle(g, hx - HR * 0.6, hy - HR * 0.4, 5, cfg.headColor || '#fbbf24');
    }
  }

  // B. MALE DETAILS: Spiky Hair, Headband Ties, Trousers
  if (gender === 'male' && age !== 'toddler') {
    if (cfg.head === 'spiky') {
      g.fillStyle = '#0e0b12';
      for (let i = 0; i < 4; i++) {
        const ang = -Math.PI * 0.8 + i * 0.35;
        const px = hx + Math.cos(ang) * HR;
        const py = hy + Math.sin(ang) * HR;
        poly(g, [[px - 3.5, py], [px, py - 9], [px + 3.5, py]], '#0e0b12');
      }
    }
    if (cfg.head === 'headband') {
      const hbc = cfg.headColor || '#64748b';
      seg(g, [[hx - HR, hy - 4], [hx - HR - 16, hy + 6]], 3.5, hbc);
      seg(g, [[hx - HR, hy - 2], [hx - HR - 12, hy + 14]], 3, hbc);
    }
    if (cfg.legs) {
      seg(g, [p.hip, p.kB, p.fB], 13, cfg.legs);
      seg(g, [p.hip, p.kF, p.fF], 14, cfg.legs);
    }
  }

  // C. GENRE ACCESSORIES
  // 1. Fedora (Detective Noir)
  if (cfg.fedora) {
    seg(g, [[hx - HR * 1.5, hy - HR * 0.6], [hx + HR * 1.4, hy - HR * 0.6]], 5, '#1e293b');
    rr(g, hx - HR * 0.75, hy - HR * 1.35, HR * 1.5, HR * 0.8, 4);
    g.fillStyle = '#334155';
    g.fill();
    rr(g, hx - HR * 0.75, hy - HR * 0.8, HR * 1.5, HR * 0.22, 1);
    g.fillStyle = '#0f172a';
    g.fill();
  }

  // 2. Knight Helmet
  if (cfg.knightHelmet) {
    rr(g, hx - HR * 1.1, hy - HR * 1.1, HR * 2.2, HR * 2.2, 10);
    g.fillStyle = '#94a3b8';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#475569';
    g.stroke();
    seg(g, [[hx - HR * 0.2, hy - HR * 0.1], [hx + HR * 0.8, hy - HR * 0.1]], 3, '#0f172a');
  }

  // 3. Eyepatch
  if (cfg.eyepatch) {
    circle(g, hx + HR * 0.35, hy - HR * 0.1, 4.5, '#000000');
    seg(g, [[hx - HR * 0.8, hy - HR * 0.4], [hx + HR * 0.8, hy]], 1.5, '#000000');
  }

  // 4. Wild Einstein Hair & Mustache
  if (cfg.wildHair) {
    g.fillStyle = '#e2e8f0';
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI * 0.9 + k * 0.3;
      circle(g, hx + Math.cos(a) * (HR + 6), hy + Math.sin(a) * (HR + 6), 9, '#e2e8f0');
    }
  }
  if (cfg.mustache) {
    seg(g, [[hx + HR * 0.15, hy + HR * 0.25], [hx + HR * 0.55, hy + HR * 0.25]], 3.5, '#e2e8f0');
  }

  // 5. Beard
  if (cfg.beard) {
    poly(
      g,
      [
        [hx + HR * 0.2, hy + HR * 0.3],
        [hx + HR * 0.5, hy + HR * 0.85],
        [hx - HR * 0.2, hy + HR * 0.85],
        [hx - HR * 0.5, hy + HR * 0.3],
      ],
      '#334155'
    );
  }

  // 6. Tie
  if (cfg.tie) {
    poly(
      g,
      [
        [sx - 2, sy],
        [sx + 2, sy],
        [sx + 4, sy + 32],
        [sx, sy + 38],
        [sx - 4, sy + 32],
      ],
      '#dc2626'
    );
  }

  // D. ELDERLY DETAILS: Cane & Shawl
  if (age === 'elderly') {
    const glassX = hx + HR * 0.3;
    const glassY = hy - HR * 0.12;
    ring(g, glassX, glassY, 6, 1.8, '#cbd5e1');
    seg(g, [[glassX - 6, glassY], [glassX - 14, glassY - 2]], 1.5, '#cbd5e1');

    if (cfg.cane || o.cane) {
      const handX = p.hF[0];
      const handY = p.hF[1];
      seg(g, [[handX + 4, handY - 14], [handX + 6, 0]], 5, '#78350f');
      g.lineWidth = 5;
      g.strokeStyle = '#92400e';
      g.beginPath();
      g.arc(handX + 10, handY - 14, 8, Math.PI, 0, false);
      g.stroke();
    }

    if (cfg.shawl) {
      poly(
        g,
        [
          [sx - 18, sy - 8],
          [sx + 18, sy - 8],
          [sx + 24, sy + 38],
          [sx - 24, sy + 38],
        ],
        '#c4b5fd'
      );
      for (let i = -20; i <= 20; i += 5) {
        seg(g, [[sx + i, sy + 38], [sx + i, sy + 44]], 1.5, '#ede9fe');
      }
    }
  }

  // E. BACKPACK (for School Kids / Explorer)
  if (cfg.backpack || o.backpack) {
    rr(g, sx - 24, sy + 2, 16, 26, 4);
    g.fillStyle = o.backpackColor || cfg.backpackColor || '#ef4444';
    g.fill();
    seg(g, [[sx - 8, sy + 4], [sx + 6, sy + 18]], 2.5, '#991b1b');
  }

  g.restore();
}
