import React from 'react';
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
}

interface MainCompositionProps {
  beats: Beat[];
  burnSubtitles?: boolean;
  audioUrl?: string;
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
  };
}

export const MainComposition: React.FC<MainCompositionProps> = ({
  beats,
  burnSubtitles = true,
  audioUrl,
  subtitleStyle = {},
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
        
        if (!isVideoAsset && mediaUrl) {
          // Subtle zoom in (1 -> 1.1) or zoom out (1.1 -> 1)
          const zoomType = index % 2 === 0 ? 'in' : 'out';
          scale = zoomType === 'in' ? 1 + (0.1 * progress) : 1.1 - (0.1 * progress);
          
          // Subtle pan
          const panDir = index % 4;
          if (panDir === 1) translateX = progress * 2; // pan right
          else if (panDir === 2) translateX = -progress * 2; // pan left
          else if (panDir === 3) translateY = progress * 2; // pan down
          // panDir === 0 -> static pan
        }

        return (
          <Sequence
            key={beat.id || index}
            from={beat.startFrame}
            durationInFrames={beat.durationInFrames}
          >
            <AbsoluteFill style={{ overflow: 'hidden' }}>
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
                <AbsoluteFill style={{ backgroundColor: '#222' }} />
              )}

              {/* Beat Voiceover Audio */}
              {beat.audioUrl && (
                <Audio src={beat.audioUrl} />
              )}

              {/* Subtitles Overlay */}
              {burnSubtitles && beat.text && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${subtitleStyle.y ?? 75}%`,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <p
                    style={{
                      color: subtitleStyle.color || '#ffffff',
                      fontSize: `${(subtitleStyle.size || 5) * 1.5}vw`,
                      lineHeight: '1.2',
                      textAlign: 'center',
                      fontFamily: 'sans-serif',
                      fontWeight: '900',
                      textTransform: subtitleStyle.uppercase ? 'uppercase' : 'none',
                      maxWidth: `${subtitleStyle.maxWidth || 80}%`,
                      WebkitTextStroke: subtitleStyle.outlineWidth
                        ? `${(subtitleStyle.outlineWidth / 3)}vw ${subtitleStyle.outlineColor || '#000'}`
                        : 'none',
                      textShadow: subtitleStyle.glow
                        ? `0 0 ${(subtitleStyle.size || 5)}vw ${subtitleStyle.glowColor || 'rgba(255,255,255,0.5)'}`
                        : 'none',
                      backgroundColor: subtitleStyle.isBox
                        ? subtitleStyle.boxColor || 'rgba(0,0,0,0.5)'
                        : 'transparent',
                      padding: subtitleStyle.isBox ? '2vw 4vw' : '0',
                      borderRadius: subtitleStyle.isBox ? '1vw' : '0',
                      margin: 0,
                    }}
                  >
                    {beat.text}
                  </p>
                </div>
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
