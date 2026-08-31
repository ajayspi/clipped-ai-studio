# Explorer Survey 2: API Routes & Workflows Mapping Report

**Project**: Clipped (Next.js 14 / Next 16 App Router AI Video Creator Studio)  
**Surveyor**: Explorer Survey 2 (API Routes & Workflows Mapping)  
**Date**: 2026-08-29  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_2`  
**Authoritative Request**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\ORIGINAL_REQUEST.md`

---

## 1. Executive Summary & Mapping Scope

This survey conducts a comprehensive investigation of the backend API route architecture, workflow handlers, rendering pipelines, and Supabase database interactions for the Clipped Next.js 14 application.

### Key Objectives
1. Audit all existing API routes under `app/api/*`.
2. Inspect Supabase database integration (`schema.sql`, `lib/db.ts`) with special focus on the `render_jobs` table (columns, status transitions, payload structure).
3. Conduct a gap analysis against the 6 target AI workflows specified in `ORIGINAL_REQUEST.md`.
4. Provide authoritative request/response schemas, validation rules, engine bindings, and database insertion patterns for all 6 target workflow routes:
   - **AI Videos** (`app/api/workflows/ai-videos/route.ts`)
   - **Stories** (`app/api/workflows/stories/route.ts`)
   - **Bulk Plan** (`app/api/workflows/bulk-plan/route.ts`)
   - **Extract Shorts** (`app/api/workflows/extract-shorts/route.ts`)
   - **Micro-Drama** (`app/api/workflows/micro-drama/route.ts`)
   - **Auto Pilot** (`app/api/workflows/auto/route.ts`)

---

## 2. Existing API Routes & Workflow Handlers Audit

The current codebase contains four active API route handlers:

```
app/api/
├── auth/
│   └── [...nextauth]/
│       └── route.ts              # NextAuth v5 authentication handler
├── health/
│   └── route.ts                  # System health & version check endpoint
└── workflows/
    ├── generate/
    │   └── route.ts              # Footage Workflow handler (Stock video matching)
    └── images/
        └── route.ts              # AI Images Workflow handler (Flux AI scene generation)
```

### 2.1 Audit of Existing Routes

#### 1. `POST /api/auth/[...nextauth]` (`app/api/auth/[...nextauth]/route.ts`)
- **Purpose**: Exposes NextAuth.js v5 route handlers (`GET`, `POST`) backed by `lib/auth.ts`.
- **Functionality**: Manages user authentication sessions, OAuth providers, and JWT issuance.

#### 2. `GET /api/health` (`app/api/health/route.ts`)
- **Purpose**: System health monitor.
- **Response**: `{ status: "ok", app: "clipped", version: "0.1.0", timestamp: "..." }`.

#### 3. `POST /api/workflows/generate` (`app/api/workflows/generate/route.ts`)
- **Workflow**: Footage Video Workflow (`/create/footage`).
- **Request Body**:
  ```ts
  {
    workflow?: string; // 'footage'
    script: string;    // Required narration text
    voice?: string;   // Optional TTS voice (default 'alloy')
  }
  ```
- **Handler Mechanism**:
  1. Validates `script` presence. Returns HTTP 400 `{ error: "Script is required" }` if absent.
  2. Generates `const jobId = crypto.randomUUID()`.
  3. Launches async background execution (`setTimeout(..., 0)`):
     - Invokes `videoOrchestrator.generateVideoPlan(script, ['pixabay', 'pexels'])`.
     - Upon completion, inserts job record into Supabase `render_jobs` table.
  4. Returns immediate HTTP 200 JSON `{ success: true, jobId, message: "Job started successfully" }`.

#### 4. `POST /api/workflows/images` (`app/api/workflows/images/route.ts`)
- **Workflow**: AI Images Video Workflow (`/create/images`).
- **Request Body**:
  ```ts
  {
    script: string;       // Required prompt/narration
    style?: string;       // e.g. "cinematic, photorealistic"
    aspectRatio?: string; // "16:9" | "9:16" | "1:1"
    voice?: string;       // TTS voice selection
  }
  ```
- **Handler Mechanism**:
  1. Validates `script`.
  2. Generates `jobId = crypto.randomUUID()`.
  3. Launches async background execution:
     - Calls `sceneMatcher.analyzeScript(script)` to break text into scenes.
     - Calls `imageGenerator.generateForScenes(analysis.scenes, { style, aspectRatio })`.
     - Logs completed/failed status and result payload into Supabase `render_jobs`.
  4. Returns immediate HTTP 200 JSON `{ success: true, jobId, message: "AI Image generation started" }`.

### 2.2 Status of `app/api/render/*`
- Currently, there are no dedicated endpoints under `app/api/render/*`.
- Video generation orchestration in Clipped is handled via dedicated workflow endpoints under `app/api/workflows/*`. These endpoints track their execution lifecycle through the PostgreSQL `render_jobs` table in Supabase.
- If a standalone render status polling endpoint is needed in the future (e.g. `GET /api/render/[id]`), the client can directly query Supabase or use a dedicated route.

---

## 3. Supabase Schema & `render_jobs` Architecture

The database architecture is defined in `schema.sql` and initialized via the Supabase client in `lib/db.ts`.

### 3.1 `render_jobs` Table Schema

```sql
CREATE TABLE render_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    logs TEXT, -- Stores JSON serialized string or JSONB object in PostgreSQL
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 3.2 Columns & Data Types

| Column | PostgreSQL Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `uuid_generate_v4()` | Primary key; matches `jobId` returned to frontend. |
| `video_id` | `UUID` | Yes | `NULL` | Foreign key referencing `videos.id`. Optional during initial generation. |
| `status` | `TEXT` | Yes | `'pending'` | Lifecycle state: `'pending'`, `'processing'`, `'completed'`, `'failed'`. |
| `progress` | `INTEGER` | Yes | `0` | Progress indicator (0 to 100). |
| `error_message` | `TEXT` | Yes | `NULL` | Human-readable error description when status is `'failed'`. |
| `logs` | `TEXT` / `JSON` | Yes | `NULL` | Structured execution payload (scenes, video URLs, analysis, series parts). |
| `started_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp when background engine execution commenced. |
| `completed_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp when job completed or failed. |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Timestamp when job record was created. |

### 3.3 Status Lifecycle State Machine

```
   [Job Request Received]
              │
              ▼
   ┌──────────────────────┐
   │ status: 'pending'    │  <-- Inserted immediately before background execution
   │ progress: 0          │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │ status: 'processing' │  <-- (Optional intermediate state during long tasks)
   │ progress: 10..90     │
   └──────────┬───────────┘
              │
        ┌─────┴──────────────┐
        ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ status:          │  │ status: 'failed' │
│   'completed'    │  │ progress: 0      │
│ progress: 100    │  │ error_message:   │
│ logs: { ... }    │  │   "Error string" │
└──────────────────┘  └──────────────────┘
```

### 3.4 Key Architectural Finding: Immediate `pending` Insertion

**Observation**: In the existing `generate/route.ts` and `images/route.ts`, the database insert was only performed *inside* the background `setTimeout` callback upon completion or failure.  
**Problem**: When the frontend receives `{ success: true, jobId }` and immediately redirects to `/dashboard?job=${jobId}`, the dashboard server component queries `supabase.from('render_jobs').select('*')`. If the background job is still processing, the job record may not exist in the database yet.  
**Requirement & Standard**: All 6 new workflow routes (as well as existing ones) must perform an **immediate synchronous insert** of the `pending` job into `render_jobs` before starting the background process, and then update the record with `status: 'completed'` / `'failed'` when the engine finishes.

```ts
// Standard Insertion Pattern:
const jobId = crypto.randomUUID()

// 1. Immediate Pending Insert
await supabase.from('render_jobs').insert({
  id: jobId,
  video_id: null,
  status: 'pending',
  progress: 0,
  logs: { workflow: 'ai-videos', input: { script, model, ... } },
  started_at: new Date().toISOString()
})

// 2. Async Engine Processing
setTimeout(async () => {
  try {
    const result = await videoGenerator.generate(...)
    await supabase.from('render_jobs').update({
      status: 'completed',
      progress: 100,
      logs: result,
      completed_at: new Date().toISOString()
    }).eq('id', jobId)
  } catch (err: any) {
    await supabase.from('render_jobs').update({
      status: 'failed',
      error_message: err.message,
      completed_at: new Date().toISOString()
    }).eq('id', jobId)
  }
}, 0)
```

---

## 4. Gap Analysis & Endpoint Specifications for 6 Target Workflows

The following table summarizes the implementation status of all 8 workflows in Clipped:

| Workflow | UI Route | API Endpoint | Engine Module | Status |
|---|---|---|---|---|
| **Footage Video** | `/create/footage` | `POST /api/workflows/generate` | `lib/engine/orchestrator.ts` | **Existing** |
| **AI Images** | `/create/images` | `POST /api/workflows/images` | `lib/engine/image-generator.ts` | **Existing** |
| **1. AI Videos** | `/create/ai-videos` | `POST /api/workflows/ai-videos` | `lib/engine/video-generator.ts` | **Missing (Target 1)** |
| **2. Stories** | `/create/stories` | `POST /api/workflows/stories` | `lib/engine/stories-orchestrator.ts` | **Missing (Target 2)** |
| **3. Bulk Plan** | `/create/bulk` | `POST /api/workflows/bulk-plan` | `lib/engine/bulk-planner.ts` | **Missing (Target 3)** |
| **4. Extract Shorts** | `/create/shorts` | `POST /api/workflows/extract-shorts` | `lib/engine/shorts-extractor.ts` | **Missing (Target 4)** |
| **5. Micro-Drama** | `/create/drama` | `POST /api/workflows/micro-drama` | `lib/engine/drama-orchestrator.ts` | **Missing (Target 5)** |
| **6. Auto Pilot** | `/create/auto` | `POST /api/workflows/auto` | `lib/engine/auto-pilot.ts` | **Missing (Target 6)** |

---

## 5. Detailed Specifications for the 6 Target API Endpoints

### 5.1 Route 1: AI Videos (`app/api/workflows/ai-videos/route.ts`)

#### Endpoint Summary
- **HTTP Method**: `POST`
- **Path**: `/api/workflows/ai-videos`
- **Engine Dependency**: `lib/engine/video-generator.ts` (`videoGenerator`)

#### Request Schema (TypeScript & JSON)
```ts
export interface AIVideosRequest {
  workflow?: "ai-videos";
  script: string;                   // Narration or prompt for AI video generation (Required)
  model?: "kling-v1" | "luma-dream-machine" | "veo-2" | "minimax"; // Default: "kling-v1"
  aspectRatio?: "16:9" | "9:16" | "1:1";                            // Default: "9:16"
  duration?: number;                // Duration per scene in seconds (5 or 10, default: 5)
  cameraMotion?: "dynamic" | "static" | "pan_left" | "pan_right" | "zoom_in" | "zoom_out"; // Default: "dynamic"
  negativePrompt?: string;          // Exclusion prompt
  voice?: string;                   // TTS voice (default: "alloy")
}
```

```json
{
  "workflow": "ai-videos",
  "script": "A cybernetic falcon soaring over a neon Tokyo skyline at midnight, rain splashing on glass skyscrapers.",
  "model": "kling-v1",
  "aspectRatio": "9:16",
  "duration": 5,
  "cameraMotion": "zoom_in",
  "negativePrompt": "blurry, low quality, watermark",
  "voice": "onyx"
}
```

#### Validation & Error Handling
- Validate `script` is non-empty string. Return `400` `{ error: "Script is required" }` if missing.
- Validate `aspectRatio` is one of `'16:9' | '9:16' | '1:1'`.

#### Response Schema
- **Success (HTTP 200)**:
  ```json
  {
    "success": true,
    "jobId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "message": "AI Video generation started successfully"
  }
  ```
- **Failure (HTTP 500)**:
  ```json
  {
    "error": "Failed to trigger AI video workflow"
  }
  ```

#### Database Payload (`render_jobs.logs`)
```json
{
  "workflow": "ai-videos",
  "model": "kling-v1",
  "aspectRatio": "9:16",
  "scenes": [
    {
      "id": "scene-0",
      "text": "A cybernetic falcon soaring over a neon Tokyo skyline at midnight...",
      "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "duration": 5
    }
  ]
}
```

---

### 5.2 Route 2: Stories Generator (`app/api/workflows/stories/route.ts`)

#### Endpoint Summary
- **HTTP Method**: `POST`
- **Path**: `/api/workflows/stories`
- **Engine Dependency**: `lib/engine/stories-orchestrator.ts` (`storiesOrchestrator`)

#### Request Schema (TypeScript & JSON)
```ts
export interface StoriesRequest {
  workflow?: "stories";
  topic: string;                    // Topic or story premise (Required)
  storyType?: "reddit-story" | "historical-mystery" | "urban-legend" | "motivational" | "sci-fi-twist"; // Default: "reddit-story"
  partsCount?: number;              // Number of episodes/parts (1-5, default: 3)
  visualStyle?: "footage" | "ai-images" | "ai-videos"; // Default: "ai-images"
  voice?: string;                   // Narrator voice (default: "onyx")
  aspectRatio?: "9:16" | "16:9";    // Default: "9:16"
  includeHooks?: boolean;           // Cliffhangers between parts (default: true)
}
```

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

#### Validation & Error Handling
- Validate `topic` is provided. Return `400` `{ error: "Story topic is required" }`.
- Bound `partsCount` between 1 and 5.

#### Response Schema
- **Success (HTTP 200)**:
  ```json
  {
    "success": true,
    "jobId": "7d9b2384-245b-481d-8422-4916a4a2b901",
    "seriesId": "story-series-1740809700",
    "partsCount": 3,
    "message": "Story series generation queued"
  }
  ```

#### Database Payload (`render_jobs.logs`)
```json
{
  "workflow": "stories",
  "topic": "The bizarre unsolved disappearance of the Flannan Isles lighthouse keepers",
  "storyType": "historical-mystery",
  "series": [
    {
      "part": 1,
      "title": "Part 1: The Abandoned Rock",
      "script": "...",
      "hook": "Wait until you hear what the logbook said...",
      "scenes": [...]
    },
    {
      "part": 2,
      "title": "Part 2: The Final Entry",
      "script": "...",
      "hook": "Follow for the shocking conclusion in Part 3!",
      "scenes": [...]
    },
    {
      "part": 3,
      "title": "Part 3: The Ghost Island",
      "script": "...",
      "scenes": [...]
    }
  ]
}
```

---

### 5.3 Route 3: Bulk Planner (`app/api/workflows/bulk-plan/route.ts`)

#### Endpoint Summary
- **HTTP Method**: `POST`
- **Path**: `/api/workflows/bulk-plan`
- **Engine Dependency**: `lib/engine/bulk-planner.ts` (`bulkPlanner`)

#### Request Schema (TypeScript & JSON)
```ts
export interface BulkPlanRequest {
  workflow?: "bulk-plan";
  niche: string;                    // Niche/category prompt (Required)
  contentCount?: number;            // Number of videos: 7 (1 wk), 14 (2 wks), 30 (1 mo) (Default: 7)
  cadence?: "daily" | "twice-daily" | "weekdays-only"; // Default: "daily"
  visualStyle?: "footage" | "images" | "ai-videos";    // Default: "footage"
  voice?: string;                   // Narrator voice (default: "alloy")
  platforms?: Array<"youtube" | "tiktok" | "instagram">; // Target platforms
  aspectRatio?: "9:16" | "16:9" | "1:1";               // Default: "9:16"
}
```

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

#### Validation & Error Handling
- Validate `niche` is provided. Return `400` `{ error: "Niche is required" }`.
- Validate `contentCount` (must be > 0 and <= 30).

#### Response Schema
- **Success (HTTP 200)**:
  ```json
  {
    "success": true,
    "jobId": "5fa23bc0-21a4-4f28-a309-8bb4e1329c04",
    "planId": "bulk-plan-1740809700",
    "totalVideos": 7,
    "message": "Bulk plan batch created and queued for rendering"
  }
  ```

#### Database Payload (`render_jobs.logs`)
```json
{
  "workflow": "bulk-plan",
  "niche": "Stoic Wisdom & Daily Mental Models",
  "totalVideos": 7,
  "calendar": [
    {
      "day": 1,
      "title": "Control What You Can",
      "hook": "Epictetus once said...",
      "script": "...",
      "keywords": ["ancient rome", "stoic statue", "peaceful mind"],
      "scheduledDate": "2026-08-30T08:00:00Z"
    }
  ]
}
```

---

### 5.4 Route 4: Extract Shorts (`app/api/workflows/extract-shorts/route.ts`)

#### Endpoint Summary
- **HTTP Method**: `POST`
- **Path**: `/api/workflows/extract-shorts`
- **Engine Dependency**: `lib/engine/shorts-extractor.ts` (`shortsExtractor`)

#### Request Schema (TypeScript & JSON)
```ts
export interface ExtractShortsRequest {
  workflow?: "extract-shorts";
  sourceType?: "url" | "upload";    // Default: "url"
  videoUrl?: string;                // Long-form video URL (Required if sourceType === 'url')
  clipCount?: number;               // Number of shorts to extract (1-10, default: 3)
  clipDuration?: "<30s" | "30-60s" | "60-90s"; // Target duration (default: "30-60s")
  strategy?: "viral-hooks" | "key-takeaways" | "humor-reactions"; // Extraction focus
  captions?: boolean;               // Generate burned-in captions (default: true)
  captionStyle?: "hormozi" | "minimal" | "yellow-pop"; // Subtitle styling
  aspectRatio?: "9:16" | "1:1";     // Default: "9:16"
}
```

```json
{
  "workflow": "extract-shorts",
  "sourceType": "url",
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "clipCount": 3,
  "clipDuration": "30-60s",
  "strategy": "viral-hooks",
  "captions": true,
  "captionStyle": "hormozi",
  "aspectRatio": "9:16"
}
```

#### Validation & Error Handling
- If `sourceType === 'url'`, validate `videoUrl` is valid URL. Return `400` `{ error: "Valid video URL is required" }`.
- Bound `clipCount` between 1 and 10.

#### Response Schema
- **Success (HTTP 200)**:
  ```json
  {
    "success": true,
    "jobId": "1b9a5281-7dc8-410a-9d2a-5799a4c0a521",
    "clipCount": 3,
    "message": "Shorts extraction initiated"
  }
  ```

#### Database Payload (`render_jobs.logs`)
```json
{
  "workflow": "extract-shorts",
  "sourceUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "extractedClips": [
    {
      "id": "clip-1",
      "startTime": 42.5,
      "endTime": 87.2,
      "viralityScore": 94,
      "hookTitle": "The Secret Formula Nobody Talks About",
      "summary": "Key insight at timestamp 0:42",
      "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
    }
  ]
}
```

---

### 5.5 Route 5: Micro-Drama (`app/api/workflows/micro-drama/route.ts`)

#### Endpoint Summary
- **HTTP Method**: `POST`
- **Path**: `/api/workflows/micro-drama`
- **Engine Dependency**: `lib/engine/drama-orchestrator.ts` (`dramaOrchestrator`)

#### Request Schema (TypeScript & JSON)
```ts
export interface DramaCharacter {
  name: string;                     // Character identifier (e.g. "Detective Marcus")
  description: string;              // Appearance / LoRA / face prompt description
  voice?: string;                   // Character voice ID
  avatarUrl?: string;               // Optional reference portrait URL
}

export interface MicroDramaRequest {
  workflow?: "micro-drama";
  script: string;                   // Plot outline or multi-character dialogue script (Required)
  genre?: "thriller" | "romance" | "sci-fi" | "mystery" | "action" | "fantasy"; // Default: "thriller"
  characters?: DramaCharacter[];    // Character cast specifications
  episodesCount?: number;           // Number of mini-episodes (default: 1)
  aspectRatio?: "9:16" | "16:9";    // Default: "9:16"
  consistencyModel?: "flux-consistent" | "kling-character"; // Consistency pipeline (default: "flux-consistent")
}
```

```json
{
  "workflow": "micro-drama",
  "script": "Marcus: 'Did you think I wouldn't trace the transmission?' Sarah: 'I was hoping you would.'",
  "genre": "thriller",
  "characters": [
    {
      "name": "Marcus",
      "description": "45yo cybernetic detective with grey hair and cybernetic left eye",
      "voice": "onyx"
    },
    {
      "name": "Sarah",
      "description": "29yo biotech scientist with dark bob haircut and neon glasses",
      "voice": "nova"
    }
  ],
  "episodesCount": 1,
  "aspectRatio": "9:16",
  "consistencyModel": "flux-consistent"
}
```

#### Validation & Error Handling
- Validate `script` is present. Return `400` `{ error: "Drama script or outline is required" }`.
- Validate `characters` array if provided.

#### Response Schema
- **Success (HTTP 200)**:
  ```json
  {
    "success": true,
    "jobId": "9c882104-e349-411a-82dc-304ab7199ecb",
    "charactersCount": 2,
    "message": "Micro-drama production pipeline started"
  }
  ```

#### Database Payload (`render_jobs.logs`)
```json
{
  "workflow": "micro-drama",
  "genre": "thriller",
  "characters": [...],
  "scenes": [
    {
      "sceneId": "scene-1",
      "speaker": "Marcus",
      "line": "Did you think I wouldn't trace the transmission?",
      "visualPrompt": "Marcus, 45yo cybernetic detective with grey hair..., speaking sternly in rainy alley",
      "assetUrl": "https://image.pollinations.ai/prompt/...",
      "voice": "onyx"
    }
  ]
}
```

---

### 5.6 Route 6: Auto Pilot (`app/api/workflows/auto/route.ts`)

#### Endpoint Summary
- **HTTP Method**: `POST`
- **Path**: `/api/workflows/auto`
- **Engine Dependency**: `lib/engine/auto-pilot.ts` (`autoPilotEngine`)

#### Request Schema (TypeScript & JSON)
```ts
export interface AutoPilotRequest {
  workflow?: "auto";
  pipelineName: string;             // Name for the automation schedule (Required)
  niche: string;                    // Topic/niche focus (Required)
  schedule?: "daily_8am" | "daily_6pm" | "twice_daily" | "weekly_monday"; // Default: "daily_8am"
  sourceStrategy?: "trending-rss" | "trending-reddit" | "llm-ideation";    // Default: "trending-rss"
  visualPipeline?: "footage" | "images" | "ai-videos";                    // Default: "footage"
  autoPublish?: boolean;            // Automatically publish or save to library (Default: false)
  targetPlatforms?: Array<"youtube" | "tiktok" | "instagram">;
  voice?: string;                   // Default: "alloy"
  status?: "active" | "paused";     // Initial state (Default: "active")
}
```

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

#### Validation & Error Handling
- Validate `pipelineName` and `niche` are provided. Return `400` `{ error: "Pipeline name and niche are required" }`.

#### Response Schema
- **Success (HTTP 200)**:
  ```json
  {
    "success": true,
    "jobId": "48b61c92-3c21-4f9e-b98a-928df776e01a",
    "pipelineId": "auto-pipe-1740809700",
    "status": "active",
    "message": "Auto Pilot pipeline configured and initial test run triggered"
  }
  ```

#### Database Payload (`render_jobs.logs`)
```json
{
  "workflow": "auto",
  "pipelineId": "auto-pipe-1740809700",
  "pipelineName": "Daily AI News Briefing",
  "schedule": "daily_8am",
  "status": "active",
  "firstRun": {
    "topic": "Latest Breakthroughs in Generative AI",
    "script": "...",
    "scenes": [...]
  }
}
```

---

## 6. Cost-Safe & Mocking Verification Protocol

To satisfy project acceptance criteria:
- Each engine orchestrator (`video-generator.ts`, `drama-orchestrator.ts`, `shorts-extractor.ts`, etc.) must inspect environment keys (`KLING_API_KEY`, `LUMA_API_KEY`, `FAL_API_KEY`, `OPENAI_API_KEY`) or Supabase `settings` table.
- When premium keys are missing or invalid, the backend must seamlessly operate in **Dry-Run / Mock mode**:
  1. Generate valid mock scene/clip structures with public placeholder assets (e.g. Google Big Buck Bunny / sample MP4s, Pollinations / Placeholder images).
  2. Perform realistic latency simulation (e.g. 100ms - 500ms).
  3. Ensure Supabase `render_jobs` records are inserted with `status: 'pending'`, then transitioned to `status: 'completed'` with structured JSON in `logs`.
  4. Ensure HTTP 200 JSON with `{ success: true, jobId }` is returned to the client.

---

## 7. Next Steps & Implementation Roadmap

1. **Engine Orchestrators**:
   - `lib/engine/video-generator.ts` (Kling / Luma AI synthetic video engine)
   - `lib/engine/stories-orchestrator.ts` (Multi-part cliffhanger shorts engine)
   - `lib/engine/bulk-planner.ts` (Batch content calendar generation engine)
   - `lib/engine/shorts-extractor.ts` (Hook detection and slicing engine)
   - `lib/engine/drama-orchestrator.ts` (Consistent character micro-drama engine)
   - `lib/engine/auto-pilot.ts` (Autonomous sourcing and scheduling engine)
2. **API Routes**:
   - Create `app/api/workflows/ai-videos/route.ts`
   - Create `app/api/workflows/stories/route.ts`
   - Create `app/api/workflows/bulk-plan/route.ts`
   - Create `app/api/workflows/extract-shorts/route.ts`
   - Create `app/api/workflows/micro-drama/route.ts`
   - Create `app/api/workflows/auto/route.ts`
3. **UI Panel Upgrades**:
   - Wire form submissions from `app/(app)/create/*` to their respective API routes with standard loading/error handling and redirect to `/dashboard?job=${jobId}`.
