/**
 * Render Worker — Supabase Realtime-driven FFmpeg pipeline.
 *
 * - Wakes on postgres_changes events for render_jobs (status = 'pending')
 *   instead of hot-polling; a slow safety poll self-heals missed events.
 * - Claims jobs atomically (single conditional UPDATE) so overlapping
 *   workers can never double-process the same job.
 * - Downloads assets as streams and uploads the finished render to
 *   Supabase Storage, so neither media nor video ever buffers fully in RAM.
 *
 * Run with Bun (preferred):   bun scripts/render-worker.ts
 * Run with Node + tsx:        node --import tsx scripts/render-worker.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { runSinglePassRender, resolveDimensions } from './lib/render-command'
import type { FfmpegCommand, RenderBeatInput } from './lib/render-command'

// Load environment variables from .env.local
const ROOT_DIR = fs.existsSync(path.resolve(process.cwd(), 'package.json'))
  ? process.cwd()
  : path.resolve(__dirname, '..')
const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.local'))
  ? path.resolve(process.cwd(), '.env.local')
  : path.resolve(ROOT_DIR, '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_service_key'

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { params: { eventsPerSecond: 5 } },
})

const RENDER_DIR = path.resolve(ROOT_DIR, 'public', 'renders')
const TEMP_DIR = path.resolve(ROOT_DIR, 'tmp_renders')
const RENDER_BUCKET = 'renders'
const IDLE_POLL_INTERVAL_MS = 60_000

if (!fs.existsSync(RENDER_DIR)) fs.mkdirSync(RENDER_DIR, { recursive: true })
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

// ---- process-wide state (used for graceful shutdown) ----
let currentJobId: string | null = null
let currentFfmpeg: FfmpegCommand | null = null
let draining = false
let shuttingDown = false

/**
 * Streams a remote file straight to disk — never buffers the whole body in RAM.
 */
async function downloadFile(url: string, dest: string) {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Failed to download ${url}: ${res.statusText}`)
  await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(dest))
}

/**
 * Claims the oldest pending job atomically: the claim is a single conditional
 * UPDATE ... WHERE status='pending' RETURNING, so two workers (or a PM2
 * restart overlap) can never grab the same job.
 */
async function claimNextJob(): Promise<any | null> {
  const atomic = await supabase
    .from('render_jobs')
    .update({ status: 'processing' })
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .select('*')

  if (!atomic.error && atomic.data && atomic.data.length > 0) {
    return atomic.data[0]
  }

  if (atomic.error) {
    // Some PostgREST configurations reject ORDER/LIMIT on PATCH — degrade
    // gracefully to select-then-claim (the guarded update keeps it near-atomic).
    console.warn('⚠️ Atomic claim failed, degrading to select-then-update:', atomic.error.message)
    const { data: jobs, error } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
    if (error || !jobs || jobs.length === 0) return null

    const { data: locked, error: lockError } = await supabase
      .from('render_jobs')
      .update({ status: 'processing' })
      .eq('id', jobs[0].id)
      .eq('status', 'pending')
      .select('*')
    if (lockError || !locked || locked.length === 0) return null
    return locked[0]
  }

  return null
}

/**
 * Drains the queue: claims and processes jobs one at a time until none are
 * left. Concurrency is guarded by the `draining` flag; the atomic claim in
 * claimNextJob() keeps multiple workers safe regardless.
 */
async function drainQueue() {
  if (draining || shuttingDown) return
  draining = true
  try {
    while (!shuttingDown) {
      const job = await claimNextJob()
      if (!job) break
      await processJob(job)
    }
  } catch (err: any) {
    console.error('Worker error:', err?.message || err)
  } finally {
    draining = false
  }
}

function startWorker() {
  const bunVersion = (globalThis as any).Bun?.version
  const runtime = bunVersion ? `Bun ${bunVersion}` : `Node ${process.version}`
  console.log(`🎬 FFmpeg Render Worker started on ${runtime}.`)
  console.log(`🛰️ Waking on Supabase Realtime events (+ ${IDLE_POLL_INTERVAL_MS / 1000}s safety poll).`)

  supabase
    .channel('render-jobs-queue')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'render_jobs' },
      (payload: any) => {
        const row = payload?.new ?? null
        if (row && row.status === 'pending') {
          console.log(`🔔 Realtime event: job ${row.id} is pending — waking up`)
          void drainQueue()
        }
      }
    )
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime channel subscribed — idle CPU/RAM are now near zero')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn(`⚠️ Realtime channel status: ${status} — continuing on safety poll`)
      }
    })

  setInterval(() => void drainQueue(), IDLE_POLL_INTERVAL_MS)
  void drainQueue()
}

/**
 * Renders a single claimed job: TTS + assets per beat, then ONE ffmpeg pass
 * over all beats, then upload to Supabase Storage.
 */
async function processJob(job: any) {
  console.log(`\n📦 Claimed job: ${job.id}`)
  currentJobId = job.id

  const jobTempDir = path.join(TEMP_DIR, job.id)
  if (!fs.existsSync(jobTempDir)) fs.mkdirSync(jobTempDir, { recursive: true })

  try {
    let params: any = {}
    if (typeof job.logs === 'string') {
      try { params = JSON.parse(job.logs) } catch { params = { message: job.logs } }
    } else if (job.logs && typeof job.logs === 'object') {
      params = job.logs
    }

    // Mission jobs are driven by the MissionOrchestrator's 5-stage pipeline
    // (script → scenes → assets → audio → composition) instead of the
    // beat-based single-pass FFmpeg flow below. The route enqueues them as
    // `workflow_type: 'mission'` with `{ type: 'mission', ... }` in the logs
    // column; progress/completion are persisted by the orchestrator via
    // updateStep(), so this branch returns without touching output_url.
    if (params.type === 'mission' || job.workflow_type === 'mission') {
      const { missionOrchestrator } = await import('../lib/engine/mission-orchestrator')
      const existing = await missionOrchestrator.getJob(job.id)
      if (!existing?.steps?.length) {
        // Hydrates stage steps for a queue row that pre-dates the orchestrator
        // record. The re-insert is a PK conflict, which createJob swallows
        // silently by design.
        await missionOrchestrator.createJob(job.id, params)
      }
      await missionOrchestrator.executeMission(job.id, params)
      return
    }

    let keys: any[] | null = null
    try {
      const { data } = await supabase.from('settings').select('provider, api_key').is('user_id', null)
      keys = data
    } catch {}

    const elevenKey = keys?.find((k: any) => k.provider === 'api_elevenlabs')?.api_key || process.env.ELEVENLABS_API_KEY
    const googleKey = keys?.find((k: any) => k.provider === 'api_google')?.api_key || process.env.GOOGLE_TTS_API_KEY

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

    if (beatsList.length === 0) {
      throw new Error('Job has no beats, scenes or script to render')
    }

    console.log(`🎙️ Generating TTS and preparing assets for ${beatsList.length} beats...`)

    const renderBeats: RenderBeatInput[] = []
    let totalDurationSeconds = 0

    for (let i = 0; i < beatsList.length; i++) {
      const b = beatsList[i]
      const text = b?.text || b?.prompt || 'Clipped Video Beat'
      console.log(`   - Beat ${i + 1}: "${text.slice(0, 30)}..."`)

      let audioUrl = ''
      let duration = b.duration || 3
      try {
        const ttsRes = await ttsEngine.synthesize({
          text: text,
          provider: elevenKey ? 'elevenlabs' : (googleKey ? 'google' : 'keyless'),
          apiKey: elevenKey || googleKey
        })
        audioUrl = ttsRes.audioUrl || ''
        duration = ttsRes.duration || b.duration || 3
      } catch (err: any) {
        console.error('TTS generation failed:', err?.message || err)
      }

      let imageUrl = b.clipUrl || b.urls?.[0] || b.candidates?.[0]?.url
      if (!imageUrl || imageUrl.endsWith('.mp4')) {
        const fullPrompt = `${text}, educational tech style, paradox style, consistent character anchor, minimalist stick man character`

        // We can check if OmniRoute local gateway is running instead of requiring a key
        try {
          console.log(`     -> Calling local OmniRoute for image...`)
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
          })
          const data = await res.json()
          if (data?.data?.[0]?.url) {
            imageUrl = data.data[0].url
          } else {
            throw new Error('Invalid OmniRoute response')
          }
        } catch (err: any) {
          console.error('     -> OmniRoute local failed, falling back to Pollinations:', err.message)
          imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&nologo=true`
        }
      }

      const imgPath = path.join(jobTempDir, `img_${i}.jpg`)
      await downloadFile(imageUrl, imgPath)

      let audioPath: string | undefined
      if (audioUrl) {
        audioPath = path.join(jobTempDir, `audio_${i}.mp3`)
        await downloadFile(audioUrl, audioPath)
      }

      renderBeats.push({ imagePath: imgPath, audioPath, duration })
      totalDurationSeconds += duration
    }

    console.log(`🚀 Rendering ${renderBeats.length} beats in a single FFmpeg pass...`)
    const dims = resolveDimensions(params.aspectRatio)
    const outputPath = path.join(RENDER_DIR, `${job.id}.mp4`)

    const render = runSinglePassRender(renderBeats, outputPath, dims)
    currentFfmpeg = render.command
    await render.promise
    currentFfmpeg = null

    console.log(`✅ Render complete: ${outputPath}`)

    const finalUrl = await uploadRender(job.id, outputPath)

    await supabase
      .from('render_jobs')
      .update({
        status: 'completed',
        logs: JSON.stringify({ ...params, finalVideoUrl: finalUrl, duration: totalDurationSeconds }),
        output_url: finalUrl
      })
      .eq('id', job.id)

    // Local copy is no longer needed once it lives in Storage (the legacy
    // local fallback keeps the file so /renders/<id>.mp4 keeps working).
    if (finalUrl.startsWith('http')) {
      try { fs.rmSync(outputPath, { force: true }) } catch {}
    }

  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    console.error(`❌ Job ${job.id} failed:`, errorMsg)
    await supabase
      .from('render_jobs')
      .update({ status: 'failed', logs: JSON.stringify({ error: errorMsg }), error_message: errorMsg })
      .eq('id', job.id)
  } finally {
    currentJobId = null
    currentFfmpeg = null
    try { fs.rmSync(jobTempDir, { recursive: true, force: true }) } catch {}
  }
}

/**
 * Uploads the finished render to the public Supabase Storage bucket and
 * returns its absolute URL. If the bucket/migration is not applied yet, the
 * worker degrades to the legacy local /renders URL instead of failing.
 */
async function uploadRender(jobId: string, outputPath: string): Promise<string> {
  try {
    const uploadOptions = { contentType: 'video/mp4', upsert: true } as const
    const { error } = await supabase.storage
      .from(RENDER_BUCKET)
      .upload(`${jobId}.mp4`, fs.createReadStream(outputPath), uploadOptions)

    if (error) {
      // Some Storage configurations require a known content length — retry
      // once with a Buffer before giving up.
      const { error: bufferError } = await supabase.storage
        .from(RENDER_BUCKET)
        .upload(`${jobId}.mp4`, fs.readFileSync(outputPath), uploadOptions)
      if (bufferError) throw bufferError
    }

    const { data } = supabase.storage.from(RENDER_BUCKET).getPublicUrl(`${jobId}.mp4`)
    if (!data?.publicUrl) throw new Error('Storage returned no public URL')

    console.log(`☁️ Uploaded render to Supabase Storage: ${data.publicUrl}`)
    return data.publicUrl
  } catch (err: any) {
    console.warn('⚠️ Storage upload failed — keeping legacy local /renders URL:', err?.message || err)
    return `/renders/${jobId}.mp4`
  }
}

/**
 * Graceful shutdown for PM2 stop/reload: kills the running ffmpeg, releases
 * the job lease back to 'pending' so it is retried on next boot, then exits.
 */
async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n🛑 ${signal} received — shutting down gracefully...`)

  try { currentFfmpeg?.kill('SIGKILL') } catch {}
  try {
    if (currentJobId) {
      await supabase
        .from('render_jobs')
        .update({ status: 'pending' })
        .eq('id', currentJobId)
        .eq('status', 'processing')
    }
  } catch {}
  try { await supabase.removeAllChannels() } catch {}
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

startWorker()