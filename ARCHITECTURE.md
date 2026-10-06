# System Architecture: Clipped AI Studio

Clipped AI is designed as an autonomous, resilient video production pipeline. This document outlines the lifecycle of a video generation request.

## The 4-Stage Lifecycle

When a user submits a prompt, it flows through four isolated micro-boundaries:

### Stage 1: The API Gateway & LLM Orchestrator
**Location**: `app/api/workflows/[name]/route.ts` & `lib/engine/[name]-orchestrator.ts`

When a POST request hits a workflow route:
1. The route instantly creates a `render_jobs` row in Supabase with `orchestration_state: 'planning'` and returns a `200 OK` or `202 Accepted` to the client. This unblocks the UI immediately.
2. The route spins off an async `setTimeout` function to run the Orchestrator.
3. The Orchestrator talks to the **OmniRoute** gateway to generate a script and slice it into `beats`.
4. It attaches media rules, styling, and text to each beat.
5. Upon completion, the Orchestrator pushes the generated JSON beats into the DB and updates `orchestration_state` to `qc_pending`.

### Stage 2: The Quality Gate
**Location**: `scripts/quality-gate-worker.ts`

A PM2 worker actively polling the DB intercepts all `qc_pending` jobs.
1. It parses the generated beat array.
2. It enforces hard constraints (e.g., text length < 2000 chars, valid duration integers).
3. It makes HTTP `HEAD` / `GET` requests to every `imageUrl`, `videoUrl`, and `clipUrl` in the beat array to verify they are reachable.
4. If a URL is dead or a constraint fails, it marks the job as `failed` with a strict error log.
5. If the job passes, it updates `orchestration_state` to `queued`.

### Stage 3: The Render Worker (Media & TTS)
**Location**: `scripts/render-worker.ts` & `lib/engine/tts.ts`

A secondary PM2 worker claims `queued` jobs one by one.
1. **TTS Cascade**: It generates audio for each beat via `lib/engine/tts.ts`. If ElevenLabs fails (402), it cascades to OpenAI (401), Sarvam, Piper, and finally Edge TTS.
2. **Media Resolution**: It downloads all remote video/image assets (including fal.ai / Pollinations generated media) to the local disk cache (`tmp_renders/`).
3. **Alignment**: It calculates the exact byte-durations of the generated audio files and precisely sets the video/image display boundaries to match the speech length.

### Stage 4: FFmpeg Compilation
**Location**: `scripts/render-worker.ts` (Core Render Engine)

Once all local assets are prepared:
1. The worker dynamically builds a massive `ffmpeg -filter_complex` string based on the `beats`.
2. It injects **Zoom/Pan** algorithms, **Drawtext Subtitles**, and **Audio Ducking** for background music.
3. It spawns the FFmpeg binary via `child_process`.
4. On success, it moves the final `.mp4` to the `public/renders/` folder and updates the DB to `completed`.

## Security & Resilience
- **Never crash the worker**: If an API key expires, the pipeline falls back gracefully. If a URL is dead, the Quality Gate catches it. FFmpeg is never fed corrupted data.
- **Circuit Breakers**: `lib/engine/provider-health.ts` monitors OmniRoute. If Anthropic or OpenAI goes down, they are placed in a cool-down array to prevent hanging the event loop.

## Key Terminology
- **Beats**: A standard array of objects `{ id, text, duration, imageUrl? }`. This is the universal currency between the Orchestrators, the Quality Gate, and the Render Worker.
- **OmniRoute**: A proprietary multi-LLM gateway running locally on port `20128`.
