/**
 * Vox-Style Papercraft Visual Engine & Computational 3D Origami Folding
 * 
 * Inspired by Alisa0808/vox-director and computational origami fold mechanics.
 * Provides $0-compute, pure CSS/SVG stop-motion paper aesthetics, torn edges,
 * masking tape/paperclip fasteners, 12 FPS posterization jitter, and 3D origami transitions.
 */

import React from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type PaperStyleId = 'vintage_newsprint' | 'brown_kraft' | 'parchment_dossier' | 'clean_cutout';

export interface PaperStyleConfig {
  id: PaperStyleId;
  name: string;
  description: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  dropShadow: string;
  texturePattern: 'newsprint' | 'fibrous' | 'dossier_grid' | 'clean';
}

export type OrigamiFoldType = 
  | 'accordion_h' 
  | 'accordion_v' 
  | 'diagonal_fold' 
  | 'envelope_reveal' 
  | 'pop_up_book';

export type FastenerType = 
  | 'masking_tape' 
  | 'washi_tape' 
  | 'paperclip' 
  | 'pushpin';

export interface StopMotionJitter {
  rotateDeg: number;
  translateX: number;
  translateY: number;
}

export interface OrigamiFoldTransform {
  leftTransform: string;
  rightTransform: string;
  leftOpacity: number;
  rightOpacity: number;
  shadingOpacity: number; // 0 (flat light) to 0.6 (deep crease shadow)
}

// ============================================================================
// Style Presets
// ============================================================================

export const PAPERCRAFT_STYLE_PRESETS: Record<PaperStyleId, PaperStyleConfig> = {
  vintage_newsprint: {
    id: 'vintage_newsprint',
    name: 'Vintage Newsprint',
    description: 'Aged newsprint paper with ink-press typography, fibrous grain, and subtle sepia hue.',
    backgroundColor: '#efe9dc',
    cardColor: '#f7f3e8',
    textColor: '#1a1917',
    accentColor: '#c2410c',
    borderColor: '#d5cdb8',
    dropShadow: '2px 8px 18px rgba(35, 28, 16, 0.22)',
    texturePattern: 'newsprint',
  },
  brown_kraft: {
    id: 'brown_kraft',
    name: 'Recycled Kraft Paper',
    description: 'Warm cardboard package texture with raw fibrous cutouts and thick physical depth.',
    backgroundColor: '#c49a6c',
    cardColor: '#dfbe93',
    textColor: '#291807',
    accentColor: '#b91c1c',
    borderColor: '#a37b4f',
    dropShadow: '3px 10px 22px rgba(41, 24, 7, 0.35)',
    texturePattern: 'fibrous',
  },
  parchment_dossier: {
    id: 'parchment_dossier',
    name: 'Classified Dossier',
    description: 'Investigative journal with stamped labels, red pins, and highlighter ink.',
    backgroundColor: '#e2ddd2',
    cardColor: '#faf7ef',
    textColor: '#111827',
    accentColor: '#dc2626',
    borderColor: '#c7beaf',
    dropShadow: '0 12px 24px rgba(17, 24, 39, 0.25)',
    texturePattern: 'dossier_grid',
  },
  clean_cutout: {
    id: 'clean_cutout',
    name: 'Modern Vox Cutout',
    description: 'Crisp white cardstock collage with bold colored washi tape and vibrant accents.',
    backgroundColor: '#18181b',
    cardColor: '#ffffff',
    textColor: '#09090b',
    accentColor: '#f59e0b',
    borderColor: '#e4e4e7',
    dropShadow: '0 14px 28px rgba(0, 0, 0, 0.4)',
    texturePattern: 'clean',
  },
};

export const ORIGAMI_FOLD_PRESETS: Record<OrigamiFoldType, { name: string; description: string; durationFrames: number }> = {
  accordion_h: {
    name: 'Horizontal Accordion Fold',
    description: 'Two-panel brochure fold collapsing inward along a vertical center crease.',
    durationFrames: 16,
  },
  accordion_v: {
    name: 'Vertical Letter Fold',
    description: 'Top and bottom panels folding down like an architectural blueprint.',
    durationFrames: 16,
  },
  diagonal_fold: {
    name: 'Diagonal Origami Crease',
    description: 'Dynamic 45-degree angle fold pivoting across the corner diagonal.',
    durationFrames: 14,
  },
  envelope_reveal: {
    name: 'Document Envelope Unseal',
    description: 'Triangular flap folds 180 degrees backward to reveal secret contents.',
    durationFrames: 18,
  },
  pop_up_book: {
    name: 'Pop-Up Book Hinge',
    description: 'Flat illustrations hinge upright 90 degrees out of the page towards the camera.',
    durationFrames: 15,
  },
};

// ============================================================================
// Deterministic 12 FPS Stop-Motion Jitter
// ============================================================================

/**
 * Simulates traditional 12 FPS stop-motion tactile paper movement.
 * In 24/30/60 FPS timelines, updates only happen every 2-3 frames,
 * yielding that authentic, jittery handmade cut-out feel.
 */
export function computeStopMotionJitter(
  frame: number,
  fps: number = 30,
  intensity: number = 1.0
): StopMotionJitter {
  // Quantize timeline into 12 FPS steps
  const stepInterval = Math.max(1, Math.round(fps / 12));
  const step = Math.floor(frame / stepInterval);

  // Deterministic pseudo-random offsets based on integer step seed
  const rotSeed = Math.sin(step * 12.9898) * 43758.5453;
  const xSeed = Math.sin(step * 78.233) * 43758.5453;
  const ySeed = Math.sin(step * 45.164) * 43758.5453;

  const rotFraction = (rotSeed - Math.floor(rotSeed)) * 2 - 1; // -1 to +1
  const xFraction = (xSeed - Math.floor(xSeed)) * 2 - 1;
  const yFraction = (ySeed - Math.floor(ySeed)) * 2 - 1;

  const maxRotate = 1.25 * intensity; // degrees
  const maxTranslate = 2.5 * intensity; // pixels

  return {
    rotateDeg: Number((rotFraction * maxRotate).toFixed(2)),
    translateX: Number((xFraction * maxTranslate).toFixed(2)),
    translateY: Number((yFraction * maxTranslate).toFixed(2)),
  };
}

// ============================================================================
// Computational 3D Origami Folding Transform Engine
// ============================================================================

/**
 * Calculates pure CSS 3D origami transforms with shading falloff.
 * 
 * @param foldType - accordion_h, accordion_v, diagonal_fold, envelope_reveal, pop_up_book
 * @param progress - 0.0 (fully folded/hidden) to 1.0 (fully flat/unfolded open)
 * @param direction - 'enter' (unfolding into view) or 'exit' (folding away)
 */
export function calculateOrigamiFoldTransform(
  foldType: OrigamiFoldType,
  progress: number,
  direction: 'enter' | 'exit' = 'enter'
): OrigamiFoldTransform {
  // Clamp progress between 0 and 1
  const p = Math.max(0, Math.min(1, progress));
  const openAmount = direction === 'enter' ? p : 1 - p;

  switch (foldType) {
    case 'accordion_h': {
      // Panels fold from 90 deg inward to 0 deg flat
      const foldAngle = (1 - openAmount) * 90;
      const leftTransform = `perspective(1200px) rotateY(${foldAngle}deg)`;
      const rightTransform = `perspective(1200px) rotateY(${-foldAngle}deg)`;
      const shadingOpacity = Number(((1 - openAmount) * 0.45).toFixed(3));

      return {
        leftTransform,
        rightTransform,
        leftOpacity: Math.max(0.1, openAmount),
        rightOpacity: Math.max(0.1, openAmount),
        shadingOpacity,
      };
    }

    case 'accordion_v': {
      // Top and bottom panels fold from 90 deg along X axis
      const foldAngle = (1 - openAmount) * 90;
      const leftTransform = `perspective(1200px) rotateX(${-foldAngle}deg)`;
      const rightTransform = `perspective(1200px) rotateX(${foldAngle}deg)`;
      const shadingOpacity = Number(((1 - openAmount) * 0.5).toFixed(3));

      return {
        leftTransform,
        rightTransform,
        leftOpacity: Math.max(0.1, openAmount),
        rightOpacity: Math.max(0.1, openAmount),
        shadingOpacity,
      };
    }

    case 'diagonal_fold': {
      // 45-degree angle rotation axis (1, 1, 0)
      const foldAngle = (1 - openAmount) * 110;
      const transform = `perspective(1200px) rotate3d(1, 1, 0, ${foldAngle}deg)`;
      const shadingOpacity = Number(((1 - openAmount) * 0.4).toFixed(3));

      return {
        leftTransform: transform,
        rightTransform: transform,
        leftOpacity: Math.max(0.1, openAmount),
        rightOpacity: Math.max(0.1, openAmount),
        shadingOpacity,
      };
    }

    case 'envelope_reveal': {
      // Top flap opens from 0 (closed) to 180 deg (fully flipped back)
      const flapAngle = openAmount * 180;
      const flapTransform = `perspective(1000px) rotateX(${flapAngle}deg)`;
      const bodyTransform = `translateY(${(1 - openAmount) * 20}px)`;
      const shadingOpacity = Number(((1 - openAmount) * 0.35).toFixed(3));

      return {
        leftTransform: flapTransform,
        rightTransform: bodyTransform,
        leftOpacity: 1,
        rightOpacity: openAmount,
        shadingOpacity,
      };
    }

    case 'pop_up_book': {
      // Element stands up from -90deg flat on the page to 0deg vertical
      const standAngle = (1 - openAmount) * -90;
      const scale = 0.8 + 0.2 * openAmount;
      const transform = `perspective(1200px) rotateX(${standAngle}deg) scale(${scale})`;
      const shadingOpacity = Number(((1 - openAmount) * 0.55).toFixed(3));

      return {
        leftTransform: transform,
        rightTransform: transform,
        leftOpacity: Math.max(0.05, openAmount),
        rightOpacity: Math.max(0.05, openAmount),
        shadingOpacity,
      };
    }
  }
}

// ============================================================================
// Procedural Torn Paper Path Generator
// ============================================================================

/**
 * Generates an SVG path for realistic torn / ripped paper edges.
 * Uses deterministic trigonometric wave synthesis to create ragged fibrous fringes.
 */
export function generateTornEdgePath(
  width: number,
  height: number,
  edgeRoughness: number = 3.5,
  seed: number = 42
): string {
  const points: [number, number][] = [];
  const segmentsX = Math.max(8, Math.floor(width / 16));
  const segmentsY = Math.max(6, Math.floor(height / 16));

  // Top edge (left to right)
  for (let i = 0; i <= segmentsX; i++) {
    const x = (i / segmentsX) * width;
    const wave = Math.sin(i * 1.7 + seed) * edgeRoughness * 0.7 + Math.cos(i * 3.1 + seed * 2) * edgeRoughness * 0.3;
    points.push([x, Math.max(0, wave)]);
  }

  // Right edge (top to bottom)
  for (let i = 0; i <= segmentsY; i++) {
    const y = (i / segmentsY) * height;
    const wave = Math.cos(i * 2.3 + seed * 1.5) * edgeRoughness * 0.7 + Math.sin(i * 4.2 + seed) * edgeRoughness * 0.3;
    points.push([width + wave, y]);
  }

  // Bottom edge (right to left)
  for (let i = segmentsX; i >= 0; i--) {
    const x = (i / segmentsX) * width;
    const wave = Math.sin(i * 2.1 + seed * 3) * edgeRoughness * 0.7 + Math.cos(i * 3.7 + seed) * edgeRoughness * 0.3;
    points.push([x, height + wave]);
  }

  // Left edge (bottom to top)
  for (let i = segmentsY; i >= 0; i--) {
    const y = (i / segmentsY) * height;
    const wave = Math.cos(i * 1.9 + seed * 2.2) * edgeRoughness * 0.7 + Math.sin(i * 3.3 + seed) * edgeRoughness * 0.3;
    points.push([Math.max(0, wave), y]);
  }

  return points.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
}

// ============================================================================
// React Visual Fastener Components
// ============================================================================

export interface PaperFastenerProps {
  type: FastenerType;
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right';
  className?: string;
  tiltDeg?: number;
}

export const PaperFastener: React.FC<PaperFastenerProps> = ({
  type,
  position = 'top-left',
  className = '',
  tiltDeg,
}) => {
  const getPositionStyles = (): React.CSSProperties => {
    switch (position) {
      case 'top-left':
        return { top: '-10px', left: '-12px', transform: `rotate(${tiltDeg ?? -12}deg)` };
      case 'top-right':
        return { top: '-10px', right: '-12px', transform: `rotate(${tiltDeg ?? 14}deg)` };
      case 'top-center':
        return { top: '-12px', left: '50%', transform: `translateX(-50%) rotate(${tiltDeg ?? -2}deg)` };
      case 'bottom-left':
        return { bottom: '-10px', left: '-10px', transform: `rotate(${tiltDeg ?? 8}deg)` };
      case 'bottom-right':
        return { bottom: '-10px', right: '-10px', transform: `rotate(${tiltDeg ?? -10}deg)` };
    }
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    zIndex: 20,
    pointerEvents: 'none',
    ...getPositionStyles(),
  };

  switch (type) {
    case 'masking_tape':
      return (
        <div
          style={{
            ...style,
            width: '64px',
            height: '24px',
            backgroundColor: 'rgba(245, 230, 168, 0.82)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
            borderLeft: '1.5px dashed rgba(210, 190, 130, 0.6)',
            borderRight: '1.5px dashed rgba(210, 190, 130, 0.6)',
            backdropFilter: 'blur(1px)',
          }}
          className={className}
        />
      );

    case 'washi_tape':
      return (
        <div
          style={{
            ...style,
            width: '60px',
            height: '22px',
            background: 'repeating-linear-gradient(45deg, #f87171, #f87171 6px, #fca5a5 6px, #fca5a5 12px)',
            opacity: 0.88,
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
          }}
          className={className}
        />
      );

    case 'paperclip':
      return (
        <svg
          style={style}
          width="26"
          height="48"
          viewBox="0 0 26 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Cast drop shadow */}
          <path
            d="M8 12V36C8 40.4 11.6 44 16 44C20.4 44 24 40.4 24 36V8C24 4.7 21.3 2 18 2C14.7 2 12 4.7 12 8V34C12 36.2 13.8 38 16 38C18.2 38 20 36.2 20 34V12"
            stroke="rgba(0, 0, 0, 0.3)"
            strokeWidth="3.5"
            strokeLinecap="round"
            transform="translate(2, 2)"
          />
          {/* Metallic wire body */}
          <path
            d="M8 12V36C8 40.4 11.6 44 16 44C20.4 44 24 40.4 24 36V8C24 4.7 21.3 2 18 2C14.7 2 12 4.7 12 8V34C12 36.2 13.8 38 16 38C18.2 38 20 36.2 20 34V12"
            stroke="#94a3b8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Wire highlight */}
          <path
            d="M7.5 12V36C7.5 40 11 43.5 15.5 43.5"
            stroke="#f1f5f9"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'pushpin':
      return (
        <svg
          style={style}
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Cast shadow */}
          <circle cx="19" cy="19" r="8" fill="rgba(0, 0, 0, 0.35)" filter="blur(2px)" />
          {/* Pin head */}
          <circle cx="15" cy="15" r="9" fill="#dc2626" />
          <circle cx="15" cy="15" r="6.5" fill="#ef4444" />
          {/* Highlight */}
          <circle cx="12" cy="12" r="2.5" fill="rgba(255, 255, 255, 0.7)" />
          {/* Center tip point */}
          <circle cx="15" cy="15" r="1.5" fill="#7f1d1d" />
        </svg>
      );
  }
};

// ============================================================================
// Curated Documentary Explainer Presets
// ============================================================================

export interface PapercraftScriptPreset {
  id: string;
  title: string;
  topic: string;
  style: PaperStyleId;
  defaultFold: OrigamiFoldType;
  beats: Array<{
    text: string;
    duration: number;
    visualHint: string;
    fastener: FastenerType;
    foldType?: OrigamiFoldType;
  }>;
}

export const PAPERCRAFT_DOCUMENTARY_PRESETS: PapercraftScriptPreset[] = [
  {
    id: 'printing_press',
    title: 'The Secret Gutenberg Revolution',
    topic: 'How movable type sparked the information explosion in 1450',
    style: 'vintage_newsprint',
    defaultFold: 'accordion_h',
    beats: [
      {
        text: 'In 1450, a goldsmith in Mainz, Germany perfected an invention that broke the monopoly on human knowledge.',
        duration: 4.2,
        visualHint: 'Engraving of Johannes Gutenberg holding a carved wooden letter block',
        fastener: 'masking_tape',
        foldType: 'accordion_h',
      },
      {
        text: 'Before this, every single Bible required 170 calfskins and three years of continuous monk transcription.',
        duration: 4.5,
        visualHint: 'Vellum parchment manuscript with hand-painted gold leaf borders',
        fastener: 'paperclip',
        foldType: 'diagonal_fold',
      },
      {
        text: 'Movable metal type drove the cost of a book down by 80 percent in less than two decades.',
        duration: 4.0,
        visualHint: 'Comparison ledger showing prices in Rhine guilders dropping drastically',
        fastener: 'pushpin',
        foldType: 'pop_up_book',
      },
      {
        text: 'Ideas now travelled faster than monarchs could burn them. The modern world had arrived.',
        duration: 4.2,
        visualHint: 'Vintage European map radiating printed pamphlets across trade routes',
        fastener: 'washi_tape',
        foldType: 'envelope_reveal',
      },
    ],
  },
  {
    id: 'mercator_maps',
    title: 'Why Every World Map is a Mathematical Lie',
    topic: 'The geometric distortion of the Mercator projection explained',
    style: 'parchment_dossier',
    defaultFold: 'diagonal_fold',
    beats: [
      {
        text: 'Look closely at Greenland on your standard world map. It appears larger than the entire continent of Africa.',
        duration: 4.0,
        visualHint: 'Standard Mercator map with Greenland and Africa highlighted with red stamps',
        fastener: 'pushpin',
        foldType: 'diagonal_fold',
      },
      {
        text: 'In reality? Africa is fourteen times larger than Greenland. You could fit China, the US, and Europe inside it.',
        duration: 4.8,
        visualHint: 'True-size country overlays sliding directly into Africa border outline',
        fastener: 'masking_tape',
        foldType: 'accordion_h',
      },
      {
        text: 'Why did 16th-century cartographer Gerardus Mercator do this? Navigation.',
        duration: 3.8,
        visualHint: 'Old nautical compass with straight rhumb line cutting across ocean waves',
        fastener: 'paperclip',
        foldType: 'accordion_v',
      },
      {
        text: 'His map preserved sailing bearings as straight lines, deliberately sacrificing landmass accuracy.',
        duration: 4.2,
        visualHint: 'Origami fold flattening spherical globe into cylindrical sheet projection',
        fastener: 'washi_tape',
        foldType: 'pop_up_book',
      },
    ],
  },
  {
    id: 'paper_money',
    title: 'The Illusion of Paper Currency',
    topic: 'How Song Dynasty China invented fiat currency and revolutionized trade',
    style: 'brown_kraft',
    defaultFold: 'accordion_v',
    beats: [
      {
        text: 'Copper coins were so heavy in eleventh-century Sichuan that buying silk required hauling carts of metal.',
        duration: 4.4,
        visualHint: 'Iron coin strings and Sichuan merchants weighing heavy sacks',
        fastener: 'masking_tape',
        foldType: 'accordion_v',
      },
      {
        text: 'Sixteen merchant houses issued paper deposit certificates called Jiaozi. Trade exploded.',
        duration: 4.2,
        visualHint: 'Ancient Song Dynasty woodblock printed paper banknote on mulberry bark',
        fastener: 'paperclip',
        foldType: 'accordion_h',
      },
      {
        text: 'When the state took over issuance, they printed without reserve backing — unleashing history\'s first hyperinflation.',
        duration: 4.6,
        visualHint: 'Bar chart made of kraft paper receipts rising exponentially into the ceiling',
        fastener: 'pushpin',
        foldType: 'diagonal_fold',
      },
      {
        text: 'Money is not gold or paper. Money is a shared collective belief that tomorrow\'s stranger will accept it.',
        duration: 4.5,
        visualHint: 'Folded paper banknote floating against dark minimalist backdrop',
        fastener: 'washi_tape',
        foldType: 'envelope_reveal',
      },
    ],
  },
];
