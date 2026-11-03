# Clipped AI Video Studio & OmniRoute — Project Gist & Master Architecture

> **Repository:** `clipped-omni-router`  
> **Operations Companion:** [`MAINTENANCE.md`](MAINTENANCE.md) — master maintenance/ops document (commands, quirks, work history, procedures).  
> **Framework:** Next.js 16.3.3 (React 19, Turbopack, App Router, TypeScript)  
> **Video Engine:** Remotion 4 (`@remotion/bundler`, `@remotion/renderer`, `@remotion/player`) + FFmpeg  
> **Database & Auth:** Supabase PostgreSQL (Multi-tenant, Dynamic Client Routing, Cookie/LocalStorage sync)  
> **Process Manager:** PM2 Native on Linode VM (172.104.171.123, 8GB RAM, CPU-Only $0 GPU Transcoding)  
> **Core AI Gateway:** OmniRoute Single-Gateway (`http://localhost:20128/v1` or remote URL) with Keyless/Free Fallback Cascades  

---

## 1. Executive Summary & Core Mission

**Clipped AI Studio** is a full-stack, autonomous video creation, editing, and publishing platform designed to turn text prompts, long-form URLs, and media assets into high-retention vertical (9:16), horizontal (16:9), and square (1:1) videos.

The application combines:
1. **6 Signature Creative Studios** ([`components/create/SignatureStudios.tsx`](../components/create/SignatureStudios.tsx)):
   - **Social Shorts Studio** (`/create/shorts`): Fast viral shorts, talking avatars, Reddit story scraper, and outpainting with hook detection.
   - **Cinema & Drama Studio** (`/create/cinema` & `/create/drama`): Multi-agent episodic series with consistent character anchor prefixing, director lens mode, and 1:N decoupled batch queue dispatch.
   - **2D & Explainer Studio** (`/create/2d` & `/create/stick-figure`): 11-point vector kinematics, anime stroke tracer, whiteboard sketch, and code morphing.
   - **Papercraft Studio** (`/create/papercraft`): Tactile stop-motion papercraft, depth shadow casting, and layered craft animation.
   - **Technical Architecture Studio** (`/create/code-video`): Dynamic architecture diagrams, code diff morphing, WaveDrom waveforms, and system flow visualizations.
   - **Viral Campaign Studio** (`/create/campaign` & `/create/bulk`): 30-day viral trend planner, automated newsroom batch generation, and podcast conversations.

2. **OmniRoute Integration**:
   - Centralizes 45+ AI models under a unified OpenAI-compatible endpoint.
   - Fallback hierarchy: Database-configured OmniRoute key/URL -> Environment variables -> `http://localhost:20128/v1` -> Zero-cost keyless fallbacks (Edge TTS, Google Translate TTS, Pollinations, Openverse).

3. **Modern Subtitles & Remotion Player**:
   - 6 visual subtitle styling presets (*Hormozi Pop*, *Cyber Neon*, *Minimalist Clean*, *Cinematic Boxed*, *Bold Impact*, *Retro Karaoke*).
   - Word-by-word spring pop animations, frosted glass pill boxes, neon glow shadows, and 3-zone vertical positioning.
   - Seamless Remotion player with synced voiceover audio, beat sequencing, and FFmpeg videoFilter drawtext rendering.

4. **Global Queue & Background Worker Subsystem**:
   - Asynchronous queue with real-time status indicator across desktop header, mobile header, and sidebar.
   - Dedicated `/queue` page with live progress, real-time logs drawer, retry capabilities, and deep links to Story Maker.
   - Decoupled `render-worker.ts` and `publish-worker.ts` managed by PM2.

---

## 2. System Architecture Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT INTERFACE                                     │
│  - App Shell: Glassmorphism Sidebar, Desktop/Mobile Header, Dark/Light Theme Provider │
│  - Creation Studios: 6 Signature Studios (/create/shorts, cinema, 2d, papercraft, etc)│
│  - Studio Dashboard (/dashboard): StudioPulse KPIs, OmniLaunchpad, Operations Deck     │
│  - Dedicated Queue (/queue): Real-time progress, status badges, and execution logs     │
│  - Video Library (/library): Inline playback modal, workspace filtering, downloads    │
│  - OmniRoute Settings (/settings): Gateway URL, API keys, and custom Supabase probe    │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                NEXT.JS APP ROUTER APIS                                 │
│  - /api/workflows/* (generate, micro-drama, stickman, cinema, mission, bulk-plan)      │
│  - /api/jobs (live count, polling, retry, status updates)                              │
│  - /api/tts/preview (low-latency voice sample preview)                                 │
│  - /api/settings/keys (OmniRoute single-gateway credential management)                 │
│  - /api/v1/* (REST Developer API, HMAC-SHA256 authenticated webhooks)                  │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                               CORE ENGINE SUBSYSTEMS                                   │
│  - OmniRoute Gateway & Key Resolver (lib/keys.ts): DB -> Env -> Localhost fallback     │
│  - LLM Dispatcher (lib/engine/llm.ts): OmniRoute 'auto' model + robust JSON repair     │
│  - TTS Voice Engine (lib/engine/tts.ts): Edge TTS -> Google Translate -> Synthetic WAV │
│  - Media Sourcing & Generation (lib/media/*, video-generator.ts, image-orchestrator.ts)│
│  - Subtitle Styler (remotion/Composition.tsx & scripts/render-worker.ts drawtext)      │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                            PERSISTENCE & BACKGROUND (SUPABASE)                         │
│  - PostgreSQL Tables: render_jobs, videos, settings, scheduled_posts, workspaces       │
│  - Render Worker (scripts/render-worker.ts): Polling render_jobs with lease locking   │
│  - Publish Worker (scripts/publish-worker.ts): Social distribution (YT, TikTok, IG)   │
│  - Storage: Local /public/renders or remote Supabase Storage S3 buckets                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Overview

The database uses Supabase PostgreSQL. Key tables include:

1. **`render_jobs`**:
   - `id`: UUID primary key.
   - `orchestration_state`: Primary claim status: `'planning' | 'queued' | 'rendering' | 'completed' | 'failed' | 'retryable'`.
   - `status`: Secondary legacy status tracking.
   - `progress`: 0 to 100 percentage.
   - `params`: JSONB workflow configuration (beats, script, voice, subtitles, aspect ratio, prompt).
   - `logs`: JSONB execution logs, intermediate plans, presentation metadata (`title`, `thumbnailUrl`, `aspectRatio`).
   - `output_url`: Rendered MP4 output destination.
   - `lease_holder`, `lease_expires_at`: Distributed lease locking to avoid worker race conditions.
   - `error_message`: Execution error trace.

2. **`videos`**:
   - Completed video library records linked to user workspaces.
   - Contains video metadata, thumbnail URL, duration, tags, and status.

3. **`settings`**:
   - Centralized key-value configuration table.
   - Stores `omniroute_api_key`, `omniroute_endpoint`, and provider keys (Azure, ElevenLabs, Fal.ai, Pexels).
   - RLS bypass enabled for server-side queries to prevent unauthorized read drops.

4. **`workspaces` & `scheduled_posts`**:
   - Multi-tenant workspace grouping and social media scheduling queue.

---

## 4. Video Rendering Pipeline

1. **Submission**:
   - User inputs script/prompt in Creation Studio or Omni-Launchpad.
   - API creates a `render_jobs` record with `orchestration_state: 'planning'` (for multi-step orchestration) or `'queued'` (when beats are finalized).
   - Client receives HTTP 202 or navigates to `/dashboard` / `/queue`.

2. **Worker Processing (`render-worker.ts`)**:
   - PM2 worker claims job using atomic PostgreSQL RPC function:
     `SELECT * FROM claim_render_job(worker_id, lease_duration)`
     which matches `orchestration_state IN ('queued', 'retryable')`.
   - Encodes clips beat-by-beat with `-threads 2` and `-preset veryfast` for CPU safety.
   - Assembles timeline via FFmpeg concat filter graphs (`cmd.videoFilters()`).
   - Applies word-by-word subtitle styling with escaped characters, custom font sizes, and bounding boxes.
   - Produces high-bitrate H.264 MP4 with synchronized AAC audio and sidechain audio ducking.
   - Updates `render_jobs` to `completed` via `complete_render_job` RPC and creates entry in `videos`.

---

## 5. Deployment Guidelines & Rules

- **Target Host**: Linode VM with 8GB RAM (`172.104.171.123`).
- **Never Build Docker on VM**: Build locally (`pnpm build`) to prevent swap thrashing and OOM crashes.
- **Deploy via PM2**: Compress standalone `.next` build bundle, transfer via SCP/SFTP, extract, and restart via `pm2 restart ecosystem.config.js`.
- **Zero Hardcoded Secrets**: All API keys must be dynamic (Supabase `settings` table or environment variables).
