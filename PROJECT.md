# Project: Clipped Application — Viewport Optimization, Global Render Queue & Media Pipeline Fixes

## Architecture
Refactoring the `/create` video creation workflow for zero-scroll 1080p viewport compliance, establishing a global render queue indicator and dedicated queue management page, and fixing critical media pipeline bugs (Edge TTS keyless voiceover synthesis, subtitle effects rendering in video output, and external voice API keys reflection).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                        │
│  - Navigation Shell (app/(app)/layout.tsx):                                            │
│    * Top "Create Video" button routed to /create/stories (Story Maker)                 │
│    * Global Render Queue indicator in Desktop Header, Mobile Header, and Sidebar       │
│  - Dedicated Queue Page (app/(app)/queue/page.tsx):                                    │
│    * Live status cards for pending/generating/processing/completed jobs                │
│    * Real-time progress bars, logs drawer, and "Go to Story Maker" quick action button │
│  - Creation Wizard (/create/stories & components/wizard/):                             │
│    * Viewport-constrained container: h-[calc(100vh-4.25rem)] overflow-hidden           │
│    * SubtitlesStep: compact master toggle, 52px preset cards, removed duplicate preview│
│    * VoiceStep: horizontal provider segmented tabs, 40px compact voice cards, inline strip│
│    * ScenesStep: scroll-capped container with 66px compact beat cards                  │
│    * ScriptStep: 120px compact textarea; RenderStep: compact review grid               │
│    * Render submission: redirects to /queue?jobId=${data.jobId}                        │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                 API & STORAGE LAYER                                    │
│  - Workflow Generation Route (app/api/workflows/generate/route.ts):                    │
│    * Preserves full subtitle styling (burnSubtitles, colors, preset, size, Y) in logs  │
│    * Captures selected voice and voiceProvider in render_jobs record                   │
│  - Settings Keys API (app/api/settings/keys/route.ts):                                 │
│    * Standardizes external voice keys (elevenlabs, google_tts, azure_speech, openai)   │
│  - Jobs Polling API (app/api/jobs/route.ts):                                           │
│    * Returns live queued, processing, completed, and failed counts for global indicator │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                    ENGINE LAYER                                        │
│  - Voice Synthesis Engine (lib/engine/tts.ts):                                         │
│    * Edge TTS Free fix: handles WebSocket errors, fallback to Google Translate TTS REST│
│    * Catalog alignment: recognizes free-* voice IDs without defaulting to US voice     │
│    * External provider reflection: checks settings table for user API keys (Azure, etc.)│
│  - Render Worker Pipeline (scripts/render-worker.ts):                                  │
│    * Native data: URI decoding into audio buffers (eliminates fetch() failure)         │
│    * Subtitle burning: burns configured subtitle styles/presets via FFmpeg drawtext    │
│    * Guaranteed audio track: merges synthesized voiceover into output video            │
│  - Remotion Preview (remotion/Composition.tsx):                                        │
│    * Imports Audio from 'remotion' and renders voiceover tracks during live preview    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Edge TTS Free Voiceover Synthesis Fix | Fix WebSocket timeout/errors, voice catalog matching (`free-`), and robust fallback | M1 | R3.1, Survey |
| 2 | Render Worker Audio Attachment | Native base64 data URI handling and guaranteed FFmpeg audio track integration | M1 | R3.1, Survey |
| 3 | Remotion Live Preview Audio | Render `<Audio />` in `remotion/Composition.tsx` for live voiceover playback | M1 | R3.1, Survey |
| 4 | Subtitle Styling Payload Preservation | Capture all subtitle parameters in `POST /api/workflows/generate` | M2 | R3.2, Survey |
| 5 | Subtitle Rendering in Render Worker | Burn styled subtitles in FFmpeg render worker using configured presets and colors | M2 | R3.2, Survey |
| 6 | External Voice Settings & Key Reflection | Fetch and utilize external provider API keys (Azure, ElevenLabs, etc.) in `tts.ts` | M2 | R3.3, Survey |
| 7 | Top Navigation Route Correction | Route "Create Video" button in `app/(app)/layout.tsx` to `/create/stories` | M3 | R2, Survey |
| 8 | Dedicated Render Queue Page | Build `app/(app)/queue/page.tsx` with live progress and "Go to Story Maker" button | M3 | R2, Survey |
| 9 | Post-Submission Queue Navigation | Redirect `/create` wizard submissions to `/queue?jobId=${jobId}` | M3 | R2, Survey |
| 10 | Global Render Queue Indicator | Global Zustand store and indicator across Desktop Header, Mobile Header, and Sidebar | M3 | R2, Survey |
| 11 | Viewport Shell Constraint | Constrain `CreationWizard.tsx` to `h-[calc(100vh-4.25rem)] overflow-hidden` | M4 | R1, Survey |
| 12 | Compact Subtitles Step | Remove duplicate sandbox/phone mockup; implement 52px preset cards and compact styling | M4 | R1, Survey |
| 13 | Compact Voice Step | Horizontal provider segmented tabs, 40px compact voice cards, inline audio strip | M4 | R1, Survey |
| 14 | Compact Scenes & Script Steps | Scroll-capped beat container (66px cards) and compact script textarea | M4 | R1, Survey |
| 15 | E2E System Verification | Automated and programmatic validation of viewport, queue, and media pipeline | M5 | AC, Survey |
| 16 | Forensic Integrity Audit | Independent binary integrity audit verifying genuine implementation with zero mocking | M5 | Audit |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Voiceover Edge TTS Fix & Audio Pipeline | Fix Edge TTS free synthesis, data URI decoding, render worker audio stream, and Remotion Audio | none | DONE |
| 2 | Subtitle Effects & Voice Settings Reflection | Preserve subtitle payload in API, burn subtitles in render worker, and utilize external provider keys in `tts.ts` | M1 | IN_PROGRESS |
| 3 | Global Render Queue & Navigation Routing | Route top button to `/create/stories`, build dedicated `/queue` page, add global indicator, and redirect submissions | none | PLANNED |
| 4 | UI Viewport Optimization for /create Flow | Compact CreationWizard container, SubtitlesStep, VoiceStep, ScenesStep, and ScriptStep for zero-scroll 1080p | M3 | PLANNED |
| 5 | E2E Integration Verification & Forensic Audit | Comprehensive programmatic verification of all acceptance criteria and binary integrity audit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. Voice Synthesis Engine (`lib/engine/tts.ts`)
```ts
export interface TTSRequest {
  text: string;
  provider?: 'omniroute' | 'keyless' | 'azure' | 'elevenlabs' | 'google' | 'openai';
  voiceId?: string;
  speed?: number;
}

export interface TTSResult {
  audioUrl: string; // http(s) URL or valid base64 data URI
  duration: number; // in seconds
  providerUsed: string;
  audioBuffer?: Buffer;
}
```

### 2. Workflow Generation Payload (`app/api/workflows/generate/route.ts`)
```ts
export interface GenerateWorkflowRequest {
  workflow: string;
  script: string;
  voice?: string;
  voiceProvider?: string;
  burnSubtitles?: boolean;
  subtitlePreset?: string;
  subtitleColor?: string;
  subtitleHighlightColor?: string;
  subtitleGlow?: boolean;
  subtitleGlowColor?: string;
  subtitleOutline?: boolean;
  subtitleOutlineWidth?: number;
  subtitleBox?: boolean;
  subtitleBoxColor?: string;
  subtitleSize?: number;
  subtitleY?: number;
}
```

### 3. Global Queue Store & Jobs Response (`app/api/jobs/route.ts`)
```ts
export interface JobsResponse {
  success: boolean;
  jobs: RenderJob[];
  queued: RenderJob[];
  completed: RenderJob[];
  failed: RenderJob[];
  counts: {
    total: number;
    queued: number;
    completed: number;
    failed: number;
  };
}
```

## Code Layout
- `lib/engine/tts.ts` — Voiceover TTS synthesis engine (Edge TTS, fallback REST, external providers)
- `scripts/render-worker.ts` — Video rendering worker (data URI audio handling, subtitle burning)
- `remotion/Composition.tsx` — Remotion composition with `<Audio />` playback
- `app/api/workflows/generate/route.ts` — Workflow submission endpoint capturing subtitle styles & voice
- `app/api/jobs/route.ts` — Queue jobs query endpoint
- `app/(app)/layout.tsx` — App layout shell with top "Create Video" link and global queue indicator
- `app/(app)/queue/page.tsx` — Dedicated Queue page with live jobs and "Go to Story Maker"
- `components/wizard/CreationWizard.tsx` — Compact container shell and post-submission redirect
- `components/wizard/VoiceStep.tsx` — Compact voice selector step
- `components/wizard/SubtitlesStep.tsx` — Compact subtitle style selector step
- `components/wizard/ScenesStep.tsx` — Compact scenes step with scroll-capped container
- `components/wizard/ScriptStep.tsx` — Compact script textarea step
