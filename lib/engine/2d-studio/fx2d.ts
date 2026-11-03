// lib/engine/2d-studio/fx2d.ts
// Atmosphere, particles, lighting and set-dressing visual FX (2D canvas).

import { E, rng, alpha, circle, radGrad, glow } from './core';

export interface RainOptions {
  seed?: number;
  count?: number;
  angle?: number;
  speed?: number;
  len?: number;
  color?: string;
  a?: number;
  w?: number;
  area?: [number, number, number, number];
  timeScale?: number;
}

export function rain(g: CanvasRenderingContext2D, t: number, o: RainOptions = {}): void {
  const {
    seed = 1,
    count = 260,
    angle = 0.14,
    speed = 2200,
    len = 46,
    color = '#b8c8ff',
    a = 0.32,
    w = 1.3,
    area = [-100, -100, E.W + 200, E.H + 200],
    timeScale = 1,
  } = o;
  const r = rng(seed);
  g.save();
  g.strokeStyle = alpha(color, a);
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  const [ax, ay, aw, ah] = area;
  const dx = Math.sin(angle);
  const dy = Math.cos(angle);
  for (let i = 0; i < count; i++) {
    const x0 = ax + r() * aw;
    const y0 = r() * ah;
    const sp = speed * (0.7 + r() * 0.6);
    const L = len * (0.6 + r() * 0.8);
    const y = ay + ((y0 + t * timeScale * sp) % ah);
    const x = x0 + (y - ay) * dx;
    g.moveTo(x, y);
    g.lineTo(x + dx * L, y + dy * L);
  }
  g.stroke();
  g.restore();
}

export interface DustOptions {
  seed?: number;
  count?: number;
  color?: string;
  area?: [number, number, number, number];
  size?: number;
  speed?: number;
  a?: number;
}

export function dust(g: CanvasRenderingContext2D, t: number, o: DustOptions = {}): void {
  const {
    seed = 3,
    count = 50,
    color = '#ffe9d2',
    area = [0, 0, E.W, E.H],
    size = 2.2,
    speed = 14,
    a = 0.5,
  } = o;
  const r = rng(seed);
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const s = 0.4 + r() * 1.2;
    const ph = r() * 6.28;
    const rad = (0.5 + r()) * size;
    const x = area[0] + ((r() * area[2] + Math.sin(t * 0.5 + ph) * 18) % area[2]);
    const y =
      area[1] +
      ((((r() * area[3] - t * speed * s) % area[3]) + area[3]) % area[3]);
    const al = a * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7 + ph)));
    g.fillStyle = radGrad(g, x, y, 0, rad * 3, [
      alpha(color, al),
      alpha(color, 0),
    ]);
    g.beginPath();
    g.arc(x, y, rad * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

export function sun(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color = '#fff6e0',
  glowColor = '#ffd59a',
  glowR = 4
): void {
  glow(g, x, y, r * glowR, glowColor, 0.55);
  glow(g, x, y, r * 1.8, '#fff3dc', 0.6);
  circle(g, x, y, r, color);
}

export function moon(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color = '#e8ecff'
): void {
  glow(g, x, y, r * 4, color, 0.18);
  circle(g, x, y, r, color);
}

export function pool(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color = '#ffd59a',
  a = 0.3
): void {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.translate(x, y);
  g.scale(1, ry / rx);
  g.fillStyle = radGrad(g, 0, 0, 0, rx, [alpha(color, a), alpha(color, 0)]);
  g.beginPath();
  g.arc(0, 0, rx, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
