# Spec: workflow route isolation + queue-boundary safety

Status: DRAFT — awaiting sign-off. No code written yet.
Date: 2026-09-29
Slug: workflow-route-isolation
File: `.opencode/spec-workflow-route-isolation.md`

Supersedes nothing. Companion to `.opencode/spec-render-worker-media-sourcing.md`
(which remains a separate, unapproved spec).

---

## 1. Goal

The 14 routes in `app/api/workflows/` follow genuinely different approaches, but
they share one folder and one `/api/workflows/*` prefix, and each one hand-rolls
its own queue boundary. That produces two failures:

1. **Confusion** — `/api/workflows/bulk-plan` looks like it queues a video. It
   returns a plan object and touches no queue. `/api/workflows/scrape` returns a
   string. `/api/workflows/images` generates images and never renders. Meanwhile
   the *actual* render-queuing path for an images job is a **different** route,
   `/api/workflows/generate` with `workflow: 'images'`.
2. **Silent job poisoning** — three write sites omit `orchestration_state`, whose
   column DEFAULT is the *claimable* `'queued'`, so the render worker claims a
   job that has no beats, builds an empty `concat.txt`, and burns all 3 attempts.

Fix both **structurally**, not as three one-off patches: one shared helper makes
the poison class impossible by construction, and a per-route contract header plus
an index makes each route self-describing.

**User decisions:** keep all URLs stable; restructure internals *and* fix the real
bugs in the same pass.

## 2. Research findings — measured 2026-09-29

Every route has a **1:1 dedicated UI page** under `app/(app)/create/*`. The
isolation the user wants already exists on the page side; the API side does not
mirror it.

| Route | Lines | UI caller | Kind | Writes `render_jobs`? | Sets `orchestration_state`? |
|---|---|---|---|---|---|
| `generate` | 268 | `components/wizard/CreationWizard.tsx` | **queue (render)** | yes `:161` | yes — proper state machine |
| `stories` | 109 | **none** | queue | yes `:33,:40` | yes |
| `ai-videos` | 116 | **none** | queue | yes `:34,:41` | yes |
| `auto` | 124 | `create/auto` | queue | yes `:43,:50` | yes |
| `micro-drama` | 113 | `create/drama` | queue | yes `:40,:47` | yes |
| `extract-shorts` | 116 | `create/shorts` | queue | yes `:40,:47` | yes |
| `avatar` | 144 | `create/avatar` | queue | yes `:39` | yes |
| `whiteboard` | 126 | `create/whiteboard` | queue | yes `:27` | yes |
| `bulk-plan/push` | 20 | `create/bulk` | queue | yes (pusher `:46`) | yes `'queued'` |
| `images` | 73 | **none** | terminal (never renders) | yes `:36,:54` | `:36` yes / **`:54` NO** |
| `whiteboard/character-sheet` | 33 | `create/whiteboard` | plan-only | via orchestrator | **NO** |
| `mission` | 104 | `create/mission/[id]` | plan-only | via orchestrator `:132` | **NO** |
| `bulk-plan` | 31 | `create/bulk` | utility (no DB) | **never inserts** | n/a |
| `scrape` | 65 | `create/url` | utility (no DB) | **never inserts** | n/a |

### Correction to `AGENTS.md` — the record is partly wrong

`AGENTS.md` states that `bulk-plan`, `mission`, `scrape` and
`whiteboard/character-sheet` "leave the column unset … reproduced live". Traced to
the actual write sites:

- **`scrape` and `bulk-plan` are NOT a problem.** Neither inserts into
  `render_jobs` anywhere in the codebase (verified across all of `app/` and
  `lib/`). They cannot create a job, so they cannot create a poison job.
- **`mission` IS a real poison** — `lib/engine/mission-orchestrator.ts:132`
  inserts with `status: 'processing'`, no `orchestration_state`, and `logs`
  containing no `beats`.
- **`whiteboard/character-sheet` IS claimable** — `lib/engine/whiteboard-orchestrator.ts:221`
  upserts with `status: 'pending'`, and the file **never** sets
  `orchestration_state` anywhere (grep: 0 hits). It *does* carry `beats`, so it
  is not the empty-`concat.txt` case — it competes for the worker, and (see §7)
  may duplicate work.
- **One AGENTS.md missed entirely:** the `images` route's **error path**
  (`app/api/workflows/images/route.ts:54`) inserts with `status: 'failed'` and no
  `orchestration_state` and no `beats` — claimable and beatless.

**Net: 3 real write sites, not 4, and a different set than documented.** This
correction is itself part of the deliverable — `AGENTS.md` is load-bearing for
future sessions and currently sends them to the wrong three files.

### Already built — do not recreate

- `lib/jobs/render-job.ts` — `claimRenderJob` / `completeRenderJob` /
  `failRenderJob` RPC wrappers. The **claim** side is already correct and shared.
- `supabase/migrations/20260905_render_job_leases.sql` — `claim_render_job`,
  already guarded by Tier 20 (`T20-CLAIM-01/02/03`), which parses the claimable
  set out of the migration so it cannot drift.
- `lib/engine/*orchestrator.ts` — 7 per-workflow orchestrators. The natural seam;
  left in place.

The gap is exclusively the **enqueue** side. The claim side is fine.

## 3. Non-goals

- **No URL changes.** All 14 paths stay exactly where they are (user decision).
  Nothing in `app/(app)/create/*`, `components/`, `tests/`, or the docs breaks.
- **No microservices, no new infrastructure.** No Redis, no BullMQ, no HTTP
  service-to-service, no containers, no queue library. The queue stays the
  Postgres `render_jobs` table + `claim_render_job` RPC.
- **No render-worker changes.** The media-sourcing fix stays in its own spec.
- **No deletion of the 3 orphaned routes** (`images`, `stories`, `ai-videos`).
  No UI caller ≠ dead API. They get documented as API-only.
- **No UI/page changes.** No component or page is edited.
- **No new columns, no migration.** `orchestration_state` already exists.

## 4. Design

### 4a. One shared enqueue helper — `lib/jobs/enqueue.ts` (new)

The claim side is already a shared, tested helper. The enqueue side is copied 14
times. Extract it.

```ts
export type RenderIntent =
  | 'render'      // worker WILL render this: requires non-empty beats
  | 'plan-only'   // unclaimable; beats are still being produced
  | 'terminal'    // unclaimable; this job will never render

/** intent -> orchestration_state. 'render' is the ONLY claimable value. */
const STATE_FOR: Record<RenderIntent, string> = {
  render: 'queued',
  'plan-only': 'planning',
  terminal: 'completed',
}

export async function enqueueRenderJob(spec: {
  id: string
  intent: RenderIntent
  status: string
  progress?: number
  logs: Record<string, unknown>
  client?: SupabaseClientLike
}): Promise<{ ok: true } | { ok: false; error: string; downgraded: boolean }>
```

Rules the helper enforces:

1. **It is the only sanctioned way to write `orchestration_state`.** The mapping
   is a single `STATE_FOR` table, so the claimable value is opt-in and explicit.
2. **A `'render'` insert with zero renderable beats is refused.** If
   `intent: 'render'` and the resolved beat list is empty, the helper downgrades
   to `'plan-only'` and returns `{ ok: false, downgraded: true }`. This makes the
   empty-`concat.txt` class **impossible to construct**, not merely discouraged.
3. It never leaves the column unset. If the `orchestration_state` write fails it
   retries as the intended state rather than falling back to the column DEFAULT.
4. `beats` is read from a single place (`spec.logs.beats` or
   `spec.logs.analysis.scenes`), so "what counts as renderable" is defined once.

### 4b. Per-route contract header — every `route.ts`

A standard block at the top of all 14 routes, so opening any one answers
"what does this do to the queue" without reading the body:

```ts
/**
 * WORKFLOW ROUTE — <name>
 *   KIND:          queue | plan-only | terminal | utility
 *   UI CALLER:     <path> | NONE (API only)
 *   WRITES QUEUE:  <render_jobs row | none>
 *   CLAIMABLE:     yes | no
 *   DISTINCT FROM: <the route it is most often confused with, and how>
 */
```

`DISTINCT FROM` is mandatory — it is where the `images` vs
`generate?workflow=images` confusion gets written down.

### 4c. `app/api/workflows/README.md` (new) — the index

A table of all 14 routes: name, kind, UI caller, claimable, and one line on what
it actually returns. This is the artifact that stops the next person from
assuming `bulk-plan` queues a video.

### 4d. The three fixes

| Site | Was | Becomes |
|---|---|---|
| `lib/engine/mission-orchestrator.ts:132` | insert, `status:'processing'`, **no state**, no beats | `enqueueRenderJob({ intent: 'plan-only', status: 'processing' })`; promoted to `intent: 'render'` at the point it writes real beats |
| `lib/engine/whiteboard-orchestrator.ts:221` | upsert, `status:'pending'`, **no state** | `enqueueRenderJob({ intent: <see §7 open question> })` |
| `app/api/workflows/images/route.ts:54` | error-path insert, `status:'failed'`, **no state**, no beats | `enqueueRenderJob({ intent: 'terminal', status: 'failed' })` |

`generate`, `stories`, `auto`, `ai-videos`, `micro-drama`, `extract-shorts`,
`avatar`, `whiteboard`, and `bulk-plan-pusher` are **migrated onto the helper
without a behavior change** — same state, same beats, same status. That is what
keeps the refactor reviewable: same behavior, one way to express it.

## 5. Affected files

**New (4):**
- `lib/jobs/enqueue.ts` — the helper + `RenderIntent`
- `lib/jobs/enqueue.test.ts` — vitest unit tests
- `app/api/workflows/README.md` — the index
- `tests/e2e/standalone-runner.js` — **modified**, see below

**Modified (17):**
- `lib/engine/mission-orchestrator.ts`, `lib/engine/whiteboard-orchestrator.ts` — the two poison fixes
- `app/api/workflows/images/route.ts` — error-path fix + contract header
- `app/api/workflows/{generate,stories,ai-videos,auto,micro-drama,extract-shorts,avatar,whiteboard,bulk-plan/push}/route.ts` — migrate onto the helper + header
- `app/api/workflows/{bulk-plan,scrape,mission,whiteboard/character-sheet}/route.ts` — header only
- `tests/e2e/standalone-runner.js` — add `'Tier 24: Workflow Route Contracts'` to
  **both** the `tiers` array and a `tests.push` block (per `AGENTS.md`, a tier
  name missing from the array silently never runs)
- `AGENTS.md` — correct the `scrape`/`bulk-plan` error and record the
  `images`-error-path case

**Explicitly untouched:** every file under `app/(app)/`, `components/`,
`remotion/`, `supabase/migrations/`, `lib/media/`, `lib/engine/ffprobe.ts`,
`scripts/render-worker.ts`.

## 6. Acceptance criteria

### Helper behavior (vitest)
- `T27-ENQ-01` — `intent:'render'` with non-empty beats writes `orchestration_state: 'queued'`.
- `T27-ENQ-02` — `intent:'render'` with **zero** beats is refused and the row is
  left `'planning'` (never `'queued'`). **This is the load-bearing test.**
- `T27-ENQ-03` — `intent:'plan-only'` writes `'planning'`.
- `T27-ENQ-04` — `intent:'terminal'` writes `'completed'`.
- `T27-ENQ-05` — beats are read from `logs.beats` **or** `logs.analysis.scenes`,
  and either counts as renderable.
- `T27-ENQ-06` — a write failure retries with the intended state and never
  leaves the column to its DEFAULT.

### Poison-class elimination (`Tier 24`, source-level)
- `T24-POI-01` — `mission-orchestrator.ts` contains no `render_jobs` insert that
  omits `orchestration_state`; it calls `enqueueRenderJob`.
- `T24-POI-02` — `whiteboard-orchestrator.ts` calls `enqueueRenderJob`.
- `T24-POI-03` — `images/route.ts` calls `enqueueRenderJob` on **both** the
  success and the error path.
- `T24-POI-04` — **exhaustive**: a scan of every `render_jobs` insert/upsert in
  `app/` and `lib/` finds that each is either inside `enqueueRenderJob` or
  passes an explicit `orchestration_state`. This is the test that generalises —
  it catches a poison site added *after* this change.
- `T24-POI-05` — `scrape/route.ts` and `bulk-plan/route.ts` are documented
  `CLAIMABLE: no` and contain no `render_jobs` write.

### Isolation (`Tier 24`)
- `T24-ISO-01` — all 14 routes carry a contract header with all five fields.
- `T24-ISO-02` — `images/route.ts` `DISTINCT FROM` names `generate?workflow=images`
  and states which one renders.
- `T24-ISO-03` — `README.md` lists all 14 routes and its row count equals the
  number of `route.ts` files under `app/api/workflows/` (so it cannot go stale
  silently).
- `T24-ISO-04` — the 3 routes with no UI caller are marked `NONE (API only)`.

### No regression
- `T27-NOR-01` — `pnpm exec vitest run --no-file-parallelism` green, **including**
  the pre-existing `test/shot-boundary.test.ts` and `T20-CLAIM-*`.
- `T27-NOR-02` — `pnpm test` (201 e2e tests) green.
- `T27-NOR-03` — `pnpm lint:scoped` and `pnpm typecheck` clean, or any failure
  proven pre-existing by running the same command on a clean tree first.
- `T27-NOR-04` — **every route URL is byte-identical.** A source scan asserts the
  14 paths under `app/api/workflows/` are unchanged.
- `T27-NOR-05` — no file under `app/(app)/` or `components/` is modified
  (`git diff --name-only` shows none).

## 7. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **Whiteboard double-render.** `whiteboard-orchestrator` upserts a claimable row at `:221` but the function *returns* a `videoUrl` at `:246`, i.e. it appears to render a video itself. | High | **Open question below.** Choosing `intent:'terminal'` stops the FFmpeg worker competing for it; `'plan-only'` leaves it unfinished. Do not guess. |
| **Mission's real intent is unknown** — it may legitimately want to render later | Med | Spec'd as `'plan-only'` + promotion, matching `generate`'s proven pattern. If mission never writes beats, `'plan-only'` leaves rows permanently unclaimable (harmless, and visible as `planning`). |
| **14-route migration is a large diff for a no-behavior-change claim** | Med | Only 3 sites change behavior. The other 11 are helper substitution, covered by `T27-NOR-*`. Review by site count, not line count. |
| **`T24-POI-04` (exhaustive scan) could be brittle** to formatting | Med | Match on `enqueueRenderJob(` / `orchestration_state` presence per insert block, not on exact whitespace. A false failure is a loud prompt to look, not a silent pass. |
| **AGENTS.md correction may be contested** | Low | Every claim in §2 cites a file:line and a grep result. It is checkable, not opinion. |
| **Pre-existing red in the tree** (`app/api/settings/keys/route.ts` — `logger` undefined) | Low | Prove pre-existing by running the same command on a clean tree **before** changing anything, and report both runs. Do not claim a green that was not green before. |
| **vitest flakes at full-suite scale** | Low | Per `AGENTS.md`: `--no-file-parallelism`; a single failing full run is not a regression signal — re-run the file alone, then the suite twice. |

### Open question — must be answered before implementing §4d row 2

`whiteboard-orchestrator.ts` returns a `videoUrl` from the same function that
queues a `render_jobs` row. Which is it?

- **(a) It renders its own video** (Remotion) → `intent: 'terminal'`. The FFmpeg
  worker should never touch it, and the queued row exists only for status.
- **(b) It only produces a preview and expects the worker to finish it** →
  `intent: 'render'`, and it must supply real beats *with* media URLs (which is
  the media-sourcing gap in the other spec).

I could not determine this from the source alone and will not guess. **Which is
it?** If you do not know, I will read `whiteboard-orchestrator.ts` fully and
report what it actually does before implementing.

## 8. Implementation order (next session, after sign-off)

1. Answer §7; if (b) or unknown, read the orchestrator and report first.
2. Failing tests for §6 (red) — `lib/jobs/enqueue.test.ts` + `Tier 24` in the runner.
3. `lib/jobs/enqueue.ts`; `T27-ENQ-*` green.
4. The 3 poison fixes; `T24-POI-*` green.
5. Migrate the 11 behavior-preserving sites; `T27-NOR-01/02` green.
6. Contract headers on all 14 + `README.md`; `T24-ISO-*` green.
7. Correct `AGENTS.md`.
8. `pnpm lint:scoped` → `pnpm typecheck` → `pnpm exec vitest run --no-file-parallelism` → `pnpm test` → `pnpm build`.
9. Update this spec with the final state.
