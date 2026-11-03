'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Eraser } from 'lucide-react';

interface ChalkParticle {
  initialX: number;
  initialY: number;
  speed: number;
  drift: number;
  size: number;
  alpha: number;
}

const STATIC_CHALK_PARTICLES: ChalkParticle[] = Array.from({ length: 45 }, (_, i) => ({
  initialX: ((i * 17.7) % 760) + 20,
  initialY: ((i * 23.3) % 440) + 20,
  speed: 25 + (i % 7) * 8,
  drift: 15 + (i % 5) * 4,
  size: 1 + (i % 3) * 0.8,
  alpha: 0.15 + (i % 5) * 0.08,
}));

export const CHALKBOARD_PRESETS = [
  {
    id: 'neural',
    title: 'Deep Learning & Backprop',
    equation: 'L = -\\sum y \\log(\\hat{y}) \\quad \\Delta w = -\\eta \\frac{\\partial L}{\\partial w}',
    notes: 'Forward propagation computes logits. Gradients descend the loss landscape.',
    accentColor: '#fde047', // Yellow chalk
  },
  {
    id: 'physics',
    title: 'General Relativity & Energy',
    equation: 'G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu} \\quad E = mc^2',
    notes: 'Spacetime curvature dictates mass motion. Energy and mass are interchangeable.',
    accentColor: '#67e8f9', // Cyan chalk
  },
  {
    id: 'finance',
    title: 'Compound Exponential Growth',
    equation: 'A = P \\left(1 + \\frac{r}{n}\\right)^{nt} \\quad \\text{CAGR} = 14.8\\%',
    notes: 'Continuous compounding drives non-linear capital acceleration over time.',
    accentColor: '#f472b6', // Pink chalk
  },
];

export function ChalkboardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activePreset, setActivePreset] = useState(0);
  const [chalkDustEnabled, setChalkDustEnabled] = useState(true);
  const [isErasing, setIsErasing] = useState(false);

  // Render Chalkboard Frame
  const renderChalkboard = useCallback((ctx: CanvasRenderingContext2D, elapsedSec: number) => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const current = CHALKBOARD_PRESETS[activePreset];

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // 1. Dark Green Slate Board Base
    const slateGrad = ctx.createLinearGradient(0, 0, W, H);
    slateGrad.addColorStop(0, '#15251d'); // Rich deep forest slate
    slateGrad.addColorStop(0.5, '#121f18');
    slateGrad.addColorStop(1, '#0e1a14');
    ctx.fillStyle = slateGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Slate Board Wood Border Frame
    ctx.strokeStyle = '#3d2817'; // Rich mahogany wood
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, W - 14, H - 14);

    ctx.strokeStyle = '#5a3d24'; // Inner highlight
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, W - 28, H - 28);

    // 3. Faint Chalk Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 35;
    for (let x = 20; x < W - 20; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, H - 20);
      ctx.stroke();
    }
    for (let y = 20; y < H - 20; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(W - 20, y);
      ctx.stroke();
    }

    // 4. Drifting Chalk Dust Particles
    if (chalkDustEnabled) {
      ctx.save();
      for (let i = 0; i < STATIC_CHALK_PARTICLES.length; i++) {
        const p = STATIC_CHALK_PARTICLES[i];
        const py = 20 + ((p.initialY + elapsedSec * p.speed) % (H - 40));
        const px = 20 + ((p.initialX + Math.sin(elapsedSec * 1.5 + i) * p.drift) % (W - 40));

        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Draw Chalkboard Header & Title
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '700 22px serif, "Courier New", monospace';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 4;
    ctx.fillText(`// LESSON ${activePreset + 1}: ${current.title.toUpperCase()}`, 45, 60);

    // Chalk Underline with rough jitter
    ctx.strokeStyle = current.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(45, 72);
    for (let lx = 45; lx <= 520; lx += 15) {
      const jitter = (Math.random() - 0.5) * 1.5;
      ctx.lineTo(lx, 72 + jitter);
    }
    ctx.stroke();
    ctx.restore();

    // 6. Draw Chalk Diagram / Equations
    ctx.save();
    ctx.fillStyle = current.accentColor;
    ctx.font = '700 28px serif, "Times New Roman"';
    ctx.shadowColor = `${current.accentColor}66`;
    ctx.shadowBlur = 6;
    ctx.fillText(current.equation, 50, 140);

    // Explanatory Chalk Notes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '500 16px "Courier New", monospace';
    ctx.shadowBlur = 2;
    ctx.fillText(`• ${current.notes}`, 50, 200);
    ctx.restore();

    // 7. Hand-Drawn Chalk Concept Diagram (e.g. Graph axis or feedback loop)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);

    // X and Y Graph Axis
    const axisX = 65;
    const axisY = 380;
    ctx.beginPath();
    ctx.moveTo(axisX, axisY - 140);
    ctx.lineTo(axisX, axisY);
    ctx.lineTo(axisX + 380, axisY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve Line
    ctx.strokeStyle = current.accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(axisX + 10, axisY - 15);
    ctx.bezierCurveTo(
      axisX + 120, axisY - 20,
      axisX + 220, axisY - 70,
      axisX + 360, axisY - 130
    );
    ctx.stroke();

    // Axis Labels in chalk
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('Epochs / Time →', axisX + 270, axisY + 22);
    ctx.fillText('Performance ↑', axisX - 10, axisY - 148);
    ctx.restore();

    // 8. Bottom Chalk Dust Accumulation Tray
    ctx.fillStyle = '#22140c';
    ctx.fillRect(14, H - 28, W - 28, 14);
    // Pieces of colorful chalk resting in tray
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(80, H - 24, 30, 6);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(125, H - 24, 25, 6);
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(165, H - 24, 28, 6);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(205, H - 24, 24, 6);

    // Eraser wipe animation overlay if erasing
    if (isErasing) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(14, 14, W - 28, H - 28);
    }

    ctx.restore();
  }, [activePreset, chalkDustEnabled, isErasing]);

  // Animation Loop
  useEffect(() => {
    let animId: number;
    let startTime: number | null = null;

    const loop = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) renderChalkboard(ctx, elapsed);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderChalkboard]);

  const triggerErase = () => {
    setIsErasing(true);
    setTimeout(() => {
      setIsErasing(false);
      setActivePreset((prev) => (prev + 1) % CHALKBOARD_PRESETS.length);
    }, 350);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Nafay Slate Chalkboard Engine
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Textured dark slate, hand-drawn chalk line jitter, and drifting dust particles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChalkDustEnabled(!chalkDustEnabled)}
            className={`text-xs border-slate-800 ${
              chalkDustEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {chalkDustEnabled ? 'Dust: On' : 'Dust: Off'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={triggerErase}
            className="text-xs border-slate-800 text-amber-300 hover:text-amber-200"
          >
            <Eraser className="w-3.5 h-3.5 mr-1" />
            Erase & Wipe
          </Button>
        </div>
      </div>

      {/* Chalk Canvas Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-950 flex justify-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          className="w-full max-w-[800px] h-auto object-contain"
        />
      </div>

      {/* Preset Lesson Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        {CHALKBOARD_PRESETS.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePreset(idx)}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activePreset === idx
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-semibold">{p.title}</div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">{p.equation}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
