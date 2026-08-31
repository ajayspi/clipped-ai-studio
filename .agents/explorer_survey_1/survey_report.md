# Clipped Engine Architecture & Workflow Survey Report

**Explorer**: Survey 1 (Architecture & Existing Patterns)  
**Date**: 2026-08-29  
**Repository**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`  
**Target Next.js Version**: Next.js 14 / 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4  

---

## 1. Executive Summary

Clipped is an open-source AI video creation studio designed around 8 specialized video generation workflows. The application is structured as a Next.js App Router project leveraging Supabase PostgreSQL for persistence and NextAuth.js v5 for authentication.

Currently, two initial workflows have baseline implementations:
1. **Footage Workflow**: Matches narration scripts to stock video clips via OpenAI LLM analysis (`sceneMatcher`) and Pexels/Pixabay APIs (`videoSourcer`), orchestrated in `lib/engine/orchestrator.ts` and exposed via `/api/workflows/generate`.
2. **AI Images Workflow**: Converts narration scripts into visual prompts, generates images via Fal.ai Flux Dev/Schnell API (`imageGenerator`), and stores the scene plan in Supabase via `/api/workflows/images`.

The remaining 6 workflows require complete backend engine modules, API route handlers, database persistence, and UI integration:
1. **AI Videos** (Pure synthetic video generation via Kling / Luma / Fal)
2. **Stories Generator** (Multi-part viral narrative shorts series)
3. **Bulk Planner** (30-day niche content generation calendar & batch scripts)
4. **Extract Shorts** (Long-form video transcript slicing & viral hook identification)
5. **Micro-Drama** (Multi-episode mini-series with consistent characters & visual cues)
6. **Auto Pilot** (Hands-off pipeline from niche trend to ready-to-publish queue)

---

## 2. Codebase Structure & Architectural Overview

The repository follows Next.js App Router conventions:

```
clipped/
├── app/
│   ├── (app)/                          # Authenticated application shell
│   │   ├── create/                     # 8 Workflow creation interfaces
│   │   │   ├── ai-videos/page.tsx      # (Placeholder UI)
│   │   │   ├── auto/page.tsx           # (Placeholder UI)
│   │   │   ├── bulk/page.tsx           # (Placeholder UI)
│   │   │   ├── drama/page.tsx          # (Placeholder UI)
│   │   │   ├── footage/page.tsx        # Fully functional Footage UI
│   │   │   ├── images/page.tsx         # Fully functional AI Images UI
│   │   │   ├── shorts/page.tsx         # (Placeholder UI)
│   │   │   ├── stories/page.tsx        # (Placeholder UI)
│   │   │   └── page.tsx                # Create Hub grid with 8 workflow cards
│   │   ├── dashboard/page.tsx          # Job activity and system stats
│   │   ├── library/page.tsx            # Generated video library
│   │   ├── settings/page.tsx           # API key management UI (5 provider categories)
│   │   └── layout.tsx                  # App layout with Sidebar and ThemeToggle
│   ├── (auth)/                         # Auth routes (login, register)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts # NextAuth handler
│   │   ├── health/route.ts             # Health check endpoint
│   │   └── workflows/
│   │       ├── generate/route.ts       # Footage workflow POST endpoint
│   │       └── images/route.ts         # AI Images workflow POST endpoint
│   ├── globals.css                     # Tailwind v4 theme definitions
│   └── layout.tsx                      # Root layout with ThemeProvider
├── components/
│   ├── sidebar.tsx                     # Navigation sidebar
│   ├── theme-provider.tsx              # next-themes wrapper
│   ├── theme-toggle.tsx                # Dark/light mode switcher
│   └── ui/                             # shadcn-style UI components
├── lib/
│   ├── auth.ts                         # NextAuth v5 credentials provider
│   ├── db.ts                           # Supabase client initialization
│   ├── store.ts                        # Zustand client state store
│   ├── utils.ts                        # cn() helper (clsx + tailwind-merge)
│   └── engine/                         # Core video processing engines
│       ├── types.ts                    # TypeScript data models
│       ├── orchestrator.ts             # Stock footage orchestrator
│       ├── scene-matcher.ts            # OpenAI script parser & scene splitter
│       ├── image-generator.ts          # Fal.ai Flux image generator
│       └── video-sourcer.ts            # Pexels & Pixabay stock searcher
├── docker-compose.yml                  # Local PostgreSQL 15 & web runner
├── schema.sql                          # Supabase PostgreSQL schema definition
└── package.json                        # Project dependencies
```

---

## 3. Existing Engine Architecture (`lib/engine/*`)

The existing engine files establish a clear design pattern: **Singleton classes with pure async methods**, relying on standard HTTP `fetch` without heavy SDK wrappers.

### 3.1. `lib/engine/types.ts`
Defines the foundational interfaces:
- `Video`: Represents a video asset (or static image asset) with fields `id`, `url`, `title`, `platform` (`'pixabay' | 'pexels' | 'unsplash' | 'coverr' | 'mixkit' | 'videvo' | 'openverse'`), `thumbnail`, `duration`, `width`, `height`.
- `Scene`: Represents an individual video cut containing `id`, `text` (spoken words), `keywords` (stock search tags), `description` (visual scene prompt), `duration` (seconds), `emotion`, and `selectedVideo?: Video`.
- `ScriptAnalysis`: Container for `script`, `scenes: Scene[]`, and `totalDuration: number`.
- `VideoMatch`: Scoring structure pairing a `Video` with a `score` and `reason`.
- `GenerationRequest` & `GenerationResponse`: Standard request payload and pipeline execution response.

### 3.2. `lib/engine/orchestrator.ts` (`VideoOrchestrator`)
- **Class Pattern**: Exported class `VideoOrchestrator` and singleton instance `videoOrchestrator`.
- **Method**: `generateVideoPlan(script: string, platforms: string[]): Promise<GenerationResponse>`.
- **Execution Flow**:
  1. Generates unique execution ID `gen-${Date.now()}`.
  2. Calls `sceneMatcher.analyzeScript(script)` to break down narration into scenes.
  3. Iterates over each scene, calling `videoSourcer.searchForKeywords(scene.keywords, platforms)`.
  4. Assigns the best matching video to `scene.selectedVideo` and appends to `videoMatches`.
  5. Returns structured `GenerationResponse` with status `'completed'` or catches errors and returns `'failed'`.

### 3.3. `lib/engine/scene-matcher.ts` (`SceneMatcher`)
- **Class Pattern**: Exported class `SceneMatcher` and singleton instance `sceneMatcher`.
- **Method**: `analyzeScript(script: string): Promise<ScriptAnalysis>`.
- **Chunking Logic**: Implements `splitIntoPasses(script)` using a threshold of 350 words per pass to handle long-form scripts cleanly within token limits.
- **LLM Integration**: Calls OpenAI Chat Completions API (`gpt-4o-mini`) using `response_format: { type: "json_object" }` and structured system prompts enforcing strict JSON output.
- **Parsing**: Validates JSON scenes, defaults missing durations to 4 seconds, and aggregates `totalDuration`.

### 3.4. `lib/engine/image-generator.ts` (`ImageGenerator`)
- **Class Pattern**: Exported class `ImageGenerator` and singleton instance `imageGenerator`.
- **Options**: `ImageGenerationOptions` (`model: 'flux-dev' | 'flux-schnell' | 'sdxl'`, `aspectRatio: '16:9' | '9:16' | '1:1'`, `style?: string`, `seed?: number`).
- **Method**: `generateForScenes(scenes: Scene[], options: ImageGenerationOptions): Promise<Scene[]>`.
- **API Target**: Calls Fal.ai Flux endpoint `https://fal.run/fal-ai/${model}` with authorization header `Key ${apiKey}`.
- **Cost-Safe Fallback**: If `process.env.FAL_API_KEY` is missing, intercepts the call and maps each scene to `https://image.pollinations.ai/prompt/${encodeURIComponent(scene.description)}?width=1024&height=1024&nologo=true` with platform `'openverse'`.
- **Fault Tolerance**: If an individual image API call fails, catches the error and attaches a fallback placeholder image (`https://placehold.co/1920x1080/2a2a2a/ffffff.png?text=Generation+Failed`).

### 3.5. `lib/engine/video-sourcer.ts` (`VideoSourcer`)
- **Class Pattern**: Exported class `VideoSourcer` and singleton instance `videoSourcer`.
- **APIs**: Integrates Pexels API (`PEXELS_API_KEY`) and Pixabay API (`PIXABAY_API_KEY`).
- **Resilience**: If keys are missing or API responses fail, silently returns `[]` without crashing the parent orchestrator. Deduplicates video IDs using a `Set`.

---

## 4. Supabase Database Schema & Client Integration

### 4.1. Client Initialization (`lib/db.ts`)
```ts
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 4.2. Database Schema (`schema.sql`)
The PostgreSQL schema provides 6 primary tables:
1. `users`: `id UUID PK`, `email TEXT UNIQUE`, `name TEXT`, `tier TEXT` ('free'/'pro'), `niches TEXT[]`, `storage_preference TEXT`, `created_at`.
2. `videos`: `id UUID PK`, `user_id UUID FK`, `title TEXT`, `script TEXT`, `workflow TEXT`, `status TEXT` ('draft'/'rendering'/'ready'/'published'), `view_count INTEGER`, `created_at`, `updated_at`.
3. `render_jobs`: `id UUID PK`, `video_id UUID FK NULLABLE`, `status TEXT` ('pending'/'processing'/'completed'/'failed'), `progress INTEGER` (0-100), `error_message TEXT`, `logs TEXT` (or JSON string/object), `started_at`, `completed_at`, `created_at`.
4. `api_credits`: `id UUID PK`, `user_id UUID FK`, `provider TEXT`, `free_quota INTEGER`, `used_this_month INTEGER`, `created_at`, `updated_at`.
5. `published_videos`: `id UUID PK`, `video_id UUID FK`, `platform TEXT` ('youtube'/'tiktok'/'instagram'), `platform_id TEXT`, `url TEXT`, `view_count INTEGER`, `published_at`.
6. `settings`: `id UUID PK`, `user_id UUID FK`, `provider TEXT`, `api_key TEXT`, `is_active BOOLEAN`, `priority INTEGER`, `created_at`, `updated_at`, `UNIQUE(user_id, provider)`.

### 4.3. Job Lifecycle & Storage Pattern
1. **API Route Trigger**:
   - Accepts request payload (e.g. `{ script, style, aspectRatio, voice, ... }`).
   - Generates `const jobId = crypto.randomUUID()`.
   - Fires background worker execution via `setTimeout(async () => { ... }, 0)`.
   - Returns immediate 200 HTTP response `{ success: true, jobId, message: "..." }`.
2. **Background Execution**:
   - Executes engine orchestration.
   - Inserts or updates row in `render_jobs`:
     ```ts
     await supabase.from('render_jobs').insert({
       id: jobId,
       video_id: null,
       status: 'completed', // or 'failed'
       progress: 100,
       logs: { workflow: '...', ...resultData },
       error_message: error ? error.message : null
     });
     ```
3. **Frontend Polling & Dashboard**:
   - UI redirects user to `/dashboard?job=${jobId}`.
   - Dashboard queries `supabase.from('render_jobs').select('*').order('created_at', { ascending: false }).limit(5)` and displays live progress, statuses, and output summary.

---

## 5. Video Generation & AI Service Integration Patterns

### 5.1. Direct Fetch vs External SDKs
The project consciously avoids heavyweight vendor SDKs (such as official OpenAI, Fal, or Replicate SDKs) in favor of standard Node.js/Next.js `fetch` requests with standard headers (`Authorization: Bearer ...` or `Key ...`). This minimizes build bundle size, ensures compatibility with Next.js Turbopack, and allows simple mock interception.

### 5.2. Video Generation Provider Targets
| Provider | Supported Workflow | Endpoint Pattern | Auth Header | Cost-Safe Fallback |
|---|---|---|---|---|
| **Kling AI** | AI Videos, Micro-Drama | `https://api.klingai.com/v1/videos/text2video` | `Authorization: Bearer ${KLING_API_KEY}` | High-quality stock clip / Pollinations animation URL / placeholder clip |
| **Luma Dream Machine** | AI Videos | `https://api.lumalabs.ai/dream-machine/v1/generations` | `Authorization: Bearer ${LUMA_API_KEY}` | High-quality stock clip / placeholder clip |
| **Fal.ai** | AI Images, AI Videos | `https://fal.run/fal-ai/flux-schnell`, `fal-ai/kling-video` | `Authorization: Key ${FAL_API_KEY}` | Pollinations.ai generative images |
| **OpenAI / OpenRouter** | Script Analysis, Drama, Bulk, Shorts | `https://api.openai.com/v1/chat/completions` or `https://openrouter.ai/api/v1/chat/completions` | `Authorization: Bearer ${KEY}` | Built-in rule-based heuristics & mock scene generators |
| **Pexels & Pixabay** | Stock Footage, Stories, Auto | REST search endpoints | `Authorization: ${KEY}` / `?key=${KEY}` | Curated fallback royalty-free clip list |

---

## 6. Error Handling, Resilience & Cost-Safe Mock/Dry-Run Patterns

### 6.1. Cost-Safe Mode Strategy
To allow thorough testing and demonstration without burning expensive API credits (or failing when external keys are not yet configured in `.env.local`), all engine modules must implement a **transparent dry-run fallback**:
1. Check for API key (e.g. `process.env.KLING_API_KEY`, `process.env.LUMA_API_KEY`, `process.env.OPENAI_API_KEY`).
2. If absent:
   - Log a descriptive console notice (e.g. `[VideoGenerator] KLING_API_KEY not found. Running in Cost-Safe Mock Mode.`).
   - Generate realistic mock outputs matching exact production schemas (mock video URLs with real durations, thumbnails, valid scene metadata).
3. If present:
   - Execute actual API call with try/catch.
   - On upstream network/API failure (rate limits, 500s), degrade gracefully to fallback assets rather than unhandled rejections.

---

## 7. Technical Specifications for the 6 Workflows

### 7.1. Workflow 1: AI Videos (`lib/engine/video-generator.ts` & `app/api/workflows/ai-videos/route.ts`)
- **Objective**: Generate synthetic video scenes using AI video generation models (Kling, Luma, Fal).
- **Engine Module**: `lib/engine/video-generator.ts` (`VideoGenerator` class).
  - Method: `generateVideoScenes(scenes: Scene[], options: VideoGenerationOptions): Promise<Scene[]>`.
  - Parameters: `model?: 'kling-1.5' | 'luma-dream' | 'flux-anim', aspectRatio?: '16:9' | '9:16' | '1:1', durationPerScene?: number`.
  - Dry-Run Logic: Returns working mock video URLs (e.g. reliable MP4 video streams / animated visuals) with scene titles and metadata.
- **API Route**: `app/api/workflows/ai-videos/route.ts` (POST).
  - Body: `{ script: string, model?: string, aspectRatio?: string, voice?: string }`.
  - Steps: Calls `sceneMatcher.analyzeScript` -> `videoGenerator.generateVideoScenes` -> Saves job to Supabase `render_jobs`.
- **UI Page**: `app/(app)/create/ai-videos/page.tsx`.
  - Interactive form with script input, model selector (Kling 1.5, Luma Dream Machine), aspect ratio toggles (16:9, 9:16, 1:1), and submit action redirecting to `/dashboard?job=${jobId}`.

### 7.2. Workflow 2: Stories Generator (`lib/engine/stories-orchestrator.ts` & `app/api/workflows/stories/route.ts`)
- **Objective**: Turn a single prompt or topic into a multi-part narrative series (e.g. 3-part viral mystery, history, or fiction story).
- **Engine Module**: `lib/engine/stories-orchestrator.ts` (`StoriesOrchestrator` class).
  - Method: `generateMultiPartStory(topic: string, partsCount: number, tone?: string): Promise<StorySeries>`.
  - Logic: Generates `partsCount` scripts connected by cliffhangers, breaks each part into scenes, sources/generates visuals for each part.
- **API Route**: `app/api/workflows/stories/route.ts` (POST).
  - Body: `{ topic: string, parts: number, tone?: string, visualStyle?: 'footage' | 'images' }`.
  - Inserts multi-part series job into `render_jobs`.
- **UI Page**: `app/(app)/create/stories/page.tsx`.
  - Topic prompt input, parts selector (2, 3, 5 parts), tone selector (Suspense, Educational, Inspirational, Comedy), visual mode toggle.

### 7.3. Workflow 3: Bulk Planner (`lib/engine/bulk-planner.ts` & `app/api/workflows/bulk/route.ts`)
- **Objective**: Generate 30 days (or batch of N) of structured video ideas, scripts, and production plans for a specific creator niche.
- **Engine Module**: `lib/engine/bulk-planner.ts` (`BulkPlanner` class).
  - Method: `generateContentCalendar(niche: string, targetAudience: string, daysCount: number): Promise<ContentCalendarPlan>`.
  - Output: Array of daily items: `{ day: number, title: string, hook: string, script: string, hashtags: string[], visualStyle: string }`.
- **API Route**: `app/api/workflows/bulk/route.ts` (POST).
  - Body: `{ niche: string, targetAudience: string, daysCount: number }`.
  - Inserts batch plan job into `render_jobs`.
- **UI Page**: `app/(app)/create/bulk/page.tsx`.
  - Niche input / suggestions (Tech, Finance, Motivation, Fitness, Gaming), Target Audience, Days Count slider/dropdown (7, 14, 30 days), Generate Plan button.

### 7.4. Workflow 4: Extract Shorts (`lib/engine/shorts-extractor.ts` & `app/api/workflows/shorts/route.ts`)
- **Objective**: Analyze long-form video transcript or text, identify high-virality moments/hooks, and extract timestamped short clips.
- **Engine Module**: `lib/engine/shorts-extractor.ts` (`ShortsExtractor` class).
  - Method: `extractShorts(input: { transcript?: string, videoUrl?: string, clipCount?: number, targetDuration?: number }): Promise<ExtractedShortsResult>`.
  - Output: List of clips: `{ clipId: string, title: string, hook: string, startTime: number, endTime: number, viralityScore: number, transcript: string, rationale: string }`.
- **API Route**: `app/api/workflows/shorts/route.ts` (POST).
  - Body: `{ transcript?: string, videoUrl?: string, clipCount?: number }`.
  - Inserts extracted clips job into `render_jobs`.
- **UI Page**: `app/(app)/create/shorts/page.tsx`.
  - Video URL or Raw Transcript textarea, Target Short Count (3, 5, 10), Minimum Virality Threshold, Extract Shorts button.

### 7.5. Workflow 5: Micro-Drama (`lib/engine/drama-orchestrator.ts` & `app/api/workflows/drama/route.ts`)
- **Objective**: Cinematic mini-series generation featuring character consistency across episodes and cliffhanger pacing.
- **Engine Module**: `lib/engine/drama-orchestrator.ts` (`DramaOrchestrator` class).
  - Method: `generateDramaSeries(title: string, characters: DramaCharacter[], episodesCount: number, premise: string): Promise<DramaSeriesResult>`.
  - Logic: Builds persistent character appearance prompts (e.g. `[Character: Marcus, 30s detective with trenchcoat and scar]`), structures episodic scripts, and attaches character-consistent visual scene prompts.
- **API Route**: `app/api/workflows/drama/route.ts` (POST).
  - Body: `{ title: string, premise: string, characters: DramaCharacter[], episodes: number }`.
  - Inserts drama series job into `render_jobs`.
- **UI Page**: `app/(app)/create/drama/page.tsx`.
  - Series Title & Premise inputs, Character Builder (Name, Role, Visual Description, Upload Reference), Episode Count, Generate Series button.

### 7.6. Workflow 6: Auto Pilot (`lib/engine/autopilot.ts` & `app/api/workflows/auto/route.ts`)
- **Objective**: Hands-off end-to-end automated generation and scheduling pipeline from trending topic to scheduled ready-to-publish video.
- **Engine Module**: `lib/engine/autopilot.ts` (`AutoPilot` class).
  - Method: `runAutoPipeline(config: AutoPilotConfig): Promise<AutoPilotResult>`.
  - Logic: Selects trending concept -> generates script -> breaks scenes -> sources footage/images -> creates scheduled video record.
- **API Route**: `app/api/workflows/auto/route.ts` (POST).
  - Body: `{ niche: string, frequency: 'daily' | 'weekly', stylePreference: 'footage' | 'images' | 'ai-video' }`.
  - Inserts automated pipeline job into `render_jobs`.
- **UI Page**: `app/(app)/create/auto/page.tsx`.
  - Auto-Pilot configuration form: Niche Selection, Frequency, Style Preference, Auto-Publishing toggles, Activate Auto-Pilot button.

---

## 8. Implementation Recommendations & Best Practices

1. **Shared Engine Helpers**:
   - Create `lib/engine/prompts.ts` for centralized LLM prompts (stories, bulk calendar, drama characters, shorts extraction).
   - Ensure `lib/engine/types.ts` is updated with complete typing for all new workflow requests and responses.
2. **Standardized API Route Handler Pattern**:
   - Each route in `app/api/workflows/<workflow>/route.ts` should validate inputs, allocate a `UUID` job ID, spawn background processing with error catching and Supabase logging, and return immediate `{ success: true, jobId }`.
3. **Database Consistency**:
   - In Supabase inserts to `render_jobs`, format `logs` as a JSON object containing the workflow name, analysis, generated items, and timestamps.
4. **UI Pattern**:
   - Upgrade all placeholder `page.tsx` files in `app/(app)/create/*` to match the polished dark/light UI design seen in `footage/page.tsx` and `images/page.tsx`, utilizing `lucide-react` icons and redirection to `/dashboard?job=${jobId}` on submission.
5. **Cost-Safe Verification Ready**:
   - All modules should run effortlessly in local development without throwing unhandled API key errors, ensuring smooth manual and automated end-to-end testing.
