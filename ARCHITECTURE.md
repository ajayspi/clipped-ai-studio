# System Architecture: Clipped AI Studio

Clipped AI Studio is a full-stack, autonomous video production platform, multi-track non-linear editor (NLE), and distributed render pipeline. This document defines the end-to-end request lifecycle, concurrency models, dual-engine rendering topology, and architectural invariants.

---

## 1. High-Level System Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CLIENT WORKSPACE (Next.js 16 UI)                     │
│  Creation Hub (/create/*) · Cinema Studio · NLE Editor · Queue Monitor │
└───────────────┬───────────────────────────────────────┬────────────────┘
                │                                       │
     (Direct Browser Export)                 (API Workflow Submission)
                ▼                                       ▼
┌───────────────────────────────┐       ┌────────────────────────────────┐
│   CLIENT-SIDE WEBCODECS       │       │    NEXT.JS 16 APP ROUTER       │
│   • VideoEncoder / AudioEncoder│       │    • /api/workflows/*          │
│   • mp4-muxer in-browser      │       │    • /api/export/nle (OTIO)    │
│   • Zero server cloud compute │       │    • /api/jobs/*               │
└───────────────────────────────┘       └───────────────┬────────────────┘
                                                        │
                                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   STATE STORE & DISTRIBUTED LEASES                     │
│   • Supabase PostgreSQL: render_jobs, videos, settings, workspaces     │
│   • Atomic RPC: claim_render_job (FOR UPDATE SKIP LOCKED)             │
│   • Real-Time Dispatch: Server-Sent Events (SSE) Progress Stream       │
└───────────────┬───────────────────────────────────────┬────────────────┘
                │                                       │
                ▼                                       ▼
┌───────────────────────────────┐       ┌────────────────────────────────┐
│   DISTRIBUTED RENDER WORKER   │       │      OMNIROUTE AI GATEWAY      │
│   • In-Process Schema Gate    │◄─────►│      (:20128/v1 Single Gateway)│
│   • Multi-Tier TTS Cascade    │       │   • 45+ Model Provider Cascade │
│   • Remotion / FFmpeg Filters │       │   • Circuit Breakers & Fallback│
└───────────────────────────────┘       └────────────────────────────────┘
```

---

## 2. The 4-Stage Production Lifecycle

Every video creation request submitted through the web platform advances through four micro-boundaries:

### Stage 1: API Gateway & Workflow Dispatcher
**Location**: `app/api/workflows/<workflow>/route.ts` & `lib/engine/dag-orchestrator.ts`

When a user submits a creation prompt (via Stories, Cinema Studio, Bulk Planner, or Whiteboard):
1. **Instant Job Initialization**: The route writes a new record to `render_jobs` with `orchestration_state: 'planning'` and immediately returns `200 OK` or `202 Accepted` with the job UUID. This ensures zero UI latency.
2. **Durable Background Execution**: The route schedules the asynchronous orchestrator via Next.js background execution (`after()` from `next/server` or detached worker promise). The route lifecycle is encapsulated in structured error boundaries; if unhandled failures occur during planning, the job transitions to `'failed'` with diagnostic error messages.
3. **Directed Acyclic Graph (DAG) Pipeline Orchestrator**: The orchestrator (`lib/engine/dag-orchestrator.ts`) models scene generation as a directed graph of dependent tasks:
   ```
          ┌───────────────────────────────┐
          │   1. Parse Script & Beats    │
          └──────────────┬────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
   ┌──────────────────┐      ┌──────────────────┐
   │ 2. Character Doc │      │ 3. Voice Synthesizer
   └────────┬─────────┘      └────────┬─────────┘
            │                         │
            ├─────────────────────────┤
            ▼                         ▼
   ┌──────────────────┐      ┌──────────────────┐
   │ 4. Scene 1 Image │      │ 5. Scene 2 Image │ ... (Parallel Execution)
   └────────┬─────────┘      └────────┬─────────┘
            │                         │
            └────────────┬────────────┘
                         ▼
          ┌───────────────────────────────┐
          │  6. AI Foley Soundstage Score │
          └──────────────┬────────────────┘
                         ▼
          ┌───────────────────────────────┐
          │ 7. Enqueue Render Pipeline    │
          └───────────────────────────────┘
   ```
4. **Asset Sourcing**: Independent scene visuals (Fal.ai Flux/SDXL, Kling video, or stock B-roll from Pexels/Pixabay) generate concurrently across worker threads, reducing turnaround latency by up to 65%.
5. **Job Promotion**: Once all beat objects contain initial media references and scripts, the orchestrator updates `render_jobs.orchestration_state` to `'qc_pending'`, queuing it for the Quality Gate pre-validation pass.

### Stage 2: In-Process Quality Gate & Pre-Validation
**Location**: `scripts/render-worker.ts` (`runQualityGatePass`) & `@clipped/schema`

Before jobs enter the atomic lease pool for heavy FFmpeg rendering, the render daemon polls for jobs with `orchestration_state: 'qc_pending'` and executes an in-process pre-validation pass:
1. **Schema Integrity**: Verifies that the `beats` array is non-empty (enforcing the Non-Empty Concat Guard), text length is within bounds (< 2000 characters per beat), and duration values are positive numbers.
2. **Asset URL Reachability**: Iterates across media references (`imageUrl`, `videoUrl`, `clipUrl`) with an HTTP `HEAD` / `GET` reachability probe bounded by an `AbortSignal` timeout budget (max 5000ms per probe) to prevent worker hangs on dead CDN links.
3. **Validation Outcome**:
   - If an asset URL is unreachable or schema constraints fail, the job transitions to `orchestration_state: 'failed'` with an explicit diagnostic written to `render_jobs.last_error`.
   - If validation succeeds, the job transitions to `orchestration_state: 'queued'`, exposing it to the atomic lease pool.

### Stage 3: Distributed Worker Lease & Asset Resolution
**Location**: `scripts/render-worker.ts`, `lib/engine/tts.ts`, & `lib/engine/foley-soundstage.ts`

The PM2 background render daemon actively claims jobs using atomic PostgreSQL row-level locks:
1. **Atomic Lease Acquisition**: The worker invokes the Supabase stored procedure `claim_render_job(worker_id, lease_token, lease_ms)`. Using `FOR UPDATE SKIP LOCKED`, this assigns an exclusive lease without race conditions across multiple instances.
2. **Heartbeat Lease Renewal**: While encoding, the worker maintains a recurring timer that updates `lease_expires_at` every 60 seconds. If a worker node crashes or loses power, its expired lease automatically returns to `'retryable'` status up to `max_attempts` (default 3).
3. **Multi-Tier Text-to-Speech (TTS) Cascade**:
   - Audio is generated per beat via `lib/engine/tts.ts`.
   - If high-tier neural providers (ElevenLabs, Azure Speech, OpenAI) fail or encounter quota exhaustion (HTTP 402/429), the engine automatically cascades to free neural models (Edge TTS) and sentence-chunked Google Translate audio.
4. **Precise Temporal Audio Alignment**: The worker inspects the generated audio files using `ffprobe` (via `getAudioDuration`) to measure exact millisecond durations, dynamically stretching or clamping each beat's visual duration to match speech length.
5. **AI Foley Soundstage & Spatial Audio**: The soundstage engine analyzes script action verbs (footsteps, swooshes, impacts, door clicks), positions sound effects in the stereo field (pan offset `-1.0` to `+1.0`), and automatically ducks background music by -12dB during speech and high-impact effects.

### Stage 4: FFmpeg Compilation & Container Muxing
**Location**: `scripts/render-worker.ts` & `remotion/Composition.tsx`

Once audio stems, visual assets, and subtitle configurations are cached locally in an ephemeral directory (`tmp_renders/{jobId}`):
1. **Concat Demuxer Assembly**: Slices are pre-rendered into normalized intermediate streams and concatenated using FFmpeg concat demuxer (`-f concat -safe 0 -c copy`).
2. **Ken Burns Motion Synthesis**: For static images, FFmpeg `zoompan` expressions apply dynamic camera motion. All progress calculations evaluate against the output frame counter `on` (never input frame `in`).
3. **Word-by-Word Kinetic Subtitles**: Subtitle styling presets (Hormozi Pop, Cyber Neon, Cinematic Boxed, Retro Karaoke) are injected using escaped FFmpeg `drawtext` filters with word-level highlight timing expressions (`enable='between(t,start,end)'`).
4. **Side-by-Side Volumetric Export**: When requested (`aspectRatio: 'volumetric'`), the worker normalizes color and grayscale depth map streams to `format=yuv420p` before executing FFmpeg `hstack`, preventing pixel format crashes for Apple Vision Pro playback.
5. **Post-Encode Verification & Cleanup**: The worker validates that the resulting MP4 exists and has a non-zero byte size (`assertOutputValid`). It uploads the final video to storage or moves it to `public/renders/`, marks the database job as `'completed'`, and purges the ephemeral scratch directory in a `finally` block.

---

## 3. Dual-Engine Rendering Topology

Clipped AI supports two distinct video rendering engines tailored to different infrastructure economics:

| Capability | Client-Side WebCodecs Engine | Server-Side FFmpeg Engine |
| :--- | :--- | :--- |
| **Primary Code Path** | [`lib/media/client-export.ts`](lib/media/client-export.ts) | [`scripts/render-worker.ts`](scripts/render-worker.ts) |
| **Execution Context** | Web Browser (Client GPU / WebCodecs API) | PM2 Daemon (Node.js runtime + FFmpeg binary) |
| **Cloud Compute Cost** | **$0.00 (Zero Server Compute)** | Billed to host instance CPU/RAM |
| **Throughput & Scaling**| Infinite horizontal scale (scales with client users) | Limited by worker concurrency and host memory |
| **Hardware Acceleration**| Native GPU (NVENC, Metal, Intel QuickSync) | Software libx264 or host VAAPI/CUDA |
| **Best Used For** | Real-time NLE timeline exports, instant previews | 30-day bulk batches, headless cron jobs, Remotion |

---

## 4. Professional NLE Bridges & Interoperability

To bridge AI video generation with desktop non-linear editing suites, Clipped AI exposes bidirectional project export ([`lib/engine/otio-exporter.ts`](lib/engine/otio-exporter.ts)):

1. **OpenTimelineIO (`.otio`)**:
   - Generates standard OpenTimelineIO JSON timelines containing synchronized video tracks, dialogue voiceover tracks, background music tracks, and subtitle markers.
   - Compatible with **DaVinci Resolve** and **Owlie Studio**.
2. **Apple Final Cut Pro XML (`.fcpxml` v1.10)**:
   - Emits compliant FCPXML documents mapping asset references, cut points, and audio stems.
   - Compatible with **Apple Final Cut Pro** and **Adobe Premiere Pro**.
3. **Isolated Stem Export**:
   - Generates separated, phase-aligned WAV stems (`dialogue.wav`, `bgm.wav`, `sfx.wav`) for multi-track audio mastering.
4. **API Endpoint**: Accessible via `POST /api/export/nle` accepting `{ jobId: string, format?: 'otio' | 'fcpxml', timelineName?: string }`. The endpoint queries Supabase for the specified `jobId`, reconstructing the multi-track timeline directly from stored beat and audio assets.

---

## 5. Distributed Lease Locking & State Machine

Job concurrency is managed exclusively through Supabase PostgreSQL stored procedures defined in `supabase/migrations/20260905_render_job_leases.sql`:

```
                 ┌───────────────┐
                 │   planning    │
                 └───────┬───────┘
                         │ (Orchestrator generates beats)
                         ▼
                 ┌───────────────┐
                 │  qc_pending   │
                 └───────┬───────┘
                         │ (runQualityGatePass: QC Pass)
                         ▼
                 ┌───────────────┐
                 │    queued     │◄──────────────────┐
                 └───────┬───────┘                   │
                         │ (claim_render_job)        │
                         ▼                           │
                 ┌───────────────┐                   │
                 │    claimed    │                   │
                 └───────┬───────┘                   │
                         │ (Worker encoding loop)    │
         ┌───────────────┴───────────────┐           │
         │ (Success)                     │ (fail_render_job /
         ▼                               │  attempt < max)
  ┌─────────────┐                        ▼           │
  │  completed  │                 ┌─────────────┐    │
  └─────────────┘                 │  retryable  │────┘
                                  └──────┬──────┘
                                         │ (fail_render_job /
                                         ▼  attempt >= max)
                                  ┌─────────────┐
                                  │   failed    │
                                  └─────────────┘
```

### Stored Procedure Contracts
- **`claim_render_job(p_worker_id, p_lease_token, p_lease_ms)`**:
  Atomically claims one eligible job using `FOR UPDATE SKIP LOCKED`. Selects where `orchestration_state IN ('queued', 'retryable')` OR active states (`'claimed'`, `'rendering'`, `'publishing'`) where `lease_expires_at < NOW()`, provided `attempt_count < max_attempts`. Increments `attempt_count`, sets `orchestration_state = 'claimed'`, `status = 'processing'`, and establishes `lease_expires_at`.
- **`complete_render_job(p_job_id, p_worker_id, p_lease_token, p_output_url, p_logs)`**:
  Requires matching `worker_id`, `lease_token`, and active lease. Updates status and `orchestration_state` to `'completed'`, clears `lease_expires_at`, and records output URL and completion logs.
- **`fail_render_job(p_job_id, p_worker_id, p_lease_token, p_error_message)`**:
  Atomically releases the lease. If `attempt_count < max_attempts`, sets `orchestration_state = 'retryable'` and `status = 'pending'` for worker re-acquisition. If attempts are exhausted, marks state and status as `'failed'`.

---

## 6. Client Synchronization & Real-Time Monitoring

1. **Immediate Redirection**: When a client creates a render job, the UI navigates to `/queue?jobId={id}`.
2. **Server-Sent Events (SSE) Stream**: The client establishes an EventSource connection to `/api/jobs/{id}/stream`. The route subscribes to Supabase Realtime Postgres row updates on `render_jobs` (`filter: id=eq.{id}`) and streams named events (`event: init`, `event: update`, `event: error`). The frontend attaches listeners via `addEventListener('update', ...)` to receive micro-granular progress percentages, worker status badges, and terminal log lines.
3. **Terminal Log Drawer**: Users can inspect live `stdout` and `stderr` logs streamed from the active render worker, complete with error tracebacks and retry buttons.

---

## 7. Security, Circuit Breakers & Resource Governance

1. **OmniRoute Circuit Breakers**:
   - `lib/engine/provider-health.ts` monitors upstream provider error rates and response latencies.
   - If an LLM or image provider returns consecutive HTTP 5xx or timeout errors, it enters a temporary cooldown state to prevent compounding request latency, automatically routing traffic to available fallback models.
2. **FFmpeg Resource Clamps**:
   - On low-memory environments (e.g. 952MB RAM instances), render workers operate in strict process isolation: concurrency is clamped to 1 active encode per worker process with bounded chunking to prevent Linux Out-Of-Memory (OOM) killer terminations.
3. **Ephemeral Disk Quotas**:
   - All intermediate audio chunks, downloaded video assets, and concat lists are quarantined in `tmp_renders/{jobId}`. The directory is unconditionally wiped in a `finally` block upon job completion or failure, preventing disk space exhaustion (`ENOSPC`).

---

## 8. Canonical Data Contracts

### The `RenderBeat` Schema (`@clipped/schema`)
The universal data currency flowing between Orchestrators, the Quality Gate, and Render Workers:

```typescript
export interface RenderBeat {
  id?: string;                         // Unique beat identifier
  text?: string;                       // Narration or dialogue text
  prompt?: string;                     // Scene prompt descriptor
  imagePrompt?: string;                // Cinematic prompt for generative image fallback
  searchQuery?: string;                // Bare keywords for stock asset search
  duration?: number;                   // Temporal scene duration in seconds
  exactDuration?: number;              // Millisecond-accurate ffprobe audio duration
  imageUrl?: string;                   // Resolved image URL or data URI
  videoUrl?: string;                   // Resolved video URL
  clipUrl?: string;                    // Stock footage clip URL
  shotType?: ShotType;                 // Framing: wide, medium, close-up, macro, over-shoulder
  cameraMove?: CameraMove;             // Motion: push-in, pull-out, pan-left, pan-right, tilt-up, tilt-down, static
  wordTimestamps?: WordTimestamp[];    // Millisecond-aligned word timestamps for karaoke
}
```

### OmniRoute Single-Gateway
- **Endpoint**: Local proxy at `http://localhost:20128/v1` or remote gateway.
- **Key Resolution Hierarchy** (`lib/keys.ts`): Supabase `settings` table $\rightarrow$ local environment variables $\rightarrow$ default localhost endpoint $\rightarrow$ keyless fallback services (Edge TTS, Pollinations, Openverse).
