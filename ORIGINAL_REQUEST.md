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
 
+## Follow-up — 2026-08-31T23:31:02Z
+
+This is a single self-contained fix; keep it small and focused. Finalizing the Clipped AI video platform by fixing background worker syntax errors and conducting a dry-run end-to-end video generation test.
+
+Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
+Integrity mode: demo
+
+## Requirements
+
+### R1. Fix Background Workers
+Restore the stripped template literals (backticks) in `scripts/publish-worker.ts` and `scripts/render-worker.ts`. These were corrupted by PowerShell escaping, causing PM2 crash loops. Ensure they compile cleanly.
+
+### R2. E2E Verification
+Conduct a dry-run End-to-End test of the video generation pipeline. Verify that a video job correctly passes from the UI to Supabase, and is successfully picked up by the fixed `render-worker`.
+
+## Acceptance Criteria
+
+### Implementation Quality
+- [ ] Running `npx tsc --noEmit` on the scripts folder passes without syntax errors related to missing backticks or template literals.
+- [ ] The background workers can be started via PM2 and maintain a stable uptime without immediate crash loops.
+
+### E2E
+- [ ] A test video generation job inserted into `render_jobs` is demonstrably picked up by the `render-worker` in the logs.

## Follow-up — 2026-09-01T15:26:33+05:30

Enhance the Clipped AI Studio dashboard UI with a collapsible glassmorphism sidebar, vibrant color schemes, and placeholder images. Additionally, write a Supabase seeder script to populate the Library and Planner views with realistic mock data to remove their blank states.

Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
Integrity mode: development

## Requirements

### R1. Dashboard UI & Sidebar Redesign
Update the main application layout to include a collapsible side navigation bar. The sidebar must feature glassmorphism styling (translucent, blurred background). Enhance the overall color scheme of the dashboard to be vibrant, colorful, and add icons wherever appropriate.

### R2. Dashboard Imagery
Incorporate high-quality images into the dashboard to make it look like a real, active application. The team may decide the best approach for sourcing these images (e.g., generating them or using high-quality stock URLs).

### R3. Supabase Data Seeding
Write a database seeder script to insert realistic mock data into the Supabase database. The script must populate the `render_jobs` table (for the Library) and the relevant tables for the Planner so that both views display active content rather than blank states.

## Acceptance Criteria

### UI Implementation
- [ ] The side navigation bar successfully toggles between a collapsed (icon-only) and expanded state.
- [ ] The side navigation bar implements CSS `backdrop-filter: blur()` or Tailwind `backdrop-blur` for the glassmorphism effect.
- [ ] At least 5 new icons are added across the dashboard components.

### Database Seeding & Verification
- [ ] A dedicated seeder script (e.g., `seed.ts` or `seed.js`) exists in the repository.
- [ ] Running the seeder script programmatically inserts at least 5 mock records into the Supabase database for both the Library and the Planner.
- [ ] The `app/(app)/library/page.tsx` and Planner pages successfully fetch and render the mock data without displaying an empty state.

## Follow-up — 2026-09-01T17:09:53+05:30

Enhance the 'create' section of the Clipped AI dashboard with API configuration status indicators and settings links. Implement an 'automatic mission' mode that generates end-to-end videos from a single prompt, and research/build pipelines for avatar-to-video and whiteboard animation with consistent Gemini-generated character references.

Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
Integrity mode: development

## Requirements

### R1. API Status Indicators
Add visual indicators (green, orange, red, $) to each workflow card in the `create` section, reflecting the configuration status of required APIs. Add a settings icon linking to the configuration page.

### R2. Automatic Mission Mode
Implement a "one-click" generation flow where typing a subject and hitting enter automatically initiates the full video generation pipeline. The user should immediately navigate to a dedicated "Mission Progress" view that shows the steps completing automatically, while still allowing a "manual/edit" toggle for granular control.

### R3. Whiteboard & Avatar Pipelines
Research and integrate two new workflows: "Avatar to Video" and "Whiteboard Animation". The team is free to research and decide the best external models/APIs to use for generating Avatars and Whiteboards. However, the whiteboard pipeline must use Google Gemini to generate consistent character reference sheets (e.g., stickman, saint, old man, etc.) that drive the video generation.

## Acceptance Criteria

### UI & UX Verification
- [ ] Each workflow card dynamically displays a status dot (green, red, orange) based on the `/api/settings/keys` response.
- [ ] Submitting a prompt in "Automatic" mode navigates the user to a Mission Progress view where the job automatically progresses without manual intervention.

### Pipeline Verification
- [ ] New UI cards for "Avatar" and "Whiteboard" are added to the create section.
- [ ] Backend orchestrators for Whiteboard animation successfully use Gemini to generate character references before rendering.
