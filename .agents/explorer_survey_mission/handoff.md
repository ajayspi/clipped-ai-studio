# Handoff Report: Generation Flow, Job Orchestration & Automatic Mission Mode

## 1. Observation
1. **Creation Hub & Wizard Initiation**:
   - `app/(app)/create/page.tsx` (lines 4-77) defines 8 workflow routes (`footage`, `images`, `ai-videos`, `stories`, `bulk`, `shorts`, `drama`, `auto`).
   - `app/(app)/create/footage/page.tsx` (lines 7-9), `app/(app)/create/images/page.tsx` (lines 7-9), and `app/(app)/create/ai-videos/page.tsx` (lines 7-9) all instantiate `<CreationWizard workflowType="..." />`.
   - `components/wizard/CreationWizard.tsx` (lines 4-9) controls a 5-step stepper: ScriptStep -> ScenesStep -> VoiceStep -> SubtitlesStep -> RenderStep.
   - `components/wizard/CreationWizard.tsx` (lines 45-113) contains a client-side `runAutoMode` that chains `/api/v1/script` -> `/api/v1/analyze` -> `/api/v1/source`, but merely stops at step index 4 (RenderStep) without auto-submitting or displaying a dedicated progress view.

2. **Job Lifecycle & Data Persistence**:
   - `schema.sql` (lines 30-41) defines table `render_jobs` with fields `id` (UUID), `video_id` (UUID), `status` ('pending'|'processing'|'completed'|'failed'), `progress` (INTEGER), `error_message` (TEXT), `logs` (TEXT), `started_at`, `completed_at`, `created_at`.
   - `app/api/workflows/generate/route.ts` (lines 18-42), `app/api/workflows/ai-videos/route.ts` (lines 36-104), and `app/api/workflows/auto/route.ts` (lines 45-114) insert a pending row into `render_jobs`, dispatch an asynchronous background task via `setTimeout(..., 0)`, and return `{ success: true, jobId }` immediately.
   - Engine components handle generation stages: `lib/ai/llm.ts` (LLM script synthesis), `lib/engine/scene-matcher.ts` (beat analysis), `lib/engine/image-generator.ts` (Fal.ai Flux / DALL-E), `lib/engine/video-generator.ts` (Kling / Luma / Fal), `lib/engine/tts.ts` (ElevenLabs / Google Cloud / Coqui / Keyless fallback), `lib/engine/audio-mixer.ts` (FFmpeg sidechain ducking), `remotion/Composition.tsx` (Hormozi animated subtitle rendering and media sequencing).

3. **State Management & Live Video Player**:
   - `components/wizard/wizard-store.ts` (lines 37-99) defines Zustand store `useWizardStore` with full generation state (`subject`, `narration`, `beats`, `voice`, `aspectRatio`, `burnSubtitles`, `subtitleY`, `autoMode`).
   - `components/wizard/LivePlayer.tsx` (lines 34-67) renders `@remotion/player` with `MainComposition` (`remotion/Composition.tsx`), updating dynamically when `beats` or `burnSubtitles` change.
   - `lib/db.ts` (lines 1-6) exposes the `supabase` JS client configured with `process.env.NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

4. **Settings & API Configuration State**:
   - `app/api/settings/keys/route.ts` (lines 15-26) returns `{ keys: Record<string, { isConfigured: boolean, maskedValue: string, isActive: boolean, updatedAt: string }> }`.
   - `app/api/settings/keys/check/route.ts` (lines 4-58) tests provider keys.

---

## 2. Logic Chain
- *From Observation 1 & 2*: Currently, submitting prompts requires clicking through 5 wizard steps or using client-side `runAutoMode` that halts at review. A true "Automatic Mission Mode" requires a dedicated endpoint (`POST /api/workflows/mission`) that receives a single prompt, provisions a `render_jobs` record in Supabase, kicks off the server-side pipeline (`lib/engine/mission-orchestrator.ts`), and returns `{ success: true, jobId }` immediately.
- *From Observation 2 & 3*: The frontend can immediately navigate the user to `/create/mission/[jobId]`. The progress view can subscribe to Supabase Realtime table changes on `render_jobs` (with 1.5s polling fallback) and display a 5-stage progress visualizer (Script -> Scene Breakdown -> Asset Sourcing -> Audio Synthesis -> Video Assembly) along with live log streams and the Remotion `LivePlayer`.
- *From Observation 3*: Because `useWizardStore` stores all generation state cleanly in Zustand, implementing a "Manual / Edit in Wizard" toggle is straightforward: reading the current `render_jobs.logs` JSON from the database and calling `useWizardStore.setState({...})` populates the wizard, allowing the user to switch seamlessly from auto-pilot to fine-grained manual customization.

---

## 3. Caveats
- Production deployments on Vercel Serverless Functions have execution timeout limits (10s to 60s); long generation jobs involving live video APIs (Kling/Luma) require either fast dry-run fallbacks, webhooks, or background worker architecture (e.g. Inngest / Trigger.dev). For development mode, `setTimeout(..., 0)` background execution in Node.js works reliably.
- Realtime subscriptions require Supabase publication replication enabled on `render_jobs`; polling provides a 100% reliable fallback.

---

## 4. Conclusion
Automatic Mission Mode is fully feasible with zero architectural blockers:
1. **Entry Point**: Add an Automatic Prompt input bar on `/create` page that submits to `POST /api/workflows/mission` and navigates to `/create/mission/[jobId]`.
2. **Backend**: Implement `lib/engine/mission-orchestrator.ts` chaining LLM script generation -> scene breakdown -> asset generation -> TTS -> audio mixing -> Remotion composition, writing progress (0% -> 100%) and partial logs to `render_jobs`.
3. **Frontend**: Build `app/(app)/create/mission/[id]/page.tsx` with real-time stepper visualizer, live log feed, live Remotion player, and a "Manual / Edit" button that transfers state to `useWizardStore`.

---

## 5. Verification Method
- Inspect report file: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_mission\report.md`
- Verify existing routes and models:
  - `schema.sql` (render_jobs table schema)
  - `components/wizard/wizard-store.ts` (Zustand state schema)
  - `app/api/workflows/generate/route.ts` & `app/api/workflows/auto/route.ts` (existing async job dispatch pattern)
  - `remotion/Composition.tsx` (Remotion player composition contract)
