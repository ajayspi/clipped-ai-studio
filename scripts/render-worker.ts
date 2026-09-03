import { createClient } from '@supabase/supabase-js'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

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
if (!fs.existsSync(RENDER_DIR)) {
  fs.mkdirSync(RENDER_DIR, { recursive: true });
}

async function startWorker() {
  console.log('ðŸŽ¬ Intelligent Render Worker started. Polling for jobs...')
  
  // Start the polling loop
  while (true) {
    try {
      await pollAndProcess()
    } catch (err: any) {
      console.error('Worker error:', err?.message || err)
    }
    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
}

async function pollAndProcess() {
  // 1. Find a pending job
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
  if (!jobs || jobs.length === 0) return // No pending jobs

  const job = jobs[0]
  console.log(`\nðŸ“¦ Found pending job: ${job.id}`)

  // 2. Mark as processing
  await supabase
    .from('render_jobs')
    .update({ status: 'processing' })
    .eq('id', job.id)

  try {
    // 3. Parse Job Data
    let params: any = {}
    if (typeof job.logs === 'string') {
      try {
        params = JSON.parse(job.logs)
      } catch {
        params = { message: job.logs }
      }
    } else if (job.logs && typeof job.logs === 'object') {
      params = job.logs
    }
    
    // Check for TTS API keys in DB
    let keys: any[] | null = null
    try {
      const { data } = await supabase.from('settings').select('provider, api_key').is('user_id', null)
      keys = data
    } catch {
      // Fallback silently if settings table is unavailable in dry-run mode
    }
    
    const elevenKey = keys?.find(k => k.provider === 'api_elevenlabs')?.api_key || process.env.ELEVENLABS_API_KEY
    const googleKey = keys?.find(k => k.provider === 'api_google')?.api_key || process.env.GOOGLE_TTS_API_KEY
    
    // Import dynamically so it doesn't break if not built yet
    const { TTSEngine } = await import('../lib/engine/tts')
    const ttsEngine = new TTSEngine()
    
    // Safely extract beats list with multi-source fallback
    let beatsList: any[] = params.beats || (params.input && params.input.beats) || []
    if (beatsList.length === 0 && (params.analysis?.scenes || params.result?.scenes || params.scenes)) {
      const scenes = params.analysis?.scenes || params.result?.scenes || params.scenes || []
      beatsList = scenes.map((s: any, idx: number) => ({
        id: s.id || `scene-${idx + 1}`,
        text: s.text || s.narration || s.prompt || s.script || '',
        duration: s.duration || 3,
        clipUrl: s.selectedVideo?.url || s.selectedVideo?.previewUrl || s.clipUrl || s.videoUrl || s.url || 'https://www.w3schools.com/html/mov_bbb.mp4'
      }))
    }
    if (beatsList.length === 0 && (params.script || params.input?.script)) {
      const scriptText = params.script || params.input?.script
      beatsList = [{
        id: 'beat-1',
        text: scriptText,
        duration: params.duration || params.input?.duration || 3.5,
        clipUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
      }]
    }
    if (beatsList.length === 0) {
      beatsList = [{
        id: 'beat-default',
        text: 'Clipped AI Video',
        duration: 3,
        clipUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
      }]
    }

    // Generate TTS for each beat
    console.log(`ðŸŽ™ï¸ Generating TTS for ${beatsList.length} beats...`)
    const processedBeats = []
    let totalDurationSeconds = 0
    
    for (const b of beatsList) {
      const text = b?.text || b?.prompt || 'Clipped Video Beat'
      console.log(`   - Synthesizing: "${text.slice(0, 30)}..."`)
      try {
        const ttsRes = await ttsEngine.synthesize({
          text: text,
          provider: elevenKey ? 'elevenlabs' : (googleKey ? 'google' : 'auto'),
          apiKey: elevenKey || googleKey,
          mock: (!elevenKey && !googleKey) // Fallback to safe mock if no keys
        })
        
        processedBeats.push({
          id: b.id || `beat-${processedBeats.length + 1}`,
          text: text,
          duration: ttsRes.duration || b.duration || 3, // Use exact audio duration!
          clipUrl: b.clipUrl || b.urls?.[0] || b.candidates?.[0]?.url || 'https://www.w3schools.com/html/mov_bbb.mp4',
          audioUrl: ttsRes.audioUrl
        })
        totalDurationSeconds += (ttsRes.duration || b.duration || 3)
      } catch (err: any) {
        console.error("TTS generation failed for beat:", err?.message || err)
        // Fallback
        processedBeats.push({
          id: b.id || `beat-${processedBeats.length + 1}`,
          text: text,
          duration: b.duration || 3,
          clipUrl: b.clipUrl || b.urls?.[0] || b.candidates?.[0]?.url || 'https://www.w3schools.com/html/mov_bbb.mp4',
        })
        totalDurationSeconds += (b.duration || 3)
      }
    }
    
    // Brand Watermark
    const brandKitKey = keys?.find(k => k.provider === 'brand_kit')?.api_key || process.env.BRAND_KIT_WATERMARK_URL
    const watermarkUrl = brandKitKey || 'https://raw.githubusercontent.com/Remotion-dev/logo/main/with-title/white.png'
    
    // Background Music (Keyless fallback lo-fi track)
    const bgmUrl = 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3'

    const burnSubtitles = params.burnSubtitles !== undefined
      ? params.burnSubtitles !== false
      : (params.input?.burnSubtitles !== false)

    // Construct the inputProps for Remotion
    const inputProps = {
      beats: processedBeats,
      burnSubtitles,
      bgmUrl: bgmUrl,
      watermarkUrl: watermarkUrl,
      subtitleStyle: {
        y: params.subtitleY ?? params.input?.subtitleY ?? 78,
        color: params.subtitleColor || params.input?.subtitleColor || '#ffffff',
        highlightColor: params.subtitleHighlightColor || params.input?.subtitleHighlightColor || '#facc15',
        glow: Boolean(params.subtitleGlow ?? params.input?.subtitleGlow),
        glowColor: params.subtitleGlowColor || params.input?.subtitleGlowColor || '#22d3ee',
        size: params.subtitleSize ?? params.input?.subtitleSize ?? 5.2,
        outlineWidth: params.subtitleOutlineWidth ?? params.input?.subtitleOutlineWidth ?? 2.5,
        outlineColor: params.subtitleOutline || params.input?.subtitleOutline || '#000000',
        isBox: Boolean(params.subtitleBox ?? params.subtitleIsBox ?? params.input?.subtitleBox ?? params.input?.subtitleIsBox),
        boxColor: params.subtitleBoxColor || params.input?.subtitleBoxColor || '#000000',
        boxOpacity: params.subtitleBoxOpacity ?? params.input?.subtitleBoxOpacity ?? 70,
        boxRadius: params.subtitleBoxRadius ?? params.input?.subtitleBoxRadius ?? 8,
        letterSpacing: params.subtitleLetterSpacing ?? params.input?.subtitleLetterSpacing ?? 0,
        uppercase: Boolean(params.subtitleUppercase ?? params.input?.subtitleUppercase),
        maxWidth: params.subtitleMaxWidth ?? params.input?.subtitleMaxWidth ?? 82,
      }
    }

    const totalDuration = inputProps.beats.reduce((acc: number, b: any) => acc + (b.duration || 3), 0)
    const durationInFrames = Math.max(1, Math.floor(totalDuration * 30))
    const outputPath = path.join(RENDER_DIR, `${job.id}.mp4`)
    const publicUrl = `/renders/${job.id}.mp4`
    
    // Branch composition ID based on Aspect Ratio
    let compId = 'MainRender-9x16'
    if (params.aspectRatio === '16:9') compId = 'MainRender-16x9'
    if (params.aspectRatio === '1:1') compId = 'MainRender-1x1'
    if (params.input?.aspectRatio === '16:9') compId = 'MainRender-16x9'
    if (params.input?.aspectRatio === '1:1') compId = 'MainRender-1x1'

    console.log(`ðŸš€ Bundling Remotion composition...`)
    const entryPoint = fs.existsSync(path.resolve(process.cwd(), 'remotion/Root.tsx'))
      ? path.resolve(process.cwd(), 'remotion/Root.tsx')
      : path.resolve(ROOT_DIR, 'remotion/Root.tsx')

    const bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => config,
    })

    console.log(`ðŸŽ¬ Extracting composition [${compId}] metadata...`)
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compId,
      inputProps,
      timeoutInMilliseconds: 60000,
      chromiumOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      }
    })

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      concurrency: 1, // Use only 1 concurrent frame to save RAM
      timeoutInMilliseconds: 120000, // Increase timeout for slow VM networking
      chromiumOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      },
      onProgress: ({ progress }) => {
        // console.log(`Rendering... ${Math.floor(progress * 100)}%`)
      }
    })

    console.log(`âœ… Render complete: ${outputPath}`)

    // 4. Mark as completed
    await supabase
      .from('render_jobs')
      .update({ 
        status: 'completed',
        logs: JSON.stringify({ ...params, finalVideoUrl: publicUrl, duration: totalDuration, durationInFrames }) 
      })
      .eq('id', job.id)

  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    console.error(`âŒ Job ${job.id} failed:`, errorMsg)
    await supabase
      .from('render_jobs')
      .update({ status: 'failed', logs: JSON.stringify({ error: errorMsg }) })
      .eq('id', job.id)
  }
}

startWorker()
