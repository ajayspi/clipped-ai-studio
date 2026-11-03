import React from 'react';
import type { BrandDesignTokens } from '@/lib/engine/types';
import { sampleEasing } from '@/lib/engine/brand-tokens-presets';
import { KineticCalloutsOverlay } from '@/lib/engine/kinetic-callouts';
import {
  calculateOrigamiFoldTransform,
  computeStopMotionJitter,
  PAPERCRAFT_STYLE_PRESETS,
  PaperFastener,
  type PaperStyleId,
  type OrigamiFoldType,
  type FastenerType,
} from '@/lib/engine/papercraft-studio';
import {
  AudioDrivenAvatar,
  type TalkingAvatarConfig,
} from '@/lib/engine/talking-avatar';
import {
  WaveDromOverlay,
  type WaveJson,
} from '@/lib/engine/wavedrom-renderer';
import {
  evaluateActiveWordAndCues,
  type VisoBeat,
} from '@/lib/engine/visotalk-orchestrator';
import {
  HormoziKineticCaptions,
} from '@/lib/engine/kinetic-captions';
import {
  CodeMorphViewer,
  type CodeMorphSpec,
} from '@/lib/engine/code-morph-engine';
import {
  BarChartRaceViewer,
  type BarChartRaceSpec,
} from '@/lib/engine/bar-chart-race';
import {
  PBRStudioViewer,
  type PBRPropConfig,
} from '@/lib/engine/pbr-materials';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Video,
  Audio,
} from 'remotion';

interface Beat {
  id: string;
  text: string;
  duration: number; // in seconds
  clipUrl?: string; // background video/image
  imageUrl?: string; 
  videoUrl?: string;
  audioUrl?: string;
  selectedVideo?: { url?: string; thumbnail?: string };
  paperStyle?: PaperStyleId;
  origamiFold?: OrigamiFoldType;
  fastener?: FastenerType;
  avatarConfig?: TalkingAvatarConfig;
  waveJson?: WaveJson;
  visotalkBeat?: VisoBeat;
  codeMorph?: CodeMorphSpec;
  chartRace?: BarChartRaceSpec;
  pbrProp?: PBRPropConfig;
  hormoziCaptions?: boolean;
}

interface MainCompositionProps {
  beats: Beat[];
  burnSubtitles?: boolean;
  audioUrl?: string;
  avatarConfig?: TalkingAvatarConfig;
  subtitleStyle?: {
    y?: number;
    color?: string;
    size?: number;
    highlightColor?: string;
    glow?: boolean;
    glowColor?: string;
    outlineWidth?: number;
    outlineColor?: string;
    isBox?: boolean;
    boxColor?: string;
    uppercase?: boolean;
    maxWidth?: number;
    fontFamily?: string;
    fontWeight?: string;
    hormoziCaptions?: boolean;
  };
  brandTokens?: BrandDesignTokens;
  papercraftMode?: boolean;
  defaultPaperStyle?: PaperStyleId;
  defaultOrigamiFold?: OrigamiFoldType;
}

export const MainComposition: React.FC<MainCompositionProps> = ({
  beats,
  burnSubtitles = true,
  audioUrl,
  subtitleStyle = {},
  brandTokens,
  papercraftMode = false,
  defaultPaperStyle = 'vintage_newsprint',
  defaultOrigamiFold,
  avatarConfig,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Calculate start frame for each beat immutably
  const beatsWithTiming = beats.reduce((acc, beat) => {
    const durationInFrames = Math.max(1, Math.round(beat.duration * fps));
    const startFrame = acc.length > 0 ? acc[acc.length - 1].startFrame + acc[acc.length - 1].durationInFrames : 0;
    acc.push({ ...beat, startFrame, durationInFrames });
    return acc;
  }, [] as (Beat & { startFrame: number; durationInFrames: number })[]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Top-level composition audio if provided */}
      {audioUrl && <Audio src={audioUrl} />}

      {beatsWithTiming.map((beat, index) => {
        // Prefer video over image
        const isVideoAsset = !!(beat.videoUrl || (beat.clipUrl && (beat.clipUrl.endsWith('.mp4') || beat.clipUrl.endsWith('.webm'))));
        const mediaUrl = beat.videoUrl || beat.clipUrl || beat.imageUrl || beat.selectedVideo?.url || beat.selectedVideo?.thumbnail;
          
        // Deterministic Ken Burns logic for images
        // We use the beat index to alternate scale/pan directions
        const progress = frame / beat.durationInFrames;
        
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        
        // Open Props brand motion easing for Ken Burns zoom & pan
        const motionEasing = brandTokens?.motion?.zoomPanEasing || brandTokens?.motion?.easingCurve || 'ease-3';
        const easedProgress = sampleEasing(motionEasing, progress);

        if (!isVideoAsset && mediaUrl) {
          // Subtle zoom in (1 -> 1.1) or zoom out (1.1 -> 1) with Open Props easing
          const zoomType = index % 2 === 0 ? 'in' : 'out';
          scale = zoomType === 'in' ? 1 + (0.1 * easedProgress) : 1.1 - (0.1 * easedProgress);
          
          // Subtle pan with Open Props easing
          const panDir = index % 4;
          if (panDir === 1) translateX = easedProgress * 2; // pan right
          else if (panDir === 2) translateX = -easedProgress * 2; // pan left
          else if (panDir === 3) translateY = easedProgress * 2; // pan down
          // panDir === 0 -> static pan
        }

        const isPapercraft = papercraftMode || !!beat.paperStyle;
        const paperStyleKey = beat.paperStyle || defaultPaperStyle;
        const paperConfig = PAPERCRAFT_STYLE_PRESETS[paperStyleKey] || PAPERCRAFT_STYLE_PRESETS.vintage_newsprint;
        const foldType: OrigamiFoldType | undefined = beat.origamiFold || defaultOrigamiFold || (isPapercraft ? 'accordion_h' : undefined);
        const fastenerType: FastenerType = beat.fastener || 'masking_tape';

        const beatFrameOffset = Math.max(0, frame - beat.startFrame);

        // 12 FPS stop-motion tactile paper jitter
        const jitter = isPapercraft ? computeStopMotionJitter(frame, fps) : { rotateDeg: 0, translateX: 0, translateY: 0 };

        // 3D Origami Folding Transition
        let foldTransform = null;
        if (foldType) {
          const foldDuration = Math.min(16, Math.max(6, Math.floor(beat.durationInFrames * 0.3)));
          const foldProgress = Math.min(1, beatFrameOffset / foldDuration);
          foldTransform = calculateOrigamiFoldTransform(foldType, foldProgress, 'enter');
        }

        return (
          <Sequence
            key={beat.id || index}
            from={beat.startFrame}
            durationInFrames={beat.durationInFrames}
          >
            <AbsoluteFill style={{ overflow: 'hidden' }}>
              {/* Papercraft Backdrop & Perspective Plane */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  backgroundColor: isPapercraft ? paperConfig.backgroundColor : 'black',
                  perspective: '1200px',
                }}
              >
              {/* 3D Origami Fold Container */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transform: foldTransform ? foldTransform.leftTransform : undefined,
                  opacity: foldTransform ? foldTransform.leftOpacity : 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {/* Papercraft Card Framing or Fullscreen Media */}
                <div
                  style={{
                    width: isPapercraft ? '88%' : '100%',
                    height: isPapercraft ? '80%' : '100%',
                    position: 'relative',
                    transform: isPapercraft ? `rotate(${jitter.rotateDeg}deg) translate(${jitter.translateX}px, ${jitter.translateY}px)` : undefined,
                    backgroundColor: isPapercraft ? paperConfig.cardColor : '#222',
                    boxShadow: isPapercraft ? paperConfig.dropShadow : undefined,
                    borderRadius: isPapercraft ? '8px' : '0px',
                    border: isPapercraft ? `3px solid ${paperConfig.borderColor}` : 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* Papercraft Fasteners on Corners */}
                  {isPapercraft && (
                    <>
                      <PaperFastener type={fastenerType} position="top-left" />
                      <PaperFastener type={fastenerType} position="top-right" />
                    </>
                  )}

                  {/* Media Background */}
                  {mediaUrl && isVideoAsset ? (
                    <Video src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : mediaUrl ? (
                    <Img 
                      src={mediaUrl} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`
                      }} 
                    />
                  ) : (
                    <AbsoluteFill style={{ backgroundColor: isPapercraft ? paperConfig.cardColor : '#222' }} />
                  )}

                  {/* Origami Crease Shading Overlay */}
                  {foldTransform && foldTransform.shadingOpacity > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background: 'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, transparent 40%, rgba(0,0,0,0.5) 50%, transparent 60%, rgba(0,0,0,0.35) 100%)',
                        opacity: foldTransform.shadingOpacity,
                        zIndex: 15,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

              {/* Audio-Driven Talking Avatar Overlay (PiP, Bubble, Fullscreen) */}
              {(beat.avatarConfig || avatarConfig) && (
                <AudioDrivenAvatar
                  avatarUrl={(beat.avatarConfig || avatarConfig)!.avatarUrl}
                  layout={(beat.avatarConfig || avatarConfig)!.layout || 'pip_bottom_right'}
                  name={(beat.avatarConfig || avatarConfig)!.name}
                  title={(beat.avatarConfig || avatarConfig)!.title}
                  preset={(beat.avatarConfig || avatarConfig)!.preset}
                  borderColor={(beat.avatarConfig || avatarConfig)!.borderColor}
                  glowColor={(beat.avatarConfig || avatarConfig)!.glowColor}
                  speakingGlow={(beat.avatarConfig || avatarConfig)!.speakingGlow ?? true}
                  frameInBeat={Math.max(0, frame - beat.startFrame)}
                  durationInFrames={beat.durationInFrames}
                />
              )}

              {/* WaveDrom Digital Timing Diagram Overlay */}
              {beat.waveJson && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 22,
                    padding: '40px',
                    pointerEvents: 'none',
                  }}
                >
                  <WaveDromOverlay
                    waveJson={beat.waveJson}
                    progress={progress}
                    width={920}
                  />
                </div>
              )}

              {/* Fireship Smooth Code Token-Morphing Overlay */}
              {beat.codeMorph && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 23,
                    padding: '40px',
                    pointerEvents: 'none',
                  }}
                >
                  <CodeMorphViewer
                    spec={beat.codeMorph}
                    progress={progress}
                    width={920}
                  />
                </div>
              )}

              {/* Bar Chart Race Data Visualization Overlay */}
              {beat.chartRace && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 23,
                    padding: '40px',
                    pointerEvents: 'none',
                  }}
                >
                  <BarChartRaceViewer
                    spec={beat.chartRace}
                    progress={progress}
                    width={920}
                  />
                </div>
              )}

              {/* 3DTexel Procedural PBR Material & Studio Lighting Overlay */}
              {beat.pbrProp && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 23,
                    padding: '40px',
                    pointerEvents: 'none',
                  }}
                >
                  <PBRStudioViewer
                    config={beat.pbrProp}
                    progress={progress}
                    width={880}
                    height={460}
                  />
                </div>
              )}

              {/* VisoTalk Word-Anchored Declarative Cues Overlay */}
              {beat.visotalkBeat && (
                <div
                  style={{
                    position: 'absolute',
                    top: '80px',
                    left: '60px',
                    right: '60px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    zIndex: 24,
                    pointerEvents: 'none',
                  }}
                >
                  {evaluateActiveWordAndCues(
                    beat.visotalkBeat,
                    (beatFrameOffset / fps) * 1000
                  ).activeCues.map((cue) => (
                    <div
                      key={cue.id}
                      style={{
                        backgroundColor: 'rgba(139, 92, 246, 0.25)',
                        border: '2px solid #8b5cf6',
                        color: '#c4b5fd',
                        padding: '8px 18px',
                        borderRadius: '12px',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        boxShadow: '0 0 16px rgba(139, 92, 246, 0.4)',
                      }}
                    >
                      ✨ {cue.label || cue.id}
                    </div>
                  ))}
                </div>
              )}

              {/* Beat Voiceover Audio */}
              {beat.audioUrl && (
                <Audio src={beat.audioUrl} />
              )}

              {/* Nafay 3D Kinetic Callouts Overlay (Highlighters, Circles, Metric Tickers) */}
              {beat.text && (
                <KineticCalloutsOverlay
                  beatText={beat.text}
                  frameInBeat={Math.max(0, frame - beat.startFrame)}
                  durationInFrames={beat.durationInFrames}
                  highlightColor={subtitleStyle.highlightColor || (isPapercraft ? paperConfig.accentColor : brandTokens?.colors?.accent)}
                />
              )}

              {/* Subtitles Overlay with Open Props Kinetic Pop or Hormozi Bouncy Words */}
              {burnSubtitles && beat.text && (() => {
                if (beat.visotalkBeat && (beat.hormoziCaptions || subtitleStyle.hormoziCaptions)) {
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        top: `${subtitleStyle.y ?? 78}%`,
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        pointerEvents: 'none',
                        zIndex: 35,
                      }}
                    >
                      <HormoziKineticCaptions
                        words={beat.visotalkBeat.words}
                        currentTimeMs={(beatFrameOffset / fps) * 1000}
                        theme="hormozi_yellow"
                      />
                    </div>
                  );
                }

                const popDuration = Math.min(12, Math.max(4, Math.floor(beat.durationInFrames * 0.2)));
                const popProgress = Math.min(1, beatFrameOffset / popDuration);
                const subtitleEasing = brandTokens?.motion?.easingCurve || 'ease-elastic-3';
                const popEased = sampleEasing(subtitleEasing, popProgress);
                const popScale = 0.88 + 0.12 * popEased;

                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${subtitleStyle.y ?? (isPapercraft ? 82 : 75)}%`,
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      pointerEvents: 'none',
                      zIndex: 30,
                    }}
                  >
                    <p
                      style={{
                        color: isPapercraft ? paperConfig.textColor : (subtitleStyle.color || brandTokens?.colors?.primary || '#ffffff'),
                        fontSize: `${(subtitleStyle.size || 5) * 1.5}vw`,
                        lineHeight: '1.25',
                        textAlign: 'center',
                        fontFamily: subtitleStyle.fontFamily || (isPapercraft ? 'Georgia, serif' : (brandTokens?.typography?.fontFamily || 'sans-serif')),
                        fontWeight: subtitleStyle.fontWeight || (isPapercraft ? '800' : (brandTokens?.typography?.fontWeight || '900')),
                        textTransform: subtitleStyle.uppercase ? 'uppercase' : (brandTokens?.typography?.textTransform || 'none'),
                        maxWidth: `${subtitleStyle.maxWidth || (isPapercraft ? 84 : 80)}%`,
                        transform: `scale(${popScale})`,
                        transformOrigin: 'center center',
                        WebkitTextStroke: isPapercraft 
                          ? 'none' 
                          : (subtitleStyle.outlineWidth ? `${(subtitleStyle.outlineWidth / 3)}vw ${subtitleStyle.outlineColor || brandTokens?.colors?.outlineColor || '#000'}` : 'none'),
                        textShadow: isPapercraft 
                          ? '0 1px 2px rgba(0,0,0,0.15)' 
                          : (subtitleStyle.glow ? `0 0 ${(subtitleStyle.size || 5)}vw ${subtitleStyle.glowColor || 'rgba(255,255,255,0.5)'}` : (brandTokens?.colors?.shadow || 'none')),
                        backgroundColor: isPapercraft 
                          ? 'rgba(255, 255, 255, 0.92)' 
                          : (subtitleStyle.isBox ? (subtitleStyle.boxColor || brandTokens?.colors?.background || 'rgba(0,0,0,0.5)') : 'transparent'),
                        padding: isPapercraft ? '1.5vw 3vw' : (subtitleStyle.isBox ? '2vw 4vw' : '0'),
                        borderRadius: isPapercraft ? '4px' : (subtitleStyle.isBox ? '1vw' : '0'),
                        boxShadow: isPapercraft ? '0 4px 12px rgba(0,0,0,0.18)' : 'none',
                        margin: 0,
                      }}
                    >
                      {beat.text}
                    </p>
                  </div>
                );
              })()}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
