/**
 * Audio-Driven Talking Avatar Component & Presenter Framing Engine
 * 
 * Inspired by andyhuo520/digital-human-koubo and modern picture-in-picture creator packaging.
 * Enables $0-compute, audio-reactive presenter avatars with head bobbing, speaking border glow,
 * rhythmic jaw cadence, and flexible PiP/split-screen framing in Remotion & React.
 */

import React from 'react';
import type { AvatarLayout } from './types';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AvatarVisualPreset = 'creator_neon' | 'anchor_dark' | 'podcast_mic' | 'minimal_bubble';

export interface AvatarPhysicsState {
  bobY: number; // Vertical head bob in pixels
  tiltDeg: number; // Rotational head tilt in degrees
  pulseScale: number; // Audio-reactive breathing / speech scale multiplier
  jawScaleY: number; // Rhythmic speech cadence micro-expansion
  glowIntensity: number; // Speaking border glow radius / opacity multiplier
  isSpeaking: boolean;
}

export interface TalkingAvatarConfig {
  avatarUrl: string;
  layout?: AvatarLayout;
  name?: string;
  title?: string;
  preset?: AvatarVisualPreset;
  borderColor?: string;
  glowColor?: string;
  speakingGlow?: boolean;
}

export interface AudioDrivenAvatarProps extends TalkingAvatarConfig {
  frameInBeat: number;
  durationInFrames: number;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================================================
// Visual Presets Catalog
// ============================================================================

export interface AvatarPresetStyling {
  id: AvatarVisualPreset;
  name: string;
  borderColor: string;
  glowColor: string;
  borderRadius: string;
  badgeBg: string;
  badgeText: string;
  showBadge: boolean;
}

export const TALKING_AVATAR_PRESETS: Record<AvatarVisualPreset, AvatarPresetStyling> = {
  creator_neon: {
    id: 'creator_neon',
    name: 'Creator Neon',
    borderColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.65)',
    borderRadius: '24px',
    badgeBg: 'rgba(245, 158, 11, 0.9)',
    badgeText: '#000000',
    showBadge: true,
  },
  anchor_dark: {
    id: 'anchor_dark',
    name: 'Broadcast Anchor',
    borderColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.55)',
    borderRadius: '16px',
    badgeBg: 'rgba(15, 23, 42, 0.9)',
    badgeText: '#38bdf8',
    showBadge: true,
  },
  podcast_mic: {
    id: 'podcast_mic',
    name: 'Studio Podcast Host',
    borderColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.6)',
    borderRadius: '50%',
    badgeBg: 'rgba(236, 72, 153, 0.9)',
    badgeText: '#ffffff',
    showBadge: false,
  },
  minimal_bubble: {
    id: 'minimal_bubble',
    name: 'Minimal Floating Bubble',
    borderColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: '50%',
    badgeBg: 'rgba(0, 0, 0, 0.7)',
    badgeText: '#ffffff',
    showBadge: false,
  },
};

// ============================================================================
// Deterministic Audio-Reactive Physics Engine
// ============================================================================

/**
 * Calculates head bob, micro-tilt, speaking border glow, and cadence expansion.
 * Operates purely deterministically on frame progress without needing GPU inference.
 */
export function calculateAvatarPhysics(
  frameInBeat: number,
  durationInFrames: number,
  isSpeechActive: boolean = true
): AvatarPhysicsState {
  // Speech is active across the majority of the beat, with natural brief pauses at start and tail
  const speechStartFrame = 3;
  const speechEndFrame = Math.max(speechStartFrame + 5, durationInFrames - 6);
  const isSpeaking = isSpeechActive && frameInBeat >= speechStartFrame && frameInBeat <= speechEndFrame;

  if (isSpeaking) {
    // Active speaking cadence
    const speechProgress = frameInBeat;
    
    // Smooth natural head bob (sinusoidal modulation)
    const bobY = Number((Math.sin(speechProgress * 0.42) * 3.8).toFixed(2));
    
    // Subtle conversational tilt (-1.5 deg to +1.5 deg)
    const tiltDeg = Number((Math.sin(speechProgress * 0.18) * 1.6).toFixed(2));
    
    // Vocal emphasis scale pulse (1.0 to 1.035)
    const pulseScale = Number((1.0 + Math.abs(Math.sin(speechProgress * 0.52)) * 0.035).toFixed(3));
    
    // Rhythmic jaw micro-cadence (simulating speech articulation)
    const jawScaleY = Number((1.0 + Math.max(0, Math.sin(speechProgress * 0.85)) * 0.028).toFixed(3));
    
    // Glow pulsation frequency
    const glowIntensity = Number((0.7 + 0.3 * Math.sin(speechProgress * 0.6)).toFixed(2));

    return {
      bobY,
      tiltDeg,
      pulseScale,
      jawScaleY,
      glowIntensity,
      isSpeaking: true,
    };
  }

  // Idle / Breathing state during pauses
  const idleProgress = frameInBeat;
  const bobY = Number((Math.sin(idleProgress * 0.12) * 1.2).toFixed(2));
  
  return {
    bobY,
    tiltDeg: 0,
    pulseScale: 1.0,
    jawScaleY: 1.0,
    glowIntensity: 0.25,
    isSpeaking: false,
  };
}

// ============================================================================
// Layout Positioning Calculations
// ============================================================================

export function getAvatarLayoutStyles(layout: AvatarLayout = 'pip_bottom_right'): React.CSSProperties {
  switch (layout) {
    case 'pip_bottom_right':
      return {
        position: 'absolute',
        bottom: '5%',
        right: '4%',
        width: '26vw',
        height: '26vw',
        maxWidth: '220px',
        maxHeight: '220px',
        zIndex: 25,
      };

    case 'pip_bottom_left':
      return {
        position: 'absolute',
        bottom: '5%',
        left: '4%',
        width: '26vw',
        height: '26vw',
        maxWidth: '220px',
        maxHeight: '220px',
        zIndex: 25,
      };

    case 'circular_bubble':
      return {
        position: 'absolute',
        bottom: '7%',
        right: '5%',
        width: '22vw',
        height: '22vw',
        maxWidth: '190px',
        maxHeight: '190px',
        zIndex: 25,
      };

    case 'fullscreen':
      return {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 10,
      };

    case 'side_by_side':
      return {
        position: 'absolute',
        top: '10%',
        left: '4%',
        width: '45vw',
        height: '75vh',
        zIndex: 20,
      };
  }
}

// ============================================================================
// Audio-Driven Avatar React Component
// ============================================================================

export const AudioDrivenAvatar: React.FC<AudioDrivenAvatarProps> = ({
  avatarUrl,
  layout = 'pip_bottom_right',
  name = 'Presenter',
  title = 'AI Host',
  preset = 'creator_neon',
  borderColor,
  glowColor,
  speakingGlow = true,
  frameInBeat,
  durationInFrames,
  className = '',
  style = {},
}) => {
  const styling = TALKING_AVATAR_PRESETS[preset] || TALKING_AVATAR_PRESETS.creator_neon;
  const physics = calculateAvatarPhysics(frameInBeat, durationInFrames, true);

  const activeBorderColor = borderColor || styling.borderColor;
  const activeGlowColor = glowColor || styling.glowColor;

  const layoutPosition = getAvatarLayoutStyles(layout);
  const isFullscreen = layout === 'fullscreen';

  // Dynamic speaking border glow
  const glowStyle = speakingGlow && physics.isSpeaking
    ? `0 0 ${16 * physics.glowIntensity}px ${activeGlowColor}, 0 8px 24px rgba(0, 0, 0, 0.45)`
    : '0 8px 20px rgba(0, 0, 0, 0.4)';

  return (
    <div
      style={{
        ...layoutPosition,
        ...style,
      }}
      className={`talking-avatar-container ${className}`}
    >
      {/* Animated Floating Anchor */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transform: isFullscreen
            ? `scale(${physics.pulseScale}) translate(0, ${physics.bobY}px)`
            : `translate(0, ${physics.bobY}px) rotate(${physics.tiltDeg}deg) scale(${physics.pulseScale})`,
          transformOrigin: 'center bottom',
          transition: 'none',
        }}
      >
        {/* Frame Wrapper */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: isFullscreen ? '0px' : styling.borderRadius,
            border: isFullscreen ? 'none' : `3.5px solid ${activeBorderColor}`,
            boxShadow: isFullscreen ? 'none' : glowStyle,
            overflow: 'hidden',
            backgroundColor: '#0f172a',
            position: 'relative',
          }}
        >
          {/* Avatar Image with Rhythmic Jaw/Lip Motion */}
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scaleY(${physics.jawScaleY})`,
                transformOrigin: 'center 70%', // Pivot from mouth/jaw area
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                fontSize: '24px',
              }}
            >
              👤
            </div>
          )}

          {/* Speaking Wave Indicator Overlay on Bottom Rim */}
          {physics.isSpeaking && !isFullscreen && (
            <div
              style={{
                position: 'absolute',
                bottom: '6px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '2.5px',
                padding: '2px 6px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                zIndex: 10,
              }}
            >
              {[1, 2, 3, 4].map((bar) => {
                const barHeight = 4 + 7 * Math.abs(Math.sin((frameInBeat * 0.3) + bar * 0.8));
                return (
                  <span
                    key={bar}
                    style={{
                      width: '2px',
                      height: `${barHeight}px`,
                      backgroundColor: activeBorderColor,
                      borderRadius: '1px',
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Presenter Name Badge Pill */}
        {styling.showBadge && !isFullscreen && (
          <div
            style={{
              position: 'absolute',
              bottom: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              padding: '2px 10px',
              borderRadius: '9999px',
              backgroundColor: styling.badgeBg,
              color: styling.badgeText,
              fontSize: '11px',
              fontWeight: '700',
              fontFamily: 'sans-serif',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 30,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: physics.isSpeaking ? '#22c55e' : '#94a3b8',
              }}
            />
            {name}{title ? ` • ${title}` : ''}
          </div>
        )}
      </div>
    </div>
  );
};
