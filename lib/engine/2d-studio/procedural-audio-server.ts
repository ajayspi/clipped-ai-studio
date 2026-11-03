// lib/engine/2d-studio/procedural-audio-server.ts
// Server-side procedural sound effects and algorithmic music synthesis.
// Zero external API calls, zero stock asset downloads, 100% license-free.

import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import {
  GenerateSfxOptions,
  GenerateMusicOptions,
} from './procedural-audio-catalog';

const execAsync = promisify(exec);

function resolveStudioPath(): string {
  // Check local workspace first
  const local = path.join(process.cwd(), 'aitrends-2d-studio');
  if (fs.existsSync(local)) return local;
  // Fallback to plugin directory
  const pluginPath = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.gemini',
    'config',
    'plugins',
    'aitrends-2d-studio',
    'skills',
    'make-2d-video',
    'kit'
  );
  if (fs.existsSync(pluginPath)) return pluginPath;
  return local;
}

/**
 * Generate a procedural sound effect WAV buffer
 */
export async function generateProceduralSfx(
  options: GenerateSfxOptions
): Promise<Buffer> {
  const studioDir = resolveStudioPath();
  const sfxScript = path.join(studioDir, 'audio', 'sfx.py');

  const tmpOut = path.join(
    studioDir,
    `tmp_sfx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.wav`
  );

  const durArg = options.dur ? `--dur ${options.dur}` : '';
  const seedArg = options.seed != null ? `--seed ${options.seed}` : '';

  try {
    if (fs.existsSync(sfxScript)) {
      const cmd = `python "${sfxScript}" --make ${options.name} --out "${tmpOut}" ${durArg} ${seedArg}`;
      await execAsync(cmd, { cwd: studioDir });

      if (fs.existsSync(tmpOut)) {
        const buffer = await fs.promises.readFile(tmpOut);
        await fs.promises.unlink(tmpOut).catch(() => {});
        return buffer;
      }
    }
  } catch (err) {
    console.warn('[ProceduralAudio] Python sfx generator failed, falling back to synthesizer:', err);
  } finally {
    if (fs.existsSync(tmpOut)) {
      await fs.promises.unlink(tmpOut).catch(() => {});
    }
  }

  // Pure TypeScript fallback PCM generator if Python script is unavailable
  return generateFallbackPcmWav(options.dur || 0.5, options.name);
}

/**
 * Generate procedural background music WAV buffer
 */
export async function generateProceduralMusic(
  options: GenerateMusicOptions
): Promise<Buffer> {
  const studioDir = resolveStudioPath();
  const musicScript = path.join(studioDir, 'audio', 'music.py');

  const tmpOut = path.join(
    studioDir,
    `tmp_mus_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.wav`
  );

  const mood = options.mood || 'ambient';
  const dur = options.dur || 10;

  try {
    if (fs.existsSync(musicScript)) {
      // Run music generator with timeline
      const cmd = `python "${musicScript}" --demo "${tmpOut}" --dur ${dur}`;
      await execAsync(cmd, { cwd: studioDir });

      if (fs.existsSync(tmpOut)) {
        const buffer = await fs.promises.readFile(tmpOut);
        await fs.promises.unlink(tmpOut).catch(() => {});
        return buffer;
      }
    }
  } catch (err) {
    console.warn('[ProceduralAudio] Python music generator failed, falling back to ambient pad:', err);
  } finally {
    if (fs.existsSync(tmpOut)) {
      await fs.promises.unlink(tmpOut).catch(() => {});
    }
  }

  return generateFallbackAmbientPad(dur, mood);
}

/**
 * Fallback RIFF/WAVE PCM synthesizer in pure JS/TS
 */
function generateFallbackPcmWav(durationSeconds: number, toneType = 'blip'): Buffer {
  const sampleRate = 48000;
  const numSamples = Math.floor(sampleRate * Math.max(0.1, durationSeconds));
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = t / durationSeconds;
    let sample = 0;

    if (toneType === 'whoosh' || toneType === 'swish') {
      const f = 150 + 600 * Math.sin(progress * Math.PI);
      const amp = Math.sin(progress * Math.PI) * 0.7;
      const noise = (Math.random() * 2 - 1) * 0.4;
      sample = (Math.sin(2 * Math.PI * f * t) * 0.6 + noise) * amp;
    } else if (toneType === 'impact' || toneType === 'hit') {
      const f = 160 * Math.exp(-t * 12) + 40;
      const decay = Math.exp(-t * 3);
      sample = Math.sin(2 * Math.PI * f * t) * decay;
    } else if (toneType === 'ding' || toneType === 'shimmer') {
      const f = 880;
      const decay = Math.exp(-t * 2);
      sample = (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 2 * t)) * decay * 0.6;
    } else {
      // Default blip / pop
      const f = 440 + 200 * (1 - progress);
      sample = Math.sin(2 * Math.PI * f * t) * Math.exp(-progress * 5) * 0.6;
    }

    const pcm = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(pcm, offset);
    buffer.writeInt16LE(pcm, offset + 2);
    offset += 4;
  }

  return buffer;
}

function generateFallbackAmbientPad(durationSeconds: number, moodType: string): Buffer {
  const sampleRate = 48000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const baseFreq = moodType === 'night' ? 110 : moodType === 'golden' ? 220 : 146.83;
  const buffer = Buffer.alloc(44 + numSamples * 4);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 4, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 4, 40);

  let offset = 44;
  // Ambient harmonic chord pad scaled to base frequency
  const freqs = [baseFreq, baseFreq * 1.2, baseFreq * 1.5, baseFreq * 1.8];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sL = 0;
    let sR = 0;

    for (let fIdx = 0; fIdx < freqs.length; fIdx++) {
      const f = freqs[fIdx];
      const pan = (fIdx / (freqs.length - 1)) * 0.4 + 0.3; // Stereo spread
      const wave = Math.sin(2 * Math.PI * f * t) * 0.15;
      sL += wave * (1 - pan);
      sR += wave * pan;
    }

    // Fade in/out
    const fade = Math.min(t / 1.5, Math.min((durationSeconds - t) / 1.5, 1.0));
    sL *= Math.max(0, fade);
    sR *= Math.max(0, fade);

    const pcmL = Math.max(-32768, Math.min(32767, Math.floor(sL * 32767)));
    const pcmR = Math.max(-32768, Math.min(32767, Math.floor(sR * 32767)));
    buffer.writeInt16LE(pcmL, offset);
    buffer.writeInt16LE(pcmR, offset + 2);
    offset += 4;
  }

  return buffer;
}
