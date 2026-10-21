# Spec: render worker media sourcing (footage + images workflows)

Status: DRAFT — awaiting sign-off. No code written yet.
Date: 2026-09-29
Slug: render-worker-media-sourcing
File: `.opencode/spec-render-worker-media-sourcing.md`

---

## 1. Goal

Make both free-source workflows actually do what they claim:

- **Footage → video** — a beat with no media gets a real stock **video** clip from
  the Pexels/Pixabay video APIs.
- **Images → video** — a beat with no media gets a real stock **image** from
  Openverse/Pexels/Pixabay, instead of an AI-generated still.

Today both paths fall through to a hand-rolled Pollinations URL built from the
beat's spoken narration, because **the render worker never calls the media
search code that already exists in the repo.**

## 2. Research findings — what already exists (do not recreate)

Verified by reading source and by live probe on 2026-09-29.

| Already built | Location | Test coverage | Used by |
|---|---|---|---|
| `searchImages()` — Openverse → Pexels → Pixabay → Pollinations, with `query`/`imagePrompt` split and correct per-aspect-ratio fallback sizing | `lib/media/image-sources.ts` | `T16-IMG-01..03` | `media-selector`, `video-sourcer.searchImages()` |
| `selectSceneMedia()` — existing → stock image → fal → Pollinations | `lib/media/media-selector.ts` | `T17-SEL-01..04` | **`mission-orchestrator.ts:620` only** |
| `MediaAsset` contract with `provider`/`license`/`attribution`/`generated` | `lib/media/types.ts` | `T14-MPC-*` | many |
| `shot-planner` computes `searchQuery` + `imagePrompt` per scene | `lib/engine/shot-planner.ts:308-309` | `test/shot-planner.test.ts` | `scene-matcher` |
| `searchQuery` is in the schema on `RenderBeat` | `packages/schema/src/render-params.ts:85,120` | — | — |
| `searchQuery` is on the wizard's `Beat` type | `components/wizard/wizard-store.ts:47` | — | — |
| Still/video decision from probed bytes (not URL sniffing) | `lib/engine/ffprobe.ts` | `test/render-media-type.test.ts` | worker |

**Live proof the free sources work** (Pexels+Pixabay keys present and active in
the `settings` table): 10 real results per keyword for `mountain`/`city`/
`coffee`/`ocean`, on both the video and image APIs.

**So this is a wiring change, not a build.** The new code is one small
video-source module and one decision unit; the cascade itself is reused as-is.

### The three-hop gap

`searchQuery` is computed, typed, and stored — then discarded twice, and the
worker never searches anyway:

1. `components/wizard/CreationWizard.tsx:163-174` — the submit `beats:` map
   sends `imagePrompt` but **not** `searchQuery` or `keywords`.
2. `app/api/workflows/generate/route.ts:58-75` — the beat whitelist is
   explicit ("this whitelist is the whole payload"), and it names
   `imagePrompt` but **not** `searchQuery` or `keywords`.
3. `scripts/render-worker.ts:526-556` — the `if (!mediaUrl)` block has **no
   sourcer import at all**. It POSTs to
   `http://localhost:20128/v1/images/generations` with **no body, no prompt and
   no auth header**, which can never succeed, then falls back to
   `https://image.pollinations.ai/prompt/<url-encoded narration>?width=1024&height=1024&nologo=true`.

Confirmed in the database: all 6 currently-stranded jobs carry
`pollinations.ai` media for every beat.

### Two secondary defects this change also removes

- The dead OmniRoute image POST costs a wasted HTTP round trip per beat
  against a port that is frequently down.
- The hardcoded `width=1024&height=1024` is **square**, so a 9:16 job gets
  square images stretched into vertical. `searchImages()` already sizes the
  fallback correctly (1080×1920 for 9:16).

## 3. Decisions taken

| Decision | Choice |
|---|---|
| Footage beat with no media | Real video clip from Pexels/Pixabay video APIs |
| Images beat with no media | Stock image via existing `searchImages()` cascade |
| fal.ai generation tier | **Excluded** — strictly free sources, Pollinations last |
| Pollinations aspect ratio | Match the job's aspect ratio (fix the square bug) |
| Operations | In scope: start the stack, dedupe + drain the 6 stranded jobs |
| fal video endpoint (deprecated) | Out of scope — see §9 |

### One inference flagged for review

For a **footage** beat where the video APIs return nothing, this spec falls back
to a **stock image** (which then gets Ken Burns motion) rather than failing the
beat. The user chose "a real video clip", which settles the normal case; this
only covers total search failure. **If you would rather the beat hard-fail and
surface "no footage found for this scene" to the user, say so and I will change
it to a thrown error** — it is a one-line switch in
`resolveBeatMedia()`.

## 4. Non-goals

- **No change to the footage path's happy case.** Beats that already carry a
  `clipUrl` (26 real clips have rendered this way) are untouched.
- **No fal.ai video.** The current endpoint
  `fal-ai/kling-video/v1/standard/text-to-video` is deprecated; the replacement
  catalog is a separate draft spec (`.opencode/spec-fal-video-model-catalog.md`).
- **No new provider accounts.** Pexels and Pixabay keys already exist and work.
- **No rework of `searchImages()`, `selectSceneMedia()`, or the schema
  package.** Reused as-is.
- **No prompt/scene-quality work.** Separate concern (the LLM currently degrades
  to an OpenRouter free model when the gateway is down — an ops problem, fixed
  in §8).
- **No UI redesign.**

## 5. Affected files

**New (3):**
- `lib/media/video-sources.ts` — `searchVideos()`, mirroring `image-sources.ts`
  (Pexels video, Pixabay video, rendition preference, `MediaAsset[]` with
  `kind: 'video'`). **No generative fallback** — Pollinations has no video
  endpoint, so it returns `[]` when both sources miss.
- `lib/engine/beat-media-resolver.ts` — `resolveBeatMedia()`, the testable
  decision unit. Chooses video vs image intent, builds the stock query, runs the
  right search, returns provenance. Optional injected keys so unit tests need no
  DB.
- `test/beat-media-resolver.test.ts` — vitest unit tests.

**Modified (5):**
- `scripts/render-worker.ts` — replace the `if (!mediaUrl)` block with a
  `resolveBeatMedia()` call; delete the dead OmniRoute POST; map
  `params.workflow` → intent (`footage` → video, everything else → image).
- `app/api/workflows/generate/route.ts` — add `searchQuery` and `keywords` to
  the beat whitelist.
- `components/wizard/CreationWizard.tsx` — add `searchQuery` and `keywords` to
  the submit `beats:` map.
- `test/shot-boundary.test.ts` — line 109 asserts the worker source matches
  `/b\.imagePrompt\?\.trim\(\)/`; that expression moves to the resolver. Repoint
  the assertion, keeping the guard's intent.
- `tests/e2e/standalone-runner.js` — add `Tier 24: Worker Media Sourcing` to
  **both** the `tiers` array and a `tests.push({...})` block (per AGENTS.md, a
  tier name that is not in the `tiers` array silently never runs).

**Possibly modified:** `packages/schema/src/render-params.ts` — only if
`RenderBeat` lacks `keywords` (`searchQuery` and `imagePrompt` are already
present at lines 83-85 / 119-120).

**Explicitly untouched:** `lib/media/image-sources.ts`,
`lib/media/media-selector.ts`, `lib/media/fal-client.ts`, `remotion/Composition.tsx`,
`supabase/migrations/*`, `lib/engine/ffprobe.ts`, `lib/engine/shot-planner.ts`.

## 6. Expected behavior

### `searchVideos()`

```ts
searchVideos({ query: string, limit?: number }, apiKeys): Promise<MediaAsset[]>
```

- Pexels: `GET /videos/search?query=…`, sorted by width descending, prefer the
  first rendition `width <= 1920`, else the widest — same rule as
  `video-sourcer.searchPexels`, so behaviour matches the path that already works.
- Pixabay: `GET /videos/?key=…&q=…`, `videos.large ?? videos.medium`.
- Returns `[]` (never throws) on any non-OK response, matching `image-sources.ts`.
- Every asset: `kind: 'video'`, `generated: false`, `provider: 'pexels' | 'pixabay'`,
  plus `license` / `attribution` / `sourceUrl`.

### `resolveBeatMedia()`

```ts
resolveBeatMedia({
  beat:      { text?, imagePrompt?, searchQuery?, keywords? },
  intent:    'video' | 'image',
  aspectRatio: '16:9' | '9:16' | '1:1',
  keys?:     { pexels?: string; pixabay?: string },   // test injection
}): Promise<ResolvedBeatMedia | null>
```

1. **Stock query precedence:** `beat.searchQuery` → `beat.keywords.join(' ')` →
   `beat.text` → `null`. (`null` → returns `null`; the worker keeps its own
   last-resort.)
2. **intent `video`** → `searchVideos()`. First result returned with
   `kind: 'video'`. **Image search is never called on this path.**
3. **intent `image`, or a video miss** → `searchImages({ query, imagePrompt,
   aspectRatio, limit })`. First result returned. `searchImages` already ends in
   the Pollinations fallback, so this never returns empty.
4. Returns `null` only when there is no query at all or both searches miss.

`ResolvedBeatMedia` carries `{ url, kind, provider, generated, license,
attribution, sourceUrl, query, attempts }` so the worker's log line records
**which source actually served each beat**.

### Worker

```ts
if (!mediaUrl) {
  const intent = params.workflow === 'footage' ? 'video' : 'image'
  const resolved = await resolveBeatMedia({ beat: b, intent, aspectRatio })
  if (resolved) { mediaUrl = resolved.url /* + log provider/attempts */ }
  else          { /* existing Pollinations last-resort, unchanged */ }
}
```

`aspectRatio` is the already-computed `aspectRatio` variable (the `AR` key), so
the resolver gets the job's real ratio.

**fal is never reached from this path** — the resolver calls `searchVideos` /
`searchImages` only, never `selectSceneMedia` (which is where the fal tier
lives).

## 7. Acceptance criteria

### Sourcing (`test/beat-media-resolver.test.ts`)
- `T26-RES-01` — `intent: 'video'` with a Pexels video hit returns `kind: 'video'`
  and does **not** call the image search.
- `T26-RES-02` — a video miss falls back to the image search and returns
  `kind: 'image'`.
- `T26-RES-03` — `intent: 'image'` never calls `searchVideos`.
- `T26-RES-04` — query precedence is `searchQuery` > `keywords.join(' ')` > `text`.
- `T26-RES-05` — no query at all → `null`.
- `T26-RES-06` — `generated: false` for every stock hit; `license` +
  `attribution` + `sourceUrl` are present.
- `T26-RES-07` — the resolver never imports or calls `media-selector` /
  `fal-client` (no fal tier).

### Video sources (`Tier 24` behavioral)
- `T24-VID-01` — Pexels video hit → `MediaAsset` with `kind: 'video'`.
- `T24-VID-02` — Pixabay video hit → same.
- `T24-VID-03` — both empty → `[]` (no generative fallback for video).
- `T24-VID-04` — Pexels rendition preference: first `width <= 1920`, else widest.
- `T24-VID-05` — a non-OK response yields `[]` and does not throw.

### Aspect ratio (`Tier 24`)
- `T24-AR-01` — `9:16` → Pollinations fallback is `width=1080&height=1920`.
- `T24-AR-02` — `16:9` → `width=1920&height=1080`.
- `T24-AR-03` — `1:1` → `width=1024&height=1024`.

### Source-level wiring guards (`Tier 24`)
- `T24-SRC-01` — `scripts/render-worker.ts` no longer contains
  `v1/images/generations`.
- `T24-SRC-02` — `scripts/render-worker.ts` no longer contains the literal
  `width=1024&height=1024` (the square bug cannot return).
- `T24-SRC-03` — `scripts/render-worker.ts` imports and calls
  `resolveBeatMedia`.
- `T24-SRC-04` — `scripts/render-worker.ts` maps `footage` → `'video'` and
  defaults to `'image'`.
- `T24-SRC-05` — the route beat whitelist includes both `searchQuery` and
  `keywords`.
- `T24-SRC-06` — the wizard submit `beats:` map includes both `searchQuery` and
  `keywords`.
- `T24-SRC-07` — `test/shot-boundary.test.ts`'s `imagePrompt`-wins guard is
  repointed at the resolver and still passes.

### Operations (manual, verified with evidence)
- `T24-OPS-01` — gateway answers on `127.0.0.1:20128`; the app answers on `:3000`;
  the render worker process is up.
- `T24-OPS-02` — the 6 identical stranded jobs are reduced to 1 (5 marked
  superseded, none deleted).
- `T24-OPS-03` — the retained job renders to an mp4 with a **non-zero** frame
  count, `mean_volume` above −60 dB, and first-vs-last frame MAD above 11
  (the same motion proof used in `test/camera-move-filter.test.ts`).
- `T24-OPS-04` — the rendered beats' media providers are logged and are
  **pexels/pixabay/openverse**, not `pollinations`, for at least one beat.

## 8. Operations plan (in scope)

Precondition — **start the gateway before the worker.** With `:20128` down, the
LLM falls back to an OpenRouter free model (`mistralai/mistral-large`, measured
14.8 s) and every TTS beat burns ElevenLabs `402` + OpenAI `429` before the
keyless Edge TTS fallback. Video quality is currently degraded for that reason
alone.

1. Start the OmniRoute gateway on `20128`; confirm with a real completion.
2. Start Next on `3000`.
3. Dedupe the 6 stranded jobs — identical `workflow`, beats, and narration,
   created within 40 s. Keep the newest, mark the other 5 `superseded`.
   **Do not delete.**
4. Start the render worker.
5. Render the retained job and collect the `T24-OPS-03` evidence.
6. Add a submission-level guard so 6 identical jobs cannot be created again
   (debounce the wizard's submit button). **Flagged as optional** — decide
   whether it belongs in this spec or a follow-up.

## 9. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **`Openverse` runs on a volunteer instance** (`api.openverse.engineering`) and is slow/flaky | Med | Already returns `[]` on non-OK; Pexels/Pixabay follow. `T24-VID-05` / `T16-IMG-01` pin the behaviour. |
| **`searchQuery` absent on jobs created before shot planning** | Med | Query precedence falls back to `keywords` then `text` (`T26-RES-04`). |
| **New per-beat video search adds latency** (~1–2 s × beats) | Low | The job already spends minutes on TTS. `limit: 1` keeps the payload small. |
| **A source clip shorter than the beat's TTS audio** → the video segment ends early and narration is cut (`-t` truncates, it does not loop) | Med | **Pre-existing, not introduced here.** Measure after the fix; if it bites, add looping for video sources in a follow-up. |
| **Dedupe could discard a wanted render** | Med | Mark superseded, never delete; keep the newest. |
| **`test/shot-boundary.test.ts` guard breaks on the moved expression** | Low | Listed as modified with the exact line (`T24-SRC-07`). |
| **Pre-existing red in the tree** — `pnpm typecheck` reportedly fails in `app/api/settings/keys/route.ts` (`logger` undefined) | Low | Per the fal spec this predates the change; do not claim a green typecheck that was not green before. |
| **vitest is flaky at full-suite scale** | Low | Per AGENTS.md: use `--no-file-parallelism`, and a single failing full run is not a regression signal — re-run the file alone. |

## 10. Implementation order (next session, after sign-off)

1. Write the failing tests for §7 (red) — vitest unit file + `Tier 24` in the e2e runner.
2. `lib/media/video-sources.ts` + its `T24-VID-*` tests green.
3. `lib/engine/beat-media-resolver.ts` + its `T26-RES-*` tests green.
4. Wire the worker, route, and wizard; `T24-SRC-*` green.
5. Repoint `test/shot-boundary.test.ts`; `T24-SRC-07` green.
6. Refactor.
7. `pnpm lint:scoped` → `pnpm typecheck` → `pnpm exec vitest run --no-file-parallelism` → `pnpm test` → `pnpm build`.
8. §8 operations; collect `T24-OPS-*` evidence.
9. Update this spec with the final state.

## 11. Open question carried forward

- The fal.ai **video** catalog spec (`.opencode/spec-fal-video-model-catalog.md`)
  is still a draft with no code. It is the natural follow-up if you want
  AI-generated footage instead of, or alongside, free stock. Not this spec.
