# Plan — Clipped Final Package Verification & Victory Cadre

## Objective
Thoroughly inspect, test, review, stress-test, and forensically audit the entire Clipped AI Studio implementation against all requirements R1, R2, R3, R4 and acceptance criteria, ensuring 100% test pass, zero regressions, robust architecture, and unassailable authenticity.

## Architecture & Verification Matrix
1. **R1: Custom Supabase Connection UI & Dynamic Client**
   - UI panel in `/settings` allowing custom `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY`.
   - Dynamic client switching via `SupabaseProvider` (localStorage + cookies).
   - Test query / latency / health check API endpoint (`/api/settings/supabase/test`).
   - Criteria: Updating credentials updates storage/cookies, and query to new database succeeds.

2. **R2: Voice API Expansion, Dynamic API Keys & Previews**
   - Azure Speech REST TTS + Free/Keyless voice fallback + OpenAI TTS in `lib/engine/tts.ts`.
   - Play/Pause preview buttons next to voice models in `/settings` and `/create` wizard (`components/wizard/VoiceStep.tsx`).
   - Preview API endpoint (`/api/tts/preview`).
   - Dynamic API key inputs for all providers in Supabase `settings` table + "Add Custom API Integration" modal.
   - Criteria: Clicking "Play" button triggers audio playback of sample text.

3. **R3: Modernize Subtitles UI**
   - Glassmorphism styling (`backdrop-blur-md`, glowing borders, shadows, dark translucent surfaces).
   - 6 subtitle style presets (Hormozi Pop, Cyber Neon, Minimalist, Cinematic, Comic, Clean Box).
   - Smartphone preview sandbox with 3-segment position selector (Top, Center, Bottom).
   - Remotion composition rendering with neon glows, custom outlines, box highlights.
   - Criteria: Subtitles UI renders without console errors and features visual depth.

4. **R4: 5 Premium Package Features**
   - 1. One-Click Social Export & Publish (YouTube Shorts, TikTok, Instagram mocks & export API).
   - 2. Custom Branding & Watermarks (Watermark overlay in Remotion with 5 anchor positions, scale, opacity, badge).
   - 3. Project Workspaces (Organize videos into workspaces/campaigns, filter in Library, create new workspace modal).
   - 4. Developer REST API & Webhooks (`/api/v1/generate`, `/api/v1/jobs/[id]`, HMAC SHA-256 signed webhooks).
   - 5. Advanced Analytics Dashboard (`/analytics` page, multi-provider token/cost estimator, usage metrics).
   - Criteria: Analytics dashboard successfully calculates and displays mock API cost based on generated videos.

## Subagent Verification Squad
- **Reviewer 1** (`teamwork_preview_reviewer`): Scope R1 & R2 (Database, Settings, Voice Engine, Previews, Dynamic Keys).
- **Reviewer 2** (`teamwork_preview_reviewer`): Scope R3 & R4 (Subtitles UI, Social Export, Watermarks, Workspaces, Webhooks, Analytics).
- **Challenger 1** (`teamwork_preview_challenger`): Empirical tests for R1 & R2.
- **Challenger 2** (`teamwork_preview_challenger`): Empirical tests for R3 & R4.
- **Forensic Auditor** (`teamwork_preview_auditor`): Integrity Forensics & Anti-Cheating validation.

## Execution Sequence
1. Dispatch all 5 verification subagents concurrently.
2. Monitor progress via heartbeat and collect handoff reports.
3. Synthesize findings in `GATE_STATUS.md`.
4. If any defect is found: dispatch worker fix + re-verify.
5. If all pass (100% test pass, APPROVE verdicts, CLEAN audit): compile final report and send victory message to Sentinel.
