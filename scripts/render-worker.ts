import { createClient } from '@supabase/supabase-js'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key'
const supabase = createClient(supabaseUrl, supabaseKey)

const RENDER_DIR = path.resolve(process.cwd(), 'public', 'renders')
if (!fs.existsSync(RENDER_DIR)) {
  fs.mkdirSync(RENDER_DIR, { recursive: true })
}

async function startWorker() {
  console.log('🎬 Intelligent Render Worker started. Polling for jobs...')
  
  // Start the polling loop
  while (true) {
    try {
      await pollAndProcess()
    } catch (err) {
      console.error('Worker error:', err)
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

  if (error) throw error
  if (!jobs || jobs.length === 0) return // No pending jobs

  const job = jobs[0]
  console.log(`\n📦 Found pending job: ${job.id}`)

  // 2. Mark as processing
  await supabase
    .from('render_jobs')
    .update({ status: 'processing' })
    .eq('id', job.id)

  try {
    // 3. Parse Job Data
    const params = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs
    
    // Check for TTS API keys in DB
    const { data: keys } = await supabase.from('settings').select('provider, api_key').eq('user_id', 'default_user');
    const elevenKey = keys?.find(k => k.provider === 'api_elevenlabs')?.api_key;
    const googleKey = keys?.find(k => k.provider === 'api_google')?.api_key;
    
    // Import dynamically so it doesn't break if not built yet
    const { TTSEngine } = await import('../lib/engine/tts.ts');
    const ttsEngine = new TTSEngine();
    
    // Generate TTS for each beat
    console.log(`🎙️ Generating TTS for ${params.beats.length} beats...`);
    const processedBeats = [];
    let totalDurationSeconds = 0;
    
    for (const b of params.beats) {
      console.log(`   - Synthesizing: "${b.text.slice(0, 30)}..."`);
      try {
        const ttsRes = await ttsEngine.synthesize({
          text: b.text,
          provider: elevenKey ? 'elevenlabs' : (googleKey ? 'google' : 'auto'),
          apiKey: elevenKey || googleKey,
          mock: (!elevenKey && !googleKey) // Fallback to safe mock if no keys
        });
        
        processedBeats.push({
          id: b.id,
          text: b.text,
          duration: ttsRes.duration, // Use exact audio duration!
          clipUrl: b.urls?.[0] || b.candidates?.[0]?.url,
          audioUrl: ttsRes.audioUrl
        });
        totalDurationSeconds += ttsRes.duration;
      } catch (err: any) {
        console.error("TTS generation failed for beat:", err.message);
        // Fallback
        processedBeats.push({
          id: b.id,
          text: b.text,
          duration: b.duration || 3,
          clipUrl: b.urls?.[0] || b.candidates?.[0]?.url,
        });
        totalDurationSeconds += b.duration || 3;
      }
    }
    
    // Brand Watermark
    const brandKitKey = keys?.find(k => k.provider === 'brand_kit')?.api_key; // Assuming stored here, or generic watermark
    const watermarkUrl = brandKitKey || 'https://raw.githubusercontent.com/Remotion-dev/logo/main/with-title/white.png';
    
    // Background Music (Keyless fallback lo-fi track)
    const bgmUrl = 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3';

    // Construct the inputProps for Remotion
    const inputProps = {
      beats: processedBeats,
      burnSubtitles: params.burnSubtitles,
      bgmUrl: bgmUrl,
      watermarkUrl: watermarkUrl,
      subtitleStyle: {
        y: params.subtitleY || 78,
        color: params.subtitleColor || '#ffffff',
        size: params.subtitleSize || 5.2,
        outlineWidth: 2.5,
        outlineColor: '#000000',
        isBox: false,
        boxColor: '#000000',
        uppercase: false,
        maxWidth: 82
      }
    }

    const totalDuration = inputProps.beats.reduce((acc: number, b: any) => acc + b.duration, 0)
    const durationInFrames = Math.max(1, Math.floor(totalDuration * 30))
    const outputPath = path.join(RENDER_DIR, `${job.id}.mp4`)
    const publicUrl = `/renders/${job.id}.mp4`
    
    // Branch compilation ID based on Aspect Ratio
    let compId = 'MainRender-9x16';
    if (params.aspectRatio === '16:9') compId = 'MainRender-16x9';
    if (params.aspectRatio === '1:1') compId = 'MainRender-1x1';

    console.log(`🚀 Bundling Remotion composition...`)
    const bundleLocation = await bundle({
      entryPoint: path.resolve(process.cwd(), 'remotion/Root.tsx'),
      webpackOverride: (config) => config,
    })

    console.log(`🎬 Extracting composition [${compId}] metadata...`)
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compId,
      inputProps,
    })

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => {
        // console.log(`Rendering... ${Math.floor(progress * 100)}%`)
      }
    })

    console.log(`✅ Render complete: ${outputPath}`)

    // 4. Mark as completed
    await supabase
      .from('render_jobs')
      .update({ 
        status: 'completed',
        logs: JSON.stringify({ ...params, finalVideoUrl: publicUrl }) 
      })
      .eq('id', job.id)

  } catch (err: any) {
    console.error(`❌ Job ${job.id} failed:`, err.message)
    await supabase
      .from('render_jobs')
      .update({ status: 'failed', logs: JSON.stringify({ error: err.message }) })
      .eq('id', job.id)
  }
}

startWorker()
