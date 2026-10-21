# Spec — make `workflowType` real, and rebuild the stories pipeline

Date: 2026-09-28
Status: **awaiting sign-off** (nothing implemented yet)

## Trigger

`/create/stories` renders byte-identical UI to `/create/ai-videos`, `/create/footage`
and `/create/images`. User asked whether stories should get a dedicated page or stay on
the shared `CreationWizard`, and chose: **parameterize all four routes**, and do a
**full rewrite of the stories pipeline**.

Investigating that surfaced something bigger than a dead prop.

## Findings (all evidence-backed)

### F1 — the queue boundary discards the entire wizard output

`app/api/workflows/generate/route.ts` is what `CreationWizard.sendToQueue()` posts to
(`components/wizard/CreationWizard.tsx:121`). Its destructure (L9–31) never includes
`beats`, `aspectRatio`, or `subject`. The route then calls
`videoOrchestrator.generateVideoPlan(script, [...])` (L97) — re-deriving a plan from the
**bare narration string**.

So every beat, every user-picked asset URL, the subject and the aspect ratio are dropped,
then the render is re-planned from scratch. This affects **all four wizard routes**, not
just stories.

Proven against the live dev server + Supabase:

```
POST /api/workflows/generate -> 200 {"success":true,"jobId":"72fbe143-…"}
logs.beats       : null
logs.aspectRatio : null
logs.subject     : null
beats survived?  : false
```

### F2 — jobs from that route are never claimable, so nothing ever renders

`claim_render_job` claims only `orchestration_state IN ('queued','retryable')` (or an
expired lease). The route writes `orchestration_state` as an **object**
(`{workflow, voice, voiceProvider, subtitleSettings}`, L53–58 and L116–119), which
Postgres stores as a JSON string that is in neither set.

Proven:

```
orchestration_state : "{\"workflow\":\"stories\",…}"
claim_render_job()  : []            <- render worker will never pick this up
status              : generating_plan
```

**Net user-visible behaviour today:** the 5-step wizard works, "Send to Queue" enables,
you click it, you get `200 "Job started successfully"` and a redirect to
`/dashboard?job=…`, and **no video is ever produced.** The button reports success on a job
that is stranded permanently.

There is a conflict to respect: the render worker reads
`orchState.subtitleSettings` from `orchestration_state` (L393) but parses it with
`JSON.parse` (L387–388). The proven-working convention — used by `/api/v1/generate`,
which is the path that *did* render end-to-end earlier in this session — is
**plain state strings in `orchestration_state`, everything else inside `logs`**
(`render-worker.ts:380-384` merges `job.logs` into `params`, and
`params.subtitleSettings` is the fallback). Fix F1+F2 by adopting that convention.

### F3 — `workflow` is a label, not a behaviour

In `/api/workflows/generate` the only branch is `workflow === 'images'` → image
orchestrator, else video orchestrator. `stories`, `ai-videos` and `footage` are identical.
Same pattern in `/api/v1/generate`: `selectedWorkflow` is validated, costed and logged,
then the enrichment prompt hardcodes *"a punchy script for a 30s video… 6-8 beats"* and
`durationSeconds = 30` regardless (`app/api/v1/generate/route.ts:66,132`).

### F4 — the "real" stories pipeline exists but is plan-only and unwired

`lib/engine/stories-orchestrator.ts` (13KB) produces a genuinely richer structure:

```
StorySeriesResponse { seriesTitle, parts: StoryPart[], metadata }
StoryPart { partNumber, title, hook, script, cliffhanger, scenes: Scene[], estimatedDuration }
Scene     { id, text, description, visualPrompt, cameraMotion, duration, emotion, keywords }
```

But `/api/workflows/stories` writes it only into `render_jobs.logs.result` with
`orchestration_state: 'planning'` (L34–59) — **no beats are ever written and no video is
ever rendered**. It is a plan generator. The wizard never calls it.

It is also behind the deferred OmniRoute gate (`stories-orchestrator.ts:63-64`).

### F5 — the v1 stories script branch throws away its own sections

`app/api/v1/script/route.ts:34-59` does the outline-then-per-section loop that *is* the
right shape for long-form stories, builds `sections`, writes each one — then returns only
`{ narration, keywords }`. Section titles and `covers` are discarded, so the client can
neither display nor re-roll a section.

### F6 — no `stories` branch in analyze, so story beats get stock keywords

`app/api/v1/analyze/route.ts:15-20` differentiates only `images` (image prompt) and
`ai-videos` (Kling/Luma prompt). `stories` falls through to
`"3-5 search keywords for stock footage"` — wrong for a narrative, which needs
`description` / `visualPrompt` / `emotion`, the fields `Scene` already has.

### F7 — `workflowType` is a dead prop in the UI

Threaded into every API payload, drives **zero** markup. All four page files are identical
but for the string prop.

## Measured gap matrix (probes run 2026-09-28 against the live dev server + Supabase)

### The wizard's own queue path — 0/4 workflows

`POST /api/workflows/generate` with the exact payload `CreationWizard.sendToQueue()` sends:

| workflow | http | status | plain state? | beats kept | aspectRatio | subject | claimable |
|----------|------|--------|--------------|-----------|-------------|---------|-----------|
| stories  | 200 | generating_plan | no | 0 | null | null | **NO** |
| ai-videos| 200 | generating_plan | no | 0 | null | null | **NO** |
| footage  | 200 | generating_plan | no | 0 | null | null | **NO** |
| images   | 200 | generating_plan | no | 0 | null | null | **NO** |

All four return `200 {"success":true}` on jobs that can never render.

### Nothing in the app flips `planning` -> `queued` except one route

A repo-wide search for `orchestration_state: 'queued'` returns exactly **one** hit:
`app/api/v1/generate/route.ts:167`. So:

| route | writes | outcome |
|-------|--------|---------|
| ai-videos, auto, avatar, extract-shorts, micro-drama, stories, whiteboard | `'planning'` | claimable never — planning-only, by design, but nothing ever promotes them |
| images | `'completed'` | terminal, never renders |
| **generate** (the wizard's) | **object** | **never claimable — the F2 bug** |
| bulk-plan, mission, scrape, whiteboard/character-sheet | unset -> `'queued'` | **claimable but beatless** — see below |

### The "unset" routes burn all 3 attempts (Tier 20's failure mode, still live)

`/api/workflows/mission` was created live and the running worker picked it up:

```
Found pending job: 9edee1c1-…
   -> Generating TTS for 0 beats...
   -> Concatenating 0 clips into final video...
Job 9edee1c1-… failed: ffmpeg exited with code 1: …\concat.txt: Invalid data found when processing input
(repeats for all 3 attempts, ~7s apart, then failed)
```

`bulk-plan`, `scrape` and `whiteboard/character-sheet` have the same shape: they default to
the claimable `'queued'` and write no `beats`. Tier 20 guarded the *insert* side of this
(7 planning-only routes must set `'planning'` explicitly) but these four were never
covered, because the failure mode is "column left to its default" rather than a wrong value.

### The headline: no UI path can produce a video

Every endpoint the UI POSTs to for queueing:

```
components/wizard/CreationWizard.tsx  /api/workflows/generate        <- the broken one
components/wizard/CreationWizard.tsx  /api/v1/{script,analyze,source}  <- planning helpers, fine
```

No page calls `/api/v1/generate`, the one route that reliably produces a rendered mp4
(verified end-to-end earlier in this session). The dedicated single-form pages post to
their own routes, all of which land in the `'planning'` or beatless-`queued'` buckets above.

**So every workflow page in the app currently ends in a job that never renders** — the four
wizard routes silently, the dedicated pages either silently (`'planning'`) or noisily (three
ffmpeg failures then a failed job).

### Route-level notes from the sweep

- `bulk-plan` returns `400 {"error":"Niche is required"}` — its validation rejects anything
  but its own niche-shaped body.
- `scrape` returns `500 {"error":"Failed to fetch URL: Not Found"}` for a plain example.com
  URL.
- `whiteboard/character-sheet` returns `200` with a `characterId` but **no jobId** — it
  creates no `render_jobs` row at all.

## Constraints

- `RenderBeat` is `{id, text, duration, clipUrl}` (`scripts/render-worker.ts:426`) and the
  render path is workflow-agnostic. A story's `Scene[]` maps onto it cleanly; part-level
  structure (partNumber / hook / cliffhanger) is *presentation* that flattens away at
  render time. So no worker change is required.
- Must not regress Tier 20 (`orchestration_state` claimability) — and should extend it.
- Must keep `/api/v1/generate`'s developer-API behaviour intact; it is a separate surface
  with its own auth.
- Latency: `/api/v1/script` already takes ~90s. A per-section loop multiplies this. Any
  section re-roll must be a single call, not a full re-plan.

## Plan

### Phase 1 — fix the queue boundary (unblocks all four routes; highest value, lowest risk)

`app/api/workflows/generate/route.ts`:

1. Destructure and **persist** `beats`, `aspectRatio`, `subject`, `tone`, and the voice /
   music settings into `logs` — the field the render worker actually reads.
2. Write `orchestration_state` as the plain strings `'planning'` → `'queued'`, matching
   `/api/v1/generate`, instead of an object.
3. **When the client supplies `beats`, do not re-plan** — queue straight to `'queued'`
   with those beats. Re-planning only happens when beats are absent (the
   generate-without-a-wizard case), preserving today's behaviour for that path.
4. Keep `subtitleSettings` in `logs` (the worker's `params` fallback), so the existing
   `orchState.subtitleSettings || params.subtitleSettings` chain still works whichever way
   the state string parses.
5. `workflow` selects the orchestrator only on the fallback path; with client beats it is
   recorded as metadata.

Guards: extend Tier 20 to assert that this route never writes a non-string
`orchestration_state` and never drops `beats`; a new Tier 22 for the queue boundary.

### Phase 2 — make the stories pipeline real

6. `script/route.ts`: return the `sections` it already builds (title + covers + narration
   per section), and add a single-section re-roll endpoint so the UI can re-roll one part
   without a full re-plan.
7. `analyze/route.ts`: add a `stories` branch producing
   `{text, duration, description, visualPrompt, emotion, cameraMotion, keywords}` per
   scene, matching the `Scene` shape, instead of stock-footage keywords.
8. Carry part structure through: the story response's `parts[]` becomes the beat grouping,
   with `partNumber`/`hook`/`cliffhanger` retained for display, and each scene flattened
   to a `RenderBeat` at queue time.
9. Un-wire the OmniRoute gate on the stories path only (F4), so stories does not depend on
   a gateway key to produce a plan.

### Phase 3 — parameterize the UI

10. Drive step content off `workflowType` via one registry in `wizard-store.ts`:
    per-workflow step hints, the analyze instruction, and which steps apply. The four
    routes stop being clones without forking the step components.
11. Stories-only Script step: section list with per-section re-roll; Scenes step grouped
    by part with narrative asset pickers.
12. Extend Tier 21 with a guard that `workflowType` reaches the rendered step content, so
    the prop cannot silently go dead again.

## Verification plan

- Unit: `pnpm exec vitest run --no-file-parallelism` (run twice — suite is known-flaky).
- E2E: `pnpm test`, plus new Tier 22 for the queue boundary.
- **Behavioural, not just source-assertion:** re-run the live probe that produced the
  evidence above, and assert `logs.beats` is populated and `claim_render_job()` returns the
  job. Then drive the wizard in a browser to a real rendered mp4 via its own Send to
  Queue — the path that is currently broken and has never been verified end-to-end.
- `pnpm lint:scoped` → `pnpm typecheck` → `pnpm build`.

## Risks

- Phase 1 changes a live queue path; the dashboard/mission pages read these jobs. Mitigate
  by keeping the no-beats fallback byte-compatible.
- Phase 2 multiplies LLM calls. The 90s script call is already the slowest thing in the
  app; cap section count and keep re-roll single-call.
- The stories orchestrator's OmniRoute gate is one of the 6 sites from the still-unanswered
  decoupling question. Fixing it here is deliberate but overlaps that decision — flagging
  it rather than silently expanding scope.
