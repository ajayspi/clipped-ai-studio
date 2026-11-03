'use client';

import dynamic from 'next/dynamic';

export const DynamicStrokeTracer = dynamic<{ className?: string }>(
  () => import('@/components/2d-studio/StrokeTracerCanvas').then((mod) => mod.StrokeTracerCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-card/40 rounded-lg animate-pulse border border-border/30">
        <span className="text-xs text-muted-foreground">Loading Anime.js Vector Stroke Tracer...</span>
      </div>
    ),
  }
);
