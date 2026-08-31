# Explorer Survey 3: UI Panels & Integration Contracts

**Project**: Clipped (Next.js 14 / Next 16 App Router AI Video Creator Studio)  
**Surveyor**: Explorer Survey 3 (UI Panels & Integration Contracts)  
**Date**: 2026-08-29  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_3`  

---

## 1. Executive Summary & Survey Scope

This report provides the architectural survey, UI component catalog, state management patterns, and strict integration contract specifications for the **6 target video generation workflows** in the Clipped Next.js application:
1. **AI Videos** (`/create/ai-videos` -> `POST /api/workflows/ai-videos`)
2. **Stories Generator** (`/create/stories` -> `POST /api/workflows/stories`)
3. **Bulk Planner** (`/create/bulk` -> `POST /api/workflows/bulk-plan`)
4. **Extract Shorts** (`/create/shorts` -> `POST /api/workflows/extract-shorts`)
5. **Micro-Drama** (`/create/drama` -> `POST /api/workflows/micro-drama`)
6. **Auto Pilot** (`/create/auto` -> `POST /api/workflows/auto`)

### Current Project Baseline
- **App Framework**: Next.js 16.3.3 (App Router), React 19.2.8, Tailwind CSS v4, Lucide React icons, Radix UI primitives.
- **Database & Auth**: Supabase PostgreSQL client (`lib/db.ts`), NextAuth v5 (`lib/auth.ts`).
- **Existing Functional Workflows**:
  - `Footage Workflow` (`app/(app)/create/footage/page.tsx` submitting to `/api/workflows/generate`)
  - `AI Images Workflow` (`app/(app)/create/images/page.tsx` submitting to `/api/workflows/images`)
- **Target Workflows Status**: Currently placeholder/stub pages under `app/(app)/create/*` awaiting UI panel implementations and corresponding backend API routes under `app/api/workflows/*`.

---

## 2. UI Component & Architectural Inventory

### 2.1 Navigation & App Shell
- **App Layout** (`app/(app)/layout.tsx`):
  - Wraps all authenticated pages with `<Sidebar />`, sticky top bar containing `<ThemeToggle />`, and main scrollable content area (`bg-muted/20`).
- **Sidebar Navigation** (`components/sidebar.tsx`):
  - Items:
    - `/dashboard` (Dashboard)
    - `/create` (Create Hub)
    - `/library` (Library)
    - `/settings` (Settings)
- **Create Hub** (`app/(app)/create/page.tsx`):
  - Hub card grid directing creators to all 8 workflows with distinct iconography, accent colors, and descriptions.

### 2.2 Dashboard & Job Tracking
- **Dashboard View** (`app/(app)/dashboard/page.tsx`):
  - Server Component querying the Supabase `render_jobs` table:
    ```ts
    const { data: jobs } = await supabase
      .from('render_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    ```
  - Displays stats (Total Videos, Render Jobs, Total Views, Last Activity) and lists the latest 5 render jobs with real-time status badges (`completed` [green], `failed` [red], `pending`/`processing` [blue]).
  - Upon submission from creation pages, the frontend navigates to `/dashboard?job=${data.jobId}`.

### 2.3 Settings & Key Management
- **Settings Page** (`app/(app)/settings/page.tsx`):
  - Manages API provider keys stored in Supabase `settings` table.
  - Providers categorized into Free vs Premium tabs:
    - **LLMs**: OpenRouter, Gemini, Groq, Cerebras, GitHub, Mistral, Claude, OpenAI, DeepSeek, Grok.
    - **Voice / TTS**: Azure Speech, Google Cloud TTS, Remote TTS, Deepgram, Sarvam AI, ElevenLabs.
    - **Stock Footage**: Pexels, Pixabay, Coverr.
    - **Generation**: ComfyUI (Local GPU), Kling AI, Luma Dream Machine, Fal.ai (Flux), Runway Gen-3.
    - **Publishing**: YouTube Data API, TikTok Content API, Instagram Graph API.

---

## 3. Reference UI Implementations & Frontend Patterns

An inspection of the two established workflow implementations (`footage` and `images`) reveals the standardized UI and communication patterns of Clipped:

### 3.1 Standard Form Pattern
1. **Client State**:
   - `loading` (boolean) disables the submit button and swaps text to a spinning `Loader2` indicator.
   - `error` (string) displays a red destructive banner at the top of the form when API calls fail.
   - Input states for script/prompts, visual styles, aspect ratios, voice selections, and workflow parameters.
2. **Form Layout**:
   - 2-column responsive layout (`grid gap-6 md:grid-cols-[2fr_1fr]`):
     - Left (2fr): Main script/story input and primary submit action button.
     - Right (1fr): Configuration cards (Voice Settings, Aspect Ratio, Character Sheets, Provider models).
3. **Submission Contract**:
   - Sends a `POST` request with JSON headers to `/api/workflows/<workflow-name>`.
   - Body contains workflow parameters.
   - On response `res.ok`, parses JSON `{ success: true, jobId: "...", message: "..." }`.
   - Redirects to `/dashboard?job=${data.jobId}`.
   - On error, extracts error message and updates `error` state while setting `loading(false)`.

---

## 4. Exact Specifications for the 6 Target Workflows

### 4.1 Workflow 1: AI Videos

#### UI Panel Specification
- **Page Location**: `app/(app)/create/ai-videos/page.tsx`
- **UI Title**: AI Videos Workflow (Synthetic Scene Generation)
- **Controls & Form Elements**:
  - **Script / Scene Description** (`textarea`): Main text or narration prompt for synthetic generation.
  - **Video AI Model** (`select`): `kling-v1` (Kling AI), `luma-dream-machine` (Luma Ray), `veo-2` (Google Veo), `minimax` (MiniMax Video-01).
  - **Aspect Ratio** (`button group`): `9:16` (Vertical/Shorts), `16:9` (Horizontal/YT), `1:1` (Square/Insta).
  - **Duration per Scene** (`select`): `5s` or `10s`.
  - **Camera Motion** (`select`): `dynamic`, `static`, `pan_left`, `pan_right`, `zoom_in`, `zoom_out`.
  - **Negative Prompt** (`input`): Optional exclusion terms (e.g. `blurry, deformed, watermark, low quality`).
  - **Narrator Voice** (`select`): `alloy`, `echo`, `nova`, `onyx`, `fable`, `shimmer`.

#### Exact Payload Schema (Frontend -> API)
- **Target Endpoint**: `POST /api/workflows/ai-videos`
```json
{
  "workflow": "ai-videos",
  "script": "A cybernetic falcon soaring over a neon Tokyo skyline at midnight, rain splashing on glass skyscrapers.",
  "model": "kling-v1",
  "aspectRatio": "9:16",
  "duration": 5,
  "cameraMotion": "zoom_in",
  "negativePrompt": "blurry, low quality, distortion",
  "voice": "onyx"
}
```

#### Expected API Response Schema
```json
{
  "success": true,
  "jobId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
  "message": "AI Video generation started successfully"
}
```

#### Database Contract (`render_jobs`)
- Initial insert with `id: jobId`, `status: "pending"`, `progress: 0`.
- Background orchestrator (`lib/engine/video-generator.ts`) updates to `status: "completed"` or `"failed"` with generated clip URLs in `logs`.

---

### 4.2 Workflow 2: Stories Generator

#### UI Panel Specification
- **Page Location**: `app/(app)/create/stories/page.tsx`
- **UI Title**: Stories Generator (Multi-Part Shorts Series)
- **Controls & Form Elements**:
  - **Story Topic / Premise** (`textarea`): Topic or seed premise (e.g. "The Lost Colony of Roanoke", "Scary Reddit Glitch in the Matrix").
  - **Story Genre / Archetype** (`select`): `historical-mystery`, `reddit-story`, `urban-legend`, `motivational`, `sci-fi-twist`.
  - **Series Length / Parts** (`number select`): `1`, `2`, `3`, `4`, `5` parts (episodes).
  - **Visual Asset Mode** (`select`): `ai-images` (Flux/Fal), `footage` (Pexels/Pixabay), `ai-videos` (Kling).
  - **Aspect Ratio** (`button group`): `9:16` (Default), `16:9`.
  - **Narrator Voice** (`select`): `onyx` (Deep/Dramatic), `alloy` (Neutral), `echo` (Warm), `fable` (Expressive).
  - **Cliffhanger Hook Injection** (`checkbox`): Include viral Part 2 / Part 3 transition hooks.

#### Exact Payload Schema (Frontend -> API)
- **Target Endpoint**: `POST /api/workflows/stories`
```json
{
  "workflow": "stories",
  "topic": "The bizarre unsolved disappearance of the Flannan Isles lighthouse keepers in 1900.",
  "storyType": "historical-mystery",
  "partsCount": 3,
  "visualStyle": "ai-images",
  "voice": "onyx",
  "aspectRatio": "9:16",
  "includeHooks": true
}
```

#### Expected API Response Schema
```json
{
  "success": true,
  "jobId": "7d9b2384-245b-481d-8422-4916a4a2b901",
  "seriesId": "story-series-1740809700",
  "partsCount": 3,
  "message": "Story series generation queued"
}
```

---

### 4.3 Workflow 3: Bulk Planner

#### UI Panel Specification
- **Page Location**: `app/(app)/create/bulk/page.tsx`
- **UI Title**: Bulk Planner (30-Day Batch Content Generator)
- **Controls & Form Elements**:
  - **Niche & Channel Focus** (`input` / `select`): e.g. "Stoic Philosophy & Daily Quotes", "AI Productivity Tools", "Daily Finance Tips".
  - **Target Video Count** (`button group` / `select`): `7 videos` (1 Week), `14 videos` (2 Weeks), `30 videos` (1 Month).
  - **Cadence / Schedule** (`select`): `daily`, `twice-daily`, `weekdays-only`.
  - **Visual Style Pipeline** (`select`): `footage` (Stock B-roll), `images` (AI Image Ken Burns), `ai-videos` (Synthetic AI).
  - **Target Publishing Platforms** (`checkboxes`): `youtube`, `tiktok`, `instagram`.
  - **Voice & Tone** (`select`): `alloy`, `echo`, `nova`, `onyx`, `fable`, `shimmer`.
  - **Aspect Ratio** (`button group`): `9:16` (Default), `16:9`, `1:1`.

#### Exact Payload Schema (Frontend -> API)
- **Target Endpoint**: `POST /api/workflows/bulk-plan`
```json
{
  "workflow": "bulk-plan",
  "niche": "Stoic Wisdom & Daily Mental Models",
  "contentCount": 7,
  "cadence": "daily",
  "visualStyle": "footage",
  "voice": "onyx",
  "platforms": ["youtube", "tiktok", "instagram"],
  "aspectRatio": "9:16"
}
```

#### Expected API Response Schema
```json
{
  "success": true,
  "jobId": "5fa23bc0-21a4-4f28-a309-8bb4e1329c04",
  "planId": "bulk-plan-1740809700",
  "totalVideos": 7,
  "message": "Bulk plan batch created and queued for rendering"
}
```

---

### 4.4 Workflow 4: Extract Shorts

#### UI Panel Specification
- **Page Location**: `app/(app)/create/shorts/page.tsx`
- **UI Title**: Extract Shorts (Long-Form Video to Viral Clips)
- **Controls & Form Elements**:
  - **Source Type** (`tab`): `YouTube URL` vs `Direct Upload`.
  - **Video URL / Source** (`input`): e.g. `https://www.youtube.com/watch?v=...`
  - **Target Clip Count** (`slider` / `select`): `1` to `10` clips (Default `3`).
  - **Target Clip Duration** (`select`): `< 30s`, `30s - 60s`, `60s - 90s`.
  - **Highlight Extraction Strategy** (`select`): `viral-hooks` (Highest virality score), `key-takeaways` (Informative summary), `humor-reactions` (High energy moments).
  - **Auto-Captions & Subtitles** (`checkbox` / `style picker`): `hormozi` (Bold colored active words), `minimal` (Clean subtitle bar), `yellow-pop` (Viral high-contrast).
  - **Aspect Ratio Cropping** (`select`): `9:16` (Smart Center-Face Crop), `1:1`.

#### Exact Payload Schema (Frontend -> API)
- **Target Endpoint**: `POST /api/workflows/extract-shorts`
```json
{
  "workflow": "extract-shorts",
  "sourceType": "url",
  "videoUrl": "https://www.youtube.com/watch?v=example123",
  "clipCount": 3,
  "clipDuration": "30-60s",
  "strategy": "viral-hooks",
  "captions": true,
  "captionStyle": "hormozi",
  "aspectRatio": "9:16"
}
```

#### Expected API Response Schema
```json
{
  "success": true,
  "jobId": "1b9a5281-7dc8-410a-9d2a-5799a4c0a521",
  "clipCount": 3,
  "message": "Shorts extraction initiated"
}
```

---

### 4.5 Workflow 5: Micro-Drama

#### UI Panel Specification
- **Page Location**: `app/(app)/create/drama/page.tsx`
- **UI Title**: Micro-Drama (Cinematic Series with Consistent Characters)
- **Controls & Form Elements**:
  - **Dramatic Premise / Script** (`textarea`): Plot summary or full scripted dialogue.
  - **Genre** (`select`): `thriller`, `romance`, `sci-fi`, `mystery`, `action`, `fantasy`.
  - **Character Cast Manager** (`dynamic list`):
    - Character Name (`input`)
    - Visual Character Description (`input` / `textarea` for LoRA / Face prompt consistency)
    - Character Avatar / Reference Image URL (`optional image upload`)
    - Character Assigned Voice (`select`)
  - **Episode Count** (`select`): `1`, `2`, `3` episodes.
  - **Visual Model & Consistency Pipeline** (`select`): `flux-consistent` (Fal Flux Multi-LoRA), `kling-character` (Kling AI).
  - **Aspect Ratio** (`button group`): `9:16` (Vertical Reel Drama), `16:9` (Cinematic Mini-Series).

#### Exact Payload Schema (Frontend -> API)
- **Target Endpoint**: `POST /api/workflows/micro-drama`
```json
{
  "workflow": "micro-drama",
  "script": "Scene 1: Marcus confronts Sarah in the neon-lit alley behind Neo-Kyoto station...",
  "genre": "thriller",
  "characters": [
    {
      "name": "Detective Marcus",
      "description": "45-year-old grizzled cyber-detective with silver hair, cybernetic eye, weathered trench coat",
      "voice": "onyx"
    },
    {
      "name": "Sarah Chen",
      "description": "29-year-old bio-tech researcher with sleek bob haircut, smart glasses, black tactical hoodie",
      "voice": "nova"
    }
  ],
  "episodesCount": 1,
  "aspectRatio": "9:16",
  "consistencyModel": "flux-consistent"
}
```

#### Expected API Response Schema
```json
{
  "success": true,
  "jobId": "9c882104-e349-411a-82dc-304ab7199ecb",
  "charactersCount": 2,
  "message": "Micro-drama production pipeline started"
}
```

---

### 4.6 Workflow 6: Auto Pilot

#### UI Panel Specification
- **Page Location**: `app/(app)/create/auto/page.tsx`
- **UI Title**: Auto Pilot (Hands-Off Autonomous Content Automation)
- **Controls & Form Elements**:
  - **Pipeline Name** (`input`): e.g. "Morning Tech AI Brief", "Nightly Crime Chronicles".
  - **Niche & Topic Sourcing** (`select` / `input`): `trending-rss` (Google News / RSS), `trending-reddit` (Subreddit top posts), `llm-ideation` (Autonomous AI brainstorm).
  - **Schedule & Cadence** (`select`): `daily_8am`, `daily_6pm`, `twice_daily`, `weekly_monday`.
  - **Video Generation Engine** (`select`): `footage` (Pexels/Pixabay), `images` (Flux AI), `ai-videos` (Kling).
  - **Auto-Publishing Target Channels** (`checkboxes`): `youtube` (Shorts), `tiktok`, `instagram` (Reels).
  - **Publishing Mode** (`radio`): `auto-publish-direct` (Fully automatic), `require-approval` (Save as draft in Library first).
  - **Voice Selection** (`select`): `alloy`, `echo`, `nova`, `onyx`.
  - **Status Toggle** (`switch` / `button`): `active` / `paused`.

#### Exact Payload Schema (Frontend -> API)
- **Target Endpoint**: `POST /api/workflows/auto`
```json
{
  "workflow": "auto",
  "pipelineName": "Daily AI News Briefing",
  "niche": "AI & Future Technology",
  "schedule": "daily_8am",
  "sourceStrategy": "trending-rss",
  "visualPipeline": "footage",
  "autoPublish": false,
  "targetPlatforms": ["youtube", "tiktok"],
  "voice": "alloy",
  "status": "active"
}
```

#### Expected API Response Schema
```json
{
  "success": true,
  "jobId": "48b61c92-3c21-4f9e-b98a-928df776e01a",
  "pipelineId": "auto-pipe-1740809700",
  "status": "active",
  "message": "Auto Pilot pipeline configured and initial test run triggered"
}
```

---

## 5. UI-to-Backend Integration Contracts & State Management

### 5.1 Universal Job Submission Lifecycle
```
[User Form Interaction in /create/<workflow>]
           │
           ▼
[Click "Generate Video" / "Start Workflow"]
           │
           ├─► Sets UI state: loading = true, error = ""
           │
           ▼
[HTTP POST /api/workflows/<workflow-slug>]
           │
           ├──► 1. API Route parses & validates payload
           ├──► 2. API Route generates jobId (crypto.randomUUID())
           ├──► 3. API Route immediately inserts initial record in Supabase:
           │        Table: render_jobs
           │        Columns: { id: jobId, status: 'pending', progress: 0, logs: { workflow, ... } }
           ├──► 4. API Route launches async engine task (setTimeout / background queue)
           │
           ▼
[HTTP 200 JSON Response: { success: true, jobId: "...", message: "..." }]
           │
           ▼
[Client Frontend Handler: router.push(`/dashboard?job=${jobId}`)]
           │
           ▼
[Dashboard View fetches Supabase render_jobs & renders Active Progress / Status]
```

### 5.2 Error Handling & Resilience Pattern
1. **Frontend**:
   - Wrap fetch in `try/catch`.
   - On HTTP `!res.ok` or JSON `{ error: string }`, extract error message.
   - Display error in `div.bg-destructive/10.text-destructive`.
   - Reset `loading = false`.
2. **Backend**:
   - If required fields are missing: Return `HTTP 400` with `{ error: "Specific field is required" }`.
   - On unhandled runtime exception: Log error to Supabase `render_jobs` (`status: "failed"`, `error_message: err.message`) and return `HTTP 500`.

### 5.3 Cost-Safe & Mocking Requirement (Kling / Luma / Fal / OpenAI)
In alignment with the project acceptance criteria:
- If `KLING_API_KEY`, `LUMA_API_KEY`, `FAL_API_KEY`, or `OPENAI_API_KEY` are not set in environment variables or Supabase `settings`, backend orchestrators must operate in **Dry-Run / Mock mode**:
  - `lib/engine/video-generator.ts`: Return mock synthetic video scene URLs (`https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/...` or placeholder video assets).
  - `lib/engine/drama-orchestrator.ts`: Return placeholder consistent character scene cards.
  - `lib/engine/shorts-extractor.ts`: Return mock detected viral hooks with start/end timestamps.
  - In all cases, the API route must successfully log a `pending` (and subsequently `completed`) job in Supabase `render_jobs` so frontend submission verification passes 100%.

---

## 6. Comprehensive Summary Table

| Workflow Name | Route Path | API Endpoint | Primary Input Payload Keys | Engine Module Target |
|---|---|---|---|---|
| **AI Videos** | `/create/ai-videos` | `POST /api/workflows/ai-videos` | `script`, `model`, `aspectRatio`, `duration`, `cameraMotion`, `negativePrompt`, `voice` | `lib/engine/video-generator.ts` |
| **Stories** | `/create/stories` | `POST /api/workflows/stories` | `topic`, `storyType`, `partsCount`, `visualStyle`, `voice`, `aspectRatio`, `includeHooks` | `lib/engine/stories-orchestrator.ts` |
| **Bulk Plan** | `/create/bulk` | `POST /api/workflows/bulk-plan` | `niche`, `contentCount`, `cadence`, `visualStyle`, `voice`, `platforms`, `aspectRatio` | `lib/engine/bulk-planner.ts` |
| **Extract Shorts** | `/create/shorts` | `POST /api/workflows/extract-shorts` | `sourceType`, `videoUrl`, `clipCount`, `clipDuration`, `strategy`, `captions`, `captionStyle` | `lib/engine/shorts-extractor.ts` |
| **Micro-Drama** | `/create/drama` | `POST /api/workflows/micro-drama` | `script`, `genre`, `characters`, `episodesCount`, `aspectRatio`, `consistencyModel` | `lib/engine/drama-orchestrator.ts` |
| **Auto Pilot** | `/create/auto` | `POST /api/workflows/auto` | `pipelineName`, `niche`, `schedule`, `sourceStrategy`, `visualPipeline`, `autoPublish`, `targetPlatforms`, `voice`, `status` | `lib/engine/auto-pilot.ts` |

---
