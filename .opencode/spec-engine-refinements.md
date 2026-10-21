# Epic: Core Engine Refinements
*(Synthesized from milimovideo, SceneFlow, and OpenMontage)*

## Goal
Upgrade the `clipped` backend engine to support real-time streaming, robust FFmpeg compilation (crossfades/overlap trimming), and persistent job state recovery.

## Requirements

### 1. Real-Time SSE (Server-Sent Events) Streaming
**Target:** `app/api/jobs/[id]/stream/route.ts` & `scripts/render-worker.ts`
- Create a new API route for SSE that clients can connect to.
- Modify `scripts/render-worker.ts` to push progress updates. Since the worker runs in a separate PM2 process from the Next.js API, they must communicate. 
- *Implementation:* The worker can update the `render_jobs` table's `progress` and `logs.status_text` columns frequently. The SSE route will listen to Supabase Realtime changes on that specific row and stream them to the connected client.

### 2. FFmpeg Transition Smoothing (Overlap Trimming)
**Target:** `scripts/render-worker.ts`
- Currently, beats are concatenated via a simple `concat` demuxer text file. This can cause audio pops or hard cuts.
- Implement a 0.5-second crossfade (video and audio) between clips.
- *Implementation:* Instead of the `concat` demuxer, dynamically build a complex filtergraph (`-filter_complex`) using the `xfade` (crossfade) filter for video and `acrossfade` for audio. Calculate the offsets based on beat durations. (If `xfade` is too complex, at least apply `afade` in/out on the audio tracks to prevent popping).

### 3. Worker Crash Recovery (State Machine)
**Target:** `scripts/render-worker.ts` & `lib/jobs/enqueue.ts`
- If the PM2 worker crashes mid-render, the job is stuck in `processing` forever.
- Create a `scripts/recovery-worker.ts` (or add logic to `auto-pilot-scheduler.ts`) that runs every 5 minutes. It sweeps the `render_jobs` table for any job with `status: 'processing'` and `updated_at` older than 15 minutes, and safely reverts them to `queued` (or marks them `failed` if `attempts > 3`).

## Instructions for Subagent
- Implement the above 3 engine refinements.
- You do not need to build the React frontend for the SSE yet; just ensure the SSE API route and Supabase Realtime hook work.
- Ensure `pnpm typecheck` passes.
