<div align="center">
  <img src="public/hero-bg.jpg" alt="Clipped AI Studio" width="100%" />
  
  <br />
  <h1>🚀 Clipped AI Studio — Autonomous Next-Gen Video Generation Engine</h1>
  <p><strong>A professional, AI-driven cinematic video studio, multi-track NLE, and distributed render pipeline built on Next.js 16, FFmpeg, WebCodecs, and Supabase.</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
  [![Turbopack](https://img.shields.io/badge/Turbopack-Enabled-blueviolet.svg?style=flat)](https://turbo.build/)
  [![WebCodecs](https://img.shields.io/badge/WebCodecs-Client--Side_Export-success.svg?style=flat)](https://w3c.github.io/webcodecs/)
  [![OTIO / FCPXML](https://img.shields.io/badge/NLE_Bridge-OTIO%20%26%20FCPXML-orange.svg?style=flat)](https://opentimeline.io/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg?style=flat&logo=supabase)](https://supabase.com/)
  [![FFmpeg](https://img.shields.io/badge/FFmpeg-Render_Engine-red.svg?style=flat&logo=ffmpeg)](https://ffmpeg.org/)
  [![Zustand + Zundo](https://img.shields.io/badge/Zustand-Time--Travel_NLE-brown.svg?style=flat&logo=react)](https://github.com/pmndrs/zustand)
  [![Tests](https://img.shields.io/badge/E2E_Tests-248%2F248_Passing-brightgreen.svg?style=flat)](tests/e2e/standalone-runner.js)
</div>

<hr />

## 📑 Table of Contents

1. [🎥 Overview & What Makes Clipped Different](#-overview--what-makes-clipped-different)
2. [📸 Studio Interface Tour (Live High-DPI Captures)](#-studio-interface-tour-live-high-dpi-captures)
3. [📖 Comprehensive User Guide: Every Section Walkthrough](#-comprehensive-user-guide-every-section-walkthrough)
   - [1. Creation Hub & Workflow Dispatcher (`/create`)](#1-creation-hub--workflow-dispatcher-create)
   - [2. Cinema Studio Director Console (`/create/cinema`)](#2-cinema-studio-director-console-createcinema)
   - [3. Bulk 30-Day Campaign Planner (`/create/bulk`)](#3-bulk-30-day-campaign-planner-createbulk)
   - [4. High-Retention Stories Generator (`/create/stories`)](#4-high-retention-stories-generator-createstories)
   - [5. Consistent Character Studio (`/create/character`)](#5-consistent-character-studio-createcharacter)
   - [6. Whiteboard Animation Studio (`/create/whiteboard`)](#6-whiteboard-animation-studio-createwhiteboard)
   - [7. Production Planner & Content Calendar (`/planner`)](#7-production-planner--content-calendar-planner)
   - [8. Real-Time Distributed Render Queue (`/queue`)](#8-real-time-distributed-render-queue-queue)
   - [9. Video Library & Media Asset Hub (`/dashboard`, `/library`)](#9-video-library--media-asset-hub-dashboard-library)
   - [10. Provider Hub & OmniRoute Gateway (`/settings`)](#10-provider-hub--omniroute-gateway-settings)
4. [⚡ Next-Generation Video Engine Advancements](#-next-generation-video-engine-advancements)
   - [Client-Side WebCodecs MP4 Export (Zero Server Cost)](#client-side-webcodecs-mp4-export-zero-server-cost)
   - [OpenTimelineIO (OTIO) & FCPXML Professional NLE Bridge](#opentimelineio-otio--fcpxml-professional-nle-bridge)
   - [AI Foley Soundstage & Spatial Sound Effects](#ai-foley-soundstage--spatial-sound-effects)
   - [Viral Kinetic Typography Subtitle Presets](#viral-kinetic-typography-subtitle-presets)
   - [DAG Scene Pipeline Orchestrator](#dag-scene-pipeline-orchestrator)
5. [🏛️ Subdirectories & Architectural Subsystems](#️-subdirectories--architectural-subsystems)
6. [🚀 Quickstart & Local Development](#-quickstart--local-development)
7. [🔒 Global System Invariants](#-global-system-invariants)
8. [🤝 Quality Gates & Testing](#-quality-gates--testing)

---

## 🎥 Overview & What Makes Clipped Different

**Clipped AI** is a self-hosted, sovereign video studio that eliminates monthly SaaS subscriptions by unifying state-of-the-art generative video models, multi-track timeline editing, and automated post-production into a single platform.

Whether starting with a raw one-line prompt, a long-form article URL, or an uploaded multi-page screenplay, Clipped autonomously plans beats, directs cinematic camera moves, synthesizes emotional speech, generates or scrapes matching B-roll, times sound effects, burns animated kinetic captions, and exports publish-ready video in vertical (9:16), widescreen (16:9), or square (1:1) formats.

### Core Superpowers
- **Zero Server Compute Client-Side Export**: Export MP4s directly in the user's browser at up to 60fps using the W3C WebCodecs API and `mp4-muxer`. Renders happen on the client GPU with zero backend queue time and zero cloud compute bills.
- **Hollywood NLE Compatibility**: One-click export to OpenTimelineIO (`.otio`) and Final Cut Pro XML (`.fcpxml`) for instant seamless handoffs to DaVinci Resolve, Adobe Premiere Pro, and Apple Final Cut Pro.
- **Cinema Director Console**: Inspired by Open-Higgsfield-AI, direct scenes using physical cinematography controls: camera shot types, lens focal lengths, film stock color grades, and lighting setups.
- **Sovereign AI Routing Gateway**: Powered by OmniRoute (`:20128/v1`), seamlessly cascading across 45+ providers (Gemini, Claude, OpenAI, DeepSeek, Kling, Runway, Fal.ai, ElevenLabs, Azure Speech, Edge TTS) with automatic keyless fallbacks.

---

## 📸 Studio Interface Tour (Live High-DPI Captures)

Explore Clipped AI Studio running live on Next.js 16.3.3:

| Section | Live Interface Preview | Description |
| :--- | :--- | :--- |
| **Workflow Hub** | <img src="public/screenshots/01_workflow_hub.png" width="480" alt="Workflow Hub" /> | 10 specialized generation workflows with real-time health badges and quick-launch modes. |
| **Cinema Studio** | <img src="public/screenshots/02_cinema_studio.png" width="480" alt="Cinema Studio" /> | Professional director console with camera motion, lens selection, and film stock grading. |
| **Bulk 30-Day Planner** | <img src="public/screenshots/03_bulk_planner.png" width="480" alt="Bulk Planner" /> | Mass content generation matrix with automated calendar scheduling and platform targeting. |
| **Stories Generator** | <img src="public/screenshots/04_stories_generator.png" width="480" alt="Stories Generator" /> | 5-step guided wizard: Hook, Story Arc, Voice Narration, Subtitle Themes, and Live Preview. |
| **Character Consistency** | <img src="public/screenshots/05_character_consistency.png" width="480" alt="Character Consistency" /> | Multi-angle character reference sheets ensuring stable identity across all scenes. |
| **Whiteboard Studio** | <img src="public/screenshots/06_whiteboard_studio.png" width="480" alt="Whiteboard Studio" /> | AI visual explainer studio generating hand-drawn style infographics and educational beats. |
| **Settings & Providers** | <img src="public/screenshots/07_settings_providers.png" width="480" alt="Settings & Providers" /> | OmniRoute gateway configuration, model routing rules, and provider health monitors. |
| **Dashboard & Library** | <img src="public/screenshots/08_dashboard_library.png" width="480" alt="Dashboard & Library" /> | Comprehensive project overview, render throughput statistics, and media asset playback. |
| **Production Planner** | <img src="public/screenshots/09_production_planner.png" width="480" alt="Production Planner" /> | Multi-channel social scheduling calendar with scheduled post statuses and preview modals. |
| **Render Queue** | <img src="public/screenshots/10_render_queue.png" width="480" alt="Render Queue" /> | Live SSE-monitored distributed render queue with atomic lease locks and step logs. |

---

## 📖 Comprehensive User Guide: Every Section Walkthrough

### 1. Creation Hub & Workflow Dispatcher (`/create`)
The central command center for launching new video projects. Choose between 10 purpose-built workflows designed for different content formats:
- **Quick-Start Cards**: Click any workflow card to launch the guided wizard or specialized studio.
- **Aspect Ratio Selector**: Toggle between **9:16 (TikTok/Reels/Shorts)**, **16:9 (YouTube/Landscape)**, or **1:1 (Instagram Feed)** before entering the generation pipeline.
- **Hybrid Auto-Pilot**: Enable Auto-Pilot mode to let the engine automatically chain scriptwriting, voiceover, asset gathering, and rendering, while still allowing manual pause-and-edit intervention at any time.

### 2. Cinema Studio Director Console (`/create/cinema`)
A filmmaker-centric workspace modeled after professional digital cinema workflows:
- **Cinematography Controls**: Select precise camera framing (Extreme Wide Shot, Master Shot, Medium Close-Up, Dutch Angle, Overhead Drone).
- **Camera Movement Dynamics**: Configure dynamic camera motion paths including Dolly In/Out, Smooth Steadicam Tracking, Rapid Whip Pan, Crane Jib, or Static Locked-Off tripod shots.
- **Lens & Optics Emulation**: Choose classic focal lengths (16mm Ultra-Wide, 24mm Wide Anamorphic, 50mm Standard Prime, 85mm Portrait, or 135mm Telephoto) with custom aperture simulation (`f/1.2` dreamlike bokeh to `f/8.0` deep focus).
- **Film Stock & Lighting Grades**: Select look-up profiles (Golden Hour Warmth, Cyberpunk Neon Rain, Kodak Portra 400 Soft Grain, Noir High Contrast, or Technicolor Vintage) that automatically translate into FFmpeg color grading filters and prompt descriptors.

### 3. Bulk 30-Day Campaign Planner (`/create/bulk`)
Generate an entire month's worth of short-form social content in one automated session:
- **Theme & Topic Matrix**: Enter a overarching niche or series topic (e.g., *"Daily Stoic Wisdom"* or *"SaaS Growth Hacks"*).
- **Cadence & Schedule Configurator**: Choose publication frequency (1 to 3 videos per day) and target social platforms (TikTok, Instagram Reels, YouTube Shorts).
- **Batch Script Synthesizer**: The engine generates distinct narrative hooks, script beats, and visual prompts for all 30 days, grouping them into a review table.
- **One-Click Enqueue**: Approve all scripts at once to enqueue batch render jobs with staggered release timestamps.

### 4. High-Retention Stories Generator (`/create/stories`)
The flagship 5-step video generation wizard:
1. **Concept & Script**: Input a premise, paste an existing script, or fetch a blog/news URL to auto-summarize into concise video beats.
2. **Visual Style**: Pick visual rendering modes: AI-Generated Flux/SDXL imagery, Gen-3 AI Video clips, or curated Stock Footage (Pexels/Pixabay/Mixkit).
3. **Voiceover & Speech**: Choose from natural neural voices (Edge TTS, ElevenLabs, Azure Speech, OpenAI) across multiple languages, accents, and emotional tones.
4. **Kinetic Captions**: Select from 6 viral subtitle presets with word-by-word highlight colors, custom font sizes, and safe-zone positioning.
5. **Live Preview & Queue**: Inspect the synchronized timeline preview, make beat-level adjustments, and send directly to the distributed render queue.

### 5. Consistent Character Studio (`/create/character`)
Solve AI character drift across multi-scene narrative videos:
- **Reference Character Generator**: Define a character's name, physical features, attire, and core personality traits.
- **Multi-Angle Model Sheets**: Generate 4-angle turnaround sheets (Front, 3/4 Profile, Side, Close-Up Expression).
- **Cross-Scene Seed Injection**: Every visual prompt generated across the project injects character consistency tokens and seed locks, maintaining facial structure and styling across every beat.

### 6. Whiteboard Animation Studio (`/create/whiteboard`)
Create engaging visual explainer videos and sketch-style educational content:
- **Concept Breakdown**: Input technical documentation, complex tutorials, or scientific concepts.
- **Gemini Vision Character Sheet**: Auto-generates clean, high-contrast vector illustrations and doodle diagrams.
- **Draw-On Reveal Effects**: Remotion and FFmpeg apply dynamic wipe and progressive draw masks that simulate hand-drawn whiteboard animations timed to speech pauses.

### 7. Production Planner & Content Calendar (`/planner`)
Manage your multi-platform publication workflow:
- **Interactive Calendar View**: View scheduled and published videos mapped across calendar days and publication timeslots.
- **Post Details Modal**: Inspect render status, preview final video files, copy generated hashtags and descriptions, or re-schedule publication times.
- **Multi-Account Channel Status**: Monitor connection status for YouTube, TikTok, and Instagram social API tokens.

### 8. Real-Time Distributed Render Queue (`/queue`)
Monitor every job moving through the distributed rendering pipeline:
- **Micro-Granular SSE Progress**: Live Server-Sent Events stream step-by-step progress bars (Scripting → Voice Synthesis → Media Extraction → QC Gate → FFmpeg Muxing).
- **Atomic Lease Tracking**: Displays worker node IDs, lease durations, and retry counts.
- **Live Terminal Log Drawer**: Click on any queued or rendering job to open an interactive drawer displaying real-time worker `stdout` and `stderr` logs.
- **Dead-Letter Queue & Retry Controls**: If an external provider experiences transient API rate limits, retry jobs with one click or edit beat parameters inline.

### 9. Video Library & Media Asset Hub (`/dashboard`, `/library`)
Manage and export your completed creations:
- **Zero-Latency Video Player**: Instant playback with spacebar pause, frame-accurate seeking, and loop toggles.
- **Multi-Format Export Dropdown**:
  - Download High-Bitrate H.264 MP4
  - Instant In-Browser WebCodecs MP4 Export (Client-side)
  - OpenTimelineIO (`.otio`) Timeline File
  - Final Cut Pro XML (`.fcpxml`) Project File
  - Isolated Audio Stems (Dialogue WAV, BGM WAV, SFX WAV)
- **Analytics & Retention Scorecards**: Review computed emotional arc graphs, tension scores, and automated VLM quality inspection ratings.

### 10. Provider Hub & OmniRoute Gateway (`/settings`)
Configure model routing and infrastructure credentials:
- **OmniRoute Gateway URL**: Direct the engine to local (`http://localhost:20128/v1`) or remote OmniRoute LLM routing endpoints.
- **Universal Provider Matrix**: Configure API credentials for OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, ElevenLabs, Fal.ai, Kling, Pexels, and Pixabay.
- **Keyless Fallback Toggles**: Toggle automated fallbacks to Edge TTS, Google Translate Audio, Pollinations AI, and Openverse to ensure zero-failure operation even when API balances run dry.
- **Live Health Diagnostics**: Ping test all configured endpoints with real-time latency measurements and status badges.

---

## ⚡ Next-Generation Video Engine Advancements

### Client-Side WebCodecs MP4 Export (Zero Server Cost)
The client-side export engine ([`lib/media/client-export.ts`](lib/media/client-export.ts)) renders full-resolution MP4 videos directly inside modern browsers via the **W3C WebCodecs API** (`VideoEncoder`, `AudioEncoder`) and `mp4-muxer`:
- **Hardware Acceleration**: Leverages the user's local GPU (NVENC, Apple Silicon Metal, Intel QuickSync) for blistering export speeds (up to 4x faster than real-time).
- **Zero Cloud Costs**: Offloads CPU/GPU rendering from cloud instances to client machines, enabling infinite scaling without server infrastructure upgrades.
- **Supported in Timeline**: Available as a primary export option in both `TimelineEditor.tsx` and `PublishModal.tsx`.

### OpenTimelineIO (OTIO) & FCPXML Professional NLE Bridge
Professional editors often want to polish AI-generated drafts inside professional desktop non-linear editing software. Clipped features a bidirectional export bridge ([`lib/engine/otio-exporter.ts`](lib/engine/otio-exporter.ts)):
- **OpenTimelineIO (`.otio`)**: Outputs standard OTIO JSON timelines with synchronized video tracks, dialogue voiceover tracks, background music with volume ducking, and subtitle markers for **DaVinci Resolve**.
- **Final Cut Pro XML (`.fcpxml` v1.10)**: Emits compliant Apple FCPXML documents mapping clips, asset references, and timing markers directly into **Apple Final Cut Pro** and **Adobe Premiere Pro**.
- **API Endpoint**: Accessible via `POST /api/export/nle` with format selection (`{ format: 'otio' | 'fcpxml' }`).

### AI Foley Soundstage & Spatial Sound Effects
Videos without tactile sound effects feel hollow. The Foley Soundstage ([`lib/engine/foley-soundstage.ts`](lib/engine/foley-soundstage.ts)) autonomously scores scripts for physical Foley cues:
- **Action Event Extraction**: Detects physical verbs and environmental context (footsteps, swooshes, doors, wind, cinematic impacts, record scratches, risers).
- **Spatial Panning & Mix Ducking**: Computes stereo pan offsets (`-1.0` left to `+1.0` right), volume gain, and low-pass filtering.
- **Auto-Ducking**: Automatically ducks background music by -12dB whenever dialogue or high-impact Foley effects trigger.

### Viral Kinetic Typography Subtitle Presets
Subtitles are essential for vertical video retention. The Kinetic Subtitle Engine ([`lib/engine/kinetic-subtitles.ts`](lib/engine/kinetic-subtitles.ts)) formats speech into 6 viral animated presets:
1. **Hormozi Pop**: High-impact yellow/green word highlights with bold black outlines and subtle bounce scaling.
2. **Cyber Neon**: Glowing cyan and magenta text with ambient neon drop-shadows.
3. **Cinematic Boxed**: Semi-transparent dark frosted-glass backdrop with crisp white typography.
4. **Minimalist Clean**: Understated modern sans-serif subtitles positioned cleanly in the lower-third.
5. **Bold Impact**: Heavy condensed uppercase lettering with heavy contrast shadows.
6. **Retro Karaoke**: Progressive color-fill wipe timed exactly to syllable durations.

### DAG Scene Pipeline Orchestrator
To minimize generation latency, the Directed Acyclic Graph (DAG) scene orchestrator ([`lib/engine/dag-orchestrator.ts`](lib/engine/dag-orchestrator.ts)) replaces serial generation with dependency-aware parallel execution:
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
│ 4. Scene 1 Image │      │ 5. Scene 2 Image │ ... (Parallel)
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         └────────────┬────────────┘
                      ▼
       ┌───────────────────────────────┐
       │  6. AI Foley Soundstage Score │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │ 7. FFmpeg / WebCodecs Render  │
       └───────────────────────────────┘
```
Scenes 1, 2, and 3 generate their visuals concurrently in parallel worker threads, reducing total render turnaround time by up to 65%.

---

## 🏛️ Subdirectories & Architectural Subsystems

The repository follows a clean, root-level App Router structure without a `src/` wrapper:

- [app](./app/README.md): Next.js 16 App Router hierarchy containing the public marketing views, authentication layout, core studio workspace, and backend API endpoints.
- [components](./components/README.md): Shadcn UI design system primitives, 5-step Creation Wizard, NLE drag-and-drop timeline, and React Flow pipeline builder.
- [lib](./lib/README.md): Core application foundation including multi-provider LLM cascade, camera motion filters, media search, distributed job leasing, and Supabase SSR clients.
- [scripts](./scripts/README.md): Distributed background daemons including the FFmpeg/Puppeteer render worker, social publisher, auto-pilot scheduler, and maintenance CLI.
- [remotion](./remotion/README.md): Remotion video composition engine driving multi-beat animations, Ken Burns effects, audio mixing, and subtitle burning.
- [supabase](./supabase/README.md): Database migrations, schema definitions, real-time publications, storage buckets, and atomic RPC lease functions (`claim_render_job`).
- [packages](./packages/README.md): Monorepo workspace packages containing canonical Zod validation schemas, enums, and TypeScript interfaces.
- [mcp](./mcp/README.md): Stdio Model Context Protocol (MCP) server exposing tools for external autonomous AI agents to orchestrate video generation.

```
clipped/
├── app/                        # Next.js 16 App Router
│   ├── (app)/                  # Authenticated application shell
│   │   ├── create/             # Creation Hub & specialized studio workflows
│   │   │   ├── cinema/         # Cinema Studio Director Console
│   │   │   ├── bulk/           # Bulk 30-Day Campaign Planner
│   │   │   ├── stories/        # Stories 5-Step Generator Wizard
│   │   │   ├── character/      # Character Consistency Sheet Studio
│   │   │   └── whiteboard/     # Whiteboard Explainer Studio
│   │   ├── dashboard/          # Production metrics & recent projects
│   │   ├── planner/            # Social media scheduling calendar
│   │   ├── queue/              # Real-time distributed render queue
│   │   └── settings/           # Provider Hub & OmniRoute gateway config
│   ├── (auth)/                 # Login & user registration screens
│   └── api/                    # RESTful backend API routes
│       ├── export/nle/         # OTIO & FCPXML timeline export bridge
│       ├── workflows/          # Generation triggers (cinema, bulk, stories)
│       ├── jobs/               # Distributed render job management
│       └── health/             # System and service health check probe
├── components/                 # React component library
│   ├── cinema/                 # Cinema Director console controls & lens picker
│   ├── create/                 # Creation wizard step cards & preview player
│   ├── timeline/               # Multi-track NLE editor (Zustand + Zundo)
│   └── ui/                     # Shadcn UI primitives (radix-ui + Tailwind)
├── lib/                        # Core application business logic
│   ├── ai/                     # LLM orchestration & JSON repair helpers
│   ├── engine/                 # Video processing engines
│   │   ├── revideo.ts          # Revideo WebCodecs render generator
│   │   ├── otio-exporter.ts    # OTIO & FCPXML project exporter
│   │   ├── cinema-director.ts  # Cinema Director framing & camera moves
│   │   ├── foley-soundstage.ts # AI Foley soundstage & spatial audio
│   │   ├── kinetic-subtitles.ts# Subtitle animation generator
│   │   ├── dag-orchestrator.ts # Directed Acyclic Graph parallel pipeline
│   │   └── tts.ts              # Multi-tier text-to-speech cascade
│   ├── media/                  # WebCodecs client-side MP4 exporter
│   └── supabase/               # Supabase SSR client, middleware, and schema
├── remotion/                   # Remotion composition components & canvas
├── scripts/                    # Distributed background worker daemons
│   ├── render-worker.ts        # FFmpeg & Remotion distributed render worker
│   ├── publish-worker.ts       # Social media auto-publisher
│   └── auto-pilot-scheduler.ts # Automated background job orchestrator
└── tests/                      # Headless automated E2E test suites (248 tests)
```

---

## 🚀 Quickstart & Local Development

### Prerequisites
- **Node.js**: v20+ (`node -v`)
- **Package Manager**: pnpm v11+ (`npm i -g pnpm`)
- **FFmpeg**: Installed and accessible on system `PATH` (`ffmpeg -version`)

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/ajayspi/clipped-ai-studio.git
cd clipped

# Install monorepo dependencies (canonical lockfile)
pnpm install --frozen-lockfile
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```
> [!NOTE]
> Even with no paid API keys configured, Clipped AI operates out-of-the-box using built-in keyless fallbacks (Edge TTS, Google Translate Audio, Pollinations AI, and Openverse).

### 3. Start Development Server
```bash
# Start Next.js with Turbopack on port 3100
pnpm dev -- -p 3100
```
Visit [`http://localhost:3100`](http://localhost:3100) to open the studio.

### 4. Start Background Render & Publish Workers
In a separate terminal, launch the PM2 distributed worker ecosystem:
```bash
# Launch OmniRoute gateway, render worker, and publisher
npm run workers
```

---

## 🔒 Global System Invariants

1. **Distributed Lease Locking**: Render workers claim jobs via the atomic Supabase RPC `claim_render_job` using `orchestration_state IN ('queued', 'retryable')` with periodic lease heartbeats. Expired leases automatically revert without dropping jobs.
2. **Non-Empty Concat Guard**: Every route submitting render jobs must ensure valid beats exist before advancing to `qc_pending`. Planning-only or beatless submissions must set `orchestration_state: 'planning'` or `'completed'` to avoid FFmpeg empty concat list crashes.
3. **Camera Move Frame Progress**: In FFmpeg `zoompan` expressions, camera progress MUST animate on the output frame counter `on`, NEVER the input frame counter `in` (which remains static during frame generation).
4. **Volumetric Stream Normalization**: Side-by-side volumetric spatial video encoding (`hstack`) strictly requires all video streams normalized to `format=yuv420p` before stacking.
5. **SSE Named Event Dispatch**: Frontend timeline listeners must connect via `addEventListener('update', ...)` to avoid silent event loss caused by default `onmessage` handlers.

---

## 🤝 Quality Gates & Testing

Clipped AI enforces strict automated quality gates. Before committing or deploying changes, run the validation suite:

```bash
# 1. Scoped ESLint verification
pnpm lint:scoped

# 2. TypeScript typecheck (excludes vendored trees)
pnpm typecheck

# 3. Unit test suite
pnpm exec vitest run --no-file-parallelism

# 4. Zero-dependency E2E test runner (248 tests across 33 tiers)
pnpm test
```

---

## 📚 Documentation & Architecture Deep Dives

- **Interactive Architecture Diagram**: [docs/architecture.html](docs/architecture.html)
- **Comprehensive Master Architecture**: [docs/PROJECT_GIST.md](docs/PROJECT_GIST.md)
- **Daily Engineering Journal**: [daily_documentation.md](daily_documentation.md)
- **Devlog Archive**: [docs/devlogs/INDEX.md](docs/devlogs/INDEX.md)
- **Agent Rules & Development Guide**: [AGENTS.md](AGENTS.md)

<hr />

<div align="center">
  <sub>Built with ❤️ by the Clipped AI Open-Source Community. Distributed under the MIT License.</sub>
</div>

<!-- about-me -->
## About me

<p>
  <img alt="HFI Certified User Experience Analyst (CXA)" src="https://img.shields.io/badge/HFI-Certified%20UX%20Analyst%20(CXA)-1a3a52?style=flat-square">
  <a href="https://www.linkedin.com/in/aigrowthandautomationleader/"><img alt="LinkedIn" src="https://img.shields.io/badge/LinkedIn-aigrowthandautomationleader-0A66C2?style=flat-square&logo=linkedin&logoColor=white"></a>
  <a href="https://designjoom.com"><img alt="designjoom.com" src="https://img.shields.io/badge/designjoom.com-Portfolio-0b1220?style=flat-square&logo=astro&logoColor=white"></a>
</p>

**A V Ajay Kiran** — AI Growth & Digital Transformation Leader with 14+ years across AI
product development, SEO and performance marketing, UX strategy and workflow automation,
working with teams across India, Germany, the US and Australia.

**Certified:** HFI Certified User Experience Analyst (CXA) — Human Factors International.

**Capabilities**

- **AI & Growth** — Generative AI · LLM workflows · Prompt engineering · AI product development · AI content & video · Workflow automation · Growth strategy · SEO/SEM · Performance marketing · CRO · Go-to-market · Content strategy · Marketing automation
- **UX & Product** — UX strategy · User research · Information architecture · Wireframing & prototyping · Design systems · Usability testing · Product strategy
- **Engineering** — TypeScript · Python · React 19 · Next.js · Astro · FastAPI · Three.js · Tailwind CSS · PostgreSQL · Docker · Vite · Zustand
- **Analytics** — GA4 · Search Console · Looker Studio · Hotjar · Mixpanel · Microsoft Clarity · Google Ads · Semrush · Ahrefs

**Find me** — [LinkedIn](https://www.linkedin.com/in/aigrowthandautomationleader/) ·
[designjoom.com](https://designjoom.com) · [ajayspi@gmail.com](mailto:ajayspi@gmail.com)
