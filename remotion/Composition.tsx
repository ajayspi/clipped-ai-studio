import React from 'react'
import { AbsoluteFill, Sequence, Video as RemotionVideo, Audio, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'

export interface BeatProp {
  id: string
  text: string
  duration: number
  clipUrl?: string
  audioUrl?: string
}

export interface WatermarkConfig {
  url?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  scale?: number;
  margin?: number;
  handle?: string;
  showHandleBadge?: boolean;
}

export interface MainCompositionProps {
  beats: BeatProp[]
  burnSubtitles: boolean
  subtitleStyle?: {
    y?: number
    color?: string
    highlightColor?: string
    glow?: boolean
    glowColor?: string
    size?: number
    outlineWidth?: number
    outlineColor?: string
    isBox?: boolean
    boxColor?: string
    boxOpacity?: number
    boxRadius?: number
    letterSpacing?: number
    uppercase?: boolean
    maxWidth?: number
  }
  bgmUrl?: string
  watermarkUrl?: string
  watermarkConfig?: WatermarkConfig
}

// Decoupled subtitle overlay with Hormozi-style word-by-word pop animations and neon/glow effects
const SubtitleOverlay: React.FC<{ text?: string, styleConfig?: Partial<MainCompositionProps['subtitleStyle']>, durationInFrames: number }> = ({ text, styleConfig, durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  
  const words = (text || '').split(' ').filter(w => w.trim() !== '')
  if (words.length === 0) return null
  const framesPerWord = Math.max(1, durationInFrames / words.length)
  
  const y = styleConfig?.y ?? 78
  const maxWidth = styleConfig?.maxWidth ?? 82
  const isBox = Boolean(styleConfig?.isBox)
  const boxColor = styleConfig?.boxColor || '#000000'
  const rawBoxOpacity = styleConfig?.boxOpacity !== undefined ? styleConfig.boxOpacity : (isBox ? 70 : 0)
  const boxOpacity = rawBoxOpacity > 1 ? rawBoxOpacity / 100 : rawBoxOpacity
  const boxRadius = styleConfig?.boxRadius ?? 8
  const textColor = styleConfig?.color || '#ffffff'
  const highlightColor = styleConfig?.highlightColor || '#facc15'
  const size = styleConfig?.size ?? 5.2
  const outlineWidth = styleConfig?.outlineWidth ?? 2.5
  const outlineColor = styleConfig?.outlineColor || '#000000'
  const glow = Boolean(styleConfig?.glow)
  const glowColor = styleConfig?.glowColor || highlightColor || '#22d3ee'
  const uppercase = Boolean(styleConfig?.uppercase)
  const letterSpacing = styleConfig?.letterSpacing ?? (uppercase ? 0.5 : 0)

  // Convert hex boxColor to rgba if needed
  const getBoxBackground = () => {
    if (!isBox) return 'transparent'
    if (boxColor.startsWith('#') && (boxColor.length === 7 || boxColor.length === 4)) {
      let r = 0, g = 0, b = 0
      if (boxColor.length === 7) {
        r = parseInt(boxColor.slice(1, 3), 16)
        g = parseInt(boxColor.slice(3, 5), 16)
        b = parseInt(boxColor.slice(5, 7), 16)
      } else {
        r = parseInt(boxColor[1] + boxColor[1], 16)
        g = parseInt(boxColor[2] + boxColor[2], 16)
        b = parseInt(boxColor[3] + boxColor[3], 16)
      }
      return `rgba(${r}, ${g}, ${b}, ${boxOpacity})`
    }
    return boxColor
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}%`,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px 12px',
          maxWidth: `${maxWidth}%`,
          backgroundColor: getBoxBackground(),
          backdropFilter: isBox ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: isBox ? 'blur(12px)' : 'none',
          border: isBox ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
          padding: isBox ? '12px 24px' : '0',
          borderRadius: `${boxRadius}px`,
          boxShadow: isBox ? '0 8px 32px rgba(0, 0, 0, 0.4)' : 'none',
        }}
      >
        {words.map((word, i) => {
          const wordStartFrame = i * framesPerWord;
          // Pop animation using spring
          const scale = spring({
            fps,
            frame: frame - wordStartFrame,
            config: { damping: 12, stiffness: 220, mass: 0.4 },
          });
          
          // Color highlight: current active word gets highlightColor
          const isActive = frame >= wordStartFrame && frame < (i + 1) * framesPerWord;
          
          // Hidden before start frame
          if (frame < wordStartFrame) return <span key={i} style={{ opacity: 0 }}>{word}</span>;
          
          // Dynamic text shadow with outline and neon glow support
          let textShadow = 'none'
          if (glow && isActive) {
            textShadow = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 35px ${glowColor}, 0 0 ${outlineWidth}px ${outlineColor}`
          } else if (outlineWidth > 0) {
            textShadow = `0 0 ${outlineWidth}px ${outlineColor}, 0 0 ${outlineWidth}px ${outlineColor}, 0 2px 8px rgba(0,0,0,0.8)`
          } else {
            textShadow = '0 2px 8px rgba(0,0,0,0.6)'
          }

          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                transform: `scale(${isActive ? scale : 1})`,
                color: isActive ? highlightColor : textColor,
                fontSize: `${size}vw`,
                fontWeight: '900',
                letterSpacing: `${letterSpacing}px`,
                textShadow: textShadow,
                textTransform: uppercase ? 'uppercase' : 'none',
                filter: isActive && glow ? `drop-shadow(0 0 8px ${glowColor})` : 'none',
              }}
            >
              {word}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// Watermark overlay component supporting 5 anchor positions, scale, opacity, and handle pill badge
export const WatermarkOverlay: React.FC<{ config?: WatermarkConfig; defaultUrl?: string }> = ({ config, defaultUrl }) => {
  const url = config?.url || defaultUrl;
  if (!url) return null;

  const position = config?.position || 'top-right';
  const opacity = config?.opacity ?? 0.85;
  const scale = config?.scale ?? 1.0;
  const margin = config?.margin ?? 32;

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: `${margin}px`, left: `${margin}px` },
    'top-right': { top: `${margin}px`, right: `${margin}px` },
    'bottom-left': { bottom: `${margin + 60}px`, left: `${margin}px` }, // Offset above subtitle area
    'bottom-right': { bottom: `${margin + 60}px`, right: `${margin}px` },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  };

  const isLeft = position.includes('left');
  const isCenter = position === 'center';

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 1000,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isLeft ? 'flex-start' : (isCenter ? 'center' : 'flex-end'),
        gap: '6px',
        pointerEvents: 'none',
        ...positionStyles[position],
      }}
    >
      <img
        src={url}
        style={{
          width: `${Math.round(120 * scale)}px`,
          height: 'auto',
          borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          objectFit: 'contain',
        }}
        alt="Brand Watermark"
      />
      {config?.handle && (
        <span
          style={{
            fontSize: `${Math.max(10, Math.round(12 * scale))}px`,
            fontWeight: 800,
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '2px 8px',
            borderRadius: '6px',
            letterSpacing: '0.5px',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {config.handle.startsWith('@') ? config.handle : `@${config.handle}`}
        </span>
      )}
    </div>
  );
};

// Pure React Component independent of Next.js / Zustand
export const MainComposition: React.FC<MainCompositionProps> = (props) => {
  const { beats = [], burnSubtitles, subtitleStyle } = props;
  const { fps } = useVideoConfig()
  let currentFrame = 0
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {(beats || []).map((beat, idx) => {
        const durationInFrames = Math.max(1, Math.floor((beat.duration || 3) * fps))
        const startFrame = currentFrame
        currentFrame += durationInFrames
        
        const clipUrl = beat.clipUrl
        const isVideo = clipUrl ? (clipUrl.endsWith('.mp4') || clipUrl.includes('.mp4')) : true
        
        return (
          <Sequence key={beat.id || `beat-${idx}`} from={startFrame} durationInFrames={durationInFrames}>
            <AbsoluteFill style={{ alignItems: 'center', justifyItems: 'center' }}>
              {clipUrl && isVideo && (
                <RemotionVideo src={clipUrl} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
              )}
              {clipUrl && !isVideo && (
                <img src={clipUrl} style={{ objectFit: 'cover', width: '100%', height: '100%' }} alt="clip" />
              )}
              {beat.audioUrl && <Audio src={beat.audioUrl} />}
              {burnSubtitles && <SubtitleOverlay text={beat.text || ''} styleConfig={subtitleStyle} durationInFrames={durationInFrames} />}
            </AbsoluteFill>
          </Sequence>
        )
      })}
      
      {/* Background Music Track */}
      {props.bgmUrl && <Audio src={props.bgmUrl} volume={0.15} />}
      
      {/* Floating Watermark / Brand Logo & Handle */}
      {(props.watermarkConfig?.url || props.watermarkUrl) && (
        <WatermarkOverlay config={props.watermarkConfig} defaultUrl={props.watermarkUrl} />
      )}
    </AbsoluteFill>
  )
}
