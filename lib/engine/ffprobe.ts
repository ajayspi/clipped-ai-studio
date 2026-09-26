import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
 * Calculate zoompan filter string for exact duration
 * Replaces the heuristic frame calculation in render-worker.ts
 */
export function buildZoompanFilter(
  durationSeconds: number,
  fps: number = 25,
  width: number = 1080,
  height: number = 1920,
  zoomType: 'in' | 'out' = 'in'
): string {
  const frames = calculateFrameCount(durationSeconds, fps);
  const zoomExpr = zoomType === 'in' 
    ? `1.0+(0.15*(in/${frames}))`
    : `1.1-(0.15*(in/${frames}))`;
  
  return `zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps}`;
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