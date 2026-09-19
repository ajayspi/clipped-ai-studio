# Implementation Plan — Clipped: Worker Hardening (Phase A) → Vercel Readiness (Phase B) → Cutover (Phase C)

## [Overview]

**Goal:** make the render pipeline memory-safe and event-driven on the 1GB Oracle VM (Phase A), remove all long-running work from the Next.js web process so the frontend can move to Vercel (Phase B), then execute the hosting split with zero user-facing downtime (Phase C).

### Architecture today

```
Oracle VM (1GB RAM)                      Supabase (managed)
├─ omniroute-gateway :20128  (PM2)       ├─ Postgres: render_jobs, scheduled_posts, settings, workspaces
├─ clipped-web :3000        (PM2)        ├─ Storage: public bucket "renders" (new, Phase A)
│    Next.js 16.3.3 UI + API routes      └─ Realtime publications: render_jobs, scheduled_posts (new, Phase A)
│    ⚠ mission pipeline runs HERE (setTimeout fire-and-forget — dies on serverless)
├─ render-worker           (PM2)
└─ publish-worker          (PM2)

app/api/workflows/*  → INSERT render_jobs (status = 'pending')
render-worker        → claims job → TTS + images per beat → FFmpeg → video URL written back to job
publish-worker       → polls scheduled_posts (dry-run mock publishing)
```

Key facts that shape this plan:

- All DB access is `@supabase/supabase-js` (HTTP/PostgREST). There is **no** direct Postgres connection anywhere in the repo, so a "connection pooler URL" is a non-issue.
- FFmpeg comes from `@ffmpeg-installer/ffmpeg`, which ships **FFmpeg 4.1** — `apad=whole_dur` is unavailable; the graph uses `apad` + `atrim` instead.
- Tests: `node tests/e2e/standalone-runner.js` — 132 offline tests with a mock Supabase (covers `lib/engine/*`, `lib/publishing/*`, API-route contracts; does **not** cover `scripts/`).
- `next.config.ts` sets `typescript.ignoreBuildErrors: true`, so `npx tsc --noEmit` is the real type gate.
- `app/api/jobs/route.ts` maps `output_url`, but the legacy worker never wrote it — fixed by Phase A's Storage upload.

### Current working-tree state (uncommitted)

Phase A was partially implemented before this plan was written. Status:

| Item | File | State |
|---|---|---|
| Bun scripts + `tsx` → devDependencies | `package.json` | ✅ written |
| PM2 workers → `interpreter: 'bun'` (node/tsx fallback documented) | `ecosystem.config.js` | ✅ written |
| Realtime publication + public renders bucket SQL | `supabase/migrations/20260905_realtime_renders_bucket.sql` | ✅ written (not yet applied to the Supabase project) |
| Single-pass FFmpeg module | `scripts/lib/render-command.ts` | ⚠️ written — **has one confirmed bug (below)** |
| Worker rewrite: realtime wake-up, atomic claim, streaming downloads, Storage upload, graceful shutdown | `scripts/render-worker.ts` | ⚠️ written — blocked by the same bug |
| Smoke harness (temporary) | `scripts/__smoke_single_pass.ts` | ✅ works — it caught the bug |

**Confirmed bug (root-caused by the smoke run):** FFmpeg's `concat` filter expects per-segment interleaved inputs — `[v0][a0][v1][a1]concat=n=2:v=1:a=1` — but `buildSinglePassFilterGraph()` emits `[v0][v1][a0][a1]`. FFmpeg 4.1 rejects the graph with `Error initializing complex filters. Invalid argument`. All other smoke checks passed (normalize chain, pad+trim, deterministic input indices, anullsrc placement).

**Pending validations:** smoke re-run after the fix; `tsc --noEmit` (was interrupted — never completed); `pnpm test`; worker boot smoke.

**Out of scope (pre-existing dirty tree — do not touch, do not commit):**
`app/(app)/create/auto/page.tsx`, `app/(app)/create/bulk/page.tsx`, `app/(app)/create/mission/[id]/components/MissionLivePreview.tsx`, `app/(app)/settings/page.tsx`, `components/wizard/LivePlayer.tsx`, `lib/api-router.ts`, `lib/engine/bulk-planner.ts`, `lib/engine/image-generator.ts`, `lib/engine/whiteboard-orchestrator.ts`, `pnpm-lock.yaml`, deleted `remotion/*`, and untracked scratch (`conversations/`, `omniroute-server/`, `*.py` scripts, `update.tar.gz`, `*.code-workspace`, `components/create/ui/`).

## [Types]

Already added (`scripts/lib/render-command.ts`):

```ts
export type FfmpegCommand = ReturnType<typeof ffmpeg>
export interface RenderDimensions { width: number; height: number }
export interface RenderBeatInput { imagePath: string; audioPath?: string; duration: number }
```

Phase B adds (`scripts/lib/job-params.ts`, new — keeps route and worker in contract):

```ts
export interface MissionJobParams {
  type: 'mission'                                   // discriminator read by the worker
  prompt: string
  aspectRatio?: '16:9' | '1:1' | '9:16' | string
  style?: string
  voice?: string
  mock?: boolean
}
```

No DB schema changes are required in any phase: `render_jobs` already has every column used (`status`, `progress`, `logs`, `output_url`, `workflow_type`, `error_message`, `created_at`).

## [Files]

**Phase A — already written, pending validation (keep):**

- `package.json` — worker/seed scripts → `bun ...`; added `worker:render:node` / `worker:publish:node` fallbacks; `tsx` moved to devDependencies.
- `ecosystem.config.js` — workers run with `interpreter: 'bun'`; node+tsx fallback documented in comments.
- `supabase/migrations/20260905_realtime_renders_bucket.sql` — idempotent: adds `render_jobs` + `scheduled_posts` to `supabase_realtime`, creates public `renders` bucket + public-read policy.
- `scripts/lib/render-command.ts` — single-pass graph builder + runner + `resolveDimensions()`.
- `scripts/render-worker.ts` — full rewrite (see Functions §2).

**Phase A — to modify/delete during implementation:**

- `scripts/lib/render-command.ts` — one fix (concat ordering, Functions §1).
- Delete after validation: `scripts/__smoke_single_pass.ts`, `scripts/render-worker.ts.bak`, `smoke_out.txt`, `smoke_exit.txt`, `tsc_out.txt`, `git_status.txt`, `tmp_smoke/` (if present).

**Phase B — to modify:**

- `app/api/workflows/mission/route.ts` — POST becomes enqueue-only; GET stays as-is (already DB-backed).
- `scripts/render-worker.ts` — add the mission branch in `processJob()`.
- Per AGENTS.md: consult `node_modules/next/dist/docs/01-app/` (route handlers) before editing the route.

**Phase C — manual/ops only:** no repo code strictly required; optional `docs/DEPLOYMENT.md` capturing the cutover runbook.

## [Functions]

1. **`buildSinglePassFilterGraph()` — FIX (Phase A step 1)** in `scripts/lib/render-command.ts`. Replace the concat input assembly:
   ```ts
   chains.push(`${videoLabels.join('')}${audioLabels.join('')}concat=n=${beats.length}:v=1:a=1[vout][aout]`)
   ```
   with per-segment interleaved labels (and delete the now-unused `videoLabels`/`audioLabels` arrays):
   ```ts
   const segmentLabels = beats.map((_, i) => `[v${i}][a${i}]`).join('')
   chains.push(`${segmentLabels}concat=n=${beats.length}:v=1:a=1[vout][aout]`)
   ```

2. **Already implemented in `scripts/render-worker.ts` (no further change in Phase A):** `downloadFile()` (stream-to-disk via `pipeline(Readable.fromWeb(...))`), `claimNextJob()` (atomic conditional UPDATE with a guarded select-then-update fallback), `drainQueue()` (single-flight loop), `startWorker()` (postgres_changes subscription + 60 s safety poll), `processJob()` (TTS / OmniRoute / Pollinations logic preserved verbatim from the legacy worker), `uploadRender()` (Storage stream upload with Buffer retry, legacy local `/renders` fallback), `shutdown()` (SIGTERM/SIGINT: kill ffmpeg, release the job lease back to `pending`).

3. **Phase B — `POST /api/workflows/mission` rewrite:** validate prompt → insert
   `render_jobs { id: jobId, status: 'pending', progress: 0, workflow_type: 'mission', logs: JSON.stringify({ type: 'mission', ...options }) }`
   → return the exact same response shape as today (`jobId`, `status: 'processing'`, `progressUrl`). **Remove the `setTimeout(..., 0)` background execution** — it is killed the moment a serverless function returns.

4. **Phase B — mission branch at the top of `processJob()`:**
   ```ts
   if (params.type === 'mission' || job.workflow_type === 'mission') {
     const { missionOrchestrator } = await import('../lib/engine/mission-orchestrator')
     const existing = await missionOrchestrator.getJob(job.id)
     if (!existing?.steps?.length) await missionOrchestrator.createJob(job.id, params) // hydrates stage steps; the duplicate INSERT fails silently by design
     await missionOrchestrator.executeMission(job.id, params)
     return // completion/progress is persisted by executeMission via updateStep()
   }
   ```

## [Classes]

- **`MissionOrchestrator`** (`lib/engine/mission-orchestrator.ts`) — consumed by the worker in Phase B; no structural change. Notes: the in-memory `memoryStore` is per-process (harmless on the VM, useless on Vercel — which is exactly why execution must move to the worker); `getJob()` falls back to parsing `render_jobs.logs`; `updateStep()` persists every stage transition (status/progress/logs), so the existing mission progress UI keeps working unchanged.
- **`TTSEngine`** (`lib/engine/tts.ts`) — interface verified (`provider`, `apiKey` request fields); unchanged.
- **`SocialPublisherManager`** (`lib/publishing`) — unchanged; `app/api/publish/route.ts` reads `logs.finalVideoUrl`, which becomes an absolute Storage URL.

<!-- CHUNK3 -->