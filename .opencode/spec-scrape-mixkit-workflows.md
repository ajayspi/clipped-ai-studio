# Spec: perfect the scrape + free-video ("mix") workflows

Status: DRAFT — awaiting sign-off. No code written yet.
Date: 2026-09-29
Slug: scrape-mixkit-workflows
File: `.opencode/spec-scrape-mixkit-workflows.md`

Scope note: deliberately narrow. The 14-route refactor
(`.opencode/spec-workflow-route-isolation.md`) and the general media-sourcing
wiring (`.opencode/spec-render-worker-media-sourcing.md`) are **deferred**; only
the parts this spec needs are absorbed here.

---

## 1. Goal

Two workflows, taken from "exists" to "works end-to-end and the content is
punchy":

1. **scrape** — paste a URL, get a short-form narration, carry it through the
   footage wizard to a finished video.
2. **mix** — source real, free, commercially-licensed **video** for every beat
   from Pexels/Pixabay **plus a curated Mixkit library**, instead of
   AI-generating a still from the beat's spoken text.

Both must be proven by a **real rendered mp4** with moving frames and audible
narration — not by a 200 response.

## 2. Research findings — measured 2026-09-29

### 2a. Mixkit has no API. This changes the design.

You asked for Mixkit as a free video source. Verified live, it cannot be a
*search* source:

| Probe | Result |
|---|---|
| `mixkit.co/api/videos` | **404** |
| `mixkit.co/api/v1/videos` | **404** |
| `mixkit.co/free-stock-video/?format=json` | **HTTP 200, `Content-Type: application/json` — but the body is the 174 KB HTML page.** A lying content-type, not JSON. |
| `mixkit.co/free-stock-video/` | Normal JS-hydrated HTML gallery. No search endpoint. |

Their own FAQ describes it as a browse-and-download site. There is no API.

**So Mixkit enters as a curated static library, not a search.** The mp4s are
directly addressable on `assets.mixkit.co/videos/preview/…`, free, no watermark,
**no attribution required**, and usable commercially under the Mixkit Video
Free License. This is legitimate — and the codebase already half-does it: **20
hardcoded Mixkit URLs** sit in `mission-orchestrator.ts:74-91`,
`whiteboard-orchestrator.ts:210` and `video-generator.ts:12`. This spec
formalises those into one typed, keyword-matched catalog instead of leaving them
scattered as placeholders.

### 2b. The other registered "free" sources are not usable either

`lib/api-router.ts:392-425` registers five free video sources. Live test:

| Source | Registered `healthEndpoint` | Live result |
|---|---|---|
| `pexels` / `pixabay` | real APIs | **200 — working** (proved earlier: 10 results/keyword) |
| `coverr_free` | `api.coverr.co/videos` | **401 Unauthorized**, also with a browser UA → needs an API key |
| `mixkit_free` | the HTML page | no API (§2a) |
| `mazwai_free` | `wp-json/wp/v2/posts` | **403 Forbidden**, also with a browser UA → blocks bots |
| `videvo_free` | — | requires a key |

**Conclusion: Pexels and Pixabay are the only keyless free video search sources
available.** The honest shape of "mix" is: Pexels + Pixabay search first,
Mixkit curated catalog as the always-available third source, and every
`healthEndpoint` in `api-router.ts` that cannot actually answer gets corrected
so no one builds on a dead registration.

### 2c. The scrape chain already exists end-to-end

`app/(app)/create/url/page.tsx` → `POST /api/workflows/scrape` → returns
`{script}` → injects into the wizard store (`workflowType: 'footage'`,
`narration`, `autoMode: true`) → `/create/footage` → scene breakdown →
`POST /api/workflows/generate` → render worker.

It is wired. It is not *reliable*. Real defects in the chain:

| # | Defect | Location |
|---|---|---|
| 1 | **SSRF.** `fetch(url)` on a fully user-supplied URL with no scheme/host allowlist, no redirect cap, no size cap. The route can be made to hit internal addresses (`169.254.169.254`, `127.0.0.1`, RFC1918). | `scrape/route.ts:13-18` |
| 2 | **Hardcoded model `'gpt-4o'`.** Bypasses the provider cascade and the gateway entirely. | `scrape/route.ts:54` |
| 3 | **Naive HTML strip.** Regex tag removal, no entity decoding, no `<article>`/`<main>` targeting, no `og:description`/JSON-LD use. Boilerplate and nav text reach the LLM. | `scrape/route.ts:26-32` |
| 4 | **Non-HTML input unhandled** — a PDF or image URL produces 15 KB of binary noise. No content-type check. | `scrape/route.ts:24-32` |
| 5 | **`new URL(url).hostname` throws** on a non-absolute URL, after the scrape already succeeded. | `create/url/page.tsx:39` |
| 6 | **No beat-level retention guidance.** The scene-breakdown prompt is purely technical — "break this narration into visual scenes for stock-footage sourcing". Nothing tells it to build a hook, vary pacing, or open hot. This is the "punchy" gap. | `scene-matcher.ts:54-85` |
| 7 | **Beat durations are model-guessed** for the footage path (4 s default), giving evenly-paced output. | `scene-matcher.ts:117` |

### 2d. Already built — do not recreate

- `lib/media/image-sources.ts` — Openverse → Pexels → Pixabay → Pollinations,
  with the `query`/`imagePrompt` split and correct aspect-ratio sizing. Tested
  `T16-IMG-01..03`. **Reused unchanged.**
- `lib/media/media-selector.ts` — `selectSceneMedia`. Tested `T17-SEL-*`. Carries
  a **paid fal tier** we are excluding, so the worker must not call it.
- `lib/engine/shot-planner.ts` — already computes `searchQuery` + `imagePrompt`
  per scene, with deterministic shot variety. Tested.
- `searchQuery` is already on the wizard `Beat` type and in the schema
  (`render-params.ts:85,120`) — it is simply dropped on the way to the worker.
- Pexels + Pixabay keys are present and active; both APIs verified working.

## 3. Non-goals

- **No 14-route refactor.** Deferred to `.opencode/spec-workflow-route-isolation.md`.
  The `mission` / `whiteboard` poison-job fixes stay deferred — they are not on
  the scrape→footage path.
- **No fal.ai video.** Endpoint deprecated; separate draft spec.
- **No runtime HTML scraping of Mixkit, Coverr, or Mazwai.** Measured
  unusable/fragile (§2b). Not worth the ToS and breakage risk.
- **No audio-mixer wiring.** The orphaned `lib/engine/audio-mixer.ts` is out of
  scope.
- **No URL changes, no schema migration, no new columns.**
- **No new provider accounts or API keys.**

## 4. Design

### 4a. `lib/media/mixkit-catalog.ts` (new)

The 20 existing hardcoded Mixkit URLs, formalised.

```ts
export interface MixkitClip {
  id: string            // mixkit-<slug>-<id>
  url: string           // direct mp4 on assets.mixkit.co
  title: string
  tags: string[]        // for keyword matching
  orientation: 'vertical' | 'horizontal'
  license: 'Mixkit Video Free License'
}
export const MIXKIT_CLIPS: MixkitClip[]
export function matchMixkitClip(keywords: string[]): MixkitClip | undefined
```

- Seeded from the URLs already in `mission-orchestrator.ts:74-91` +
  `whiteboard-orchestrator.ts:210` + `video-generator.ts:12` — no new scraping, no
  new network dependency, no ToS question.
- `matchMixkitClip` scores by tag overlap; returns `undefined` on no match.
- The hardcoded URLs in those three orchestrators are **replaced** by catalog
  lookups, so there is one source of truth.

### 4b. `lib/engine/beat-media-resolver.ts` (new) — video intent

Resolves media for a beat that arrived with none.

1. **Stock query precedence:** `searchQuery` → `keywords.join(' ')` → `text`.
2. **Video intent** → `VideoSourcer.searchForKeywords()` (Pexels + Pixabay,
   already working). First hit wins.
3. **No video found** → `matchMixkitClip()`. Always available, no network.
4. **No video and no catalog match** → `null`; the worker keeps its existing
   Pollinations last-resort, and the log says so.

`ResolvedBeatMedia` carries `{ url, kind, provider, license, attribution,
query, attempts }` so every beat's actual source is recorded in the render log.
**Mixkit requires no attribution**, so `attribution` is `undefined` for it — that
is a licence fact, recorded rather than guessed.

### 4c. Wire the worker + the two dropped hops

- `scripts/render-worker.ts` — replace the `if (!mediaUrl)` block
  (lines 526-556) with `resolveBeatMedia()`. **Delete the dead OmniRoute POST**
  (no body, no prompt, no auth header — it can never succeed) and the hardcoded
  `width=1024&height=1024` square fallback.
- `components/wizard/CreationWizard.tsx:163-174` — add `searchQuery` and
  `keywords` to the submit `beats:` map.
- `app/api/workflows/generate/route.ts:58-75` — add `searchQuery` and `keywords`
  to the beat whitelist (it is explicitly "the whole payload").
- `test/shot-boundary.test.ts:109` asserts the worker matches
  `/b\.imagePrompt\?\.trim\(\)/`; that expression moves to the resolver. Repoint
  the assertion.

### 4d. Scrape hardening

- **SSRF guard** (`lib/net/safe-fetch.ts`, new): reject non-`http(s)` schemes;
  resolve the host and reject loopback / link-local / RFC1918 / unique-local
  addresses; cap redirects (re-validate each hop); cap response bytes; enforce
  timeout. Refuse to follow a redirect into a private range.
- **Model:** replace hardcoded `'gpt-4o'` with `'auto'` so the existing cascade
  and gateway are used.
- **Extraction:** prefer `<article>`/`<main>`, fall back to `<body>`; decode HTML
  entities; strip `<script>`/`<style>`/`<nav>`/`<footer>`/`<aside>`; prepend
  `og:title` / `og:description` / JSON-LD `headline` when present. Reject
  non-HTML content types with a clear 415 rather than feeding binary to the LLM.
- **`create/url/page.tsx:39`** — parse the URL defensively.

### 4e. Punchy content (the actual ask)

- **Scene-breakdown prompt** (`scene-matcher.ts:54-85`) gains retention
  guidance: beat 1 is the **hook** and must be the most dynamic shot; open on
  motion; alternate visual density; land a visual change on every sentence that
  carries a new idea; end on a loop-friendly final beat.
- **Beat durations:** clamp to a punchy short-form band rather than the model's
  free guess — 1.8-3.5 s, first beat ≤ 2.5 s, and never longer than the words in
  that beat take to speak (a beat cannot outlast its own narration).
- **Coverage rule preserved:** every narration word must still appear in exactly
  one scene, in order. Punchiness must not cost words.

## 5. Affected files

**New (5):**
- `lib/media/mixkit-catalog.ts` — the curated catalog
- `lib/engine/beat-media-resolver.ts` — the video-intent resolver
- `lib/net/safe-fetch.ts` — SSRF-guarded fetch
- `lib/media/mixkit-catalog.test.ts`, `test/beat-media-resolver.test.ts` — vitest
- `tests/e2e/standalone-runner.js` — **modified**, see below

**Modified (9):**
- `scripts/render-worker.ts` — call the resolver; delete the dead OmniRoute POST
  and the square fallback
- `app/api/workflows/scrape/route.ts` — safe fetch, `'auto'` model, real extraction,
  content-type guard
- `app/api/workflows/generate/route.ts` — whitelist `searchQuery`, `keywords`
- `components/wizard/CreationWizard.tsx` — submit `searchQuery`, `keywords`
- `app/(app)/create/url/page.tsx` — defensive URL parse
- `lib/engine/scene-matcher.ts` — retention prompt + duration clamp
- `lib/engine/mission-orchestrator.ts`, `lib/engine/whiteboard-orchestrator.ts`,
  `lib/engine/video-generator.ts` — replace scattered hardcoded Mixkit URLs with
  catalog lookups
- `lib/api-router.ts` — correct the `healthEndpoint`s measured dead in §2b
- `test/shot-boundary.test.ts` — repoint the moved assertion

**Explicitly untouched:** `lib/media/image-sources.ts` (reused as-is),
`lib/media/media-selector.ts` (holds the fal tier we exclude), `remotion/`,
`supabase/migrations/*`, every other route, every other `app/(app)/**` page.

## 6. Acceptance criteria

### Media sourcing (vitest)
- `T28-SRC-01` — a footage beat with no media resolves to a Pexels/Pixabay
  **video** and never calls the image search.
- `T28-SRC-02` — when video search misses, `matchMixkitClip` supplies a clip from
  `assets.mixkit.co`.
- `T28-SRC-03` — a Mixkit clip reports `license: 'Mixkit Video Free License'` and
  `attribution: undefined`.
- `T28-SRC-04` — query precedence is `searchQuery` > `keywords.join(' ')` > `text`.
- `T28-SRC-05` — with no query and no catalog match, `null` is returned (not a
  fabricated URL).
- `T28-SRC-06` — every resolved beat records the provider that actually served
  it.
- `T28-SRC-07` — the resolver never imports `media-selector` / `fal-client`.

### Catalog
- `T28-MIX-01` — every catalog URL is on `assets.mixkit.co` and ends `.mp4`.
- `T28-MIX-02` — no duplicate ids; ≥ 20 clips; every entry has ≥ 1 tag.
- `T28-MIX-03` — `matchMixkitClip(['ocean','waves'])` returns an ocean-tagged clip.
- `T28-MIX-04` — the hardcoded `assets.mixkit.co` URLs no longer appear in
  `mission-orchestrator.ts`, `whiteboard-orchestrator.ts`, or
  `video-generator.ts`.

### Scrape safety (vitest)
- `T28-SRF-01` — `http://127.0.0.1/…`, `http://[::1]/…`,
  `http://169.254.169.254/latest/meta-data/`, and RFC1918 hosts are **rejected**.
- `T28-SRF-02` — `file://`, `gopher://`, and other non-`http(s)` schemes rejected.
- `T28-SRF-03` — a redirect to a private address is refused.
- `T28-SRF-04` — response size and time are capped.
- `T28-SRF-05` — a non-HTML content type returns 415, not an LLM call.

### Punchy content
- `T28-PUN-01` — the scene-breakdown prompt names the hook beat explicitly.
- `T28-PUN-02` — beat 1 duration is clamped ≤ 2.5 s; all beats within 1.8-3.5 s.
- `T28-PUN-03` — no beat is longer than its own spoken text takes to read.
- `T28-PUN-04` — the verbatim, in-order coverage rule is still present in the
  prompt (punchiness must not drop words).
- `T28-PUN-05` — `scrape/route.ts` contains no hardcoded model string.

### Wiring
- `T28-WIR-01` — `render-worker.ts` contains no `v1/images/generations`.
- `T28-WIR-02` — `render-worker.ts` contains no `width=1024&height=1024`.
- `T28-WIR-03` — the route whitelist includes `searchQuery` and `keywords`.
- `T28-WIR-04` — the wizard submit map includes `searchQuery` and `keywords`.

### End-to-end proof (manual, evidence required)
- `T28-E2E-01` — start gateway `:20128`, web `:3000`, render worker.
- `T28-E2E-02` — paste a real public article URL → narration returned.
- `T28-E2E-03` → carried through the footage wizard to a rendered mp4.
- `T28-E2E-04` — the mp4 has a **non-zero** frame count, duration matching the
  narration, `mean_volume` above −60 dB, and first-vs-last frame **MAD > 11**
  (the same motion proof `test/camera-move-filter.test.ts` uses).
- `T28-E2E-05` — **the render log shows per-beat providers, and at least one beat
  is Pexels/Pixabay/Mixkit — not `pollinations.ai`.** This is the criterion that
  actually proves the fix.
- `T28-E2E-06` — the first rendered beat is the most visually dynamic shot
  (reviewed, with the frame noted).

### No regression
- `T28-NOR-01` — `pnpm exec vitest run --no-file-parallelism` green.
- `T28-NOR-02` — `pnpm test` (201 e2e) green, with `'Tier 25: Scrape & Mixkit'` in
  **both** the `tiers` array and a `tests.push` block.
- `T28-NOR-03` — `pnpm lint:scoped` + `pnpm typecheck` clean, or proven
  pre-existing by a baseline run on the clean tree first.

## 7. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **Mixkit catalog is small and fixed** — 20-ish clips cannot cover arbitrary narration | Med | It is tier 3 of 3, only reached when Pexels+Pixabay both miss. Pexels/Pixabay are the workhorses (proved 10 results/keyword). The catalog grows by adding entries; `matchMixkitClip` returning `undefined` is a normal, tested path (`T28-SRC-05`). |
| **Catalog URLs can rot** — Mixkit can move files | Med | Every entry is verified reachable in a unit test (`T28-MIX-01` plus a live reachability check). A dead URL is a test failure, not a silent broken render. |
| **SSRF guard breaks a legitimate scrape** (e.g. a public URL that resolves to a CDN IP in a private range via DNS rebinding) | Med | Guard re-validates **after** DNS resolution, not on the hostname string alone. Private/loopback targets are not legitimate use for "paste an article URL". |
| **Punchiness could cost word coverage** | Med | `T28-PUN-04` pins the verbatim in-order rule; the duration clamp can only *shorten* a beat, never drop a scene. |
| **The gateway being down silently degrades quality** — the LLM falls back to an OpenRouter free model (`mistralai/mistral-large`, measured 14.8 s), which will blunt exactly the "punchy" writing this spec targets | High | `T28-E2E-01` makes the gateway a **precondition**. Log the serving provider per LLM call and assert in `T28-E2E-02` that the response was **not** `[LLM] Served by fallback provider`. Punchiness cannot be verified through a fallback model. |
| **Duration clamp fights the TTS audio** — the worker sets the beat length from the real TTS duration, which may exceed the clamp | Med | The clamp governs the *planned* beat; the worker already prefers the ffprobe audio duration. Assert on the plan, not on the render, and note the interaction in the test. |
| **vitest flakes at full-suite scale** | Low | Per `AGENTS.md`: `--no-file-parallelism`; one failing full run is not a signal — re-run the file alone, then the suite twice. |
| **Pre-existing red** (`app/api/settings/keys/route.ts` — `logger` undefined) | Low | Baseline the command on the clean tree before changing anything; report both runs. |

## 8. Implementation order (next session, after sign-off)

1. Failing tests for §6 (red) — three vitest files + `'Tier 25: Scrape & Mixkit'`.
2. `lib/media/mixkit-catalog.ts`; `T28-MIX-*` green.
3. `lib/net/safe-fetch.ts`; `T28-SRF-*` green.
4. `scrape/route.ts` + `create/url`; `T28-SRF-05`, `T28-PUN-05` green.
5. `lib/engine/beat-media-resolver.ts`; `T28-SRC-*` green.
6. Worker + wizard + route wiring; `T28-WIR-*` green.
7. `scene-matcher.ts` retention prompt + clamp; `T28-PUN-01..04` green.
8. Replace the scattered hardcoded Mixkit URLs; `T28-MIX-04` green.
9. `lib/api-router.ts` healthEndpoint corrections.
10. Refactor.
11. `pnpm lint:scoped` → `pnpm typecheck` → `pnpm exec vitest run --no-file-parallelism` → `pnpm test` → `pnpm build`.
12. `T28-E2E-*`: start the stack, scrape a real URL, render, collect evidence.
13. Update this spec with the final state.
