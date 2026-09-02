"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Sliders,
  Type,
  Palette,
  Layers,
  Smartphone,
  Check,
  RotateCcw,
  Zap,
  Flame,
  Eye,
  CheckCircle2,
  Box,
  MoveVertical,
  Maximize2,
} from 'lucide-react'
import { useWizardStore, SUBTITLE_PRESETS, SubtitlePresetConfig } from './wizard-store'

// Curated palette swatches for quick one-click color selection
const PRIMARY_COLOR_SWATCHES = [
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Soft Slate', hex: '#F8FAFC' },
  { name: 'Warm Cream', hex: '#FEF3C7' },
  { name: 'Ice Cyan', hex: '#22D3EE' },
  { name: 'Mint Green', hex: '#A7F3D0' },
  { name: 'Lavender', hex: '#DDD6FE' },
  { name: 'Rose Tint', hex: '#FEE2E2' },
  { name: 'Golden Sun', hex: '#FCD34D' },
]

const HIGHLIGHT_COLOR_SWATCHES = [
  { name: 'Hormozi Yellow', hex: '#FACC15' },
  { name: 'Hot Pink / Rose', hex: '#F43F5E' },
  { name: 'Electric Cyan', hex: '#22D3EE' },
  { name: 'Vibrant Orange', hex: '#FB923C' },
  { name: 'Purple Neon', hex: '#A855F7' },
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Coral Red', hex: '#EF4444' },
]

const OUTLINE_COLOR_SWATCHES = [
  { name: 'Pitch Black', hex: '#000000' },
  { name: 'Dark Slate', hex: '#0F172A' },
  { name: 'Deep Navy', hex: '#1E1B4B' },
  { name: 'Midnight Purple', hex: '#3B0764' },
  { name: 'Charcoal', hex: '#18181B' },
]

const DEMO_WORDS = ['CREATE', 'ENGAGING', 'VIRAL', 'CLIPS', 'NOW']

// Mini animated subtitle preview inside preset card
function PresetMiniPreview({ preset }: { preset: SubtitlePresetConfig }) {
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % 3)
    }, 900)
    return () => clearInterval(timer)
  }, [])

  const sampleWords = ['MAKE', 'VIDEOS', 'POP']

  const getBoxBg = () => {
    if (!preset.isBox) return 'transparent'
    const opacity = (preset.boxOpacity || 70) / 100
    if (preset.boxColor.startsWith('#')) {
      const hex = preset.boxColor.replace('#', '')
      const r = parseInt(hex.substring(0, 2) || '0', 16)
      const g = parseInt(hex.substring(2, 4) || '0', 16)
      const b = parseInt(hex.substring(4, 6) || '0', 16)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    return preset.boxColor
  }

  return (
    <div className="w-full h-20 rounded-lg bg-gradient-to-br from-zinc-950/90 via-zinc-900 to-black flex items-center justify-center p-2 relative overflow-hidden border border-white/5">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
      
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 transition-all duration-300"
        style={{
          backgroundColor: getBoxBg(),
          borderRadius: `${preset.boxRadius}px`,
          backdropFilter: preset.isBox ? 'blur(8px)' : 'none',
          border: preset.isBox ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
        }}
      >
        {sampleWords.map((word, i) => {
          const isActive = activeIdx === i
          const outlineStyle = preset.outlineWidth > 0
            ? `0 0 ${preset.outlineWidth}px ${preset.outlineColor}, 0 0 ${preset.outlineWidth}px ${preset.outlineColor}`
            : 'none'
          const glowStyle = preset.glow && isActive
            ? `0 0 10px ${preset.glowColor}, 0 0 20px ${preset.glowColor}`
            : outlineStyle

          return (
            <motion.span
              key={word}
              animate={{
                scale: isActive ? 1.15 : 1,
                color: isActive ? preset.highlightColor : preset.color,
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 18 }}
              className="text-xs font-black tracking-tight select-none"
              style={{
                textTransform: preset.uppercase ? 'uppercase' : 'none',
                letterSpacing: `${preset.letterSpacing * 0.5}px`,
                textShadow: glowStyle,
              }}
            >
              {word}
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}

export function SubtitlesStep() {
  const w = useWizardStore()
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'position'>('presets')
  const [sandboxBackdrop, setSandboxBackdrop] = useState<'cinema' | 'cyber' | 'sunset' | 'studio'>('cinema')
  const [sandboxWordIdx, setSandboxWordIdx] = useState(0)

  // Real-time animation cycle for sandbox
  useEffect(() => {
    if (!w.burnSubtitles) return
    const interval = setInterval(() => {
      setSandboxWordIdx((prev) => (prev + 1) % DEMO_WORDS.length)
    }, 750)
    return () => clearInterval(interval)
  }, [w.burnSubtitles])

  // Current active preset match
  const currentPreset = useMemo(() => {
    return SUBTITLE_PRESETS.find(
      (p) => p.name.toLowerCase() === w.subtitlePreset.toLowerCase() || p.id.toLowerCase() === w.subtitlePreset.toLowerCase()
    ) || SUBTITLE_PRESETS[0]
  }, [w.subtitlePreset])

  // Helper for computing box background rgba
  const computedBoxBg = useMemo(() => {
    if (!w.subtitleBox) return 'transparent'
    const opacity = (w.subtitleBoxOpacity ?? 70) / 100
    const color = w.subtitleBoxColor || '#000000'
    if (color.startsWith('#')) {
      const clean = color.replace('#', '')
      const r = parseInt(clean.substring(0, 2) || '0', 16)
      const g = parseInt(clean.substring(2, 4) || '0', 16)
      const b = parseInt(clean.substring(4, 6) || '0', 16)
      return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    return color
  }, [w.subtitleBox, w.subtitleBoxColor, w.subtitleBoxOpacity])

  // Sandbox backdrop gradient styles
  const backdropClasses = {
    cinema: 'from-zinc-950 via-zinc-900 to-black',
    cyber: 'from-slate-950 via-indigo-950 to-blue-950',
    sunset: 'from-purple-950 via-rose-950 to-amber-950',
    studio: 'from-zinc-800 via-zinc-900 to-zinc-950',
  }

  return (
    <div className="space-y-6">
      {/* Top Glassmorphic Master Burn-in Toggle Card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-card/80 dark:bg-zinc-900/70 backdrop-blur-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-all"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-2.5 rounded-xl border transition-colors ${
              w.burnSubtitles
                ? 'bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/20'
                : 'bg-muted/40 border-border/50 text-muted-foreground'
            }`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  Burn-in Animated Subtitles
                </h3>
                {w.burnSubtitles ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                    OFF
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hardcode dynamic, viral word-by-word subtitles into video frames with spring physics and neon highlights.
              </p>
            </div>
          </div>

          {/* Animated Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={w.burnSubtitles}
            onClick={() => w.set('burnSubtitles', !w.burnSubtitles)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              w.burnSubtitles ? 'bg-primary shadow-md shadow-primary/30' : 'bg-muted-foreground/30'
            }`}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 ${
                w.burnSubtitles ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {w.burnSubtitles && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Live Subtitle Interactive Sandbox Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-zinc-950 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-primary" /> Live Animated Sandbox Preview
                  </span>
                </div>

                {/* Sandbox Backdrop Controls */}
                <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-white/10 text-xs">
                  {(['cinema', 'cyber', 'sunset', 'studio'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSandboxBackdrop(mode)}
                      className={`px-2.5 py-1 rounded capitalize text-[11px] font-medium transition-all ${
                        sandboxBackdrop === mode
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Animated Subtitle Canvas */}
              <div className={`w-full min-h-[140px] rounded-xl bg-gradient-to-br ${backdropClasses[sandboxBackdrop]} flex items-center justify-center p-6 relative border border-white/10 overflow-hidden shadow-inner`}>
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                
                <div
                  className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 transition-all duration-300 relative z-10"
                  style={{
                    backgroundColor: computedBoxBg,
                    backdropFilter: w.subtitleBox ? 'blur(12px)' : 'none',
                    WebkitBackdropFilter: w.subtitleBox ? 'blur(12px)' : 'none',
                    border: w.subtitleBox ? '1px solid rgba(255, 255, 255, 0.18)' : 'none',
                    padding: w.subtitleBox ? '14px 28px' : '0',
                    borderRadius: `${w.subtitleBoxRadius}px`,
                    maxWidth: `${w.subtitleMaxWidth}%`,
                    boxShadow: w.subtitleBox ? '0 12px 36px rgba(0, 0, 0, 0.5)' : 'none',
                  }}
                >
                  {DEMO_WORDS.map((word, i) => {
                    const isActive = sandboxWordIdx === i
                    
                    let textShadow = 'none'
                    if (w.subtitleGlow && isActive) {
                      textShadow = `0 0 10px ${w.subtitleGlowColor}, 0 0 20px ${w.subtitleGlowColor}, 0 0 35px ${w.subtitleGlowColor}, 0 0 ${w.subtitleOutlineWidth}px ${w.subtitleOutline}`
                    } else if (w.subtitleOutlineWidth > 0) {
                      textShadow = `0 0 ${w.subtitleOutlineWidth}px ${w.subtitleOutline}, 0 0 ${w.subtitleOutlineWidth}px ${w.subtitleOutline}, 0 2px 8px rgba(0,0,0,0.8)`
                    } else {
                      textShadow = '0 2px 8px rgba(0,0,0,0.6)'
                    }

                    return (
                      <motion.span
                        key={word}
                        animate={{
                          scale: isActive ? 1.2 : 1,
                          color: isActive ? w.subtitleHighlightColor : w.subtitleColor,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="font-black select-none tracking-tight leading-none"
                        style={{
                          fontSize: `clamp(1.2rem, ${w.subtitleSize * 0.45}rem, 2.5rem)`,
                          letterSpacing: `${w.subtitleLetterSpacing}px`,
                          textTransform: w.subtitleUppercase ? 'uppercase' : 'none',
                          textShadow: textShadow,
                          filter: isActive && w.subtitleGlow ? `drop-shadow(0 0 8px ${w.subtitleGlowColor})` : 'none',
                        }}
                      >
                        {word}
                      </motion.span>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Navigation Tabs for Subtitle Controls */}
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-muted/40 border border-border/50 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'presets'
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-primary" />
                6 Visual Presets
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('position')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'position'
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-primary" />
                Position Selector
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'custom'
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-primary" />
                Custom Styling
              </button>
            </div>

            {/* TAB 1: 6 HIGH-IMPACT VISUAL PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Choose a Visual Preset
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select one of 6 professionally tuned, high-retention subtitle aesthetics.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => w.applySubtitlePreset(currentPreset.id)}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Preset
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SUBTITLE_PRESETS.map((preset) => {
                    const isSelected =
                      w.subtitlePreset.toLowerCase() === preset.name.toLowerCase() ||
                      w.subtitlePreset.toLowerCase() === preset.id.toLowerCase()

                    return (
                      <motion.div
                        key={preset.id}
                        whileHover={{ y: -3, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => w.applySubtitlePreset(preset.id)}
                        className={`cursor-pointer rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-card/90 dark:bg-zinc-900/80 border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/10'
                            : 'bg-card/50 dark:bg-zinc-900/40 border-border/40 hover:border-border hover:bg-card/80'
                        }`}
                      >
                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pr-6">
                            <h5 className="font-bold text-sm text-foreground">{preset.name}</h5>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                              {preset.tag}
                            </span>
                          </div>

                          {/* Mini Live Animated Preview */}
                          <PresetMiniPreview preset={preset} />

                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>

                        {/* Preset color swatches footer */}
                        <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
                              style={{ backgroundColor: preset.color }}
                              title={`Text Color: ${preset.color}`}
                            />
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
                              style={{ backgroundColor: preset.highlightColor }}
                              title={`Active Highlight: ${preset.highlightColor}`}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground/80">
                            {preset.isBox ? 'Frosted Box' : preset.glow ? 'Neon Glow' : 'Outline'}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: 3-SEGMENT VISUAL POSITION SELECTOR */}
            {activeTab === 'position' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 rounded-2xl border border-white/10 dark:border-white/5 bg-card/60 dark:bg-zinc-900/50 backdrop-blur-xl">
                {/* Left: Stylized Interactive Smartphone Mockup */}
                <div className="md:col-span-5 flex flex-col items-center justify-center">
                  <div className="text-center mb-3">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Interactive Screen View
                    </span>
                    <p className="text-[11px] text-muted-foreground">Click a segment or drag slider</p>
                  </div>

                  <div className="w-[200px] h-[360px] rounded-[36px] bg-black border-4 border-zinc-700/80 shadow-2xl p-2 relative overflow-hidden flex flex-col justify-between select-none">
                    {/* Camera notch / dynamic island */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-zinc-800 rounded-full z-30" />
                    
                    {/* Screen canvas */}
                    <div className="w-full h-full rounded-[28px] bg-gradient-to-b from-zinc-900 via-zinc-950 to-black relative flex flex-col overflow-hidden">
                      {/* Top Interactive Segment (15%) */}
                      <button
                        type="button"
                        onClick={() => {
                          w.set('subtitlePosition', 'Top')
                          w.set('subtitleY', 15)
                        }}
                        className={`absolute top-0 left-0 right-0 h-1/3 z-10 flex items-start justify-center pt-8 transition-colors ${
                          w.subtitleY <= 30
                            ? 'bg-primary/20 border-b-2 border-primary/60'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          w.subtitleY <= 30 ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-500'
                        }`}>
                          TOP (15%)
                        </span>
                      </button>

                      {/* Center Interactive Segment (50%) */}
                      <button
                        type="button"
                        onClick={() => {
                          w.set('subtitlePosition', 'Center')
                          w.set('subtitleY', 50)
                        }}
                        className={`absolute top-1/3 left-0 right-0 h-1/3 z-10 flex items-center justify-center transition-colors ${
                          w.subtitleY > 30 && w.subtitleY < 65
                            ? 'bg-primary/20 border-y-2 border-primary/60'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          w.subtitleY > 30 && w.subtitleY < 65 ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-500'
                        }`}>
                          CENTER (50%)
                        </span>
                      </button>

                      {/* Bottom Interactive Segment (78%) */}
                      <button
                        type="button"
                        onClick={() => {
                          w.set('subtitlePosition', 'Bottom (Recommended)')
                          w.set('subtitleY', 78)
                        }}
                        className={`absolute bottom-0 left-0 right-0 h-1/3 z-10 flex items-end justify-center pb-6 transition-colors ${
                          w.subtitleY >= 65
                            ? 'bg-primary/20 border-t-2 border-primary/60'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          w.subtitleY >= 65 ? 'bg-primary text-primary-foreground shadow-sm' : 'text-zinc-500'
                        }`}>
                          BOTTOM (78%)
                        </span>
                      </button>

                      {/* Live Subtitle Indicator Inside Mockup */}
                      <motion.div
                        animate={{ top: `${w.subtitleY}%` }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        className="absolute left-2 right-2 -translate-y-1/2 pointer-events-none z-20"
                      >
                        <div className="bg-primary/90 text-primary-foreground font-black text-[9px] text-center py-1 px-2 rounded shadow-md uppercase tracking-wider">
                          SUBTITLES PREVIEW
                        </div>
                      </motion.div>
                    </div>

                    {/* Home Indicator Bar */}
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-1 bg-zinc-600 rounded-full z-30" />
                  </div>
                </div>

                {/* Right: Fine-Tuning Slider & Position Controls */}
                <div className="md:col-span-7 flex flex-col justify-center space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MoveVertical className="w-4 h-4 text-primary" /> Fine-Tune Vertical Height
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Adjust exact vertical alignment percentage on mobile 9:16 portrait feeds.
                    </p>
                  </div>

                  {/* Position Quick Selector Cards */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { name: 'Top', val: 15, label: '15%' },
                      { name: 'Center', val: 50, label: '50%' },
                      { name: 'Bottom', val: 78, label: '78%' },
                    ].map((pos) => {
                      const isActive = Math.abs(w.subtitleY - pos.val) < 5
                      return (
                        <button
                          key={pos.name}
                          type="button"
                          onClick={() => {
                            w.set('subtitlePosition', `${pos.name}${pos.val === 78 ? ' (Recommended)' : ''}`)
                            w.set('subtitleY', pos.val)
                          }}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            isActive
                              ? 'bg-primary/15 border-primary text-primary font-bold shadow-sm'
                              : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                          }`}
                        >
                          <div className="text-xs font-semibold">{pos.name}</div>
                          <div className="text-[10px] opacity-80">{pos.label}</div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Range Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <span className="text-muted-foreground">Vertical Y Offset:</span>
                      <span className="font-mono text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        {Math.round(w.subtitleY)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="1"
                      value={w.subtitleY}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 78
                        w.set('subtitleY', val)
                        if (val <= 30) w.set('subtitlePosition', 'Top')
                        else if (val >= 65) w.set('subtitlePosition', 'Bottom (Recommended)')
                        else w.set('subtitlePosition', 'Center')
                      }}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>5% (Top Notch)</span>
                      <span>50% (Center)</span>
                      <span>95% (Bottom Bar)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CUSTOM STYLING & DEEP COLOR CONTROLS */}
            {activeTab === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl border border-white/10 dark:border-white/5 bg-card/60 dark:bg-zinc-900/50 backdrop-blur-xl">
                {/* Panel 1: Colors & Glow */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                    <Palette className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Colors & Highlights</h4>
                  </div>

                  {/* Primary Text Color */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground flex justify-between items-center">
                      <span>Primary Text Color</span>
                      <span className="font-mono text-muted-foreground text-[11px]">{w.subtitleColor}</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={w.subtitleColor}
                        onChange={(e) => w.set('subtitleColor', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {PRIMARY_COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => w.set('subtitleColor', swatch.hex)}
                            title={swatch.name}
                            className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                              w.subtitleColor.toLowerCase() === swatch.hex.toLowerCase()
                                ? 'ring-2 ring-primary border-white scale-110'
                                : 'border-black/20'
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Highlight / Active Word Color */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground flex justify-between items-center">
                      <span>Active Word Highlight Color</span>
                      <span className="font-mono text-primary text-[11px] font-bold">{w.subtitleHighlightColor}</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={w.subtitleHighlightColor}
                        onChange={(e) => w.set('subtitleHighlightColor', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {HIGHLIGHT_COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => w.set('subtitleHighlightColor', swatch.hex)}
                            title={swatch.name}
                            className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                              w.subtitleHighlightColor.toLowerCase() === swatch.hex.toLowerCase()
                                ? 'ring-2 ring-primary border-white scale-110'
                                : 'border-black/20'
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Radiant Neon Glow Switch & Color */}
                  <div className="p-3.5 rounded-xl border border-border/40 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="text-xs font-semibold text-foreground">Radiant Neon Glow</div>
                          <div className="text-[10px] text-muted-foreground">Multi-layer diffused lighting effect</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={w.subtitleGlow}
                        onChange={(e) => w.set('subtitleGlow', e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </div>

                    {w.subtitleGlow && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        <span className="text-[11px] text-muted-foreground">Glow Color:</span>
                        <input
                          type="color"
                          value={w.subtitleGlowColor || w.subtitleHighlightColor}
                          onChange={(e) => w.set('subtitleGlowColor', e.target.value)}
                          className="w-7 h-7 rounded border border-border cursor-pointer p-0 bg-transparent"
                        />
                        <span className="font-mono text-[11px] text-muted-foreground">{w.subtitleGlowColor}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel 2: Stroke & Background Box */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                    <Layers className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Outline & Box Background</h4>
                  </div>

                  {/* Outline / Stroke Width */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <span className="text-foreground">Outline / Stroke Width</span>
                      <span className="font-mono text-muted-foreground">{w.subtitleOutlineWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="0.5"
                      value={w.subtitleOutlineWidth}
                      onChange={(e) => w.set('subtitleOutlineWidth', parseFloat(e.target.value) || 0)}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-muted-foreground">Outline Color:</span>
                      <input
                        type="color"
                        value={w.subtitleOutline}
                        onChange={(e) => w.set('subtitleOutline', e.target.value)}
                        className="w-6 h-6 rounded border border-border cursor-pointer p-0 bg-transparent"
                      />
                      <div className="flex gap-1 ml-1">
                        {OUTLINE_COLOR_SWATCHES.map((s) => (
                          <button
                            key={s.hex}
                            type="button"
                            onClick={() => w.set('subtitleOutline', s.hex)}
                            title={s.name}
                            className="w-4 h-4 rounded-full border border-zinc-700"
                            style={{ backgroundColor: s.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Background Box Settings */}
                  <div className="p-3.5 rounded-xl border border-border/40 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-xs font-semibold text-foreground">Frosted Translucent Box</div>
                          <div className="text-[10px] text-muted-foreground">Pill background box for contrast</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={w.subtitleBox}
                        onChange={(e) => w.set('subtitleBox', e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                    </div>

                    {w.subtitleBox && (
                      <div className="space-y-3 pt-2 border-t border-border/30">
                        {/* Box Color */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Box Color</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={w.subtitleBoxColor}
                              onChange={(e) => w.set('subtitleBoxColor', e.target.value)}
                              className="w-6 h-6 rounded border border-border cursor-pointer p-0 bg-transparent"
                            />
                            <span className="font-mono text-[11px]">{w.subtitleBoxColor}</span>
                          </div>
                        </div>

                        {/* Box Opacity Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Box Opacity</span>
                            <span className="font-mono font-medium">{w.subtitleBoxOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={w.subtitleBoxOpacity}
                            onChange={(e) => w.set('subtitleBoxOpacity', parseInt(e.target.value) || 70)}
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>

                        {/* Box Border Radius */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Corner Radius</span>
                            <span className="font-mono font-medium">{w.subtitleBoxRadius}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="24"
                            step="2"
                            value={w.subtitleBoxRadius}
                            onChange={(e) => w.set('subtitleBoxRadius', parseInt(e.target.value) || 8)}
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Width Panel: Typography & Layout */}
                <div className="md:col-span-2 pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {/* Uppercase Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-primary" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">Uppercase</div>
                        <div className="text-[10px] text-muted-foreground">ALL CAPS styling</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={w.subtitleUppercase}
                      onChange={(e) => w.set('subtitleUppercase', e.target.checked)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </div>

                  {/* Font Scale Slider */}
                  <div className="space-y-1.5 p-3 rounded-xl border border-border/40 bg-muted/20">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">Font Scale</span>
                      <span className="font-mono text-primary font-bold">{w.subtitleSize}vw</span>
                    </div>
                    <input
                      type="range"
                      min="2.5"
                      max="9.0"
                      step="0.2"
                      value={w.subtitleSize}
                      onChange={(e) => w.set('subtitleSize', parseFloat(e.target.value) || 5.2)}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Max Width Slider */}
                  <div className="space-y-1.5 p-3 rounded-xl border border-border/40 bg-muted/20">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">Max Width</span>
                      <span className="font-mono text-primary font-bold">{w.subtitleMaxWidth}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="100"
                      step="2"
                      value={w.subtitleMaxWidth}
                      onChange={(e) => w.set('subtitleMaxWidth', parseInt(e.target.value) || 82)}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
