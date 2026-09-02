# Project: Clipped AI Studio — Final Product Package

## Architecture
Clipped is a full-stack Next.js 15 (React 19) AI video generation platform powered by Remotion, multi-provider LLMs/TTS/Video models, Supabase PostgreSQL, and automated social publishing.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                        │
│  - App Shell, Header, Sidebar, Dynamic Supabase Context Provider                       │
│  - Creation Hub & Workflows (/create, /create/*)                                       │
│  - Subtitles Configuration with Glassmorphism & Visual Depth (R3)                      │
│  - Settings (/settings) with Custom Supabase Panel (R1) & Voice Previews (R2)          │
│  - Workspaces & Folder Organization (R4.3)                                             │
│  - Analytics Dashboard & API Cost Estimation (R4.5)                                    │
│  - Brand Kit & Watermark Configuration (R4.2)                                          │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                 API & ENGINE LAYER                                     │
│  - Dynamic Supabase SSR Client & Connection Diagnostics (/api/settings/supabase/test)  │
│  - Voice Engine (Azure TTS, OpenAI TTS, Keyless Fallback) & Preview API (/api/tts/*)   │
│  - Developer REST API (/api/v1/generate, /api/v1/jobs/[id]) & HMAC Webhooks (R4.4)     │
│  - Social Publishing Engine (YouTube Shorts, TikTok, Instagram) & Export (R4.1)        │
│  - Cost Estimator & Usage Tracking Engine (lib/engine/cost-estimator.ts)               │
│  - Remotion Composition (Subtitles, Neon Glows, Watermark Overlay) & Render Worker     │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                            PERSISTENCE & INFRASTRUCTURE                                │
│  - Dynamic Supabase Instance (LocalStorage + Cookies + Fallback)                       │
│  - Tables: users, videos, render_jobs, api_credits, settings, scheduled_posts,         │
│            workspaces, campaigns                                                       │
│  - Opaque-Box Automated Test Suite (tests/e2e/standalone-runner.js)                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Custom Supabase UI | Settings panel for NEXT_PUBLIC_SUPABASE_URL & ANON_KEY | M1 | R1 |
| 2 | Dynamic Client Routing | SupabaseProvider + localStorage + SSR cookies for dynamic DB | M1 | R1 |
| 3 | Supabase Test Probe | POST /api/settings/supabase/test for latency & schema checks | M1 | R1 |
| 4 | Azure TTS Integration | Azure Cognitive Speech REST synthesis in TTSEngine | M2 | R2 |
| 5 | Free/Keyless Voice APIs | Google Translate TTS, Web Speech, in-memory synth | M2 | R2 |
| 6 | Voice Audio Previews | Play/Pause preview buttons next to voice models with sample audio | M2 | R2 |
| 7 | Modern Subtitles UI | Glassmorphism, backdrop-blur, shadows, visual depth | M3 | R3 |
| 8 | Subtitle Style Presets | 6 presets: Hormozi Pop, Cyber Neon, Minimalist, Cinematic, etc. | M3 | R3 |
| 9 | Subtitle Position Selector | 3-segment smartphone mockup selector + live preview sandbox | M3 | R3 |
| 10 | One-Click Export & Publish | Direct publish to YouTube Shorts / TikTok mocks + export API | M4 | R4.1 |
| 11 | Custom Branding & Watermark | Watermark overlay in Remotion (5 anchors, scale, opacity, badge) | M4 | R4.2 |
| 12 | Project Workspaces | Folders & campaigns organization, workspaces table & UI filter | M4 | R4.3 |
| 13 | Developer API & Webhooks | /api/v1/generate, /api/v1/jobs/[id], HMAC signed webhooks | M4 | R4.4 |
| 14 | Advanced Analytics Dashboard | API usage tracking, multi-provider cost estimation model | M4 | R4.5 |
| 15 | Standalone Test Suite | Automated opaque-box tests covering all R1-R4 criteria | M5 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Custom Supabase Connection | Settings panel, dynamic context, cookies, connection probe test | none | PLANNED |
| 2 | Voice API Expansion & Previews | Azure TTS, Free/Keyless, Preview API, Play/Pause UI in Settings & Wizard | none | PLANNED |
| 3 | Modernize Subtitles UI | SubtitlesStep redesign, glassmorphism, 6 presets, position selector, Remotion styling | none | PLANNED |
| 4 | Premium Package Features | Social Export, Branding & Watermarks, Workspaces, Developer API/Webhooks, Analytics | M1, M2, M3 | PLANNED |
| 5 | E2E Testing & Verification | Comprehensive test runner for R1-R4 acceptance criteria | M1, M2, M3, M4 | PLANNED |
| 6 | Forensic Audit & Packaging | Integrity verification, build validation, and final presentation | M5 | PLANNED |

## Interface Contracts

### 1. Supabase Dynamic Client Context
- `lib/supabase/context.tsx`:
  - `useSupabase()`: returns `{ supabase, config, setCustomConfig, resetToDefault, testConnection }`
  - `clipped_custom_supabase_config` in `localStorage`
  - `clipped_custom_supabase_url`, `clipped_custom_supabase_anon_key` in `document.cookie`
- `app/api/settings/supabase/test/route.ts`:
  - Request: `{ url: string, anonKey: string }`
  - Response: `{ success: boolean, reachable: boolean, latencyMs: number, schema: { isHealthy: boolean, tables: Record<string, { exists: boolean }> } }`

### 2. TTS Voice Preview & Synthesis
- `lib/engine/tts.ts`:
  - Providers: `'azure' | 'elevenlabs' | 'openai' | 'google' | 'coqui' | 'keyless' | 'mock' | 'auto'`
  - `synthesize(request: TTSRequest): Promise<TTSResponse>`
- `app/api/tts/preview/route.ts`:
  - Request: `{ text?: string, voiceId: string, provider?: string, language?: string, speed?: number }`
  - Response: `{ success: boolean, audioUrl: string, audioBase64: string, duration: number, providerUsed: string, voiceId: string }`

### 3. Remotion Composition & Watermark
- `remotion/Composition.tsx`:
  - `WatermarkConfig`: `{ url?: string, position?: 'top-left'|'top-right'|'bottom-left'|'bottom-right'|'center', opacity?: number, scale?: number, margin?: number, handle?: string }`
  - `SubtitleStyleConfig`: `{ preset: string, color: string, highlightColor?: string, outlineColor: string, outlineWidth: number, fontSize: number, yPosition: number, showBox: boolean, boxColor: string, boxOpacity?: number, neonGlow?: boolean, uppercase: boolean, maxWidth: number }`

### 4. Developer API & Webhooks
- `app/api/v1/generate/route.ts`:
  - Request: `{ prompt: string, workflow?: string, aspectRatio?: string, voice?: string, burnSubtitles?: boolean, watermarkUrl?: string, webhookUrl?: string, metadata?: Record<string, any> }`
  - Response: `{ success: true, jobId: string, status: "processing", createdAt: string, statusUrl: string }`
- `app/api/v1/jobs/[id]/route.ts`:
  - Response: `{ jobId: string, status: string, progress: number, videoUrl?: string, duration?: number, costEstimation?: { totalCostUsd: number, llmTokens: number, ttsCharacters: number } }`

### 5. Workspaces & Analytics
- `app/api/workspaces/route.ts`:
  - `GET`: Returns list of workspaces with video counts.
  - `POST`: `{ name: string, color?: string, icon?: string, description?: string }`
- `lib/engine/cost-estimator.ts`:
  - `calculateVideoCost(params: VideoCostParams): VideoCostBreakdown`
  - `getAggregatedAnalytics(): AnalyticsSummary`

## Code Layout
- `app/(app)/settings/page.tsx` — Settings page with Supabase Connection & Voice Catalog tabs
- `app/(app)/analytics/page.tsx` — Analytics and cost estimations dashboard
- `app/(app)/library/page.tsx` — Video library with workspaces filter and one-click export
- `components/wizard/SubtitlesStep.tsx` — Modernized Subtitles UI
- `components/wizard/VoiceStep.tsx` — Voice Step with audio previews
- `lib/supabase/context.tsx` — Dynamic Supabase React Context
- `lib/supabase/client.ts` — Dynamic Browser SSR client
- `lib/supabase/server.ts` — Dynamic Server SSR client with cookie inspection
- `lib/engine/tts.ts` — Expanded TTS engine (Azure + Keyless + OpenAI)
- `lib/engine/cost-estimator.ts` — Cost calculation engine
- `lib/engine/webhook-dispatcher.ts` — HMAC webhook dispatcher
- `remotion/Composition.tsx` — Remotion composition with watermark & neon subtitle support
- `tests/e2e/standalone-runner.js` — Automated test suite for R1-R4
