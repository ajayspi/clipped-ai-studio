import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

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

const RENDER_DIR = path.resolve(ROOT_DIR, 'public', 'renders');
const TEMP_DIR = path.resolve(ROOT_DIR, 'tmp_renders');
if (!fs.existsSync(RENDER_DIR)) fs.mkdirSync(RENDER_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function downloadFile(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buffer));
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
  const { data: jobs, error } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) {
    console.error('Supabase query error:', error.message || error)
    return
  }
  if (!jobs || jobs.length === 0) return 

  const job = jobs[0]
  console.log(`\n📦 Found pending job: ${job.id}`)

  await supabase
    .from('render_jobs')
    .update({ status: 'processing' })
    .eq('id', job.id)

  const jobTempDir = path.join(TEMP_DIR, job.id);
  if (!fs.existsSync(jobTempDir)) fs.mkdirSync(jobTempDir, { recursive: true });

  try {
    let params: any = {}
    if (typeof job.logs === 'string') {
      try { params = JSON.parse(job.logs) } catch { params = { message: job.logs } }
    } else if (job.logs && typeof job.logs === 'object') {
      params = job.logs
    }
    
    let keys: any[] | null = null
    try {
      const { data } = await supabase.from('settings').select('provider, api_key').is('user_id', null)
      keys = data
    } catch {}
    
    const elevenKey = keys?.find(k => k.provider === 'api_elevenlabs')?.api_key || process.env.ELEVENLABS_API_KEY
    const googleKey = keys?.find(k => k.provider === 'api_google')?.api_key || process.env.GOOGLE_TTS_API_KEY
    
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

    console.log(`🎙️ Generating TTS and preparing assets for ${beatsList.length} beats...`)
    
    const beatClips: string[] = [];
    let totalDurationSeconds = 0;

    for (let i = 0; i < beatsList.length; i++) {
      const b = beatsList[i];
      const text = b?.text || b?.prompt || 'Clipped Video Beat'
      console.log(`   - Beat ${i+1}: "${text.slice(0, 30)}..."`)
      
      let audioUrl = '';
      let duration = b.duration || 3;
      try {
        const ttsRes = await ttsEngine.synthesize({
          text: text,
          provider: elevenKey ? 'elevenlabs' : (googleKey ? 'google' : 'keyless'),
          apiKey: elevenKey || googleKey
        })
        audioUrl = ttsRes.audioUrl || '';
        duration = ttsRes.duration || b.duration || 3;
      } catch (err: any) {
        console.error("TTS generation failed:", err?.message || err)
      }

      let imageUrl = b.clipUrl || b.urls?.[0] || b.candidates?.[0]?.url;
      if (!imageUrl || imageUrl.endsWith('.mp4')) {
        const fullPrompt = `${text}, educational tech style, paradox style, consistent character anchor, minimalist stick man character`;
        
        // We can check if OmniRoute local gateway is running instead of requiring a key
        try {
          console.log(`     -> Calling local OmniRoute for image...`);
          const res = await fetch('http://localhost:20128/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'auto', // OmniRoute auto combo
              prompt: fullPrompt,
              n: 1,
              size: '1024x1024'
            })
          });
          const data = await res.json();
          if (data?.data?.[0]?.url) {
            imageUrl = data.data[0].url;
          } else {
            throw new Error("Invalid OmniRoute response");
          }
        } catch (err: any) {
          console.error("     -> OmniRoute local failed, falling back to Pollinations:", err.message);
          imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&nologo=true`;
        }
      }

      const imgPath = path.join(jobTempDir, `img_${i}.jpg`);
      await downloadFile(imageUrl, imgPath);

      let audioPath = '';
      if (audioUrl) {
        audioPath = path.join(jobTempDir, `audio_${i}.mp3`);
        await downloadFile(audioUrl, audioPath);
      }

      const clipPath = path.join(jobTempDir, `clip_${i}.mp4`);
      await new Promise<void>((resolve, reject) => {
        let cmd = ffmpeg()
          .input(imgPath)
          .loop(duration);
        
        if (audioPath) {
          cmd = cmd.input(audioPath);
        }
        
        cmd.outputOptions([
          '-c:v libx264',
          '-tune stillimage',
          '-c:a aac',
          '-b:a 192k',
          '-pix_fmt yuv420p',
          '-shortest', 
          '-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'
        ])
        .save(clipPath)
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

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions('-c copy')
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    console.log(`✅ Render complete: ${outputPath}`)

    await supabase
      .from('render_jobs')
      .update({ 
        status: 'completed',
        logs: JSON.stringify({ ...params, finalVideoUrl: publicUrl, duration: totalDurationSeconds }) 
      })
      .eq('id', job.id)

  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    console.error(`❌ Job ${job.id} failed:`, errorMsg)
    await supabase
      .from('render_jobs')
      .update({ status: 'failed', logs: JSON.stringify({ error: errorMsg }) })
      .eq('id', job.id)
  } finally {
    try { fs.rmSync(jobTempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

startWorker()
