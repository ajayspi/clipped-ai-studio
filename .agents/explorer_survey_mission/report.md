# Comprehensive Investigation Report: Generation Flow, Job Orchestration & Automatic Mission Mode

## Executive Summary

This report documents the deep-dive architectural investigation of Clipped AI Studio's generation pipeline, background job lifecycle, Supabase data layer, Remotion composition engine, and state management. Based on this codebase analysis, a concrete design and implementation specification is established for **Automatic Mission Mode** (single-prompt one-click video creation with immediate navigation to a real-time progress visualizer and a manual/edit toggle).

---

## 1. Existing Generation Initiation Flow

### 1.1 Create Section & Entry Points
The Create hub is located at `app/(app)/create/page.tsx` and exposes 8 workflow cards:
1. **Footage Video** (`/create/footage`) — Stock footage matching
2. **AI Images Video** (`/create/images`) — Flux/DALL-E image generation + animation
3. **AI Videos** (`/create/ai-videos`) — Kling / Luma synthetic video generation
4. **Stories Generator** (`/create/stories`) — Multi-part episodic storytelling
5. **Bulk Planner** (`/create/bulk`) — 30-day content calendar batch generation
6. **Extract Shorts** (`/create/shorts`) — Viral hook extraction from long-form video
7. **Micro-Drama** (`/create/drama`) — Cinematic character-consistent drama
8. **Auto Pilot** (`/create/auto`) — Autonomous recurring pipeline

### 1.2 Creation Wizard Architecture
Workflows (Footage, Images, AI Videos, etc.) render the `CreationWizard` component (`components/wizard/CreationWizard.tsx`), managed by Zustand store `components/wizard/wizard-store.ts`.

The wizard consists of 5 linear steps:
- **Step 0 (Script)**: Subject/topic input, tone selection, target duration, paragraph count -> calls `POST /api/v1/script`
- **Step 1 (Scenes)**: Analyzes narration into shot-length beats (`POST /api/v1/analyze`) and queries candidates for each beat (`POST /api/v1/source`)
- **Step 2 (Voice)**: Provider selection (OpenAI TTS, ElevenLabs, Google Cloud, Coqui), voice selection, background music preset
- **Step 3 (Subtitles)**: Subtitle font, color, positioning, interactive drag overlay on live player
- **Step 4 (Render)**: Final review, aspect ratio (9:16, 16:9, 1:1), auto-publish checkbox, and queue submission -> calls `POST /api/workflows/generate`

### 1.3 Existing "Auto-Pilot" Button in Wizard
Within `CreationWizard.tsx` (lines 45-113), there is an existing `runAutoMode` function. However:
- It runs sequentially in the client browser: generates script -> breaks scenes -> queries asset sources sequentially.
- Once finished, it merely advances the wizard step to Step 4 (RenderStep).
- It does **not** auto-submit to queue, does **not** navigate to a dedicated mission view, does **not** persist interim job progress in Supabase, and requires the user to stay on the page.

---

## 2. Generation Job Lifecycle & Pipeline Architecture

### 2.1 Database Model: `render_jobs` Table
Defined in `schema.sql` (lines 30-41):
```sql
CREATE TABLE render_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
    progress INTEGER DEFAULT 0,    -- 0 to 100
    error_message TEXT,
    logs TEXT,                     -- JSON payload with steps, inputs, candidates, outputs
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 2.2 End-to-End Pipeline Steps
1. **Job Initialization (`pending`, 0%)**:
   - API route receives request (`POST /api/workflows/generate`, `/api/workflows/ai-videos`, etc.).
   - Generates `jobId = crypto.randomUUID()`.
   - Inserts initial `pending` record into `render_jobs` table in Supabase.
   - Dispatches asynchronous background execution via `setTimeout(..., 0)` (or serverless background task).
   - Returns immediate HTTP 200 `{ success: true, jobId }` to client.

2. **Script Generation (LLM Synthesis)**:
   - Module: `lib/ai/llm.ts` -> `complete()`.
   - Providers: OpenAI (`gpt-4o-mini`), Google Gemini, Anthropic, or free keyless fallback via Pollinations.ai Text API (`https://text.pollinations.ai`).
   - Output: Narration text and search keywords.

3. **Scene Breakdown & Beat Analysis**:
   - Module: `POST /api/v1/analyze` and `lib/engine/scene-matcher.ts`.
   - Breaks narration into 3-5 second shot beats with calculated timing, visual prompts, and search tags.

4. **Asset Generation / Sourcing**:
   - **Stock Footage**: `POST /api/v1/source` & `lib/engine/video-sourcer.ts` -> Pexels API, Pixabay API, or Pollinations.ai fallback.
   - **AI Images**: `lib/engine/image-generator.ts` -> Fal.ai Flux (`flux-schnell`, `flux-dev`), DALL-E 3, or Pollinations.ai Flux.
   - **AI Videos**: `lib/engine/video-generator.ts` -> Kling AI (`kling-v1`), Luma Dream Machine (`luma-dream`), Fal.ai Kling, HuggingFace Zeroscope, or deterministic dry-run fallback clips.

5. **Voiceover & Speech Synthesis**:
   - Module: `lib/engine/tts.ts` -> `TTSEngine.synthesize()`.
   - Providers with auto-fallback cascade: ElevenLabs (`eleven_multilingual_v2`) -> Google Cloud TTS (Neural2/Journey/Wavenet) -> Coqui TTS -> Keyless Google Translate TTS -> In-memory synthetic WAV buffer.
   - Supports 8 languages (en-US, en-IN, hi-IN, ta-IN, te-IN, kn-IN, bn-IN, mr-IN).

6. **Audio Mixing & Speech Ducking**:
   - Module: `lib/engine/audio-mixer.ts` -> `AudioMixer.mixAudio()`.
   - Uses FFmpeg sidechain compression (`sidechaincompress=threshold=0.125:ratio=4.0:attack=50:release=300`) to dynamically lower background music during spoken voiceover, with fade-in and fade-out.
   - Safe fallback when FFmpeg is not installed.

7. **Subtitles & Remotion Video Composition**:
   - Module: `remotion/Composition.tsx` -> `MainComposition` & `SubtitleOverlay`.
   - Uses `@remotion/player` with spring physics for Hormozi-style word-by-word pop animations and highlighted yellow text.
   - Renders sequence of video/image clips with overlaid audio tracks and customizable subtitle styling.

8. **Completion & Status Transition (`completed`, 100%)**:
   - Updates `render_jobs` record in Supabase: `status = 'completed'`, `progress = 100`, `completed_at = now()`, `logs = JSON.stringify(result)`.
   - Appears in Dashboard (`app/(app)/dashboard/page.tsx`) and Library (`app/(app)/library/page.tsx`).

---

## 3. Automatic Mission Mode Architecture

### 3.1 UX / User Interaction Flow
```
User enters prompt on Create page or Mission Input Bar
      │ (e.g. "5 crazy psychological tricks to read minds", workflow: footage/images/ai-videos/whiteboard/avatar)
      ▼
Client calls `POST /api/workflows/mission`
      │
      ├─► Backend inserts `render_jobs` row (status: 'pending', progress: 5, step: 'script')
      ├─► Backend triggers asynchronous Mission Orchestrator
      │
      ▼
Client receives `{ success: true, jobId }` and immediately redirects to `/create/mission/[jobId]`
      │
      ▼
Mission Progress View (`/create/mission/[jobId]`):
      ├─► Real-time Stepper Visualizer (Script -> Scenes -> Assets -> Voiceover -> Subtitles -> Final Video)
      ├─► Live Preview Player (loads clips & audio dynamically as generated)
      ├─► Live Log Console / Timeline
      └─► "Manual / Edit in Wizard" Toggle Button
```

### 3.2 Backend Mission Orchestrator (`/api/workflows/mission/route.ts` & `lib/engine/mission-orchestrator.ts`)
The Mission Orchestrator executes all 6 stages sequentially in the background while broadcasting status updates to Supabase:
- **Phase 1: Script Synthesis** (`progress: 15%`, `step: "script"`, updates `render_jobs.logs.script`)
- **Phase 2: Scene Breakdown** (`progress: 35%`, `step: "scenes"`, updates `render_jobs.logs.beats`)
- **Phase 3: Visual Asset Generation** (`progress: 60%`, `step: "assets"`, updates `render_jobs.logs.assets`)
- **Phase 4: Neural Voiceover & BGM Mixing** (`progress: 80%`, `step: "audio"`, updates `render_jobs.logs.audio`)
- **Phase 5: Subtitle Timing & Remotion Alignment** (`progress: 95%`, `step: "composition"`)
- **Phase 6: Finalization** (`progress: 100%`, `status: "completed"`, `logs.finalVideoUrl`)

If any stage fails, the error is caught, recorded in `render_jobs.error_message`, status set to `failed`, and logged.

---

## 4. Mission Progress View Specification

### 4.1 Page Layout & Route
- Route: `app/(app)/create/mission/[id]/page.tsx` or `app/(app)/mission/[id]/page.tsx`
- Layout: 2-column responsive layout:
  - **Left Column (2/3 width)**:
    - **Header Card**: Topic title, workflow badge, overall progress bar (0-100%), elapsed time counter, status badge (`Processing`, `Completed`, `Failed`).
    - **Step-by-Step Visualizer Accordion**:
      1. *Script & Hook*: Displays generated narration, hook line, word count, tone.
      2. *Scene Breakdown*: Displays beat cards with durations and visual prompt keywords.
      3. *Asset Generation*: Displays grid of generated images/clips with source badges (Flux, Pexels, Gemini, etc.).
      4. *Voiceover & Audio*: Displays waveform visualization, selected voice (Alloy, Nova, Rachel), and background music vibe.
      5. *Subtitles & Composition*: Subtitle style preview.
    - **Real-Time Job Terminal / Event Log**: Expandable console stream with timestamps.
  - **Right Column (1/3 width)**:
    - **Live Video Player / Remotion Preview**: Automatically displays the assembled Remotion composition once beats & audio are ready.
    - **Controls & Action Bar**:
      - **"Switch to Manual / Edit in Wizard" button**: Serializes current job state into `wizard-store.ts` and routes to `/create/footage` (or appropriate workflow).
      - **"Publish Video" button** (active on completion): Opens `PublishModal` to publish to YouTube Shorts, TikTok, Instagram Reels.
      - **"Download HD Video" button**.
      - **"Rerun Mission" / "Cancel Mission" button**.

### 4.2 Real-time Sync & Polling Architecture
- **Primary Mechanism**: Supabase Realtime subscription via `supabase.channel('render_jobs_channel').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'render_jobs', filter: `id=eq.${jobId}` }, payload => ...)`
- **Fallback Mechanism**: SWR or `setInterval` polling every 1500ms to `/api/render-jobs/${jobId}` or direct Supabase `select` query.
- **Graceful Error Recovery**: If an API key is missing or an external provider fails, the orchestrator automatically falls back to dry-run / keyless models without halting the mission pipeline.

---

## 5. State Management & "Manual / Edit" Handshake

### 5.1 Store Architecture
- Global App Store: `lib/store.ts` (`useAppStore` for sidebar state, active user).
- Wizard Store: `components/wizard/wizard-store.ts` (`useWizardStore` containing full state: `workflowType`, `subject`, `narration`, `beats`, `voice`, `aspectRatio`, `subtitleStyle`).

### 5.2 Seamless Transition from Mission Progress to Manual Wizard
When the user clicks "Edit in Wizard" on the Mission Progress page:
1. The client reads the current `job.logs` payload (containing `narration`, `beats`, `voice`, `subtitleStyle`, etc.).
2. Calls `useWizardStore.getState().reset()` followed by populating:
   - `workflowType`: `job.logs.workflow || 'footage'`
   - `subject`: `job.logs.subject || job.title`
   - `narration`: `job.logs.narration`
   - `beats`: `job.logs.beats`
   - `voice`: `job.logs.voice`
   - `aspectRatio`: `job.logs.aspectRatio`
   - `step`: determined by furthest completed step (e.g., Step 1 for Scenes or Step 3 for Subtitles)
   - `furthestStep`: set to current step
   - `autoMode`: false
3. Navigates via `router.push('/create/' + workflowType)` so the user can immediately fine-tune, re-order beats, change assets, or adjust subtitles in the interactive UI.

---

## 6. Recommendations for Implementation Phase

1. **Create Section Enhancement (`app/(app)/create/page.tsx`)**:
   - Add a top "Quick Auto Mission" prompt bar: user types topic -> hits Enter -> triggers `POST /api/workflows/mission` -> redirects to `/create/mission/[jobId]`.
   - Add status dots (green, orange, red) to each workflow card by querying `/api/settings/keys`.
   - Add workflow cards for "Avatar Video" and "Whiteboard Animation" (driven by Gemini character reference sheets).
2. **Backend Mission Pipeline (`app/api/workflows/mission/route.ts` & `lib/engine/mission-orchestrator.ts`)**:
   - Chain script -> scenes -> assets -> voice -> composition.
   - Update `render_jobs` record at every sub-step with progress percentage and structured logs.
3. **Mission Progress Page (`app/(app)/create/mission/[id]/page.tsx`)**:
   - Build real-time stepper visualizer with Remotion player preview and "Edit in Wizard" toggle.
