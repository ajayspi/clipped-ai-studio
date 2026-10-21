# Spec: Stickman explainer video workflow

Status: DRAFT — awaiting sign-off. No code written yet.
Date: 2026-09-28
Slug: stickman-workflow
File: `.opencode/spec-stickman-workflow.md`

---

## 1. Goal

Add a `stickman` workflow to clipped that produces a fully animated, narrated
explainer video end-to-end, queue→claim→render, using only APIs and code that
already exist in this repo plus at most one new module.

A user posts a topic. They get back a renderable `render_jobs` row containing
timed beats, each with a vector stickman performance and a background, plus a
voiceover. The existing render worker turns it into an MP4 at
`/renders/<jobId>.mp4`.

Decisions taken (see §9 for the rejected alternatives):

| Decision | Choice |
|---|---|
| Animation | Vector stickman (reuse the 9 poses) tweened per beat |
| Backgrounds | `lib/media` cascade: fal-ai/flux/dev → Openverse/Pexels/Pixabay → Pollinations |
| Voiceover | `ttsEngine.synthesize()` — ElevenLabs already supported, else Edge TTS fallback |
| Render path | `scripts/render-worker.ts` + ffmpeg now; beat contract stays Remotion-swappable |
| Scope | New workflow **and** fix the 2 live `orchestration_state` claim bugs |
| Paid calls | fal.ai key available; tests must still run with zero paid calls |

## 2. Non-goals

- **No UI.** No wizard entry, no dashboard card, no settings screen. Backend only.
- **No server-side Remotion renderer.** `remotion/Composition.tsx` stays unused.
  We only ensure the beat contract *could* feed it later.
- **No new DB migration.** Beats travel inside `render_jobs.logs` JSON, exactly
  as every other workflow does. There is deliberately no `beats` column.
- **No lip-sync, no facial features, no limb skinning.** Stickman is a
  geometric figure with a head, torso, two arms, two legs.
- **No Google Flow / Veo / Kling video generation.** The character is vector, so
  character consistency across scenes is structural, not prompt-engineered.
- **Not a fix for the two live claim bugs in spirit** — those are fixed only
  because a new workflow sitting next to them would inherit them (§6).

## 3. What already exists (do not recreate)

Verified by reading the code, not assumed.

| Asset | Location | Reuse |
|---|---|---|
| 9 stickman poses + `POSE_GRID_BBOXES` | `lib/ai/gemini-character-generator.ts:38-121` | **The character.** Poses are hand-written SVG path data, composed to a `data:image/svg+xml` URI at `:126-160`. No image model involved. |
| Sentiment → pose picker | same file, `:336-383` `mapSentimentToPose` / `getPose` | Maps a beat's tone to a pose key |
| fal.ai queue client | `lib/media/fal-client.ts:20` `submitAndWait` | Submit + poll; `timeoutMs=90000`, `pollIntervalMs=2000` |
| Background cascade | `lib/media/media-selector.ts` `selectSceneMedia` | Existing stock → flux → Pollinations order |
| Free image sources | `lib/media/image-sources.ts:22,51,84,129` | Openverse, Pexels, Pixabay, Pollinations |
| TTS | `lib/engine/tts.ts:727` `TTSEngine.synthesize` | ElevenLabs `:1069`, Edge TTS `:1307`. Returns `audioBuffer` + `audioUrl` data-URL |
| Beat schema | `packages/schema/src/render-params.ts:40-72` | `RenderBeatSchema` — the contract to conform to |
| Queue + leases + retries | `supabase/migrations/20260905_render_job_leases.sql` | `claim_render_job` / `complete_render_job` / `fail_render_job` |
| Render | `scripts/render-worker.ts` | Per-beat asset → ffmpeg → `concat.txt` → `/renders/<id>.mp4` |
| Provider keys | `lib/keys.ts:155` `getApiKey` | env var → `settings` row |

Explicitly **not** reusable: `scripts/lib/render-command.ts` is dead code
(`runSinglePassRender` is imported by nothing and covered by no test). We mirror
`render-worker.ts`'s per-beat + concat path instead of half-adopting it.

## 4. The beat contract

The stickman workflow produces ordinary `RenderBeat` objects — no new schema
version, no new column, no special field. The render worker must not be able to
tell a stickman beat from a stock-footage beat except by what the media URL is.

```ts
// lib/engine/stickman-orchestrator.ts — the shape we assemble
{
  id: string,
  text: string,          // on-screen copy for this beat
  duration: number,      // seconds; also drives the tween
  narration: string,     // data:audio/mp3;base64 from ttsEngine.synthesize()
  imageUrl: string,      // <-- the background still
  prompt: string,        // kept for provenance/debugging
  // stickman specifics, carried inside the existing free-form beat:
  stickman: {
    archetype: string,   // e.g. 'explainer'
    poseA: string,       // pose key at t=0
    poseB: string,       // pose key at t=1
    svg: string,         // composed character sheet, data:image/svg+xml
    bbox: { x: number; y: number; w: number; h: number }  // from POSE_GRID_BBOXES
  }
}
```

`RenderBeatSchema` has no `stickman` key, so the field is additive and lives
under the same JSON blob the worker already `JSON.parse`s
(`render-worker.ts:380-391`). `zod` strips unknown keys on parse, so the worker
must not *require* it — it only needs `imageUrl` + `narration` to work.

### Why `imageUrl` and not a video

`render-worker.ts:544-556` probes each asset with `isVideoFile` and applies
Ken Burns pan/zoom to stills. A still background therefore needs zero worker
changes. A vector stickman layered on top is the *only* genuinely new render
step, and it is owned by us, not by the worker.

## 5. Affected files

**New (3):**
- `lib/engine/stickman-orchestrator.ts` — pose selection, background fetch, TTS,
  beat assembly, promotion to `'queued'`
- `lib/ai/stickman-animator.ts` — the pose interpolator. Pure function
  `interpolatePose(poseA, poseB, t) => PoseFrame`. No I/O, no network; this is
  what makes the character deterministic
- `app/api/workflows/stickman/route.ts` — POST, mirrors the shape of
  `app/api/workflows/generate/route.ts`

**Modified (3):**
- `app/api/workflows/images/route.ts:54` — add `orchestration_state: 'completed'`
  to the error-path insert
- `lib/engine/mission-orchestrator.ts:132` — add
  `orchestration_state: 'planning'`
- `tests/e2e/standalone-runner.js` — new tier + tests (§7)

**Explicitly untouched:** `scripts/render-worker.ts`,
`supabase/migrations/*`, `schema.sql`, `remotion/Composition.tsx`, any UI file.

## 6. Expected behavior

### `POST /api/workflows/stickman`

Request: `{ topic: string, voice?: string, aspectRatio?: string,
beatCount?: number }` → `beats: 5-8`, default 6.

Response: `202 { jobId }` immediately. Generation continues in an
`orchestrator`-style async block, mirroring the `setTimeout` pattern already in
`app/api/workflows/generate/route.ts:226-255`.

### The state machine — the part that must not be got wrong

```
1. insert render_jobs {
     status: 'generating_plan',
     progress: 0,
     orchestration_state: 'planning',   <-- EXPLICIT. Never omit.
     logs: JSON.stringify({ ...jobLogs })   <-- no `beats` key yet
   }

2. plan beats from topic (LLM via lib/engine/llm.ts, keyless fallback)
3. for each beat: resolve poseA/poseB, fetch background, synthesize narration
4. update render_jobs {
     logs: JSON.stringify({ ...logs, script, beats, finalVideoUrl }),
     orchestration_state: 'queued',   <-- THE ONLY PROMOTION
     status: 'processing', progress: 20
   }

   on failure -> orchestration_state: 'failed', status: 'failed'
```

Two invariants, both from the Tier 20/22 tests already in the repo:

- **`orchestration_state` is never omitted.** The column DDL is
  `NOT NULL DEFAULT 'queued'` (migration line 2) and `'queued'` is claimable.
  A beatless job that defaults to `'queued'` gets claimed, builds an empty
  `concat.txt`, and fails all 3 attempts.
- **A job is never promoted to `'queued'` without `beats` in `logs`.** Same
  failure, same 3-attempt burn.

On `pnpm dev` the LLM call may fail (no key). We follow the
`app/api/v1/generate/route.ts:152-154` precedent and emit a deterministic
fallback beat list from the topic, so the route never produces a beatless job.

### The two bug fixes (in scope)

Both are one-line additions of an explicit `orchestration_state`:

- `app/api/workflows/images/route.ts:52-60` — the **catch** block inserts a
  `status: 'failed'` job with no `orchestration_state`. The success path at
  `:43` already sets `'completed'`. So a failed *image* job is currently
  claimable by the FFmpeg render worker and burns 3 attempts on a job that has
  no beats and never will. Fix: `'completed'` (terminal, matching the sibling
  insert) — it has no render work outstanding.
- `lib/engine/mission-orchestrator.ts:130-142` — inserts
  `status: 'processing'`, no `orchestration_state`, and `logs` carries the
  mission state object with no `beats` array. Fix: `'planning'`, which keeps
  the worker away. This is the honest value: the mission orchestrator's later
  stages are not yet known to write a claimable beat list, and marking it
  `'queued'` would be asserting something unverified.

## 7. Acceptance criteria

Written as the failing tests we will write first. Tier 24, appended to the
`tests/e2e/standalone-runner.js` `tiers` array **and** registered in
`tests.push({tier, id, title, fn})` — per the repo note, a tier missing from
the array silently never executes.

**Contract / claim safety** (source-parsing style, like Tier 20 and 22):
- `T24-CLAIM-01` — `app/api/workflows/stickman/route.ts` exists and its insert
  writes `orchestration_state` literally. Parse it out and assert it is
  `'planning'`, cross-checked against the `IN` list scraped from the migration.
- `T24-CLAIM-02` — exactly one `'queued'` write, and it is in the same update
  that writes `beats` into `logs`. Structural assertion: no `'queued'` write
  anywhere in the file that is not in the promoting update.
- `T24-CLAIM-03` — the route contains no `orchestration_state: {` (object form).

**The two bug fixes:**
- `T24-BUGFIX-01` — `app/api/workflows/images/route.ts` has **zero** `insert`
  calls that omit `orchestration_state`.
- `T24-BUGFIX-02` — `lib/engine/mission-orchestrator.ts` insert sets
  `'planning'`.

**Animation determinism** (real logic, not source-parsing):
- `T24-ANIM-01` — `interpolatePose(p, p, t)` returns the same pose for every
  `t` in `[0,1]`. Static input, static output.
- `T24-ANIM-02` — every value in a returned `PoseFrame` is finite (no `NaN`,
  no `undefined` limb coordinates) across a sweep of `t` steps and all 9 poses.
  NaN here becomes a broken SVG and a silent black frame.
- `T24-ANIM-03` — `t=0` equals pose A and `t=1` equals pose B, within epsilon.
  Otherwise the stickman visibly jumps at the beat boundary.
- `T24-ANIM-04` — pose keys are validated against `POSE_DEFINITIONS`; an
  unknown key throws rather than emitting a malformed frame.

**Beat assembly** (mocked I/O — no paid calls):
- `T24-BEAT-01` — assembled beats conform to `RenderBeatSchema`
  (`packages/schema/src/render-params.ts:40-70`); unknown-key stripping does
  not remove `text`, `duration`, `imageUrl`, `narration`.
- `T24-BEAT-02` — with the LLM and the network both forced to fail, the
  orchestrator still returns ≥1 beat. This is the regression guard for the
  empty-concat failure mode.
- `T24-BEAT-03` — every beat has a non-empty `imageUrl` and a `narration`.

**No paid calls in CI:**
- `T24-COST-01` — no test in Tier 24 issues a network request. Assert the test
  bodies reference no `fetch` to a real host; mock `submitAndWait` and
  `searchImages`.

## 8. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **The empty-concat failure mode recurs.** A promoted-but-beatless job burns all 3 attempts and is marked failed with a confusing ffmpeg error | High | `T24-CLAIM-02` and `T24-BEAT-02` are structural, not behavioural — they assert on the *shape* of the writes so the bug cannot be reintroduced silently |
| **9 poses read as stiff.** Pose-to-pose tweening of 9 fixed poses is not expressive; this will not look like the video's Google Flow output | Med | Accepted, stated in non-goals. `lib/ai/stickman-animator.ts` is the seam: more poses or real limb kinematics can be added without touching the route, the contract, or the worker |
| **Vector stickman needs a server-side render that does not exist.** The pose interpolator emits frames; *something* must rasterise and composite SVG-over-background | High | This is the main implementation cost. Prefer SVG→PNG (sharp is already a dep) then let the worker's existing ffmpeg path composite. If that proves too slow, the fallback is baking the stickman into the background `imageUrl` before the worker sees it — a single raster step, no worker change either way |
| **fal.ai 90s timeout on a 6-beat run** | Med | `submitAndWait` is already async per model. Fetch backgrounds in parallel, and on flux failure fall through to the existing free cascade rather than failing the job |
| **Repo test flakiness.** The vitest suite is documented flaky even with `--no-file-parallelism` | Med | Tier 24 lives in the **e2e runner** (`pnpm test`), which has no fork-worker timeouts. `test/` (vitest) is left alone |
| **TTS data-URL size.** `narration` is a base64 data-URL inside `logs` TEXT | Low | 6 beats × ~30s ≈ manageable, but `logs` has no length limit and this is the one field that could bloat it. Flag, do not solve — check real sizes during implementation |
| **Pre-existing red in the tree** | Low | `pnpm typecheck` already fails on 2 errors in `app/api/settings/keys/route.ts` (`logger` undefined) from unrelated WIP. We do not touch that file, and we do not claim a green typecheck |

## 9. Alternatives considered and rejected

- **fal.ai Kling image-to-video per beat** — closest to the video's Google Flow
  step, but costs money per beat, is non-deterministic, and the character drifts
  between scenes. That is precisely the consistency problem the video spends
  steps 3 and 4 solving with a reference sheet; paying per beat to recreate the
  problem we can make structural is the wrong trade.
- **Google Flow / Veo** — not available through any integration in this repo.
- **A new server-side Remotion renderer** — faithful to the codebase's apparent
  intent, but a new subsystem with its own cost and failure modes, for a
  character that is a handful of SVG paths. Deferred per the "Remotion later"
  decision; the beat contract is deliberately Remotion-compatible.
- **A new `beats` JSONB column** — cleaner, but every existing workflow stores
  beats in `logs` and `RenderBeatSchema` already models them there. A new
  column means the worker needs a second read path.
- **A new `stickman` table** — nothing else in the system owns its rows;
  `render_jobs` is the queue.

## 10. Open questions for implementation

Not blocking sign-off. Flagged so the implementer decides deliberately:

1. **Rasterisation strategy** — sharp SVG→PNG vs. handing SVG to ffmpeg
   directly. `sharp` is already a dependency; ffmpeg's librsvg support is not
   guaranteed on the alpine image. Decide by what the `Dockerfile` actually has.
2. **Frame rate and hold.** 12fps with a 2-frame hold per pose reads better
   than 24fps for a 6-beat explainer and halves the frame count. Guess to be
   confirmed by actually rendering a clip.
3. **Archetype count.** `KNOWN_ARCHETYPES` has 26 entries
   (`gemini-character-generator.ts:26`) but only one stickman figure. Ship one
   archetype first; do not pretend to offer 26.
