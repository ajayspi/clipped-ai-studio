/**
 * Zero-Asset Procedural Foley Synthesis Engine
 * 
 * Generates cinematic sound effects (whooshes, pops, clicks, risers, dings)
 * purely via mathematical sound synthesis in FFmpeg filtergraphs and Web Audio API.
 * Eliminates external MP3 downloads, licensing issues, and 404/quota errors.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type FoleyType = 'whoosh' | 'pop' | 'click' | 'riser' | 'ding';

export interface FoleyCue {
  timeMs: number;
  type: FoleyType;
  volume?: number; // 0.0 to 1.0 (default 0.8)
}

// ============================================================================
// FFmpeg Mathematical Filtergraph Recipes
// ============================================================================

/**
 * Returns the FFmpeg audio filter definition for generating a specific sound effect.
 */
export function getFoleyFilterDefinition(type: FoleyType, durationSeconds?: number): { inputSource: string; filterChain: string; duration: number } {
  switch (type) {
    case 'whoosh': {
      const dur = durationSeconds || 0.45;
      return {
        inputSource: `anoisesrc=duration=${dur}:color=brown:sample_rate=44100`,
        filterChain: `highpass=f=120,lowpass=f=2200,volume='sin(t/${dur}*PI)*1.4':eval=frame`,
        duration: dur,
      };
    }
    case 'pop': {
      const dur = durationSeconds || 0.08;
      return {
        inputSource: `sine=frequency=480:duration=${dur}:sample_rate=44100`,
        filterChain: `volume='if(lt(t,${dur}), 1-t/${dur}, 0)':eval=frame`,
        duration: dur,
      };
    }
    case 'click': {
      const dur = durationSeconds || 0.03;
      return {
        inputSource: `anoisesrc=duration=${dur}:color=white:sample_rate=44100`,
        filterChain: `highpass=f=2000,volume='if(lt(t,${dur}), 1-t/${dur}, 0)':eval=frame`,
        duration: dur,
      };
    }
    case 'riser': {
      const dur = durationSeconds || 0.8;
      return {
        inputSource: `sine=frequency=150:duration=${dur}:sample_rate=44100`,
        filterChain: `volume='t/${dur}':eval=frame`,
        duration: dur,
      };
    }
    case 'ding': {
      const dur = durationSeconds || 0.6;
      return {
        inputSource: `sine=frequency=1200:duration=${dur}:sample_rate=44100`,
        filterChain: `volume='exp(-4*t)':eval=frame`,
        duration: dur,
      };
    }
  }
}

/**
 * Builds an FFmpeg standalone command line to synthesize a single procedural SFX WAV file.
 */
export function generateProceduralFoleyCommand(type: FoleyType, outputPath: string): string {
  const { inputSource, filterChain } = getFoleyFilterDefinition(type);
  return `ffmpeg -y -f lavfi -i "${inputSource}" -af "${filterChain}" "${outputPath}"`;
}

/**
 * Constructs an inline FFmpeg multi-cue filtergraph that synthesizes and mixes
 * all cues on top of a base audio stream using delays and amix.
 */
export function buildProceduralSfxFiltergraph(
  cues: FoleyCue[],
  baseAudioLabel = '0:a'
): { filterComplex: string; outputLabel: string } {
  if (!cues || cues.length === 0) {
    return {
      filterComplex: '',
      outputLabel: baseAudioLabel,
    };
  }

  const parts: string[] = [];
  const mixLabels: string[] = [baseAudioLabel];

  cues.forEach((cue, index) => {
    const { inputSource, filterChain } = getFoleyFilterDefinition(cue.type);
    const sfxLabel = `sfx_${index}`;
    const delayedLabel = `del_${index}`;
    const delayMs = Math.max(0, Math.round(cue.timeMs));

    // Synthesize procedural generator
    parts.push(`[${index + 1}:a]${filterChain}[${sfxLabel}]`); // If passed as lavfi inputs
    // Or pure inline lavfi filtergraph
    parts.push(`lavfi.${inputSource},${filterChain},adelay=${delayMs}|${delayMs}[${delayedLabel}]`);
    mixLabels.push(`[${delayedLabel}]`);
  });

  const finalMix = `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=2[a_sfx_mix]`;

  return {
    filterComplex: parts.join(';') + ';' + finalMix,
    outputLabel: '[a_sfx_mix]',
  };
}

// ============================================================================
// Web Audio Browser Synthesis (Zero Network Latency in Previews)
// ============================================================================

/**
 * Plays a procedural sound effect inside the browser using Web Audio API.
 * Safe for client-side previews with zero external audio assets.
 */
export function playBrowserProceduralSfx(type: FoleyType): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'whoosh') {
      const dur = 0.45;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(2500, now + dur * 0.5);
      filter.frequency.exponentialRampToValueAtTime(150, now + dur);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + dur * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
      source.stop(now + dur);
    } else if (type === 'pop') {
      const dur = 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + dur);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } else if (type === 'click') {
      const dur = 0.02;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } else if (type === 'ding') {
      const dur = 0.6;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    }
  } catch (err) {
    console.warn('[Foley] Browser audio context synthesis notice:', err);
  }
}
