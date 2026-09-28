import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { CameraMove } from './shot-planner';

/**
 * FFprobe utility for precise audio/video duration and metadata extraction
 * Used for exact frame calculation to prevent audio/subtitle drift
 */

interface FFprobeStream {
  codec_type?: string;
  codec_name?: string;
  sample_rate?: string;
  channels?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  width?: number;
  height?: number;
}

interface FFprobeFormat {
  duration?: string;
  size?: string;
  bit_rate?: string;
  format_name?: string;
}

interface FFprobeOutput {
  streams?: FFprobeStream[];
  format?: FFprobeFormat;
}

/**
 * FFprobe utility for precise audio/video duration and metadata extraction
 * Used for exact frame calculation to prevent audio/subtitle drift
 */

export interface FFprobeAudioResult {
  duration: number;       // seconds, from format.duration
  sampleRate: number;     // from stream.sample_rate
  channels: number;       // from stream.channels
  codec: string;          // from stream.codec_name
  bitRate?: number;       // from format.bit_rate
  format: string;         // format name (mp3, wav, etc.)
  size: number;           // file size in bytes
}

export interface FFprobeVideoResult extends FFprobeAudioResult {
  width: number;          // video width
  height: number;         // video height
  fps: number;            // frames per second (r_frame_rate)
  videoCodec: string;     // video codec name
  hasAudio: boolean;      // whether video has audio stream
}

export interface FFprobeError {
  error: string;
  stderr: string;
}

/**
 * Check if ffprobe is available on the system
 */
export function isFFprobeAvailable(): boolean {
  try {
    execSync('ffprobe -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse ffprobe JSON output for audio files
 */
export function parseFFprobeAudioOutput(json: string): FFprobeAudioResult {
  const data = JSON.parse(json) as FFprobeOutput;
  
  // Find the audio stream
  const audioStream = data.streams?.find((s) => s.codec_type === 'audio');
  if (!audioStream) {
    throw new Error('No audio stream found in file');
  }
  
  const format = data.format || {};
  
  return {
    duration: parseFloat(format.duration || '0'),
    sampleRate: parseInt(audioStream.sample_rate || '0', 10),
    channels: audioStream.channels || 0,
    codec: audioStream.codec_name || 'unknown',
    bitRate: format.bit_rate ? parseInt(format.bit_rate, 10) : undefined,
    format: format.format_name || 'unknown',
    size: parseInt(format.size || '0', 10),
  };
}

/**
 * Parse ffprobe JSON output for video files
 */
export function parseFFprobeVideoOutput(json: string): FFprobeVideoResult {
  const data = JSON.parse(json) as FFprobeOutput;
  
  // Find video and audio streams
  const videoStream = data.streams?.find((s) => s.codec_type === 'video');
  const audioStream = data.streams?.find((s) => s.codec_type === 'audio');
  const format = data.format || {};
  
  if (!videoStream) {
    throw new Error('No video stream found in file');
  }
  
  // Parse frame rate (can be "30000/1001" format)
  let fps = 30;
  if (videoStream.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
    if (den > 0) fps = num / den;
  } else if (videoStream.avg_frame_rate) {
    const [num, den] = videoStream.avg_frame_rate.split('/').map(Number);
    if (den > 0) fps = num / den;
  }
  
  return {
    duration: parseFloat(format.duration || '0'),
    sampleRate: audioStream ? parseInt(audioStream.sample_rate || '0', 10) : 0,
    channels: audioStream ? (audioStream.channels || 0) : 0,
    codec: audioStream ? (audioStream.codec_name || 'unknown') : 'none',
    bitRate: format.bit_rate ? parseInt(format.bit_rate, 10) : undefined,
    format: format.format_name || 'unknown',
    size: parseInt(format.size || '0', 10),
    width: videoStream.width || 0,
    height: videoStream.height || 0,
    fps,
    videoCodec: videoStream.codec_name || 'unknown',
    hasAudio: !!audioStream,
  };
}

/**
 * Run ffprobe on an audio file and return parsed metadata
 * Supports local files and data: URLs (writes temp file for data URLs)
 */
export async function ffprobeAudio(audioPath: string): Promise<FFprobeAudioResult> {
  if (!isFFprobeAvailable()) {
    throw new Error('ffprobe not available on system');
  }
  
  let tempFile: string | null = null;
  let actualPath = audioPath;
  
  try {
    // Handle data: URLs by writing to temp file
    if (audioPath.startsWith('data:')) {
      const commaIndex = audioPath.indexOf(',');
      const base64Data = commaIndex !== -1 ? audioPath.slice(commaIndex + 1) : audioPath;
      const buffer = Buffer.from(base64Data, 'base64');
      
      tempFile = path.join(path.dirname(audioPath) || '/tmp', `ffprobe_audio_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`);
      fs.writeFileSync(tempFile, buffer);
      actualPath = tempFile;
    }
    
    // Run ffprobe with JSON output
    const cmd = `ffprobe -v error -show_entries format=duration,size,bit_rate,format_name -show_entries stream=codec_type,codec_name,sample_rate,channels,r_frame_rate,avg_frame_rate,width,height -of json "${actualPath}"`;
    const output = execSync(cmd, { 
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    
    return parseFFprobeAudioOutput(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`ffprobe failed: ${message}`);
  } finally {
    // Cleanup temp file
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
  }
}

/**
 * Run ffprobe on a video file and return parsed metadata
 */
export async function ffprobeVideo(videoPath: string): Promise<FFprobeVideoResult> {
  if (!isFFprobeAvailable()) {
    throw new Error('ffprobe not available on system');
  }
  
  let tempFile: string | null = null;
  let actualPath = videoPath;
  
  try {
    // Handle data: URLs
    if (videoPath.startsWith('data:')) {
      const commaIndex = videoPath.indexOf(',');
      const base64Data = commaIndex !== -1 ? videoPath.slice(commaIndex + 1) : videoPath;
      const buffer = Buffer.from(base64Data, 'base64');
      
      tempFile = path.join(path.dirname(videoPath) || '/tmp', `ffprobe_video_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`);
      fs.writeFileSync(tempFile, buffer);
      actualPath = tempFile;
    }
    
    const cmd = `ffprobe -v error -show_entries format=duration,size,bit_rate,format_name -show_entries stream=codec_type,codec_name,sample_rate,channels,r_frame_rate,avg_frame_rate,width,height -of json "${actualPath}"`;
    const output = execSync(cmd, { 
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    
    return parseFFprobeVideoOutput(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`ffprobe failed: ${message}`);
  } finally {
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
  }
}

/**
 * Tripwire for the still/misclassified-as-video bug.
 *
 * The render worker classified media with `mediaUrl.includes('video')`, and the
 * Pollinations fallback URL embeds the URL-encoded beat text in its path — so
 * any script merely MENTIONING the word "video" was treated as a video, skipped
 * the zoompan/loop path, and rendered ~1 frame per beat while still reporting
 * `completed`. `isVideoFile` below decides from the bytes instead.
 *
 * If you find yourself deleting this constant, you are about to reintroduce that
 * bug; delete the test that guards it too, deliberately.
 */
export const STILL_IMAGE_PROBE_FIXED = true;

/**
 * Codec names that ffprobe reports for STILL images. ffprobe labels a JPEG a
 * `codec_type: 'video'` stream (codec `mjpeg`) with exactly one frame, so
 * "has a video stream" is not a usable test on its own — the frame count and
 * the codec have to agree.
 */
const STILL_IMAGE_CODECS = new Set([
  'mjpeg', 'jpeg', 'png', 'apng', 'bmp', 'tiff', 'tif', 'webp', 'jpegls',
  'png_pipe', 'dpx', 'exr', 'hdr', 'targa',
]);

/**
 * Container format names that unambiguously denote a moving-image file. The
 * probe payload for a still is `image2` / `jpeg_pipe` / `png_pipe` / `webp_pipe`
 * / `image2pipe`, none of which appear here.
 */
const MOVING_CONTAINER_RE = /(^|,|\|)(mov,mp4|mp4|matroska,webm|webm|avi|flv|mpegts|ogg|asf)/i;

/**
 * Decide whether a downloaded file is a playable VIDEO or a STILL IMAGE, by
 * inspecting its bytes rather than its URL.
 *
 * Why this exists: the render worker used to infer this with
 * `mediaUrl.includes('video')`. The Pollinations fallback URL embeds the
 * URL-encoded beat text in its path, so any beat whose script merely *mentions*
 * the word "video" was classified as video. The still image then took the video
 * path — no `zoompan`, and `-t <duration>` truncation instead of `-loop` — and
 * each beat encoded to roughly one frame, producing a 0.17s "video" that was
 * still reported as `completed`.
 *
 * Returns `true` only when the file really has moving frames.
 */
export async function isVideoFile(filePath: string): Promise<boolean> {
  if (!isFFprobeAvailable()) {
    throw new Error('ffprobe not available on system');
  }

  // -count_frames makes ffprobe actually decode to count frames, so nb_read_frames
  // is populated even for containers that do not store a count in the header
  // (webm, some mov). -read_intervals "%+2" bounds that decode to the first two
  // seconds, so the probe is O(1) in clip length rather than decoding the whole
  // file: anything with 2+ frames in its first 2s is moving, by definition.
  const cmd = `ffprobe -v error -count_frames -read_intervals %+2 -select_streams v:0 `
    + `-show_entries "stream=codec_type,codec_name,nb_frames,nb_read_frames:format=format_name" `
    + `-of json "${filePath}"`;

  const output = execSync(cmd, {
    encoding: 'utf-8',
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });

  const data = JSON.parse(output) as {
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      nb_frames?: string;
      nb_read_frames?: string;
    }>;
    format?: { format_name?: string };
  };

  const stream = data.streams?.find((s) => s.codec_type === 'video');
  if (!stream) return false;

  const container = data.format?.format_name || '';

  // A container that is definitively a moving-image container wins first: a
  // 1-frame mp4 is still an mp4 pipeline input, and B-frames can make
  // nb_read_frames unreliable.
  if (MOVING_CONTAINER_RE.test(container)) return true;

  // A still-image container is definitive in the other direction.
  if (/image2|jpeg_pipe|png_pipe|webp_pipe|image2pipe|bmp_pipe|tiff_pipe/i.test(container)) {
    return false;
  }

  // Frame count: prefer the counted value, fall back to the header value.
  const counted = parseInt(stream.nb_read_frames || '', 10);
  const declared = parseInt(stream.nb_frames || '', 10);
  const frames = Number.isFinite(counted) ? counted : declared;
  if (Number.isFinite(frames) && frames > 1) return true;
  if (Number.isFinite(frames) && frames <= 1) return false;

  // No usable frame count (some webm/streamed webm): fall back to the codec.
  const codec = (stream.codec_name || '').toLowerCase();
  if (STILL_IMAGE_CODECS.has(codec)) return false;
  if (codec) return true;

  // Nothing to go on: treat as a still, which is the safe direction. A still
  // gets the zoompan/loop treatment and always renders; a mislabelled still
  // that took the video path is what produced 1-frame clips.
  return false;
}

/**
 * Get exact duration of audio file in seconds
 * This is the primary function used for frame calculation
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  const result = await ffprobeAudio(audioPath);
  return result.duration;
}

/**
 * Get exact duration of video file in seconds
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  const result = await ffprobeVideo(videoPath);
  return result.duration;
}

/**
 * Calculate exact frame count for a given duration at target FPS
 * Used for zoompan and video filter frame counts
 */
export function calculateFrameCount(durationSeconds: number, fps: number): number {
  return Math.max(1, Math.ceil(durationSeconds * fps));
}

/**
 * Peak zoom for a beat. Also the pan headroom: at z=1.15 the crop window has
 * 0.13*width (~140px at 1080) of horizontal slack to travel across, which reads
 * as a slow drift rather than a jump. Going higher buys travel but costs
 * resolution -- 1.15x upscale of a stock photo is invisible, 1.4x is not.
 */
const ZOOM_MAX = 1.15;
/** Kept as a literal rather than `ZOOM_MAX - 1`: 1.15-1 is 0.15000000000000002. */
const ZOOM_DELTA = 0.15;

/**
 * Calculate the zoompan filter string for a still, driven by a shot's camera move.
 *
 * The `x`/`y` expressions are `slack * progress`, where `slack` is
 * `(iw-iw/zoom)` -- the full range the crop window can legally travel -- and
 * `progress` runs 0..1 across the shot. Because the window is always
 * `slack * [0..1]` from the origin, it stays inside the frame on EVERY output
 * frame. This is the property that keeps pans and tilts free of black edges,
 * and it holds for any input size without needing a separate oversample step.
 *
 * THE VARIABLE IS `on`, NEVER `in`. This is the buildZoompanFilter version of
 * "the crop window off the frame" -- a failure mode that produced valid files
 * and quiet reports, and survived centuries of eyeballing a filter string:
 * zoompan's `in` is the INPUT frame counter and does NOT advance while it
 * generates output frames, so an `(in/...)` progress expression evaluates to
 * the same value on every output frame and the shot renders as a frozen
 * still. `on` is the OUTPUT frame counter and advances 0..N-1. MEASURED
 * 2026-09-28 on the render worker's exact recipe (-loop 1 -i still -t <dur>
 * + anullsrc + -shortest + -tune stillimage): every in-based move rendered
 * frame-to-frame MAD < 0.03 (frozen), the same expressions with `on` render
 * MAD > 11 (moving). Guarded by the real-encode motion tests in
 * test/camera-move-filter.test.ts -- string-level readability of the filter
 * is exactly how this bug shipped the first time.
 *
 * The previous version hardcoded a centred pan at every beat AND used `in`,
 * so the render worker could only alternate push-in with pull-out
 * (`i % 2 === 0 ? 'in' : 'out'`) and, because of the `in` bug, none of it
 * moved at all. Direction now has somewhere to live, and it moves.
 *
 * Zoom never goes below 1.0, and never relies on float luck to prove it: the
 * two zoom expressions are written as `1.0 + ZOOM_DELTA * p` and
 * `1.0 + ZOOM_DELTA * (1 - p)`, so a pull-out lands on exactly 1.0 rather than
 * 0.9999999999999999, which would make `iw - iw/zoom` very slightly negative.
 */
export function buildZoompanFilter(
  durationSeconds: number,
  fps: number = 25,
  width: number = 1080,
  height: number = 1920,
  move: CameraMove = 'push-in'
): string {
  const frames = calculateFrameCount(durationSeconds, fps);
  // `on` runs 0..frames-1, so divide by frames-1 for a progress that reaches
  // exactly 1.0 on the final output frame. A 1-frame shot must not divide by
  // zero -- and correctly renders no motion at all.
  const span = Math.max(1, frames - 1);
  const fwd = `(on/${span})`;
  const back = `(1-${fwd})`;

  const cx = '(iw-iw/zoom)/2';
  const cy = '(ih-ih/zoom)/2';
  const sx = '(iw-iw/zoom)';
  const sy = '(ih-ih/zoom)';

  const held = `1.0+${ZOOM_DELTA}*${fwd}`;
  const released = `1.0+${ZOOM_DELTA}*${back}`;

  const M: Record<CameraMove, { z: string; x: string; y: string }> = {
    'static':       { z: '1.0',      x: '0', y: '0' },
    'push-in':      { z: held,        x: cx, y: cy },
    'pull-out':     { z: released,    x: cx, y: cy },
    'pan-left':     { z: String(ZOOM_MAX), x: `${sx}*${back}`, y: cy },
    'pan-right':    { z: String(ZOOM_MAX), x: `${sx}*${fwd}`,  y: cy },
    'tilt-up':      { z: String(ZOOM_MAX), x: cx, y: `${sy}*${back}` },
    'tilt-down':    { z: String(ZOOM_MAX), x: cx, y: `${sy}*${fwd}` },
  };

  const e = M[move] ?? M['push-in'];

  return `zoompan=z='${e.z}':x='${e.x}':y='${e.y}':d=${frames}:s=${width}x${height}:fps=${fps}`;
}

/**
 * Batch ffprobe multiple audio files in parallel
 */
export async function ffprobeAudioBatch(audioPaths: string[]): Promise<FFprobeAudioResult[]> {
  const results = await Promise.allSettled(
    audioPaths.map(path => ffprobeAudio(path))
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`ffprobe failed for ${audioPaths[index]}:`, result.reason);
      // Return default/fallback
      return {
        duration: 3,
        sampleRate: 24000,
        channels: 1,
        codec: 'unknown',
        format: 'unknown',
        size: 0,
      };
    }
  });
}

/**
 * Verify audio file matches expected duration (for validation)
 */
export async function verifyAudioDuration(
  audioPath: string,
  expectedDuration: number,
  toleranceSeconds: number = 0.5
): Promise<{ matches: boolean; actual: number; expected: number; diff: number }> {
  const actual = await getAudioDuration(audioPath);
  const diff = Math.abs(actual - expectedDuration);
  return {
    matches: diff <= toleranceSeconds,
    actual,
    expected: expectedDuration,
    diff,
  };
}