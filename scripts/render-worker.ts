import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { claimRenderJob, completeRenderJob, failRenderJob } from '../lib/jobs/render-job'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

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

export interface SubtitleConfig {
  burnSubtitles?: boolean;
  subtitlePreset?: string;
  subtitleColor?: string;
  subtitleHighlightColor?: string;
  subtitleGlow?: boolean;
  subtitleGlowColor?: string;
  subtitleOutline?: boolean | string;
  subtitleOutlineWidth?: number;
  subtitleBox?: boolean;
  subtitleBoxColor?: string;
  subtitleSize?: number;
  subtitleY?: number;
  subtitleUppercase?: boolean;
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

  const s = settings || {};
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

async function startWorker() {
  console.log('🎬 Lightweight FFmpeg Render Worker started. Polling for jobs...')
  
  while (true) {
    try {
      await pollAndProcess()
    } catch (err: any) {
      console.error('Worker error:', err?.message || err)
    }
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
}

async function pollAndProcess() {
  const leaseToken = crypto.randomUUID()
  const claim = await claimRenderJob(supabase as any, {
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
    let params: any = {}
    if (typeof job.logs === 'string') {
      try { params = JSON.parse(job.logs) } catch { params = { message: job.logs } }
    } else if (job.logs && typeof job.logs === 'object') {
      params = job.logs
    }

    let orchState: any = {}
    if (typeof job.orchestration_state === 'string') {
      try { orchState = JSON.parse(job.orchestration_state) } catch { orchState = {} }
    } else if (job.orchestration_state && typeof job.orchestration_state === 'object') {
      orchState = job.orchestration_state
    }

    const subtitleSettings: SubtitleConfig = orchState.subtitleSettings || params.subtitleSettings || {
      burnSubtitles: params.burnSubtitles,
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
    }
    
    let keys: any[] | null = null
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
    
    let beatsList: any[] = params.beats || (params.input && params.input.beats) || []
    if (beatsList.length === 0 && (params.analysis?.scenes || params.result?.scenes || params.scenes)) {
      const scenes = params.analysis?.scenes || params.result?.scenes || params.scenes || []
      beatsList = scenes.map((s: any, idx: number) => ({
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

    let compId = 'MainRender-9x16'
    if (params.aspectRatio === '16:9') compId = 'MainRender-16x9'
    if (params.aspectRatio === '1:1') compId = 'MainRender-1x1'

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
      } catch (err: any) {
        console.error("TTS generation failed:", err?.message || err)
      }

        // Extract URL from Orchestrator VideoMatch format, or fallback
        let mediaUrl = b?.selectedVideo?.url || b?.imageUrl || b?.videoUrl || b.clipUrl || b.urls?.[0] || b.candidates?.[0]?.url;
        
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
          } catch (err: any) {
            console.error("     -> OmniRoute local failed, falling back to Pollinations:", err.message);
            mediaUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&nologo=true`;
          }
        }

        const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video') || b?.selectedVideo?.platform === 'pexels';
        const ext = isVideo ? 'mp4' : 'jpg';
        const mediaPath = path.join(jobTempDir, `media_${i}.${ext}`);
        
        console.log(`     -> Downloading media (${ext})...`);
        await downloadFile(mediaUrl, mediaPath);
  
        let audioPath = '';
        if (audioUrl) {
          const aExt = audioUrl.startsWith('data:audio/wav') ? 'wav' : 'mp3';
          audioPath = path.join(jobTempDir, `audio_${i}.${aExt}`);
          await downloadFile(audioUrl, audioPath);
        }
  
        let baseFilter = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
        if (!isVideo) {
          const fps = 25;
          const frames = Math.ceil(duration * fps);
          baseFilter += `,zoompan=z='1.0+(0.15*(in/${frames}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps}`;
        }
        const subFilter = buildSubtitleDrawtextFilter(text, subtitleSettings);
        const videoFilter = subFilter ? `${baseFilter},${subFilter}` : baseFilter;
  
        const clipPath = path.join(jobTempDir, `clip_${i}.mp4`);
        await new Promise<void>((resolve, reject) => {
          let cmd = ffmpeg().input(mediaPath);
          
          if (!isVideo) {
            cmd = cmd.loop(duration);
          } else {
            cmd = cmd.inputOptions([`-t ${duration}`]); // Truncate video to scene duration
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
            cmd = cmd.input('anullsrc=r=44100:cl=stereo').inputOptions(['-f lavfi', `-t ${duration}`]);
            
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
            .on('error', (err) => reject(err));
        });

      beatClips.push(clipPath);
      totalDurationSeconds += duration;
    }

    console.log(`🚀 Concatenating ${beatClips.length} clips into final video...`)
    
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
          .on('error', (err) => reject(err));
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
            .on('error', (err) => reject(err));
        });
      } else {
        // Just move the concat temp file to output
        fs.copyFileSync(concatTempPath, outputPath);
      }
  
      console.log(`🎬 Render complete: ${outputPath}`)

    await completeRenderJob(supabase as any, {
      jobId: job.id,
      workerId,
      leaseToken,
      outputUrl: publicUrl,
      logs: { ...params, finalVideoUrl: publicUrl, duration: totalDurationSeconds },
    })

  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    console.error(`❌ Job ${job.id} failed:`, errorMsg)
    await failRenderJob(supabase as any, {
      jobId: job.id,
      workerId,
      leaseToken,
      errorMessage: errorMsg,
    })
  } finally {
    try { fs.rmSync(jobTempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

if (require.main === module) {
  startWorker()
}
