import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Video,
} from 'remotion';

interface Beat {
  id: string;
  text: string;
  duration: number; // in seconds
  clipUrl?: string; // background video/image
  imageUrl?: string; 
  videoUrl?: string;
  selectedVideo?: { url?: string; thumbnail?: string };
}

interface MainCompositionProps {
  beats: Beat[];
  burnSubtitles?: boolean;
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
  subtitleStyle = {},
}) => {
  const { fps } = useVideoConfig();

  // Calculate start frame for each beat
  let currentFrame = 0;
  const beatsWithTiming = beats.map((beat) => {
    const durationInFrames = Math.max(1, Math.round(beat.duration * fps));
    const startFrame = currentFrame;
    currentFrame += durationInFrames;
    return {
      ...beat,
      startFrame,
      durationInFrames,
    };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {beatsWithTiming.map((beat, index) => {
        // Resolve media URL from various possible properties
        const mediaUrl =
          beat.clipUrl ||
          beat.videoUrl ||
          beat.selectedVideo?.url ||
          beat.imageUrl ||
          beat.selectedVideo?.thumbnail;
          
        const isVideo = mediaUrl?.toLowerCase().endsWith('.mp4') || mediaUrl?.toLowerCase().endsWith('.webm');

        return (
          <Sequence
            key={beat.id || index}
            from={beat.startFrame}
            durationInFrames={beat.durationInFrames}
          >
            <AbsoluteFill>
              {/* Media Background */}
              {mediaUrl && isVideo ? (
                <Video src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : mediaUrl ? (
                <Img src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <AbsoluteFill style={{ backgroundColor: '#222' }} />
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
                      fontSize: `${subtitleStyle.size || 5}rem`,
                      textAlign: 'center',
                      fontFamily: 'sans-serif',
                      fontWeight: 'bold',
                      textTransform: subtitleStyle.uppercase ? 'uppercase' : 'none',
                      maxWidth: `${subtitleStyle.maxWidth || 80}%`,
                      WebkitTextStroke: subtitleStyle.outlineWidth
                        ? `${subtitleStyle.outlineWidth}px ${subtitleStyle.outlineColor || '#000'}`
                        : 'none',
                      textShadow: subtitleStyle.glow
                        ? `0 0 10px ${subtitleStyle.glowColor || 'rgba(255,255,255,0.5)'}`
                        : 'none',
                      backgroundColor: subtitleStyle.isBox
                        ? subtitleStyle.boxColor || 'rgba(0,0,0,0.5)'
                        : 'transparent',
                      padding: subtitleStyle.isBox ? '10px 20px' : '0',
                      borderRadius: subtitleStyle.isBox ? '8px' : '0',
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
