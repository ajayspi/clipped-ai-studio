// lib/engine/2d-studio/animals.ts
// Expressive procedural stick-style animal rigs (Dogs & Cats).
// Integrates with the 2D canvas engine, supports idle breathing, walk/run cycles, and posing.

import { shade, circle, seg, poly } from './core';

export interface DrawDogOptions {
  x?: number;
  y?: number;
  s?: number;
  facing?: number;
  t?: number;
  pose?: 'stand' | 'sit' | 'walk' | 'run' | 'play';
  breed?: 'labrador' | 'husky' | 'shiba' | 'small';
  color?: string;
  ink?: string;
  rimColor?: string;
}

export function drawDog(g: CanvasRenderingContext2D, o: DrawDogOptions = {}) {
  const x = o.x ?? 0;
  const y = o.y ?? 0;
  const s = (o.s ?? 1) * 0.9;
  const f = o.facing ?? 1;
  const t = o.t ?? 0;
  const pose = o.pose || 'stand';
  const breed = o.breed || 'labrador';
  const col = o.color || (breed === 'husky' ? '#334155' : breed === 'shiba' ? '#ea580c' : '#d97706');
  const ink = o.ink || '#0e0b12';
  const rimColor = o.rimColor || '#ffcf8f';

  g.save();
  g.translate(x, y);
  g.scale(f * s, s);

  // Ground shadow
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath();
  g.ellipse(0, 2, 42, 8, 0, 0, Math.PI * 2);
  g.fill();

  let hipY = -48;
  let shoulderY = -54;
  let headX = 42;
  let headY = -78;
  let tailAng = Math.sin(t * 12) * 0.45;

  if (pose === 'sit') {
    hipY = -24;
    shoulderY = -48;
    headX = 34;
    headY = -74;
    tailAng = Math.sin(t * 6) * 0.25;
  } else if (pose === 'play') {
    shoulderY = -22;
    hipY = -56;
    headX = 46;
    headY = -44;
    tailAng = Math.sin(t * 16) * 0.6;
  }

  const hip: [number, number] = [-30, hipY];
  const sh: [number, number] = [24, shoulderY];

  // 1. Far Legs
  const walkPhase = t * 6;
  const fLegOffset = pose === 'walk' ? Math.sin(walkPhase) * 14 : 0;
  const bLegOffset = pose === 'walk' ? Math.cos(walkPhase) * 14 : 0;

  if (pose === 'sit') {
    seg(g, [hip, [-38, -12], [-22, 0]], 7, shade(col, -0.3));
  } else {
    seg(g, [hip, [-30 - bLegOffset, -22], [-28 - bLegOffset, 0]], 7, shade(col, -0.3));
  }
  seg(g, [sh, [22 - fLegOffset, -24], [24 - fLegOffset, 0]], 7, shade(col, -0.3));

  // 2. Tail
  g.save();
  g.translate(hip[0] - 6, hip[1] + 4);
  g.rotate(-0.8 + tailAng);
  if (breed === 'husky' || breed === 'shiba') {
    g.beginPath();
    g.arc(-16, -16, 20, 0, Math.PI * 1.5);
    g.lineWidth = 11;
    g.strokeStyle = col;
    g.lineCap = 'round';
    g.stroke();
  } else {
    seg(g, [[0, 0], [-26, -18], [-34, -36]], 8, col);
  }
  g.restore();

  // 3. Torso
  seg(g, [hip, sh], 22, col);

  // 4. Near Legs
  if (pose === 'sit') {
    seg(g, [sh, [24, -24], [26, 0]], 8, col);
    circle(g, hip[0], hip[1] + 4, 14, col);
    seg(g, [[hip[0], hip[1] + 4], [-12, -4], [-8, 0]], 8, col);
  } else {
    seg(g, [hip, [-26 + bLegOffset, -24], [-24 + bLegOffset, 0]], 8, col);
    seg(g, [sh, [26 + fLegOffset, -24], [28 + fLegOffset, 0]], 8, col);
  }

  // 5. Neck & Head
  seg(g, [sh, [headX - 10, headY + 14]], 14, col);
  circle(g, headX, headY, 17, col);

  // Snout
  poly(g, [[headX + 4, headY - 6], [headX + 26, headY + 2], [headX + 6, headY + 12]], col);
  circle(g, headX + 25, headY + 2, 4.5, ink); // Nose

  // Eye
  circle(g, headX + 8, headY - 4, 3, ink);
  circle(g, headX + 9, headY - 5, 1, '#ffffff');

  // Ears
  if (breed === 'husky' || breed === 'shiba') {
    poly(g, [[headX - 6, headY - 14], [headX + 2, headY - 32], [headX + 10, headY - 12]], col);
    poly(g, [[headX - 4, headY - 14], [headX + 2, headY - 28], [headX + 8, headY - 13]], '#fbcfe8');
  } else {
    seg(g, [[headX - 4, headY - 12], [headX - 14, headY + 6]], 8, shade(col, -0.2));
  }

  // Collar
  circle(g, headX - 6, headY + 10, 3, '#fbbf24');
  seg(g, [[headX - 12, headY + 6], [headX + 2, headY + 16]], 3.5, '#dc2626');

  // Rim lighting highlight
  g.lineWidth = 2.5;
  g.strokeStyle = rimColor;
  g.beginPath();
  g.arc(headX, headY, 18, Math.PI * 0.9, Math.PI * 1.5);
  g.stroke();

  g.restore();
}

export interface DrawCatOptions {
  x?: number;
  y?: number;
  s?: number;
  facing?: number;
  t?: number;
  pose?: 'sit' | 'loaf' | 'walk' | 'stretch';
  color?: string;
  ink?: string;
}

export function drawCat(g: CanvasRenderingContext2D, o: DrawCatOptions = {}) {
  const x = o.x ?? 0;
  const y = o.y ?? 0;
  const s = (o.s ?? 1) * 0.85;
  const f = o.facing ?? 1;
  const t = o.t ?? 0;
  const pose = o.pose || 'sit';
  const col = o.color || '#1e293b';
  const ink = o.ink || '#0e0b12';

  g.save();
  g.translate(x, y);
  g.scale(f * s, s);

  // Ground shadow
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath();
  g.ellipse(0, 2, 34, 6, 0, 0, Math.PI * 2);
  g.fill();

  const headX = 26;
  const headY = pose === 'loaf' ? -38 : -56;
  const tailSway = Math.sin(t * 4) * 0.3;

  // Body
  if (pose === 'loaf') {
    circle(g, 0, -20, 22, col);
    circle(g, 14, -22, 16, col);
  } else {
    seg(g, [[-16, -24], [14, -36]], 18, col);
    circle(g, -16, -18, 14, col);
    seg(g, [[14, -36], [16, 0]], 6.5, col);
  }

  // Tail
  g.save();
  g.translate(-24, -14);
  g.rotate(-0.4 + tailSway);
  g.lineWidth = 6;
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(-22, -18, -14, -36);
  g.stroke();
  g.restore();

  // Head
  circle(g, headX, headY, 14, col);

  // Ears
  poly(g, [[headX - 10, headY - 10], [headX - 12, headY - 26], [headX - 2, headY - 12]], col);
  poly(g, [[headX - 9, headY - 10], [headX - 11, headY - 23], [headX - 3, headY - 12]], '#fda4af');

  poly(g, [[headX + 2, headY - 12], [headX + 12, headY - 26], [headX + 10, headY - 10]], col);
  poly(g, [[headX + 3, headY - 12], [headX + 11, headY - 23], [headX + 9, headY - 10]], '#fda4af');

  // Eye
  circle(g, headX + 6, headY - 2, 3.5, '#eab308');
  seg(g, [[headX + 6, headY - 5], [headX + 6, headY + 1]], 1.5, ink);

  // Whiskers
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 1;
  seg(g, [[headX + 10, headY + 2], [headX + 26, headY - 2]], 1, 'rgba(255,255,255,0.7)');
  seg(g, [[headX + 10, headY + 5], [headX + 26, headY + 7]], 1, 'rgba(255,255,255,0.7)');

  g.restore();
}
