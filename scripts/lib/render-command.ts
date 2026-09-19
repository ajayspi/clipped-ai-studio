/**
 * Single-pass FFmpeg render pipeline.
 *
 * Replaces the legacy per-beat encode + `-c copy` concat (N+1 ffmpeg processes
 * and N intermediate files on disk) with ONE process and ZERO intermediates:
 *
 *   image_0 (-loop 1 -t d0) ─┐
 *   audio_0 (or anullsrc)  ──┤  normalize each stream → concat video + audio
 *   image_1 (-loop 1 -t d1) ─┤            → [vout] [aout]
 *   audio_1 (or anullsrc)  ──┘
 *
 * Input layout is deterministic: image i → input 2i, audio i → input 2i + 1.
 * Beats without TTS audio get silence generated via lavfi anullsrc, and audio
 * shorter than its beat is silence-padded (apad + atrim) so the final duration
 * is exactly the sum of beat durations (the legacy `-shortest` behavior could
 * truncate a beat and desync every beat after it).
 *
 * `apad` (no args) + `atrim=0:<dur>` is used instead of `apad=whole_dur` for
 * compatibility with older FFmpeg builds (whole_dur needs FFmpeg >= 4.2).
 */
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

// Pin fluent-ffmpeg to the bundled FFmpeg binary (the original worker did this
// at startup; without it fluent-ffmpeg probes whatever `ffmpeg` it finds on
// PATH and its capability check may reject lavfi inputs).
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export type FfmpegCommand = ReturnType<typeof ffmpeg>

export interface RenderDimensions {
  width: number
  height: number
}

export interface RenderBeatInput {
  imagePath: string
  audioPath?: string
  duration: number
}

const ANULLSRC = 'anullsrc=channel_layout=stereo:sample_rate=44100'
const OUTPUT_FPS = 30

/**
 * Resolves pixel dimensions for a supported aspect ratio label.
 * Defaults to portrait 9:16 (the legacy worker behavior).
 */
export function resolveDimensions(aspectRatio?: string | null): RenderDimensions {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1920, height: 1080 }
    case '1:1':
      return { width: 1080, height: 1080 }
    case '9:16':
    default:
      return { width: 1080, height: 1920 }
  }
}

function normalizedDuration(duration: unknown): number {
  return Math.max(0.1, Math.round((Number(duration) || 3) * 1000) / 1000)
}

/**
 * Builds the `-filter_complex` graph string for all beats.
 */
export function buildSinglePassFilterGraph(
  beats: RenderBeatInput[],
  dims: RenderDimensions
): string {
  if (beats.length === 0) {
    throw new Error('Cannot build a render command with zero beats')
  }

  const chains: string[] = []

  beats.forEach((beat, i) => {
    const dur = normalizedDuration(beat.duration)

    chains.push(
      `[${i * 2}:v]scale=${dims.width}:${dims.height}:force_original_aspect_ratio=increase,` +
        `crop=${dims.width}:${dims.height},setsar=1,fps=${OUTPUT_FPS},format=yuv420p[v${i}]`
    )
    chains.push(
      `[${i * 2 + 1}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,` +
        `apad,atrim=0:${dur},asetpts=N/SR/TB[a${i}]`
    )
  })

  // concat expects per-segment interleaved inputs: [v0][a0][v1][a1] …
  const segmentLabels = beats.map((_, i) => `[v${i}][a${i}]`).join('')
  chains.push(`${segmentLabels}concat=n=${beats.length}:v=1:a=1[vout][aout]`)

  return chains.join(';')
}

/**
 * Builds and starts the single ffmpeg invocation. Resolves when the file is
 * fully written. The returned command handle lets callers kill the process on
 * graceful shutdown.
 */
export function runSinglePassRender(
  beats: RenderBeatInput[],
  outputPath: string,
  dims: RenderDimensions
): { promise: Promise<void>; command: FfmpegCommand } {
  const filterGraph = buildSinglePassFilterGraph(beats, dims)

  let command = ffmpeg()
  beats.forEach((beat) => {
    const dur = normalizedDuration(beat.duration)
    command = command
      .input(beat.imagePath)
      .inputOptions(['-loop 1', `-t ${dur}`])

    if (beat.audioPath) {
      command = command.input(beat.audioPath)
    } else {
      command = command.input(ANULLSRC).inputOptions(['-f lavfi', `-t ${dur}`])
    }
  })

  command
    .complexFilter(filterGraph)
    .outputOptions([
      '-map [vout]',
      '-map [aout]',
      '-c:v libx264',
      '-tune stillimage',
      '-preset veryfast',
      '-crf 23',
      '-pix_fmt yuv420p',
      '-c:a aac',
      '-b:a 192k',
      '-movflags +faststart',
    ])
    .save(outputPath)

  const promise = new Promise<void>((resolve, reject) => {
    command
      .on('error', (err: Error) => reject(err))
      .on('end', () => resolve())
  })

  return { promise, command }
}
