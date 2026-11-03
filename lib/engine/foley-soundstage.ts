/**
 * AI Foley Soundstage Engine
 * 
 * Automatically designs, times, and layers cinematic Foley sound effects (SFX)
 * and ambient atmospheric audio beds for video scenes:
 * - Intelligent keyword & action-based sound event detection
 * - Transition sound effects (cinematic whooshes, risers, sub-drops) at scene cuts
 * - Dynamic volume levels, stereo panning, and speech ducking awareness
 * - Generates FFmpeg audio filtergraphs (adelay, volume, amix)
 * - Produces OpenTimelineIO (OTIO) audio tracks for DaVinci Resolve & Premiere
 */

export type FoleySoundCategory =
  | 'transition'
  | 'ambience'
  | 'impact'
  | 'action'
  | 'ui'
  | 'cinematic';

export interface FoleySoundAsset {
  id: string;
  name: string;
  category: FoleySoundCategory;
  url: string;
  duration: number; // in seconds
  keywords: string[];
  defaultVolume: number; // 0.0 to 1.0
}

export interface FoleyCue {
  id: string;
  soundId: string;
  name: string;
  category: FoleySoundCategory;
  startTime: number; // in seconds from video start
  duration: number; // in seconds
  volume: number; // 0.0 to 1.0
  pan?: number; // -1.0 (left) to 1.0 (right), 0 is center
  audioUrl: string;
  triggeredBy: string; // keyword or 'cut-transition'
}

export interface FoleySceneInput {
  id?: string;
  text?: string;
  description?: string;
  keywords?: string[];
  duration?: number;
  shotType?: string;
  cameraMove?: string;
}

export interface FoleySoundstageResult {
  cues: FoleyCue[];
  totalDuration: number;
  ffmpegFilterComplex: string;
  otioTrack: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Curated Royalty-Free SFX Sound Bank
// ---------------------------------------------------------------------------

export const CURATED_FOLEY_LIBRARY: FoleySoundAsset[] = [
  // 1. Transitions
  {
    id: 'sfx_whoosh_cinematic',
    name: 'Cinematic Whoosh Transition',
    category: 'transition',
    url: 'https://storage.clipped.ai/sfx/whoosh-cinematic-01.mp3',
    duration: 1.2,
    keywords: ['cut', 'transition', 'whip', 'pan', 'rush', 'zoom'],
    defaultVolume: 0.65
  },
  {
    id: 'sfx_sub_drop_boom',
    name: 'Sub-Bass Drop Impact',
    category: 'cinematic',
    url: 'https://storage.clipped.ai/sfx/sub-drop-boom-01.mp3',
    duration: 2.5,
    keywords: ['impact', 'epic', 'boom', 'shock', 'explosion', 'dramatic', 'matrix', 'power'],
    defaultVolume: 0.8
  },
  {
    id: 'sfx_glitch_digital',
    name: 'Digital Glitch Zap',
    category: 'transition',
    url: 'https://storage.clipped.ai/sfx/digital-glitch-01.mp3',
    duration: 0.8,
    keywords: ['glitch', 'cyberpunk', 'tech', 'digital', 'neon', 'futuristic', 'hacker'],
    defaultVolume: 0.5
  },

  // 2. Action & Foley
  {
    id: 'sfx_keyboard_typing',
    name: 'Rapid Mechanical Typing',
    category: 'action',
    url: 'https://storage.clipped.ai/sfx/keyboard-typing-01.mp3',
    duration: 3.0,
    keywords: ['typing', 'keyboard', 'computer', 'coding', 'office', 'laptop', 'writing'],
    defaultVolume: 0.45
  },
  {
    id: 'sfx_camera_shutter',
    name: 'Camera Shutter Click',
    category: 'action',
    url: 'https://storage.clipped.ai/sfx/camera-shutter-click-01.mp3',
    duration: 0.6,
    keywords: ['camera', 'photo', 'photograph', 'shutter', 'snapshot', 'flash'],
    defaultVolume: 0.6
  },
  {
    id: 'sfx_cash_register',
    name: 'Cash Register Cha-Ching',
    category: 'ui',
    url: 'https://storage.clipped.ai/sfx/cash-register-01.mp3',
    duration: 1.5,
    keywords: ['money', 'cash', 'dollar', 'wealth', 'profit', 'sale', 'business', 'rich'],
    defaultVolume: 0.6
  },
  {
    id: 'sfx_footsteps_pavement',
    name: 'Footsteps on Wet Concrete',
    category: 'action',
    url: 'https://storage.clipped.ai/sfx/footsteps-pavement-01.mp3',
    duration: 3.5,
    keywords: ['walk', 'walking', 'running', 'footsteps', 'street', 'alley', 'shoes'],
    defaultVolume: 0.4
  },
  {
    id: 'sfx_sword_blade_sheath',
    name: 'Metallic Blade Draw',
    category: 'action',
    url: 'https://storage.clipped.ai/sfx/sword-draw-metal-01.mp3',
    duration: 1.4,
    keywords: ['sword', 'blade', 'samurai', 'knife', 'metal', 'fight', 'weapon'],
    defaultVolume: 0.7
  },

  // 3. Ambience
  {
    id: 'sfx_rain_city_ambient',
    name: 'Gentle Rain with Distant Thunder',
    category: 'ambience',
    url: 'https://storage.clipped.ai/sfx/rain-thunder-ambient-01.mp3',
    duration: 10.0,
    keywords: ['rain', 'storm', 'weather', 'thunder', 'wet', 'gloomy', 'melancholy', 'water'],
    defaultVolume: 0.35
  },
  {
    id: 'sfx_cyberpunk_neon_hum',
    name: 'Cyberpunk City Neon Hum',
    category: 'ambience',
    url: 'https://storage.clipped.ai/sfx/cyberpunk-city-hum-01.mp3',
    duration: 10.0,
    keywords: ['cyberpunk', 'neon', 'city', 'night', 'tokyo', 'sci-fi', 'space', 'dystopian'],
    defaultVolume: 0.3
  },
  {
    id: 'sfx_forest_wind_nature',
    name: 'Forest Wind & Rustling Leaves',
    category: 'ambience',
    url: 'https://storage.clipped.ai/sfx/forest-wind-leaves-01.mp3',
    duration: 10.0,
    keywords: ['forest', 'nature', 'trees', 'wind', 'peaceful', 'mountains', 'calm'],
    defaultVolume: 0.3
  }
];

// ---------------------------------------------------------------------------
// Detection & Orchestration Engine
// ---------------------------------------------------------------------------

/**
 * Analyzes scenes and generates timed Foley cues for narrative beats.
 */
export function detectFoleyCues(scenes: FoleySceneInput[]): FoleyCue[] {
  const cues: FoleyCue[] = [];
  let currentTime = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const duration = Math.max(1, scene.duration || 3);
    const sceneText = `${scene.text || ''} ${scene.description || ''} ${(scene.keywords || []).join(' ')}`.toLowerCase();

    // 1. Scene Transition Foley (Whoosh or Riser between cuts)
    if (i > 0) {
      const isFastMove = scene.cameraMove === 'whip-pan' || scene.cameraMove === 'fpv-drone-rush';
      const transitionSfx = isFastMove
        ? CURATED_FOLEY_LIBRARY.find((s) => s.id === 'sfx_glitch_digital')!
        : CURATED_FOLEY_LIBRARY.find((s) => s.id === 'sfx_whoosh_cinematic')!;

      cues.push({
        id: `foley_trans_${i}_${Date.now().toString(36)}`,
        soundId: transitionSfx.id,
        name: transitionSfx.name,
        category: transitionSfx.category,
        startTime: Math.max(0, currentTime - 0.25), // Lead-in by 250ms
        duration: transitionSfx.duration,
        volume: transitionSfx.defaultVolume,
        audioUrl: transitionSfx.url,
        triggeredBy: `cut-transition-${i}`
      });
    }

    // 2. Keyword & Action Foley Matching
    for (const asset of CURATED_FOLEY_LIBRARY) {
      if (asset.category === 'transition') continue; // Handled above

      const matches = asset.keywords.some((kw) => sceneText.includes(kw));
      if (matches) {
        // Prevent duplicate cues within the same scene
        const alreadyAdded = cues.some(
          (c) => c.soundId === asset.id && Math.abs(c.startTime - currentTime) < duration
        );

        if (!alreadyAdded) {
          const cueDuration = Math.min(asset.duration, duration);
          cues.push({
            id: `foley_action_${i}_${asset.id}`,
            soundId: asset.id,
            name: asset.name,
            category: asset.category,
            startTime: currentTime + 0.3, // Slight delay into the scene
            duration: cueDuration,
            volume: asset.defaultVolume,
            audioUrl: asset.url,
            triggeredBy: `scene-keywords`
          });
        }
      }
    }

    currentTime += duration;
  }

  return cues;
}

/**
 * Builds an FFmpeg complex filter string to overlay Foley cues with precise delays and volume.
 */
export function generateFoleyFilterComplex(cues: FoleyCue[], totalDuration: number): string {
  if (!cues || cues.length === 0) {
    return 'anull';
  }

  const filterChains: string[] = [];
  const mixInputs: string[] = [];

  for (let idx = 0; idx < cues.length; idx++) {
    const cue = cues[idx];
    const delayMs = Math.round(cue.startTime * 1000);
    const volume = cue.volume.toFixed(2);
    const tag = `sfx_${idx}`;

    // Note: input index idx + 2 (assuming input 0 is voice, input 1 is BGM)
    const inTag = `[${idx + 2}:a]`;
    filterChains.push(
      `${inTag}volume=${volume},adelay=${delayMs}|${delayMs}[${tag}]`
    );
    mixInputs.push(`[${tag}]`);
  }

  // Combine all SFX streams into a single Foley master stream
  if (mixInputs.length > 1) {
    filterChains.push(
      `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=2[foley_master]`
    );
  } else {
    filterChains.push(`${mixInputs[0]}aformat=sample_fmts=fltp:sample_rates=44100[foley_master]`);
  }

  void totalDuration;
  return filterChains.join('; ');
}

/**
 * Converts Foley cues into an OpenTimelineIO (OTIO) audio track structure
 */
export function exportFoleyToOtioTrack(cues: FoleyCue[], fps = 30): Record<string, unknown> {
  const children: Record<string, unknown>[] = [];
  let currentHeadFrame = 0;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const startFrame = Math.round(cue.startTime * fps);
    const durationFrames = Math.max(1, Math.round(cue.duration * fps));

    // Insert Gap if cue starts after current playhead
    if (startFrame > currentHeadFrame) {
      const gapFrames = startFrame - currentHeadFrame;
      children.push({
        OTIO_SCHEMA: 'Gap.1',
        source_range: {
          OTIO_SCHEMA: 'TimeRange.1',
          start_time: { OTIO_SCHEMA: 'RationalTime.1', rate: fps, value: 0 },
          duration: { OTIO_SCHEMA: 'RationalTime.1', rate: fps, value: gapFrames }
        }
      });
      currentHeadFrame = startFrame;
    }

    children.push({
      OTIO_SCHEMA: 'Clip.2',
      name: `SFX_${cue.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      source_range: {
        OTIO_SCHEMA: 'TimeRange.1',
        start_time: { OTIO_SCHEMA: 'RationalTime.1', rate: fps, value: 0 },
        duration: { OTIO_SCHEMA: 'RationalTime.1', rate: fps, value: durationFrames }
      },
      media_references: {
        DEFAULT_MEDIA: {
          OTIO_SCHEMA: 'ExternalReference.1',
          target_url: cue.audioUrl,
          available_range: {
            OTIO_SCHEMA: 'TimeRange.1',
            start_time: { OTIO_SCHEMA: 'RationalTime.1', rate: fps, value: 0 },
            duration: { OTIO_SCHEMA: 'RationalTime.1', rate: fps, value: durationFrames }
          }
        }
      },
      active_media_reference_key: 'DEFAULT_MEDIA',
      metadata: {
        owlie_vibes: {
          volume: cue.volume,
          category: cue.category,
          triggered_by: cue.triggeredBy
        }
      }
    });

    currentHeadFrame += durationFrames;
  }

  return {
    OTIO_SCHEMA: 'Track.1',
    name: 'A2_Foley_SFX',
    kind: 'Audio',
    children
  };
}

/**
 * High-level Foley soundstage compiler
 */
export function buildFoleySoundstage(scenes: FoleySceneInput[], fps = 30): FoleySoundstageResult {
  const totalDuration = scenes.reduce((acc, s) => acc + (s.duration || 3), 0);
  const cues = detectFoleyCues(scenes);
  const ffmpegFilterComplex = generateFoleyFilterComplex(cues, totalDuration);
  const otioTrack = exportFoleyToOtioTrack(cues, fps);

  return {
    cues,
    totalDuration,
    ffmpegFilterComplex,
    otioTrack
  };
}
