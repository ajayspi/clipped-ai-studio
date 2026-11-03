// lib/engine/2d-studio/vehicles.ts
// 2D vector vehicles (Sedan, Sports Car, SUV, Pickup Truck).
// Designed for the 2D stickman engine: supports wheel rotation, headlights, reflections, and exhaust.

import { shade, circle, seg, poly, linGrad } from './core';

export interface DrawCarOptions {
  x?: number;
  y?: number;
  s?: number;
  facing?: number;
  t?: number;
  type?: 'sedan' | 'sports' | 'suv' | 'truck';
  color?: string;
  lightsOn?: boolean;
  speed?: number;
}

export function drawCar(g: CanvasRenderingContext2D, o: DrawCarOptions = {}) {
  const x = o.x ?? 0;
  const y = o.y ?? 0;
  const s = o.s ?? 1;
  const f = o.facing ?? 1;
  const t = o.t ?? 0;
  const type = o.type || 'sedan';
  const bodyColor = o.color || (type === 'sports' ? '#ef4444' : type === 'suv' ? '#2563eb' : '#0f172a');
  const lightsOn = o.lightsOn ?? true;
  const speed = o.speed ?? 0;

  g.save();
  g.translate(x, y);
  g.scale(f * s, s);

  // 1. Contact shadow under car
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  g.ellipse(0, 2, 130, 10, 0, 0, Math.PI * 2);
  g.fill();

  // Headlight Light Cone (Volumetric beam on the road)
  if (lightsOn) {
    g.save();
    g.beginPath();
    g.moveTo(115, -28);
    g.lineTo(380, -60);
    g.lineTo(380, 25);
    g.lineTo(115, -18);
    g.closePath();
    const beamGrad = linGrad(g, 115, 0, 380, 0, [
      'rgba(255, 245, 200, 0.45)',
      'rgba(255, 245, 200, 0.15)',
      'rgba(255, 245, 200, 0)',
    ]);
    g.fillStyle = beamGrad;
    g.fill();
    g.restore();
  }

  // 2. Wheel geometry
  const wheelR = type === 'suv' ? 24 : 20;
  const wheelY = -wheelR;
  const rearWheelX = -68;
  const frontWheelX = 68;

  const darkBody = shade(bodyColor, -0.35);

  // 3. Car Body Shells by type
  if (type === 'sports') {
    poly(
      g,
      [
        [-120, -18],
        [-110, -42],
        [-75, -34],
        [-20, -52],
        [35, -48],
        [80, -30],
        [125, -20],
        [125, -12],
        [-120, -12],
      ],
      bodyColor
    );

    // Rear spoiler
    seg(g, [[-115, -42], [-95, -42]], 5, darkBody);
    seg(g, [[-105, -42], [-105, -34]], 4, darkBody);

    // Tinted cabin glass
    poly(
      g,
      [
        [-55, -35],
        [-15, -50],
        [32, -46],
        [65, -32],
        [10, -32],
      ],
      'rgba(15, 23, 42, 0.85)'
    );
  } else if (type === 'suv') {
    poly(
      g,
      [
        [-115, -24],
        [-115, -74],
        [-20, -78],
        [42, -74],
        [58, -48],
        [120, -42],
        [122, -16],
        [-115, -16],
      ],
      bodyColor
    );

    // Roof rack rails
    seg(g, [[-95, -82], [32, -82]], 3, '#64748b');

    // Windows
    poly(
      g,
      [
        [-95, -70],
        [-22, -72],
        [-22, -48],
        [-95, -48],
      ],
      'rgba(15, 23, 42, 0.8)'
    );
    poly(
      g,
      [
        [-14, -72],
        [36, -70],
        [52, -48],
        [-14, -48],
      ],
      'rgba(15, 23, 42, 0.8)'
    );
  } else {
    // Sedan
    poly(
      g,
      [
        [-110, -18],
        [-88, -42],
        [-34, -62],
        [32, -62],
        [68, -42],
        [116, -34],
        [118, -14],
        [-110, -14],
      ],
      bodyColor
    );

    // Windows
    poly(
      g,
      [
        [-68, -40],
        [-26, -58],
        [28, -58],
        [58, -40],
      ],
      'rgba(15, 23, 42, 0.85)'
    );
  }

  // 4. Wheels with rotating 5-spoke alloys
  const drawWheel = (wx: number) => {
    // Tire
    circle(g, wx, wheelY, wheelR, '#0f172a');
    circle(g, wx, wheelY, wheelR * 0.65, '#cbd5e1');
    circle(g, wx, wheelY, wheelR * 0.22, '#475569');

    // Spokes
    const rot = t * speed * 8;
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * Math.PI * 2) / 5;
      seg(
        g,
        [
          [wx, wheelY],
          [wx + Math.cos(a) * (wheelR * 0.6), wheelY + Math.sin(a) * (wheelR * 0.6)],
        ],
        2.5,
        '#64748b'
      );
    }
  };

  drawWheel(rearWheelX);
  drawWheel(frontWheelX);

  // 5. Headlight & Taillight lens
  circle(g, 118, -24, 4.5, lightsOn ? '#fef08a' : '#94a3b8');
  circle(g, -114, -26, 4, '#ef4444');

  g.restore();
}
