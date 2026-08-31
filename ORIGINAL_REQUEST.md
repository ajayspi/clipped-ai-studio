# Original User Request

## Initial Request — 2026-08-29T00:55:08Z

You are the Project Orchestrator for the "Clipped" Next.js 14 project.

Working Directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped
Authoritative Request File: C:\Users\vigilare\.gemini\antigravity\brain\ac4aaaa8-8169-4ffe-8042-d4eb1af8cc96\ORIGINAL_REQUEST.md

Task Summary:
Building the backend logic and API routes for 6 remaining AI video generation workflows (AI Videos, Stories, Bulk Plan, Extract Shorts, Micro-Drama, Auto) in the "Clipped" Next.js 14 application.

Requirements:
- R1: Implement AI Video Generators (`lib/engine/video-generator.ts` and `app/api/workflows/ai-videos/route.ts` interfacing with Kling/Luma APIs).
- R2: Implement Stories & Bulk Plan (queueing logic and database insertions in Supabase for Stories and Bulk Planner workflows, stringing together engine calls).
- R3: Implement Micro-Drama & Shorts (`lib/engine/drama-orchestrator.ts` and `lib/engine/shorts-extractor.ts` for consistent character generation and long-form video slicing).

Acceptance Criteria:
- Backend files in `lib/engine/*` correctly export functional orchestrators for each workflow.
- API routes in `app/api/workflows/*` successfully receive POST requests and insert jobs into Supabase `render_jobs` table.
- Strictly adhere to existing architectural patterns in `lib/engine/orchestrator.ts` and `lib/engine/image-generator.ts`.
- Cost-Safe Verification: When executing test runs, use mocked API responses or "dry-run" modes if real API keys for premium video generation (Kling/Luma) are absent. Verify that clicking "Generate" in UI panels correctly logs a `pending` job into Supabase.

Please coordinate the specialists/team, maintain progress.md and BRIEFING.md, execute the implementation, run verification, and notify me when complete.

## Follow-up — 2026-08-29T11:08:24Z

Integrating the 6 external systems for the "Clipped" Next.js 14 application: TTS providers (Google, Coqui, ElevenLabs), Social Publishing (YouTube, Instagram, TikTok), Analytics/Quotas, and Audio mixing.

Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
Integrity mode: development
Requested team: Standard team (parallel execution)

## Requirements

### R1. Implement TTS Providers
Build `lib/engine/tts.ts` to interface with Google Cloud TTS, Coqui, and ElevenLabs. MUST support English and 6 Indian languages (Hindi, Tamil, Telugu, Kannada, Bengali, Marathi).

### R2. Implement Social Publishing APIs
Build `lib/publishing/*` modules to handle OAuth flows and direct video uploads to YouTube Data API v3, Instagram Graph API (Reels), and TikTok Content API.

### R3. Implement Quotas & Audio Mixing
Build `lib/quotas.ts` to track usage in Supabase (enforcing the 3 videos/month free tier). Build `lib/engine/audio-mixer.ts` for FFmpeg background music overlay.

## Acceptance Criteria

### Implementation Quality
- [ ] `tts.ts` successfully maps language codes (e.g., `hi-IN`, `ta-IN`) across all 3 providers.
- [ ] Publishing modules correctly implement rate-limit handling and exponential backoff.
- [ ] Quota system successfully increments usage in Supabase and blocks execution if limits are exceeded.

### Verification (Cost-Safe Execution)
- [ ] MUST implement strict "dry-run" execution defaults for the Social APIs to prevent accidental live posting to social accounts during testing.
- [ ] Must build E2E integration tests in `tests/e2e/tier6-integration.test.ts` verifying dry-run paths.

