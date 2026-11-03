// lib/engine/2d-studio/props.ts
// Rich library of narrative props: Money, Tech, Career, and Story objects.

import { circle, seg, poly, rr } from './core';

// ============================================================================
// 1. MONEY & WEALTH PROPS
// ============================================================================

export function drawCashStack(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  const w = 70;
  const h = 42;
  const depth = 28;

  // Contact shadow
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(w * 0.5, h + depth * 0.5, w * 0.65, 8, 0, 0, Math.PI * 2);
  g.fill();

  // Stack paper edges
  for (let i = 0; i < depth; i += 3) {
    rr(g, 0, depth - i, w, h, 3);
    g.fillStyle = i % 6 === 0 ? '#e2e8f0' : '#cbd5e1';
    g.fill();
  }

  // Top bill
  rr(g, 0, 0, w, h, 4);
  g.fillStyle = '#15803d';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = '#166534';
  g.stroke();

  // Inner border & president oval
  rr(g, 4, 4, w - 8, h - 8, 2);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.stroke();
  g.beginPath();
  g.ellipse(w / 2, h / 2, 12, 15, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,0.2)';
  g.fill();

  // Corner '$' values
  g.fillStyle = '#ffffff';
  g.font = '700 9px sans-serif';
  g.fillText('$', 8, 14);
  g.fillText('$', w - 12, h - 6);

  // Wrapper bank band
  rr(g, w * 0.38, -2, w * 0.24, h + depth + 2, 2);
  g.fillStyle = '#f59e0b';
  g.fill();
  g.fillStyle = '#78350f';
  g.font = '800 7px sans-serif';
  g.fillText('$10k', w * 0.41, h * 0.55);

  g.restore();
}

export function drawSingleBill(g: CanvasRenderingContext2D, x: number, y: number, s = 1, rot = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);

  const w = 54;
  const h = 30;
  rr(g, -w / 2, -h / 2, w, h, 3);
  g.fillStyle = '#22c55e';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = '#15803d';
  g.stroke();

  circle(g, 0, 0, 9, 'rgba(255,255,255,0.28)');
  g.fillStyle = '#ffffff';
  g.font = '800 12px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('$', 0, 1);

  g.restore();
}

export function drawFloatingCash(
  g: CanvasRenderingContext2D,
  t: number,
  bounds = { x0: 0, y0: 0, w: 1080, h: 1920 },
  count = 25
) {
  for (let i = 0; i < count; i++) {
    const seed = i * 137.5;
    const speed = 120 + (i % 5) * 45;
    const px = bounds.x0 + ((seed * 73 + t * 40) % bounds.w);
    const py = bounds.y0 + ((t * speed + seed * 91) % bounds.h);
    const rot = Math.sin(t * 2 + i) * 0.6 + i * 0.4;
    const sz = 0.8 + (i % 4) * 0.25;
    drawSingleBill(g, px, py, sz, rot);
  }
}

export function drawCoinStack(g: CanvasRenderingContext2D, x: number, y: number, count = 5, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  const coinW = 32;
  const coinH = 10;
  const step = 6;

  for (let i = 0; i < count; i++) {
    const cy = -i * step;
    g.fillStyle = '#d97706';
    g.beginPath();
    g.ellipse(0, cy + 3, coinW / 2, coinH / 2, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#f59e0b';
    g.beginPath();
    g.ellipse(0, cy, coinW / 2, coinH / 2, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fbbf24';
    g.lineWidth = 1;
    g.stroke();
  }

  g.restore();
}

// ============================================================================
// 2. TECHNOLOGY & STORY PROPS
// ============================================================================

export function drawSmartphone(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  opts: { glowColor?: string } = {}
) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  const w = 26;
  const h = 48;

  // Phone body
  rr(g, -w / 2, -h / 2, w, h, 5);
  g.fillStyle = '#0f172a';
  g.fill();
  g.strokeStyle = '#334155';
  g.lineWidth = 1.5;
  g.stroke();

  // Screen
  rr(g, -w / 2 + 2, -h / 2 + 3, w - 4, h - 6, 3);
  g.fillStyle = opts.glowColor || '#0284c7';
  g.fill();

  // Screen notification bar
  seg(g, [[-w / 2 + 5, -h / 2 + 10], [w / 2 - 5, -h / 2 + 10]], 2, 'rgba(255,255,255,0.7)');
  seg(g, [[-w / 2 + 5, -h / 2 + 16], [0, -h / 2 + 16]], 2, 'rgba(255,255,255,0.5)');

  g.restore();
}

export function drawLaptop(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  opts: { screenColor?: string } = {}
) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Screen lid (open at angle)
  poly(g, [[-30, -38], [30, -38], [26, 0], [-26, 0]], '#1e293b');
  poly(g, [[-27, -35], [27, -35], [23, -2], [-23, -2]], opts.screenColor || '#0284c7');

  // Chart on screen
  seg(g, [[-18, -10], [-8, -18], [4, -12], [18, -26]], 2, '#22c55e');

  // Keyboard base
  poly(g, [[-36, 0], [36, 0], [42, 14], [-42, 14]], '#334155');
  rr(g, -12, 6, 24, 6, 1);
  g.fillStyle = '#475569';
  g.fill();

  g.restore();
}

export function drawBriefcase(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Handle
  g.lineWidth = 2.5;
  g.strokeStyle = '#78350f';
  g.beginPath();
  g.arc(0, -12, 6, Math.PI, 0);
  g.stroke();

  // Case body
  rr(g, -24, -10, 48, 32, 4);
  g.fillStyle = '#92400e';
  g.fill();
  g.strokeStyle = '#78350f';
  g.lineWidth = 2;
  g.stroke();

  // Brass latches
  circle(g, -12, 0, 3, '#f59e0b');
  circle(g, 12, 0, 3, '#f59e0b');

  g.restore();
}

export function drawSword(g: CanvasRenderingContext2D, x: number, y: number, s = 1, rot = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);

  // Pommel
  circle(g, 0, 28, 4, '#f59e0b');
  // Grip
  seg(g, [[0, 28], [0, 10]], 3.5, '#78350f');
  // Crossguard
  seg(g, [[-12, 10], [12, 10]], 4, '#f59e0b');
  // Steel Blade
  poly(g, [[-4, 10], [0, -48], [4, 10]], '#e2e8f0');
  // Fuller / central ridge
  seg(g, [[0, 8], [0, -36]], 1.5, '#94a3b8');

  g.restore();
}

export function drawLabFlask(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  liquidColor = '#10b981'
) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Flask Neck & Rim
  seg(g, [[-6, -26], [6, -26]], 3, '#cbd5e1');
  seg(g, [[-4, -26], [-4, -12]], 2, '#cbd5e1');
  seg(g, [[4, -26], [4, -12]], 2, '#cbd5e1');

  // Conical Body
  poly(g, [[-4, -12], [4, -12], [22, 18], [-22, 18]], 'rgba(255,255,255,0.18)');
  g.strokeStyle = '#cbd5e1';
  g.lineWidth = 2;
  g.stroke();

  // Liquid
  poly(g, [[-12, 4], [12, 4], [20, 16], [-20, 16]], liquidColor);
  circle(g, -4, 8, 2.5, '#ffffff');
  circle(g, 6, 12, 2, '#ffffff');

  g.restore();
}

// ============================================================================
// 3. EXTENDED PROCEDURAL STORY PROPS
// ============================================================================

export function drawCoffeeCup(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Cup body
  poly(g, [[-12, -14], [12, -14], [9, 14], [-9, 14]], '#e2e8f0');
  // Coffee rim
  g.fillStyle = '#78350f';
  g.beginPath();
  g.ellipse(0, -14, 12, 3, 0, 0, Math.PI * 2);
  g.fill();

  // Cup handle
  g.strokeStyle = '#e2e8f0';
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(12, 0, 6, -Math.PI * 0.4, Math.PI * 0.4);
  g.stroke();

  // Steam waves
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 1.5;
  seg(g, [[-4, -18], [-2, -24], [-5, -28]], 1.5, 'rgba(255,255,255,0.4)');
  seg(g, [[2, -18], [4, -25], [1, -30]], 1.5, 'rgba(255,255,255,0.4)');

  g.restore();
}

export function drawIdeaBulb(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Glow aura
  const grad = g.createRadialGradient(0, -6, 4, 0, -6, 28);
  grad.addColorStop(0, 'rgba(250, 204, 21, 0.7)');
  grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, -6, 28, 0, Math.PI * 2);
  g.fill();

  // Bulb glass
  circle(g, 0, -8, 14, '#fde047');
  poly(g, [[-9, -4], [9, -4], [6, 8], [-6, 8]], '#facc15');

  // Screw base
  rr(g, -5, 8, 10, 4, 1);
  g.fillStyle = '#94a3b8';
  g.fill();
  rr(g, -4, 12, 8, 3, 1);
  g.fillStyle = '#64748b';
  g.fill();

  // Filament rays
  g.strokeStyle = '#f59e0b';
  g.lineWidth = 2;
  seg(g, [[0, -32], [0, -25]], 2, '#f59e0b');
  seg(g, [[-18, -22], [-13, -17]], 2, '#f59e0b');
  seg(g, [[18, -22], [13, -17]], 2, '#f59e0b');

  g.restore();
}

export function drawMicrophone(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Handle
  seg(g, [[0, 2], [0, 26]], 5, '#334155');
  // Mesh capsule
  rr(g, -7, -22, 14, 22, 7);
  g.fillStyle = '#94a3b8';
  g.fill();
  g.strokeStyle = '#cbd5e1';
  g.lineWidth = 1.5;
  g.stroke();

  // Metal band
  seg(g, [[-7, -8], [7, -8]], 2, '#0f172a');

  g.restore();
}

export function drawMagnifyingGlass(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Handle
  seg(g, [[10, 10], [24, 24]], 4.5, '#78350f');
  // Brass rim
  circle(g, -4, -4, 16, 'rgba(56, 189, 248, 0.25)');
  g.strokeStyle = '#f59e0b';
  g.lineWidth = 3.5;
  g.beginPath();
  g.arc(-4, -4, 16, 0, Math.PI * 2);
  g.stroke();

  // Glass reflection glare
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(-4, -4, 11, -Math.PI * 0.7, -Math.PI * 0.3);
  g.stroke();

  g.restore();
}

export function drawGavel(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Wooden handle
  seg(g, [[0, 22], [0, 2]], 4, '#78350f');
  // Gavel mallet head
  rr(g, -18, -10, 36, 12, 3);
  g.fillStyle = '#92400e';
  g.fill();
  g.strokeStyle = '#78350f';
  g.lineWidth = 1.5;
  g.stroke();

  // Brass head band
  seg(g, [[-2, -10], [-2, 2]], 2, '#f59e0b');
  seg(g, [[2, -10], [2, 2]], 2, '#f59e0b');

  g.restore();
}

export function drawTrophy(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Cup chalice
  poly(g, [[-16, -24], [16, -24], [12, -4], [-12, -4]], '#f59e0b');
  // Cup base stem
  seg(g, [[0, -4], [0, 8]], 4, '#d97706');
  // Marble pedestal
  rr(g, -14, 8, 28, 10, 2);
  g.fillStyle = '#334155';
  g.fill();

  // Handles
  g.strokeStyle = '#f59e0b';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(-16, -14, 7, Math.PI * 0.5, Math.PI * 1.5);
  g.stroke();
  g.beginPath();
  g.arc(16, -14, 7, -Math.PI * 0.5, Math.PI * 0.5);
  g.stroke();

  // Golden star
  circle(g, 0, -14, 3.5, '#fef08a');

  g.restore();
}

export function drawBook(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Leather cover
  rr(g, -16, -20, 32, 40, 3);
  g.fillStyle = '#831843';
  g.fill();

  // Pages edge
  rr(g, -12, -18, 26, 36, 1);
  g.fillStyle = '#f8fafc';
  g.fill();

  // Gold spine & title
  seg(g, [[-14, -20], [-14, 20]], 3, '#f59e0b');
  seg(g, [[-6, -6], [8, -6]], 1.5, '#94a3b8');
  seg(g, [[-6, 0], [6, 0]], 1.5, '#94a3b8');
  seg(g, [[-6, 6], [4, 6]], 1.5, '#94a3b8');

  g.restore();
}

export function drawCashBag(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Sack shape
  circle(g, 0, 4, 18, '#d97706');
  poly(g, [[-8, -12], [8, -12], [14, 0], [-14, 0]], '#d97706');

  // Tie string
  seg(g, [[-7, -12], [7, -12]], 3, '#78350f');
  // Ruffled top
  poly(g, [[-10, -22], [10, -22], [7, -12], [-7, -12]], '#b45309');

  // Big Dollar sign
  g.fillStyle = '#15803d';
  g.font = '800 16px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('$', 0, 6);

  g.restore();
}

export function drawShield(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Knight heater shield
  g.beginPath();
  g.moveTo(-16, -22);
  g.lineTo(16, -22);
  g.lineTo(16, 2);
  g.quadraticCurveTo(16, 24, 0, 32);
  g.quadraticCurveTo(-16, 24, -16, 2);
  g.closePath();

  g.fillStyle = '#1e3a8a';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = '#f59e0b';
  g.stroke();

  // Silver cross
  seg(g, [[0, -18], [0, 20]], 4, '#e2e8f0');
  seg(g, [[-10, -4], [10, -4]], 4, '#e2e8f0');

  g.restore();
}

export function drawKey(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Ring handle
  g.strokeStyle = '#f59e0b';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, -14, 8, 0, Math.PI * 2);
  g.stroke();

  // Shaft
  seg(g, [[0, -6], [0, 22]], 3.5, '#f59e0b');
  // Teeth
  seg(g, [[0, 14], [8, 14]], 3, '#f59e0b');
  seg(g, [[0, 20], [6, 20]], 3, '#f59e0b');

  g.restore();
}

export function drawClock(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Dial
  circle(g, 0, 0, 18, '#f8fafc');
  g.strokeStyle = '#0f172a';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, 18, 0, Math.PI * 2);
  g.stroke();

  // Center pin
  circle(g, 0, 0, 2.5, '#ef4444');

  // Hands (10:10 classic)
  seg(g, [[0, 0], [7, -7]], 2, '#0f172a');
  seg(g, [[0, 0], [-6, -4]], 2.5, '#0f172a');

  g.restore();
}

export function drawUmbrella(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);

  // Canopy
  g.beginPath();
  g.arc(0, -6, 22, Math.PI, 0);
  g.closePath();
  g.fillStyle = '#0284c7';
  g.fill();
  g.strokeStyle = '#0369a1';
  g.lineWidth = 2;
  g.stroke();

  // Handle shaft
  seg(g, [[0, -6], [0, 22]], 2.5, '#475569');
  // Curved crook
  g.strokeStyle = '#78350f';
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(4, 22, 4, 0, Math.PI);
  g.stroke();

  g.restore();
}

/**
 * Universal Procedural Prop Router
 * Synthesizes vector art on the fly for any prop name.
 */
export function drawProceduralProp(
  g: CanvasRenderingContext2D,
  propName: string,
  x: number,
  y: number,
  s = 1,
  opts: Record<string, unknown> = {}
) {
  const norm = (propName || '').toLowerCase().trim();

  // 1. Exact & Synonym Routing
  if (norm.includes('phone') || norm.includes('mobile') || norm.includes('cell')) {
    drawSmartphone(g, x, y, s);
  } else if (norm.includes('laptop') || norm.includes('computer') || norm.includes('pc')) {
    drawLaptop(g, x, y, s);
  } else if (norm.includes('cashbag') || norm.includes('sack') || norm.includes('bag of money')) {
    drawCashBag(g, x, y, s);
  } else if (norm.includes('cash') || norm.includes('money') || norm.includes('dollar') || norm.includes('bill')) {
    drawCashStack(g, x, y, s);
  } else if (norm.includes('coin') || norm.includes('crypto') || norm.includes('gold')) {
    drawCoinStack(g, x, y, 5, s);
  } else if (norm.includes('briefcase') || norm.includes('suitcase') || norm.includes('portfolio')) {
    drawBriefcase(g, x, y, s);
  } else if (norm.includes('sword') || norm.includes('blade') || norm.includes('weapon') || norm.includes('dagger')) {
    drawSword(g, x, y, s);
  } else if (norm.includes('flask') || norm.includes('potion') || norm.includes('chemical') || norm.includes('beaker')) {
    drawLabFlask(g, x, y, s, (opts.liquidColor as string) || '#10b981');
  } else if (norm.includes('coffee') || norm.includes('tea') || norm.includes('cup') || norm.includes('mug')) {
    drawCoffeeCup(g, x, y, s);
  } else if (norm.includes('bulb') || norm.includes('idea') || norm.includes('lightbulb') || norm.includes('spark')) {
    drawIdeaBulb(g, x, y, s);
  } else if (norm.includes('mic') || norm.includes('podcast') || norm.includes('sing') || norm.includes('audio')) {
    drawMicrophone(g, x, y, s);
  } else if (norm.includes('magnify') || norm.includes('glass') || norm.includes('clue') || norm.includes('search')) {
    drawMagnifyingGlass(g, x, y, s);
  } else if (norm.includes('gavel') || norm.includes('court') || norm.includes('judge') || norm.includes('mallet')) {
    drawGavel(g, x, y, s);
  } else if (norm.includes('trophy') || norm.includes('award') || norm.includes('prize') || norm.includes('cup')) {
    drawTrophy(g, x, y, s);
  } else if (norm.includes('book') || norm.includes('bible') || norm.includes('diary') || norm.includes('read')) {
    drawBook(g, x, y, s);
  } else if (norm.includes('shield') || norm.includes('defense') || norm.includes('armor')) {
    drawShield(g, x, y, s);
  } else if (norm.includes('key') || norm.includes('unlock') || norm.includes('access')) {
    drawKey(g, x, y, s);
  } else if (norm.includes('clock') || norm.includes('time') || norm.includes('watch') || norm.includes('timer')) {
    drawClock(g, x, y, s);
  } else if (norm.includes('umbrella') || norm.includes('rain') || norm.includes('parasol')) {
    drawUmbrella(g, x, y, s);
  } else {
    // 2. Generic Vector Fallback Badge for unknown items
    g.save();
    g.translate(x, y);
    g.scale(s, s);

    // Glowing hex container
    rr(g, -18, -18, 36, 36, 6);
    g.fillStyle = '#1e293b';
    g.fill();
    g.strokeStyle = '#38bdf8';
    g.lineWidth = 1.5;
    g.stroke();

    // Star icon inside
    circle(g, 0, 0, 6, '#38bdf8');
    g.fillStyle = '#ffffff';
    g.font = '700 8px sans-serif';
    g.textAlign = 'center';
    g.fillText(norm.slice(0, 3).toUpperCase(), 0, 12);

    g.restore();
  }
}

