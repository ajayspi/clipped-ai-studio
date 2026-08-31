import React from 'react'
import { AbsoluteFill, Sequence, Video as RemotionVideo, Audio, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'

export interface BeatProp {
  id: string
  text: string
  duration: number
  clipUrl?: string
  audioUrl?: string
}

export interface MainCompositionProps {
  beats: BeatProp[]
  burnSubtitles: boolean
  subtitleStyle: {
    y: number
    color: string
    size: number
    outlineWidth: number
    outlineColor: string
    isBox: boolean
    boxColor: string
    uppercase: boolean
    maxWidth: number
  }
  bgmUrl?: string
  watermarkUrl?: string
}

// Decoupled subtitle overlay with Hormozi-style word-by-word pop animations
const SubtitleOverlay: React.FC<{ text: string, styleConfig: MainCompositionProps['subtitleStyle'], durationInFrames: number }> = ({ text, styleConfig, durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  
  const words = text.split(' ').filter(w => w.trim() !== '')
  const framesPerWord = Math.max(1, durationInFrames / words.length)
  
  return (
    <div
      style={{
        position: 'absolute',
        top: `${styleConfig.y}%`,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '8px',
          maxWidth: `${styleConfig.maxWidth}%`,
          backgroundColor: styleConfig.isBox ? styleConfig.boxColor : 'transparent',
          padding: styleConfig.isBox ? '10px 20px' : '0',
          borderRadius: styleConfig.isBox ? '8px' : '0',
        }}
      >
        {words.map((word, i) => {
          const wordStartFrame = i * framesPerWord;
          // Pop animation using spring
          const scale = spring({
            fps,
            frame: frame - wordStartFrame,
            config: { damping: 12, stiffness: 200, mass: 0.5 },
          });
          
          // Color highlight: current active word gets primary color, others get secondary/white
          const isActive = frame >= wordStartFrame && frame < (i + 1) * framesPerWord;
          const isPast = frame >= (i + 1) * framesPerWord;
          
          // Hidden before start frame
          if (frame < wordStartFrame) return <span key={i} style={{ opacity: 0 }}>{word}</span>;
          
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                transform: `scale(${isActive ? scale : 1})`,
                color: isActive ? '#facc15' : styleConfig.color, // Yellow highlight for active word
                fontSize: `${styleConfig.size}vw`,
                fontWeight: '900',
                textShadow: `0 0 ${styleConfig.outlineWidth}px ${styleConfig.outlineColor}, 0 0 ${styleConfig.outlineWidth}px ${styleConfig.outlineColor}, 0 0 ${styleConfig.outlineWidth + 2}px rgba(0,0,0,0.5)`,
                textTransform: styleConfig.uppercase ? 'uppercase' : 'none',
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

// Pure React Component independent of Next.js / Zustand
export const MainComposition: React.FC<MainCompositionProps> = (props) => {
  const { beats, burnSubtitles, subtitleStyle } = props;
  const { fps } = useVideoConfig()
  let currentFrame = 0
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {beats.map((beat) => {
        const durationInFrames = Math.max(1, Math.floor(beat.duration * fps))
        const startFrame = currentFrame
        currentFrame += durationInFrames
        
        const clipUrl = beat.clipUrl
        const isVideo = clipUrl?.endsWith('.mp4') || clipUrl?.includes('.mp4') || true // Assume video for most stock 
        // Note: For full production, you'd distinguish image vs video properly using mime types.
        
        return (
          <Sequence key={beat.id} from={startFrame} durationInFrames={durationInFrames}>
            <AbsoluteFill style={{ alignItems: 'center', justifyItems: 'center' }}>
              {clipUrl && isVideo && (
                <RemotionVideo src={clipUrl} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
              )}
              {clipUrl && !isVideo && (
                <img src={clipUrl} style={{ objectFit: 'cover', width: '100%', height: '100%' }} alt="clip" />
              )}
              {beat.audioUrl && <Audio src={beat.audioUrl} />}
              {burnSubtitles && <SubtitleOverlay text={beat.text} styleConfig={subtitleStyle} durationInFrames={durationInFrames} />}
            </AbsoluteFill>
          </Sequence>
        )
      })}
      
      {/* Background Music Track */}
      {props.bgmUrl && <Audio src={props.bgmUrl} volume={0.15} />}
      
      {/* Floating Watermark / Brand Logo */}
      {props.watermarkUrl && (
        <div style={{ position: 'absolute', top: '40px', right: '40px', zIndex: 1000, opacity: 0.8 }}>
          <img src={props.watermarkUrl} style={{ width: '120px', height: 'auto', borderRadius: '12px' }} alt="Brand Watermark" />
        </div>
      )}
    </AbsoluteFill>
  )
}
