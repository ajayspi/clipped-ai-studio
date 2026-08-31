# Handoff Report: Explorer Survey 2 (API Routes & Workflows Mapping)

**Date**: 2026-08-29  
**Agent**: `explorer_survey_2`  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_2`  
**Parent Orchestrator**: `5ed66db4-ecf5-417a-a59a-c3ac74234bea`  
**Handoff Type**: Hard Handoff (Investigation & Mapping Complete)

---

## 1. Observation

1. **Existing API Routes**:
   - `app/api/auth/[...nextauth]/route.ts` (lines 1-3): Exposes NextAuth handlers.
   - `app/api/health/route.ts` (lines 1-9): Returns `{ status: "ok", app: "clipped", version: "0.1.0" }`.
   - `app/api/workflows/generate/route.ts` (lines 1-53): Stock footage workflow handler calling `videoOrchestrator.generateVideoPlan`.
   - `app/api/workflows/images/route.ts` (lines 1-73): AI Images workflow handler calling `sceneMatcher.analyzeScript` and `imageGenerator.generateForScenes`.
   - No endpoints currently exist under `app/api/render/*` or for the remaining 6 target workflows.

2. **Missing Target Workflow Routes**:
   - `app/api/workflows/ai-videos/route.ts` (AI Videos) — NOT FOUND
   - `app/api/workflows/stories/route.ts` (Stories) — NOT FOUND
   - `app/api/workflows/bulk-plan/route.ts` (Bulk Plan) — NOT FOUND
   - `app/api/workflows/extract-shorts/route.ts` (Extract Shorts) — NOT FOUND
   - `app/api/workflows/micro-drama/route.ts` (Micro-Drama) — NOT FOUND
   - `app/api/workflows/auto/route.ts` (Auto Pilot) — NOT FOUND

3. **Supabase Database Schema (`schema.sql` lines 31-41)**:
   ```sql
   CREATE TABLE render_jobs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
       status TEXT DEFAULT 'pending',
       progress INTEGER DEFAULT 0,
       error_message TEXT,
       logs TEXT,
       started_at TIMESTAMP WITH TIME ZONE,
       completed_at TIMESTAMP WITH TIME ZONE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );
   ```

4. **Job Insertion Pattern in Existing Code**:
   - In `app/api/workflows/generate/route.ts` (lines 25-32) and `app/api/workflows/images/route.ts` (lines 35-46), database insertion occurs asynchronously inside `setTimeout` after engine completion with `status: 'completed'` or `'failed'`.
   - In `app/(app)/dashboard/page.tsx` (lines 6-10), the server component queries the latest 5 records from `render_jobs` ordered by `created_at DESC`.

5. **Engine Pattern Baseline**:
   - `lib/engine/orchestrator.ts` and `lib/engine/image-generator.ts` export singleton class instances (`videoOrchestrator`, `imageGenerator`) with dry-run/mock fallbacks when API keys are not provided (e.g., `FAL_API_KEY` in `lib/engine/image-generator.ts:19-30`).

---

## 2. Logic Chain

1. **Premise 1 (From Observation 2)**: The 6 target workflows requested in `ORIGINAL_REQUEST.md` (AI Videos, Stories, Bulk Plan, Extract Shorts, Micro-Drama, Auto Pilot) lack their dedicated API routes under `app/api/workflows/*`.
2. **Premise 2 (From Observation 4 & Dashboard UI)**: When the frontend submits a creation form, it immediately redirects to `/dashboard?job=${data.jobId}`. If database insertion is delayed until engine completion, the dashboard query may return before the record exists, resulting in a missing job card.
3. **Premise 3 (From Observation 3 & ORIGINAL_REQUEST.md Acceptance Criteria)**: The acceptance criteria explicitly require: *"Verify that clicking 'Generate' in UI panels correctly logs a pending job into Supabase."*
4. **Deduction 1 (Pattern Standard)**: All new API route handlers must synchronously perform an initial insert of `{ id: jobId, status: 'pending', progress: 0, logs: { workflow, input }, started_at: now() }` into `render_jobs` before dispatching async engine work, and then update the record with `status: 'completed'` or `'failed'` when the engine completes.
5. **Deduction 2 (Contract Uniformity)**: Each route must accept standardized JSON payloads matching the parameters defined in `survey_report.md` Section 5, validate required inputs, return `{ success: true, jobId, message: "..." }` on HTTP 200, and gracefully handle errors with HTTP 400/500 responses.

---

## 3. Caveats

- **Database RLS Policies**: The PostgreSQL schema does not currently enforce Row Level Security (RLS) on `render_jobs` in local dev mode. If RLS is enabled in production, the Supabase client in `lib/db.ts` must use authenticated user tokens or service role keys.
- **Queueing in Production**: The application currently uses `setTimeout(..., 0)` as a demo fire-and-forget background runner. In high-scale production, this should be migrated to a durable queue (e.g., Inngest, Trigger.dev, BullMQ), but `setTimeout` is sufficient for current architecture and tests.
- **API Key Fallbacks**: Premium model keys (Kling, Luma, Fal, OpenAI) may not be present in test environments; engine orchestrators must implement robust mock fallbacks to prevent test failures.

---

## 4. Conclusion

1. **6 API routes must be implemented under `app/api/workflows/`**:
   - `app/api/workflows/ai-videos/route.ts`
   - `app/api/workflows/stories/route.ts`
   - `app/api/workflows/bulk-plan/route.ts`
   - `app/api/workflows/extract-shorts/route.ts`
   - `app/api/workflows/micro-drama/route.ts`
   - `app/api/workflows/auto/route.ts`
2. **Standardized Request/Response & Supabase Flow**:
   - Validate required fields (e.g., `script`, `topic`, `niche`, `videoUrl`, `pipelineName`).
   - Generate `jobId = crypto.randomUUID()`.
   - Synchronously insert `status: 'pending'` record into `render_jobs`.
   - Execute background engine task via `setTimeout(..., 0)` and update `render_jobs` to `completed` or `failed`.
   - Return `{ success: true, jobId, message: "..." }` with HTTP 200.
3. Detailed schemas, payload examples, and implementation blueprints are fully documented in `survey_report.md`.

---

## 5. Verification Method

1. **Static Inspection**:
   - Verify file existence of all 6 routes under `app/api/workflows/`.
   - Inspect request parsing, validation, and error response handling.
2. **Schema & Contract Verification**:
   - Test `POST` requests to each endpoint with mock payloads using curl / fetch / test runner.
   - Verify that HTTP 200 is returned with `{ success: true, jobId: string }`.
   - Verify that `render_jobs` in Supabase contains the new record with `id = jobId` and `status = 'pending'` immediately upon call.
3. **Invalidation Conditions**:
   - If any endpoint fails to insert `pending` into `render_jobs`, or throws unhandled exceptions on valid JSON payloads, verification is considered failed.
