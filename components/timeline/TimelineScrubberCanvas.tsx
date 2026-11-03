'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface TimelineScrubberBeat {
  id: string;
  duration: number;
  text: string;
}

interface TimelineScrubberCanvasProps {
  beats: TimelineScrubberBeat[];
  currentTime?: number;
  onSeek?: (timeSeconds: number) => void;
  onSelectBeat?: (index: number) => void;
}

export function TimelineScrubberCanvas({
  beats,
  currentTime: externalCurrentTime,
  onSeek,
  onSelectBeat,
}: TimelineScrubberCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [internalTime, setInternalTime] = useState<number>(externalCurrentTime || 0);
  const isDraggingRef = useRef(false);

  const totalDuration = beats.reduce((acc, b) => acc + (b.duration || 0), 0) || 1;
  const activeTime = externalCurrentTime !== undefined ? externalCurrentTime : internalTime;

  // Format seconds to mm:ss.s
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    const paddedSecs = parseFloat(secs) < 10 ? `0${secs}` : secs;
    return `${mins}:${paddedSecs}`;
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = width / dpr;
    const logicalHeight = height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    const isDark = document.documentElement.classList.contains('dark');
    const trackBg = isDark ? '#18181b' : '#f4f4f5';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const textColor = isDark ? '#a1a1aa' : '#71717a';
    const tickColor = isDark ? '#3f3f46' : '#d4d4d8';

    // 1. Draw Timeline Ruler Background
    ctx.fillStyle = trackBg;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // 2. Draw Ruler Ticks (Every 1s minor, Every 5s major with timecode)
    const rulerHeight = 22;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight);
    ctx.lineTo(logicalWidth, rulerHeight);
    ctx.stroke();

    const pixelsPerSecond = logicalWidth / totalDuration;
    const stepSeconds = totalDuration > 60 ? 5 : totalDuration > 30 ? 2 : 1;

    ctx.font = '10px monospace';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';

    for (let t = 0; t <= totalDuration; t += stepSeconds) {
      const x = t * pixelsPerSecond;
      const isMajor = t % 5 === 0 || t === 0 || t >= Math.floor(totalDuration);
      const tickH = isMajor ? 10 : 5;

      ctx.strokeStyle = isMajor ? textColor : tickColor;
      ctx.beginPath();
      ctx.moveTo(x, rulerHeight - tickH);
      ctx.lineTo(x, rulerHeight);
      ctx.stroke();

      if (isMajor && x < logicalWidth - 20) {
        ctx.fillText(`${t}s`, x, rulerHeight - 12);
      }
    }

    // 3. Draw Clip Segments Track
    const trackY = rulerHeight + 6;
    const trackH = logicalHeight - trackY - 6;
    let accumulatedX = 0;

    beats.forEach((beat, idx) => {
      const clipWidth = Math.max(2, (beat.duration / totalDuration) * logicalWidth);
      const isAlt = idx % 2 === 0;

      // Clip block background
      ctx.fillStyle = isAlt
        ? isDark
          ? 'rgba(124, 58, 237, 0.18)'
          : 'rgba(124, 58, 237, 0.12)'
        : isDark
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.08)';

      ctx.strokeStyle = isAlt
        ? isDark
          ? 'rgba(139, 92, 246, 0.4)'
          : 'rgba(139, 92, 246, 0.3)'
        : isDark
        ? 'rgba(99, 102, 241, 0.3)'
        : 'rgba(99, 102, 241, 0.2)';

      ctx.beginPath();
      // Round rect for clip block
      const r = 4;
      ctx.roundRect(accumulatedX + 1, trackY, clipWidth - 2, trackH, r);
      ctx.fill();
      ctx.stroke();

      // Clip Label (Scene # & duration)
      if (clipWidth > 35) {
        ctx.fillStyle = isDark ? '#e4e4e7' : '#27272a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Scene ${idx + 1}`, accumulatedX + 6, trackY + 16);

        ctx.fillStyle = textColor;
        ctx.font = '9px monospace';
        ctx.fillText(`${beat.duration.toFixed(1)}s`, accumulatedX + 6, trackY + 30);
      }

      accumulatedX += clipWidth;
    });

    // 4. Draw Playhead Scrubber Line
    const clampedActiveTime = Math.max(0, Math.min(totalDuration, activeTime));
    const playheadX = (clampedActiveTime / totalDuration) * logicalWidth;

    // Scrubber Line
    ctx.strokeStyle = '#8b5cf6'; // Violet primary
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, logicalHeight);
    ctx.stroke();

    // Scrubber Handle (Diamond head at top)
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX + 6, 8);
    ctx.lineTo(playheadX, 14);
    ctx.lineTo(playheadX - 6, 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [beats, totalDuration, activeTime]);

  // Handle Resize and Canvas DPR Scaling
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 72 * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `72px`;
      renderCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer Scrubbing Logic
  const handleSeekFromEvent = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const progress = offsetX / rect.width;
    const targetSeconds = parseFloat((progress * totalDuration).toFixed(2));

    setInternalTime(targetSeconds);
    onSeek?.(targetSeconds);

    // Identify which beat was clicked
    if (onSelectBeat) {
      let accum = 0;
      for (let i = 0; i < beats.length; i++) {
        accum += beats[i].duration;
        if (targetSeconds <= accum) {
          onSelectBeat(i);
          break;
        }
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleSeekFromEvent(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    handleSeekFromEvent(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full select-none" ref={containerRef}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span>Canvas 60fps Scrubber</span>
        </span>
        <span className="font-semibold text-foreground">
          {formatTimecode(activeTime)} / {formatTimecode(totalDuration)}
        </span>
      </div>
      <div className="relative w-full rounded-xl border border-border/60 overflow-hidden shadow-xs cursor-ew-resize">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="block w-full h-[72px]"
          aria-label="Timeline Canvas Scrubber"
        />
      </div>
    </div>
  );
}
