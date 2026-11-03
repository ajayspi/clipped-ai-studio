"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useWizardStore } from './wizard-store'
import { motion } from 'framer-motion'
import { Play, Pause } from 'lucide-react'

export function LivePlayer() {
  const w = useWizardStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  
  // Only interactive if we are on the subtitles step (step index 3)
  const isInteractive = w.step === 3

  // Calculate dynamic dimensions
  const aspectClass = w.aspectRatio === '16:9' ? 'aspect-video' : (w.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[9/16]');

  const beats = w.beats || []
  const currentBeat = beats[currentBeatIndex]
  const candidates = currentBeat?.candidates || []
  const selectedCandidate = candidates.find(c => c.id === currentBeat?.selectedId) || candidates[0]
  const mediaUrl = selectedCandidate?.url

  useEffect(() => {
    if (videoRef.current && mediaUrl && isPlaying) {
      videoRef.current.src = mediaUrl
      videoRef.current.play().catch(() => {})
    } else if (videoRef.current && !isPlaying) {
      videoRef.current.pause()
    }
  }, [currentBeatIndex, mediaUrl, isPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100)
      }
    }
    const handleEnded = () => {
      if (currentBeatIndex < beats.length - 1) {
        setCurrentBeatIndex(i => i + 1)
      } else {
        setIsPlaying(false)
        setCurrentBeatIndex(0)
      }
    }
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [currentBeatIndex, beats.length])

  const subtitleStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    top: `${w.subtitleY}%`,
    textAlign: 'center',
    color: w.subtitleColor,
    fontSize: `${w.subtitleSize * 1.5}vw`,
    letterSpacing: `${w.subtitleLetterSpacing}px`,
    textTransform: w.subtitleUppercase ? 'uppercase' : 'none',
    maxWidth: `${w.subtitleMaxWidth}%`,
    textShadow: w.subtitleOutline ? `2px 2px 2px ${w.subtitleOutline}, -2px -2px 2px ${w.subtitleOutline}, 2px -2px 2px ${w.subtitleOutline}, -2px 2px 2px ${w.subtitleOutline}` : 'none',
    padding: w.subtitleBox ? '8px 16px' : '0',
    backgroundColor: w.subtitleBox ? `${w.subtitleBoxColor}${Math.round((w.subtitleBoxOpacity / 100) * 255).toString(16).padStart(2, '0')}` : 'transparent',
    borderRadius: `${w.subtitleBoxRadius}px`,
    fontWeight: 700,
    lineHeight: 1.3,
    pointerEvents: 'none',
    zIndex: 5,
  }

  return (
    <div className={`relative w-full ${aspectClass} bg-black rounded-lg overflow-hidden border shadow-lg group mx-auto`} ref={containerRef} style={{ maxWidth: w.aspectRatio === '16:9' ? '100%' : '400px' }}>
      {beats.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 p-4 text-center">
          <p>Add beats in the Scenes step to preview your video</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted={false}
            playsInline
            controls={false}
          />
          {w.burnSubtitles && currentBeat?.text && (
            <div style={subtitleStyle}>
              {currentBeat.text}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-primary transition-colors">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <div className="flex-1 h-1 bg-white/30 rounded overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-white text-xs">{currentBeatIndex + 1}/{beats.length}</span>
            </div>
          </div>
        </>
      )}
      
      {/* Interactive Overlay for Subtitle Positioning */}
      {isInteractive && w.burnSubtitles && (
        <div className="absolute inset-0 z-10 pointer-events-none">
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
