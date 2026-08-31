"use client"

import React, { useMemo, useRef, useState, useEffect } from 'react'
import { Player } from '@remotion/player'
import { AbsoluteFill, Sequence, Video as RemotionVideo, Audio, useCurrentFrame, useVideoConfig } from 'remotion'
import { useWizardStore } from './wizard-store'
import { motion } from 'framer-motion'

import { MainComposition } from '@/remotion/Composition'

// The LivePlayer wrapping the Remotion Player with Framer Motion interactive overlay
export function LivePlayer() {
  const w = useWizardStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const fps = 30
  
  // Calculate total duration
  const totalDuration = useMemo(() => {
    return Math.max(1, w.beats.reduce((acc, beat) => acc + beat.duration, 0))
  }, [w.beats])
  
  const durationInFrames = Math.max(1, Math.floor(totalDuration * fps))
  
  // Only interactive if we are on the subtitles step (step index 3)
  const isInteractive = w.step === 3

  // Calculate dynamic dimensions
  const compWidth = w.aspectRatio === '16:9' ? 1920 : 1080;
  const compHeight = w.aspectRatio === '9:16' ? 1920 : 1080;
  const aspectClass = w.aspectRatio === '16:9' ? 'aspect-video' : (w.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[9/16]');

  return (
    <div className={`relative w-full ${aspectClass} bg-black rounded-lg overflow-hidden border shadow-lg group mx-auto`} ref={containerRef} style={{ maxWidth: w.aspectRatio === '16:9' ? '100%' : '400px' }}>
      <Player
        component={MainComposition}
        durationInFrames={durationInFrames}
        compositionWidth={compWidth}
        compositionHeight={compHeight}
        fps={fps}
        controls
        autoPlay
        loop
        inputProps={{
          beats: w.beats.map(b => ({
            id: b.id,
            text: b.text,
            duration: b.duration,
            clipUrl: b.candidates?.[0]?.url
          })),
          burnSubtitles: w.burnSubtitles,
          subtitleStyle: {
            y: w.subtitleY,
            color: w.subtitleColor,
            size: w.subtitleSize,
            outlineWidth: w.subtitleOutlineWidth,
            outlineColor: w.subtitleOutline,
            isBox: w.subtitleBox,
            boxColor: w.subtitleBoxColor,
            uppercase: w.subtitleUppercase,
            maxWidth: w.subtitleMaxWidth
          }
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      
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
