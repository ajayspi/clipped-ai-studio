"use client"

import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useWizardStore } from './wizard-store'
import { motion } from 'framer-motion'

export function LivePlayer() {
  const w = useWizardStore()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Only interactive if we are on the subtitles step (step index 3)
  const isInteractive = w.step === 3

  // Calculate dynamic dimensions
  const aspectClass = w.aspectRatio === '16:9' ? 'aspect-video' : (w.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[9/16]');

  return (
    <div className={`relative w-full ${aspectClass} bg-black rounded-lg overflow-hidden border shadow-lg group mx-auto`} ref={containerRef} style={{ maxWidth: w.aspectRatio === '16:9' ? '100%' : '400px' }}>
      
      <div className="absolute inset-0 flex items-center justify-center text-white/50 p-4 text-center">
        <p>FFmpeg Preview (Worker Processing...)</p>
      </div>
      
      {/* Interactive Overlay for Subtitle Positioning */}
      {isInteractive && w.burnSubtitles && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Framer motion bounding box */}
          <motion.div
            drag="y"
            dragConstraints={containerRef}
            dragElastic={0}
            dragMomentum={false}
            className="absolute left-0 right-0 h-24 border-2 border-primary border-dashed bg-primary/10 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing group"
            style={{ top: `${w.subtitleY}%` }}
            onDrag={(e, info) => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const yPct = ((info.point.y - rect.top) / rect.height) * 100;
                w.set('subtitleY', Math.min(Math.max(yPct, 5), 95));
              }
            }}
          >
            <div className="text-white text-sm font-bold bg-black/50 px-2 py-1 rounded shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              Drag to position subtitles
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
