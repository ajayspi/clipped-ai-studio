import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import ffmpeg from 'fluent-ffmpeg'
import { claimRenderJob, completeRenderJob, failRenderJob } from '../lib/jobs/render-job'
import { getAudioDuration, buildZoompanFilter, isFFprobeAvailable } from '../lib/engine/ffprobe'
import { 
  SubtitleConfig, 
  RenderBeat, 
  RenderScene, 
  RenderParams, 
  RenderOrchestrationState,
  validateRenderParams,
  validateSubtitleConfig,
  validateRenderBeat,
} from '@clipped/schema'

// Check ffprobe availability at startup
const FF_PROBE_AVAILABLE = isFFprobeAvailable();
if (FF_PROBE_AVAILABLE) {
  console.log('✅ ffprobe available for exact frame calculation');
} else {
  console.warn('⚠️ ffprobe not available — falling back to estimated durations');
}

// Resolve the ffmpeg binary lazily: `@ffmpeg-installer/ffmpeg` throws at require
// time when its bundled binary is absent (platform builds are missing on some
// installs), which used to kill the worker at import. Prefer the explicit
// FFMPEG_PATH env, then the installer's bundled binary, then the system PATH.
function resolveFfmpegPath(): string {
  const explicit = process.env.FFMPEG_PATH?.trim();
  if (explicit) return explicit;
  try {
    // Runtime-only legacy require: the module throws when its bundled binary
    // is absent, so we must not import it statically.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installer = require('@ffmpeg-installer/ffmpeg');
    if (installer && typeof installer.path === 'string' && installer.path) {
      return installer.path;
    }
  } catch {
    // Bundled binary not available — fall through to the system PATH.
  }
  return 'ffmpeg';
}
ffmpeg.setFfmpegPath(resolveFfmpegPath())

// Load environment variables from .env.local
const ROOT_DIR = fs.existsSync(path.resolve(process.cwd(), 'package.json'))
  ? process.cwd()
  : path.resolve(__dirname, '..');
const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.local'))
  ? path.resolve(process.cwd(), '.env.local')
  : path.resolve(ROOT_DIR, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_service_key';
const supabase = createClient(supabaseUrl, supabaseKey);
const workerId = process.env.RENDER_WORKER_ID || `render-worker-${process.pid}`

const RENDER_DIR = path.resolve(ROOT_DIR, 'public', 'renders');
const TEMP_DIR = path.resolve(ROOT_DIR, 'tmp_renders');
if (!fs.existsSync(RENDER_DIR)) fs.mkdirSync(RENDER_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Structural adapter for the shared RPC job helpers (lib/jobs/render-job.ts): the
// untyped supabase client exposes .rpc() but not the exact { data, error } Promise
// shape the helpers require, so bridge it once here instead of `as any` per call.
const renderJobRpc = {
  rpc: async (name: string, params: Record<string, unknown>) => {
    const res = await supabase.rpc(name, params);
    return { data: res.data, error: res.error };
  },
}

async function downloadFile(url: string, dest: string) {
  if (url.startsWith('data:')) {
    const commaIndex = url.indexOf(',');
    const base64Data = commaIndex !== -1 ? url.slice(commaIndex + 1) : url;
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(dest, buffer);
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buffer));
}

export function escapeFfmpegDrawtext(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

export function normalizeBoxColor(raw?: string): string {
  if (!raw) return 'black@0.6';
  const clean = raw.trim();
  const rgbaMatch = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10))).toString(16).padStart(2, '0');
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10))).toString(16).padStart(2, '0');
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10))).toString(16).padStart(2, '0');
    const alphaNum = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1.0;
    const a = Number.isNaN(alphaNum) ? '1.0' : Math.min(1, Math.max(0, alphaNum)).toFixed(2);
    return `0x${r}${g}${b}@${a}`;
  }
  if (clean.startsWith('#')) {
    return `0x${clean.slice(1)}@0.7`;
  }
  return clean;
}

export function buildSubtitleDrawtextFilter(text: string, settings?: SubtitleConfig): string | null {
  if (!text || !text.trim()) return null;
  if (settings && settings.burnSubtitles === false) return null;

  const s: SubtitleConfig = settings || {} as SubtitleConfig;
  let content = text.trim();
  if (s.subtitleUppercase === true || (s.subtitleUppercase !== false && s.subtitlePreset && ['Hormozi Pop', 'Cyber Neon', 'Cinematic Boxed', 'Bold Impact'].includes(s.subtitlePreset))) {
    content = content.toUpperCase();
  }
  const escaped = escapeFfmpegDrawtext(content);
  if (!escaped) return null;

  let fontSize = 54;
  if (typeof s.subtitleSize === 'number' && s.subtitleSize > 0) {
    fontSize = s.subtitleSize < 20 ? Math.round(s.subtitleSize * 10) : Math.round(s.subtitleSize);
  }

  const normalizeColor = (c?: string, defaultColor = 'white') => {
    if (!c) return defaultColor;
    const clean = c.trim();
    if (clean.startsWith('#')) {
      return `0x${clean.slice(1)}`;
    }
    return clean;
  };

  const fontColor = normalizeColor(s.subtitleColor || (s.subtitlePreset === 'Hormozi Pop' ? '#FACC15' : '#FFFFFF'), 'white');

  const yPercent = typeof s.subtitleY === 'number' && s.subtitleY >= 0 ? s.subtitleY / 100 : 0.75;
  const xExpr = '(w-text_w)/2';
  const yExpr = `(h-text_h)*${yPercent.toFixed(2)}`;

  let borderw = 0;
  let bordercolor = 'black';
  if (s.subtitleOutline === true || s.subtitleOutline === 'thick' || s.subtitleOutline === 'thin' || (typeof s.subtitleOutlineWidth === 'number' && s.subtitleOutlineWidth > 0)) {
    borderw = typeof s.subtitleOutlineWidth === 'number' && s.subtitleOutlineWidth > 0 
      ? Math.round(s.subtitleOutlineWidth) 
      : (s.subtitleOutline === 'thick' ? 4 : 2);
    bordercolor = normalizeColor(s.subtitleGlow ? s.subtitleGlowColor : 'black', 'black');
  } else if (s.subtitlePreset === 'Hormozi Pop') {
    borderw = 3;
    bordercolor = 'black';
  } else if (s.subtitlePreset === 'Bold Impact') {
    borderw = 4;
    bordercolor = 'black';
  }

  const isBox = s.subtitleBox === true || s.subtitlePreset === 'Cinematic Boxed' || s.subtitlePreset === 'Retro Karaoke';
  let boxParam = '';
  if (isBox) {
    const boxColor = normalizeBoxColor(s.subtitleBoxColor);
    boxParam = `:box=1:boxcolor=${boxColor}:boxborderw=10`;
  }

  let filter = `drawtext=text='${escaped}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${xExpr}:y=${yExpr}`;
  if (borderw > 0) {
    filter += `:borderw=${borderw}:bordercolor=${bordercolor}`;
  }
  if (boxParam) {
    filter += boxParam;
  }

  return filter;
}

/**
 * Build karaoke-style subtitle filter with word-level highlighting
 * Each word gets its own drawtext with enable='between(t,start,end)' for highlighting
 */
export function buildKaraokeSubtitleFilter(
  wordTimestamps: Array<{ word: string; start: number; end: number; confidence?: number }>,
  settings: SubtitleConfig,
  beatStartTime: number = 0
): string | null {
  if (!wordTimestamps || wordTimestamps.length === 0) return null;
  if (settings && settings.burnSubtitles === false) return null;

  const s: SubtitleConfig = settings || {} as SubtitleConfig;
  const normalizeColor = (c?: string, defaultColor = 'white') => {
    if (!c) return defaultColor;
    const clean = c.trim();
    if (clean.startsWith('#')) {
      return `0x${clean.slice(1)}`;
    }
    return clean;
  };

  let fontSize = 54;
  if (typeof s.subtitleSize === 'number' && s.subtitleSize > 0) {
    fontSize = s.subtitleSize < 20 ? Math.round(s.subtitleSize * 10) : Math.round(s.subtitleSize);
  }

  const fontColor = normalizeColor(s.subtitleColor || (s.subtitlePreset === 'Hormozi Pop' ? '#FACC15' : '#FFFFFF'), 'white');
  const highlightColor = normalizeColor(s.subtitleHighlightColor || '#FFFF00', 'yellow');
  const yPercent = typeof s.subtitleY === 'number' && s.subtitleY >= 0 ? s.subtitleY / 100 : 0.75;
  const xExpr = '(w-text_w)/2';
  const yExpr = `(h-text_h)*${yPercent.toFixed(2)}`;

  let borderw = 0;
  let bordercolor = 'black';
  if (s.subtitleOutline === true || s.subtitleOutline === 'thick' || s.subtitleOutline === 'thin' || (typeof s.subtitleOutlineWidth === 'number' && s.subtitleOutlineWidth > 0)) {
    borderw = typeof s.subtitleOutlineWidth === 'number' && s.subtitleOutlineWidth > 0 
      ? Math.round(s.subtitleOutlineWidth) 
      : (s.subtitleOutline === 'thick' ? 4 : 2);
    bordercolor = normalizeColor(s.subtitleGlow ? s.subtitleGlowColor : 'black', 'black');
  } else if (s.subtitlePreset === 'Hormozi Pop') {
    borderw = 3;
    bordercolor = 'black';
  } else if (s.subtitlePreset === 'Bold Impact') {
    borderw = 4;
    bordercolor = 'black';
  }

  const isBox = s.subtitleBox === true || s.subtitlePreset === 'Cinematic Boxed' || s.subtitlePreset === 'Retro Karaoke';
  let boxParam = '';
  if (isBox) {
    const boxColor = normalizeBoxColor(s.subtitleBoxColor);
    boxParam = `:box=1:boxcolor=${boxColor}:boxborderw=10`;
  }

  // Build the base style for normal words
  let baseStyle = `fontsize=${fontSize}:fontcolor=${fontColor}:x=${xExpr}:y=${yExpr}`;
  if (borderw > 0) {
    baseStyle += `:borderw=${borderw}:bordercolor=${bordercolor}`;
  }
  if (boxParam) {
    baseStyle += boxParam;
  }

  // Build the highlight style for active word
  let highlightStyle = `fontsize=${fontSize}:fontcolor=${highlightColor}:x=${xExpr}:y=${yExpr}`;
  if (borderw > 0) {
    highlightStyle += `:borderw=${borderw}:bordercolor=${bordercolor}`;
  }
  if (boxParam) {
    highlightStyle += boxParam;
  }

  // Generate drawtext filters for each word
  // We create a base layer with all text in normal color, then overlay highlighted words
  const escapedWords = wordTimestamps.map(w => {
    const text = w.word.trim();
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")
      .replace(/:/g, '\\:')
      .replace(/%/g, '\\%')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  });

  const allText = escapedWords.join(' ');
  if (!allText) return null;

  // Base layer: all text in normal color
  let filter = `drawtext=text='${escapeFfmpegDrawtext(allText)}':${baseStyle}`;

  // Overlay each word with highlight during its time window
  for (let i = 0; i < wordTimestamps.length; i++) {
    const wt = wordTimestamps[i];
    const word = escapedWords[i];
    if (!word) continue;
    
    const globalStart = beatStartTime + wt.start;
    const globalEnd = beatStartTime + wt.end;
    const enableExpr = `between(t,${globalStart.toFixed(3)},${globalEnd.toFixed(3)})`;
    
    filter += `,drawtext=text='${word}':${highlightStyle}:enable='${enableExpr}'`;
  }

  return filter;
}

async function startWorker() {
  console.log('🎬 Lightweight FFmpeg Render Worker started. Polling for jobs...')
  
  while (true) {
    try {
      await pollAndProcess()
    } catch (err) {
      console.error('Worker error:', err instanceof Error ? err.message : String(err))
    }
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
}

async function pollAndProcess() {
  const leaseToken = crypto.randomUUID()
  const claim = await claimRenderJob(renderJobRpc, {
    workerId,
    leaseToken,
    leaseMs: 300000,
  })
  if (!claim) return

  const { data: job, error } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('id', claim.id)
    .single()

  if (error || !job) {
    console.error('Supabase job fetch error:', error?.message || 'Job not found')
    return
  }
  console.log(`\n📦 Found pending job: ${job.id}`)

  const jobTempDir = path.join(TEMP_DIR, job.id);
  if (!fs.existsSync(jobTempDir)) fs.mkdirSync(jobTempDir, { recursive: true });

  try {
    let params: RenderParams = {
      voiceSpeed: 1.0,
      voiceVolume: 100,
      bgmVolume: 0,
      enableDucking: true,
    }
    if (typeof job.logs === 'string') {
      try { params = { ...params, ...JSON.parse(job.logs) } } catch { params = { ...params, message: job.logs } }
    } else if (job.logs && typeof job.logs === 'object') {
      params = { ...params, ...job.logs } as RenderParams
    }

    let orchState: RenderOrchestrationState = {}
    if (typeof job.orchestration_state === 'string') {
      try { orchState = JSON.parse(job.orchestration_state) } catch { orchState = {} }
    } else if (job.orchestration_state && typeof job.orchestration_state === 'object') {
      orchState = job.orchestration_state as RenderOrchestrationState
    }

    const subtitleSettings: SubtitleConfig = orchState.subtitleSettings || params.subtitleSettings || {
      burnSubtitles: params.burnSubtitles ?? true,
      karaoke: false,
      wordTimestamps: [],
      subtitlePreset: params.subtitlePreset,
      subtitleColor: params.subtitleColor,
      subtitleHighlightColor: params.subtitleHighlightColor,
      subtitleGlow: params.subtitleGlow,
      subtitleGlowColor: params.subtitleGlowColor,
      subtitleOutline: params.subtitleOutline,
      subtitleOutlineWidth: params.subtitleOutlineWidth,
      subtitleBox: params.subtitleBox,
      subtitleBoxColor: params.subtitleBoxColor,
      subtitleSize: params.subtitleSize,
      subtitleY: params.subtitleY,
      subtitleUppercase: (params.subtitleSettings as SubtitleConfig | undefined)?.subtitleUppercase,
    }
    
    let keys: Array<{ provider: string | null; api_key: string | null }> | null = null
    try {
      const { data } = await supabase.from('settings').select('provider, api_key').is('user_id', null)
      keys = data
    } catch {}
  
    const findKey = (name: string) => keys?.find(k => k.provider === name || k.provider === `api_${name}`)?.api_key;
    const elevenKey = findKey('elevenlabs') || process.env.ELEVENLABS_API_KEY
    const googleKey = findKey('google_tts') || findKey('google') || process.env.GOOGLE_TTS_API_KEY
    const azureKey = findKey('azure_speech') || findKey('azure') || process.env.AZURE_SPEECH_KEY
    const openAiKey = findKey('openai') || process.env.OPENAI_API_KEY
    
    const { TTSEngine } = await import('../lib/engine/tts')
    const ttsEngine = new TTSEngine()
    
    let beatsList: RenderBeat[] = params.beats || (params.input && params.input.beats) || []
    if (beatsList.length === 0 && (params.analysis?.scenes || params.result?.scenes || params.scenes)) {
      const scenes = params.analysis?.scenes || params.result?.scenes || params.scenes || []
      beatsList = scenes.map((s: RenderScene, idx: number) => ({
        id: s.id || `scene-${idx + 1}`,
        text: s.text || s.narration || s.prompt || s.script || '',
        duration: s.duration || 3,
        clipUrl: s.selectedVideo?.url || s.selectedVideo?.previewUrl || s.clipUrl || s.videoUrl || s.url || ''
      }))
    }
    if (beatsList.length === 0 && (params.script || params.input?.script)) {
      beatsList = [{
        id: 'beat-1',
        text: params.script || params.input?.script,
        duration: params.duration || params.input?.duration || 3.5,
        clipUrl: ''
      }]
    }

    // Aspect ratio configuration
    const aspectRatios = {
      '9:16': { width: 1080, height: 1920, label: 'MainRender-9x16', orientation: 'vertical' },
      '16:9': { width: 1920, height: 1080, label: 'MainRender-16x9', orientation: 'horizontal' },
      '1:1': { width: 1080, height: 1080, label: 'MainRender-1x1', orientation: 'square' },
    }
    const aspectRatio = (params.aspectRatio ?? '9:16') as keyof typeof aspectRatios
    const AR = aspectRatios[aspectRatio]
    const { width, height, label: compId } = AR

    console.log(`   -> Remotion composition binding: ${compId}`)
    console.log(`🎙️ Generating TTS for ${beatsList.length} beats...`)
    
    const beatClips: string[] = [];
    let totalDurationSeconds = 0;

    for (let i = 0; i < beatsList.length; i++) {
      const b = beatsList[i];
      const text = b?.text || b?.prompt || 'Clipped Video Beat'
      console.log(`   - Beat ${i+1}: "${text.slice(0, 30)}..."`)
      
      let audioUrl = '';
      let duration = b.duration || 3;
      try {
        const requestedVoice = params.voice || orchState.voice || b.voice;
        const requestedProvider = params.voiceProvider || orchState.voiceProvider || (elevenKey ? 'elevenlabs' : (googleKey ? 'google_tts' : (azureKey ? 'azure_speech' : 'keyless')));
        const providerKeyMap: Record<string, string | undefined> = {
          elevenlabs: elevenKey,
          google_tts: googleKey,
          google: googleKey,
          azure_speech: azureKey,
          azure: azureKey,
          openai: openAiKey,
        };
        const matchingKey = requestedProvider ? providerKeyMap[requestedProvider] : undefined;
        const ttsRes = await ttsEngine.synthesize({
          text: text,
          provider: requestedProvider,
          voice: requestedVoice,
          voiceId: requestedVoice,
          speed: params.voiceSpeed || 1.0,
          volume: params.voiceVolume || 100,
          apiKey: matchingKey
        });
        audioUrl = ttsRes.audioUrl || '';
        duration = ttsRes.duration || b.duration || 3;
        
        // Extract word timestamps from TTS result if available (for karaoke)
        if (ttsRes.metadata?.wordTimestamps && Array.isArray(ttsRes.metadata.wordTimestamps)) {
          b.wordTimestamps = ttsRes.metadata.wordTimestamps;
        }
      } catch (err) {
        console.error("TTS generation failed:", err instanceof Error ? err.message : String(err))
      }

      // Extract URL from Orchestrator VideoMatch format, or fallback
      let mediaUrl = b?.selectedVideo?.url || b?.imageUrl || b?.videoUrl || b.clipUrl || b.urls?.[0] || b.candidates?.[0]?.url || '';
      
      if (!mediaUrl) {
        const fullPrompt = `${text}, educational tech style, paradox style, consistent character anchor, minimalist stick man character`;
        try {
          console.log(`     -> Calling local OmniRoute for image...`);
          const res = await fetch('http://localhost:20128/v1/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const data = await res.json();
          if (data?.data?.[0]?.url) {
            mediaUrl = data.data[0].url;
          } else {
            throw new Error("Invalid OmniRoute response");
          }
        } catch (err) {
          console.error("     -> OmniRoute local failed, falling back to Pollinations:", err instanceof Error ? err.message : String(err));
          mediaUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&nologo=true`;
        }
      }

      const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video') || b?.selectedVideo?.platform === 'pexels';
      const ext = isVideo ? 'mp4' : 'jpg';
      const mediaPath = path.join(jobTempDir, `media_${i}.${ext}`);
      
      console.log(`     -> Downloading media (${ext})...`);
      await downloadFile(mediaUrl, mediaPath);
  
      let audioPath = '';
      let exactDuration = 0;
      if (audioUrl) {
        const aExt = audioUrl.startsWith('data:audio/wav') ? 'wav' : 'mp3';
        audioPath = path.join(jobTempDir, `audio_${i}.${aExt}`);
        await downloadFile(audioUrl, audioPath);

        // Use ffprobe to get exact audio duration for precise frame calculation
        if (FF_PROBE_AVAILABLE && fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
          try {
            exactDuration = await getAudioDuration(audioPath);
            console.log(`     -> Exact audio duration: ${exactDuration.toFixed(3)}s`);
          } catch (e) {
            console.warn(`     -> ffprobe failed, using estimated duration: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
      
      // Use exact duration from ffprobe if available, otherwise fall back to TTS reported duration or beat duration
      const finalDuration = exactDuration > 0 ? exactDuration : (duration || b.duration || 3);
      
      // Store exact duration on beat for later use
      b.exactDuration = finalDuration;

      let baseFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
      // Use finalDuration (exact from ffprobe) for all timing
      const fps = 25;
      
      // Build subtitle filter - use karaoke if word timestamps available and karaoke enabled
      let subFilter: string | null = null;
      if (b.wordTimestamps && b.wordTimestamps.length > 0 && subtitleSettings.karaoke) {
        subFilter = buildKaraokeSubtitleFilter(b.wordTimestamps, subtitleSettings, totalDurationSeconds);
      } else {
        subFilter = buildSubtitleDrawtextFilter(text, subtitleSettings);
      }
      
      // Build video filter with exact frame count from ffprobe duration
      if (!isVideo) {
        baseFilter += `,${buildZoompanFilter(finalDuration, fps, AR.width, AR.height, i % 2 === 0 ? 'in' : 'out')}`;
      }
      const videoFilter = subFilter ? `${baseFilter},${subFilter}` : baseFilter;

      const clipPath = path.join(jobTempDir, `clip_${i}.mp4`);
      await new Promise<void>((resolve, reject) => {
        let cmd = ffmpeg().input(mediaPath);
        
        if (!isVideo) {
          cmd = cmd.loop(finalDuration);
        } else {
          cmd = cmd.inputOptions([`-t ${finalDuration}`]); // Truncate video to exact scene duration
        }
        
        if (audioPath && fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
          cmd = cmd.input(audioPath);
          
          const outputOpts = [
            '-c:v libx264',
            '-map 0:v:0',
            '-map 1:a:0',
            '-c:a aac',
            '-b:a 192k',
            '-pix_fmt yuv420p',
            '-shortest'
          ];
          if (!isVideo) outputOpts.push('-tune stillimage');
          
          cmd.outputOptions(outputOpts).videoFilters(videoFilter);
        } else {
          // Keep audio stream active and consistent across all clips
          cmd = cmd.input('anullsrc=r=44100:cl=stereo').inputOptions(['-f lavfi', `-t ${finalDuration}`]);
          
          const outputOpts = [
            '-c:v libx264',
            '-map 0:v:0',
            '-map 1:a:0',
            '-c:a aac',
            '-b:a 192k',
            '-pix_fmt yuv420p',
            '-shortest'
          ];
          if (!isVideo) outputOpts.push('-tune stillimage');
          
          cmd.outputOptions(outputOpts).videoFilters(videoFilter);
        }

        cmd.save(clipPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err));
      });

      beatClips.push(clipPath);
      totalDurationSeconds += finalDuration;
    }

    console.log(`🎬 Concatenating ${beatClips.length} clips into final video...`)
    
    const outputPath = path.join(RENDER_DIR, `${job.id}.mp4`)
    const publicUrl = `/renders/${job.id}.mp4`

    const concatListPath = path.join(jobTempDir, 'concat.txt');
    const concatContent = beatClips.map(clip => `file '${clip}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);
  
    const concatTempPath = path.join(jobTempDir, 'concat_temp.mp4');
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions('-c copy')
        .save(concatTempPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err));
    });

    // Apply Background Music with Audio Ducking
    const pixabayKey = findKey('pixabay') || process.env.PIXABAY_API_KEY;
    const musicVolume = params.musicVolume ? parseInt(params.musicVolume) : 0;
    let bgmDownloaded = false;
    const bgmPath = path.join(jobTempDir, 'bgm.mp3');

    if (musicVolume > 0 && pixabayKey) {
      console.log(`     -> Fetching background music...`);
      try {
        const musicQuery = params.musicSource && params.musicSource !== 'Random Background Music' 
          ? params.musicSource 
          : 'cinematic ambient';
        const bgmRes = await fetch(`https://pixabay.com/api/audio/?key=${pixabayKey}&q=${encodeURIComponent(musicQuery)}`);
        const bgmData = await bgmRes.json();
        if (bgmData.hits && bgmData.hits.length > 0) {
          const track = bgmData.hits[Math.floor(Math.random() * Math.min(3, bgmData.hits.length))];
          await downloadFile(track.preview, bgmPath);
          bgmDownloaded = true;
        }
      } catch (e) {
        console.error("Failed to download BGM:", e);
      }
    }

    if (bgmDownloaded) {
      console.log(`     -> Mixing Audio with sidechain ducking...`);
      const duckingVol = musicVolume / 100; // e.g. 20 -> 0.2
      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg();
        cmd.input(concatTempPath);
        cmd.input(bgmPath).inputOptions(['-stream_loop', '-1']);
        cmd.complexFilter([
            `[1:a]volume=${duckingVol}[bgm]`,
            `[0:a]asplit[main1][main2]`,
            `[bgm][main1]sidechaincompress=threshold=0.08:ratio=4:attack=5:release=50[bgm_ducked]`,
            `[main2][bgm_ducked]amix=inputs=2:duration=first:dropout_transition=2[aout]`
          ])
          .outputOptions([
            '-map 0:v',
            '-map [aout]',
            '-c:v copy',
            '-c:a aac',
            '-b:a 192k',
            '-shortest'
          ])
          .save(outputPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err));
      });
    } else {
      // Just move the concat temp file to output
      fs.copyFileSync(concatTempPath, outputPath);
    }
  
    console.log(`🎬 Render complete: ${outputPath}`)

    await completeRenderJob(renderJobRpc, {
      jobId: job.id,
      workerId,
      leaseToken,
      outputUrl: publicUrl,
      logs: { ...params, finalVideoUrl: publicUrl, duration: totalDurationSeconds },
    })

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`❌ Job ${job.id} failed:`, errorMsg)
    await failRenderJob(renderJobRpc, {
      jobId: job.id,
      workerId,
      leaseToken,
      errorMessage: errorMsg,
    })
  } finally {
    try { fs.rmSync(jobTempDir, { recursive: true, force: true }); } catch {}
  }
}

if (require.main === module) {
  startWorker()
}