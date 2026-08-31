# Project: Clipped - AI Video Generation Workflows

## Architecture
Clipped is a Next.js 14 full-stack video creation platform with App Router, TypeScript, Tailwind CSS, Supabase database, and native `fetch` AI engine integrations.

### Data Flow & Execution Model
1. **Frontend**: User configures workflow in `/create/<workflow>` panel and clicks "Generate".
2. **API Layer**: Route handler in `app/api/workflows/<workflow>/route.ts` parses & validates payload, generates a UUID `jobId`, and synchronously creates an initial record in Supabase `render_jobs` table with `status: 'pending'`, `progress: 0`.
3. **Client Response**: Returns `{ success: true, jobId, message }` immediately with HTTP 200. Frontend redirects to `/dashboard?job=<jobId>`.
4. **Background Execution**: Handler triggers async engine task in background (`setTimeout(..., 0)`).
5. **Engine Layer**: `lib/engine/*` singletons execute workflow logic (script generation, prompt refinement, scene breakdown, AI generation calls, asset assembly). If API keys are missing, cost-safe dry-run mock fallbacks provide deterministic, functional outputs.
6. **Status Update**: Engine updates Supabase `render_jobs` record with `status: 'completed'` (or `'failed'`), `progress: 100`, and structured metadata/logs.

---

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 1 | Workflow Type Definitions | Comprehensive TypeScript interfaces in `lib/engine/types.ts` for all 6 workflows | M1 | DONE |
| 2 | Prompt Engineering Library | Reusable structured system prompts in `lib/engine/prompts.ts` | M1 | DONE |
| 3 | AI Video Generator Engine | `lib/engine/video-generator.ts` interfacing with Kling AI, Luma Dream Machine, and Fal.ai + cost-safe dry-run fallback | M1 | DONE |
| 4 | AI Videos API Route | `app/api/workflows/ai-videos/route.ts` with Supabase `pending` logging & background generation | M1 | DONE |
| 5 | AI Videos UI Panel | `app/(app)/create/ai-videos/page.tsx` interactive creation form | M1 | DONE |
| 6 | Stories Orchestrator Engine | `lib/engine/stories-orchestrator.ts` multi-part story generator with cliffhangers and visual prompts | M2 | DONE |
| 7 | Stories API Route | `app/api/workflows/stories/route.ts` with Supabase `pending` logging | M2 | DONE |
| 8 | Stories UI Panel | `app/(app)/create/stories/page.tsx` interactive multi-part story generator panel | M2 | DONE |
| 9 | Bulk Content Planner Engine | `lib/engine/bulk-planner.ts` generating 30-day/multi-video calendar content batches with Supabase job queueing | M2 | DONE |
| 10 | Bulk Plan API Route | `app/api/workflows/bulk-plan/route.ts` supporting batch generation | M2 | DONE |
| 11 | Bulk Plan UI Panel | `app/(app)/create/bulk/page.tsx` calendar planner and batch creation panel | M2 | DONE |
| 12 | Micro-Drama Orchestrator Engine | `lib/engine/drama-orchestrator.ts` multi-episode drama engine with consistent character visual anchors | M3 | DONE |
| 13 | Micro-Drama API Route | `app/api/workflows/micro-drama/route.ts` character tracking & episode job creation | M3 | DONE |
| 14 | Micro-Drama UI Panel | `app/(app)/create/drama/page.tsx` multi-character drama creation panel | M3 | DONE |
| 15 | Shorts Extractor Engine | `lib/engine/shorts-extractor.ts` transcript hook detector & vertical video slicing | M3 | DONE |
| 16 | Extract Shorts API Route | `app/api/workflows/extract-shorts/route.ts` video URL / transcript processing & clip extraction | M3 | DONE |
| 17 | Extract Shorts UI Panel | `app/(app)/create/shorts/page.tsx` video URL / transcript upload & clip extraction panel | M3 | DONE |
| 18 | Auto Pilot Engine | `lib/engine/auto-pilot.ts` hands-off automated video generation pipeline from trending RSS/niches | M4 | DONE |
| 19 | Auto Pilot API Route | `app/api/workflows/auto/route.ts` automated schedule & recurring trigger logging | M4 | DONE |
| 20 | Auto Pilot UI Panel | `app/(app)/create/auto/page.tsx` autopilot schedule configuration panel | M4 | DONE |
| 21 | E2E Testing Suite (Tiers 1-4) | Comprehensive opaque-box test runner covering all 6 workflows with 100% pass | E2E-Track / M5 | DONE |
| 22 | Adversarial Hardening (Tier 5) | White-box edge-case and stress test verification (25 tests) | M5 | DONE |
| 23 | External Systems Integration | TTS (Google/Coqui/ElevenLabs + 6 Indian languages), Social Publishing (YouTube/IG/TikTok), Quotas, Audio Mixer | M6 | DONE |
| 24 | Local Docker Environment | `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.docker`, `next.config.ts` | M7A | DONE |
| 25 | Google Colab Notebook | `deployment/colab/clipped-studio.ipynb` (Jupyter Notebook v4 JSON) | M7B | DONE |
| 26 | Oracle Cloud Setup Script | `deployment/oracle/setup.sh` (Oracle Linux / Ubuntu A100 bash setup script) | M7C | DONE |
| 27 | Multi-Deployment Verification | Syntax validation, JSON schema check, bash linting, stress tests & forensic audit | M7D | DONE |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven opaque-box test suite (Tiers 1-4) & runner publishing `TEST_READY.md` | None | DONE |
| M1 | AI Video Generators & Types | `types.ts`, `prompts.ts`, `video-generator.ts`, `/api/workflows/ai-videos`, `/create/ai-videos` | None | DONE |
| M2 | Stories & Bulk Plan Workflows | `stories-orchestrator.ts`, `bulk-planner.ts`, `/api/workflows/stories`, `/api/workflows/bulk-plan`, `/create/stories`, `/create/bulk` | M1 | DONE |
| M3 | Micro-Drama & Shorts Extractor | `drama-orchestrator.ts`, `shorts-extractor.ts`, `/api/workflows/micro-drama`, `/api/workflows/extract-shorts`, `/create/drama`, `/create/shorts` | M1 | DONE |
| M4 | Auto Pilot Pipeline & Bindings | `auto-pilot.ts`, `/api/workflows/auto`, `/create/auto` | M2, M3 | DONE |
| M5 | 100% E2E Verification & Adversarial Hardening | Pass 100% E2E tests (Tiers 1-4), then Tier 5 adversarial stress verification (112 tests total) | E2E, M1, M2, M3, M4 | DONE |
| M6 | External Systems & Tier 6 Tests | TTS Providers, Social Publishing, Quotas & Audio Mixer, Tier 6 Tests (132 tests total) | M5 | DONE |
| M7 | Targeted Deployment Configurations | Local Docker (M7A), Google Colab (M7B), Oracle Cloud (M7C), Verification & Audit (M7D) | M6 | DONE |

---

## Interface Contracts

### 1. AI Video Generator (`lib/engine/video-generator.ts`)
- **Signature**: `videoGenerator.generateAIVideo(request: AIVideoGenerationRequest): Promise<AIVideoGenerationResponse>`
- **Request**: `{ script: string; model?: 'kling-v1' | 'luma-dream' | 'fal-flux'; aspectRatio?: string; duration?: number; cameraMotion?: string; negativePrompt?: string; voice?: string; mock?: boolean }`
- **Response**: `{ success: boolean; jobId: string; videoUrl: string; prompt: string; modelUsed: string; duration: number; metadata: Record<string, any> }`

### 2. Stories Orchestrator (`lib/engine/stories-orchestrator.ts`)
- **Signature**: `storiesOrchestrator.generateStorySeries(request: StorySeriesRequest): Promise<StorySeriesResponse>`
- **Request**: `{ topic: string; storyType: string; partsCount: number; visualStyle: string; voice?: string; aspectRatio?: string; includeHooks?: boolean }`
- **Response**: `{ success: boolean; seriesTitle: string; parts: Array<{ partNumber: number; title: string; script: string; hook: string; cliffhanger: string; scenes: Scene[] }>; metadata: Record<string, any> }`

### 3. Bulk Planner (`lib/engine/bulk-planner.ts`)
- **Signature**: `bulkPlanner.generatePlan(request: BulkPlanRequest): Promise<BulkPlanResponse>`
- **Request**: `{ niche: string; contentCount: number; cadence: string; visualStyle: string; voice?: string; platforms: string[]; aspectRatio?: string }`
- **Response**: `{ success: boolean; planTitle: string; items: Array<{ day: number; title: string; hook: string; script: string; status: string }>; batchJobIds: string[] }`

### 4. Micro-Drama Orchestrator (`lib/engine/drama-orchestrator.ts`)
- **Signature**: `dramaOrchestrator.generateDramaSeries(request: DramaSeriesRequest): Promise<DramaSeriesResponse>`
- **Request**: `{ script?: string; genre: string; characters: Array<{ name: string; description: string; visualAnchor: string; voice?: string }>; episodesCount: number; aspectRatio?: string }`
- **Response**: `{ success: boolean; dramaTitle: string; characters: Array<{ name: string; avatarUrl: string; visualAnchor: string }>; episodes: Array<{ episodeNumber: number; title: string; script: string; scenes: Scene[] }> }`

### 5. Shorts Extractor (`lib/engine/shorts-extractor.ts`)
- **Signature**: `shortsExtractor.extractShorts(request: ShortsExtractionRequest): Promise<ShortsExtractionResponse>`
- **Request**: `{ sourceType: 'url' | 'transcript' | 'file'; videoUrl?: string; transcript?: string; clipCount?: number; strategy?: string; captionStyle?: string; aspectRatio?: string }`
- **Response**: `{ success: boolean; originalDuration: number; clips: Array<{ clipId: string; title: string; hook: string; startTime: number; endTime: number; viralScore: number; reason: string }> }`

### 6. Auto Pilot (`lib/engine/auto-pilot.ts`)
- **Signature**: `autoPilot.executePipeline(config: AutoPilotConfig): Promise<AutoPilotResponse>`
- **Request**: `{ pipelineName: string; niche: string; schedule: string; sourceStrategy: string; visualPipeline: string; autoPublish: boolean; targetPlatforms: string[]; voice?: string }`
- **Response**: `{ success: boolean; pipelineId: string; nextRun: string; generatedJobId?: string; status: string }`

### 7. API Routes Standard (`app/api/workflows/*`)
- **Methods**: `POST`
- **Response Shape (HTTP 200)**: `{ success: true, jobId: string, message: string, data?: any }`
- **Response Shape (HTTP 400/500)**: `{ success: false, error: string }`
- **Database Contract**: Immediate synchronous insertion of `{ id: jobId, status: 'pending', progress: 0, logs: JSON.stringify({ workflow, input }), started_at: new Date().toISOString() }` into Supabase `render_jobs` before running async background task.

---

## Code Layout
```
lib/
├── db.ts                          # Supabase client singleton
└── engine/
    ├── types.ts                   # Core data models & workflow types
    ├── prompts.ts                 # Reusable AI prompt engineering templates
    ├── orchestrator.ts            # VideoOrchestrator (stock footage)
    ├── image-generator.ts         # ImageGenerator (Fal.ai Flux)
    ├── scene-matcher.ts           # SceneMatcher (LLM script to scenes)
    ├── video-sourcer.ts           # VideoSourcer (Pexels / Pixabay)
    ├── tts.ts                     # Text to Speech engine
    ├── video-generator.ts         # Kling / Luma / Fal AI video generator
    ├── stories-orchestrator.ts    # Multi-part story series generator
    ├── bulk-planner.ts            # 30-day content calendar planner
    ├── drama-orchestrator.ts      # Multi-episode character-consistent drama
    ├── shorts-extractor.ts        # Long-form video transcript slicing & hooks
    └── auto-pilot.ts              # Autonomous pipeline runner

app/
├── (app)/
│   └── create/
│       ├── footage/page.tsx       # Stock footage workflow UI
│       ├── images/page.tsx        # AI images workflow UI
│       ├── ai-videos/page.tsx     # AI videos workflow UI
│       ├── stories/page.tsx       # Multi-part stories UI
│       ├── bulk/page.tsx          # Bulk content planner UI
│       ├── shorts/page.tsx        # Extract shorts UI
│       ├── drama/page.tsx         # Micro-drama UI
│       └── auto/page.tsx          # Auto pilot UI
└── api/
    └── workflows/
        ├── generate/route.ts      # Stock footage workflow endpoint
        ├── images/route.ts        # AI images workflow endpoint
        ├── ai-videos/route.ts     # AI videos workflow endpoint
        ├── stories/route.ts       # Stories workflow endpoint
        ├── bulk-plan/route.ts     # Bulk planner workflow endpoint
        ├── extract-shorts/route.ts# Extract shorts workflow endpoint
        ├── micro-drama/route.ts   # Micro-drama workflow endpoint
        └── auto/route.ts          # Auto pilot workflow endpoint
```
