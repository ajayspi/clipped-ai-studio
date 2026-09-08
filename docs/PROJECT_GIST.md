# Clipped AI Video Studio & OmniRoute — Project Gist & Master Architecture

> **Repository:** `clipped-omni-router`  
> **Framework:** Next.js 15 (React 19, App Router, TypeScript)  
> **Video Engine:** Remotion (`@remotion/bundler`, `@remotion/renderer`, `@remotion/player`) + FFmpeg  
> **Database & Auth:** Supabase PostgreSQL (Multi-tenant, Dynamic Client Routing, Cookie/LocalStorage sync)  
> **Process Manager:** PM2 Native on Oracle Cloud Infrastructure (Ubuntu 22.04, 952MB RAM constraint)  
> **Core AI Gateway:** OmniRoute Single-Gateway (`http://localhost:20128/v1` or remote URL) with Keyless/Free Fallback Cascades  

---

## 1. Executive Summary & Core Mission

**Clipped AI Studio** is a full-stack, autonomous video creation, editing, and publishing platform designed to turn text prompts, long-form URLs, and media assets into high-retention vertical (9:16), horizontal (16:9), and square (1:1) videos.

The application combines:
1. **10 Dedicated Creation Workflows**:
   - **Stories Generator** (`/create/stories`): Narrative-driven video with sequential scenes, dynamic text overlays, and emotion-matched narration.
   - **AI Images Video** (`/create/images`): Text-to-image video generation utilizing Fal.ai Flux/SDXL and Pollinations free fallbacks.
   - **Generative AI Video** (`/create/video`): Full AI video generation with Kling, Luma Dream Machine, Runway Gen-3, or Fal.ai video models.
   - **Stock Footage** (`/create/stock`): Automated keyword extraction sourcing B-roll from Pexels, Pixabay, and Openverse.
   - **Bulk 30-Day Planner** (`/create/bulk`): 30-day content calendar generator with batch video production and scheduled publishing.
   - **Extract Shorts** (`/create/shorts`): Long-form video to viral short-form clips extraction using transcript analysis and hook detection.
   - **Micro-Drama Series** (`/create/drama`): Multi-episode story arcs with consistent character styling and dramatic cliffhangers.
   - **Auto Pilot** (`/create/auto`): Single-prompt end-to-end autonomous mission mode with live multi-stage execution steppers.
   - **Talking Head Avatars** (`/create/avatar`): AI avatar presenter synthesis powered by HeyGen and D-ID.
   - **Whiteboard Animation** (`/create/whiteboard`): Character sheet animations (stickman, saint, modern persona) powered by Gemini vision prompting.

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
│  - Creation Wizard (/create/stories): Zero-scroll 1080p viewport-constrained layout    │
│  - Creation Hub (/create): 10 workflow cards with real-time API health status dots     │
│  - Dedicated Queue (/queue): Real-time progress, status badges, and execution logs     │
│  - Video Library (/library): Inline playback, workspace filtering, and asset downloads │
│  - OmniRoute Settings (/settings): Gateway URL, API keys, and custom Supabase probe    │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                NEXT.JS APP ROUTER APIS                                 │
│  - /api/workflows/* (generate, bulk-plan, extract-shorts, mission, scrape)             │
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
│  - Media Sourcing & Generation (lib/engine/video-generator.ts, image-orchestrator.ts)  │
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
   - `status`: `'pending' | 'generating' | 'rendering' | 'completed' | 'failed'`.
   - `progress`: 0 to 100 percentage.
   - `payload`: Full JSON workflow configuration (beats, script, voice, subtitles, aspect ratio, prompt).
   - `video_url`: Rendered MP4 output destination.
   - `lease_holder`, `lease_expires_at`: Distributed lease locking to avoid worker race conditions.
   - `error_message`, `render_log`: Execution trace.

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
   - User inputs script/prompt in Creation Wizard or Auto-Pilot.
   - API creates a `render_jobs` record with status `pending`.
   - Client immediately navigates to `/queue?jobId=...`.

2. **Worker Processing (`render-worker.ts`)**:
   - PM2 worker claims job using atomic lease update (`UPDATE render_jobs SET lease_holder = ... WHERE lease_expires_at < NOW()`).
   - Downloads/decodes audio and visual assets (supporting `data:` base64 URIs natively).
   - Assembles timeline via Remotion or FFmpeg fluent filter graphs (`cmd.videoFilters()`).
   - Applies word-by-word subtitle styling with escaped characters and safety margins.
   - Produces high-bitrate H.264 MP4 with synchronized AAC audio.
   - Updates `render_jobs` to `completed` and creates entry in `videos`.

---

## 5. Deployment Guidelines & Rules

- **Oracle Cloud VM Limit**: Strict 952MB RAM limit.
- **Never Build Docker on VM**: Next.js builds cause OOM panics. Build locally (`npm run build` / `npx next build`).
- **Deploy via PM2**: Compress build bundle (`zip_fast.py` excluding `.zip` files), SCP to Oracle VM, extract, and restart via `pm2 restart clipped-web`.
- **Zero Hardcoded Secrets**: All API keys must be dynamic (Supabase `settings` table or environment variables).
