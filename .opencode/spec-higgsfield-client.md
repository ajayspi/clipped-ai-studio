# Spec: Higgsfield API client

Status: DRAFT — awaiting sign-off. No code written yet.
Date: 2026-09-29
Slug: higgsfield-client
File: `.opencode/spec-higgsfield-client.md`

---

## 1. Goal

Add a Higgsfield API client alongside the existing `fal-client.ts`, plus a real
cost-estimate call, so AI image/video generation has a working second provider
and a per-account price instead of a hardcoded guess.

**Scope is the client only.** Nothing in the render path is rewired in this
spec — see §3.

## 2. Research findings — from the vendor's own docs, fetched 2026-09-29

Docs index is machine-readable at `https://docs.higgsfield.ai/docs/llms.txt`.

### 2a. Higgsfield largely supersedes the fal catalog

The catalog is **82 entries (16 image, 66 video) across 22 model families**,
"listed for sale as of September 22, 2026". Cross-checked against
`.opencode/spec-fal-video-model-catalog.md`:

| fal spec family | Higgsfield equivalent |
|---|---|
| Wan 3.0 / 3.0 Prime | Wan 2.6, 2.7, 3.0, 3.0 Prime |
| Kling v3 / o3 | Kling 2.5 Turbo, 2.6, **3.0 (8 workflows incl. 4K)**, O3, Omni |
| Seedance 2.0 / 2.5 | Seedance 2.0 (3 wf), 2.5 (5 wf) |
| MiniMax H3 / Hailuo 2.3 | MiniMax H3, Hailuo 2.3 |
| xAI Grok | Grok Imagine Video 1.5 |
| Happy Horse | Happy Horse 1.0, 1.1 |
| LTX 2.3 | LTX-2.5 |
| PixVerse v6 | PixVerse V6 |

The **deprecated endpoint that prompted the fal spec**
(`fal-ai/kling-video/v1/standard/text-to-video`, `lib/engine/video-generator.ts:249`)
has a direct live equivalent here: Kling 3.0 Standard.

> **User decision: keep both fal and Higgsfield. The fal catalog spec stays.**
> Higgsfield is **additive, not a replacement** — two aggregators, two billing
> relationships, and a fallback if either degrades. Nothing in this spec deletes
> or supersedes fal.
>
> **One thing keeping fal does *not* fix, stated plainly:** Higgsfield does not
> repair fal's dead endpoint. `video-generator.ts:249` still calls
> `fal-ai/kling-video/v1/standard/text-to-video`, which the vendor has
> deprecated, so **that call is still broken** and will keep returning an error
> until either the fal catalog spec is built or `generateWithFal` is repointed.
> "Keep both" is a fine answer to the catalog question; it is not an answer to
> this live bug.

Higgsfield also ships **motion transfer**, which the fal spec's §9 declared
impossible ("needs a driving-video asset pipeline that does not exist"):
`Genjutsu` (motion transfer + object swap), `Kling 2.6 Motion Control`,
`Kling 3.0 Motion Control`. Out of scope for v1 — see §3 — but it is the reason
Higgsfield is worth more than a like-for-like fal replacement.

### 2b. Two features that change how this gets built

**Estimate endpoint.** `POST https://api.higgsfield.ai/estimate/<endpoint-id>`
returns `{ credits, usd }` *before* submitting, and the docs state the
per-account figure is authoritative. This replaces the hardcoded
`cost-estimator.ts:75` `'ai-videos': 0.15, // Kling / Luma AI ($0.15/clip)`.
Documented example: **Soul v2 image = $0.094** → ~$0.66 for a 7-beat video.

**Failed work is free.** `failed` and `nsfw` requests are not charged and any
reserved credits are auto-refunded; a queued request cancelled before processing
is also refunded. Iterating on a prompt is cheap.

### 2c. The API contract (verified)

- Submit: `POST https://api.higgsfield.ai/<endpoint-id>` — e.g.
  `higgsfield-ai/soul/v2/standard`
- Auth: `Authorization: Key ${KEY_ID}:${KEY_SECRET}` (legacy `hf-api-key` +
  `hf-secret` headers also accepted; the `Authorization` form is documented as
  the one new integrations should use)
- Submit response: `{ status, request_id, status_url, cancel_url }` —
  **the poll URL is returned**, unlike fal where it must be constructed
- Completed response: `{ status: "completed", request_id, video: { url } }`
  (images for image endpoints)
- Model access is **per-account**: an unavailable model returns `404`, `423`, or
  `503`

### 2d. Five hazards, one of them nasty

| # | Hazard | Consequence |
|---|---|---|
| 1 | **Concurrency limit returns `400 Bad Request`, not `429`** — `"Maximum number of concurrent requests (4) has been reached"` | A 400 conventionally means "malformed, don't retry". A naive retry loop spins or dies. **Must be special-cased.** |
| 2 | **No `Retry-After`, no rate-limit headers** | Docs say the console is authoritative; we must self-throttle. |
| 3 | **Output retained ≥7 days only, then may be removed** | The render worker downloads immediately so a render is safe, but a URL persisted in `render_jobs.logs` **rots in a week** — re-render and library playback break silently. |
| 4 | **Two-part credential** (`id:secret`) | `settings.api_key` is one TEXT column and `getApiKey()` returns a string. |
| 5 | **Legacy endpoint typo** — `higgsfiled/genjutsu/motion-transfer/v1.0` (mis-spelled upstream) still callable but hidden from discovery | Must not be used. |

### 2e. Already built — do not recreate

- **`lib/media/fal-client.ts`** is the exact template. `submitAndWait()` →
  `MediaJob`, native `fetch`, no SDK. Higgsfield's lifecycle is identical:
  submit → `request_id` → poll → output. A sibling file, not a new pattern.
- **`lib/media/types.ts`** already defines `MediaAsset` (with `provider`,
  `license`, `attribution`, `generated`, `prompt`) and `MediaJob`
  (`requestId`, `provider`, `model`, `status`, `asset?`, `error?`). Only the
  `MediaProvider` union needs `'higgsfield'`.
- **`fal-client.ts` error discipline is the house style and is copied:** throw
  on validation and submit failure; return a `failed` `MediaJob` on timeout,
  poll failure, or result-fetch failure.

## 3. Non-goals

- **No motion transfer in v1.** It needs a driving-video asset pipeline that does
  not exist (fal spec §9). The client supports arbitrary endpoints, so it is
  additive later — but no motion-transfer endpoint, schema, or asset pipeline here.
- **No wiring into the render path.** `media-selector.ts` keeps its fal tier; the
  render worker is untouched. This spec delivers a **client plus an estimate
  call**, proven in isolation.
- **No model catalog module.** Not an 82-entry catalog, and deliberately not a
  replacement for the fal catalog spec — both are kept (see §2a). The client
  takes an `endpointId` string, so fal's catalog spec remains a valid, separate
  piece of work against `fal-client.ts`.
- **No credential rotation, secrets manager, or separate dev/prod keys.** The
  docs' security guidance is server-side-only, which the render worker already
  satisfies.
- **No `api-router.ts` health-ping entry** for Higgsfield. There is no cheap
  keyless availability endpoint to ping, and `checkProviderHealth` expects one.
- **No change to the fal client**, and no change to the four other open specs.

### Decisions I made (flagged — say otherwise and I will revise)

| Decision | Choice | Rationale |
|---|---|---|
| **First target** | **Images (Soul v2)**, not motion transfer | Images exercise the entire client path — submit, poll, normalize to `MediaAsset`, estimate — at $0.094 and fast turnaround. Motion transfer is the differentiated capability but is blocked on an asset pipeline. Cheapest route to a proven client. |
| **Credential storage** | `"<keyId>:<keySecret>"` in the existing `settings.api_key` column, split on the **first** colon | Minimal diff. `getApiKey('higgsfield')` keeps working unchanged. A secret can contain `:`; the key id cannot. |
| **Provider id** | `higgsfield` (new `MediaProvider` member) | Distinct from `fal-ai` in the union and in logs. |

## 4. Design

### 4a. `lib/media/higgsfield-client.ts` (new)

```ts
export interface HiggsfieldCredentials { keyId: string; keySecret: string }
export function parseHiggsfieldCredentials(raw: string): HiggsfieldCredentials  // throws on malformed
export function buildAuthHeader(creds: HiggsfieldCredentials): string           // `Key ${id}:${secret}`

export async function submitAndWait(
  options: HiggsfieldSubmitOptions,
  credentials: HiggsfieldCredentials,
): Promise<MediaJob>

export async function estimate(
  endpointId: string,
  input: Record<string, unknown>,
  credentials: HiggsfieldCredentials,
): Promise<{ credits: number; usd: number } | null>
```

`HiggsfieldSubmitOptions` (in `lib/media/types.ts`) mirrors `FalSubmitOptions`
— `endpointId`, `input`, `timeoutMs` (default 90 000), `pollIntervalMs`
(default 2 000) — with `endpointId` rather than `model`, because that is the
vendor's term. It is a separate interface, not an alias, so the vendor vocabulary
stays accurate and `T14-MPC-04`'s `FalSubmitOptions` assertion is untouched.

### 4b. Submit/poll, following `fal-client.ts` discipline exactly

1. Validate `endpointId`, non-empty `input`, and both credential parts → **throw**.
2. `POST https://api.higgsfield.ai/<endpointId>` with the auth header.
3. Read `{ request_id, status_url }`. **`status_url` is used as returned**, not
   constructed — but it is validated to start with
   `https://api.higgsfield.ai/` first. A malformed or hostile response must not
   be able to redirect polling at an arbitrary host.
4. Poll `status_url` every `pollIntervalMs` until `completed` / `failed` /
   `nsfw`, or `timeoutMs` → **return a `failed` `MediaJob` on timeout**.
5. Normalize output to a `MediaAsset` with `provider: 'higgsfield'`,
   `generated: true`, and `prompt` when `input.prompt` is a string — handling
   `video.url`, `image.url`, and `images[0].url`, mirroring `fal-client.ts:134-161`.
6. `nsfw` is terminal and is **not** charged, so it is reported as `failed` with
   the reason, not retried.

### 4c. The concurrency 400 — the one that will bite

`400` with a body matching `/maximum number of concurrent requests/i` is
**retryable**, and is categorically different from a real malformed-request 400.
It maps to a distinguishable error, and `submitAndWait` surfaces it as a
`failed` `MediaJob` whose message names the cause, so a caller (or the health
circuit in `spec-provider-health-circuit`) can tell "busy, back off" from
"your request is wrong, never retry".

A plain 400 stays non-retryable. **This distinction is the acceptance test that
matters most in this spec.**

### 4d. `lib/media/types.ts` (modify)

Add `'higgsfield'` to `MediaProvider` and add `HiggsfieldSubmitOptions`.
`T14-MPC-07` ("All valid MediaProvider values accepted") must be updated to
include it, or it will fail — that is expected, not a regression.

### 4e. `lib/engine/cost-estimator.ts` (modify)

Add `estimateHiggsfieldCost(endpointId, input)` that calls `estimate()` and
returns `null` when unavailable, so a caller can prefer a real number and fall
back to the existing table. **The hardcoded `0.15` is not removed in this
spec** — it stays as the fallback until a real estimate is wired end-to-end.

## 5. Affected files

**New (3):**
- `lib/media/higgsfield-client.ts` — the client
- `test/higgsfield-client.test.ts` — vitest, `fetch` mocked
- `tests/e2e/standalone-runner.js` — **modified**, `Tier 27`

**Modified (3):**
- `lib/media/types.ts` — `MediaProvider` + `HiggsfieldSubmitOptions`
- `lib/engine/cost-estimator.ts` — `estimateHiggsfieldCost()`
- `tests/e2e/standalone-runner.js` — add `'Tier 27: Higgsfield Client'` to
  **both** the `tiers` array and a `tests.push` block (per `AGENTS.md`, a tier
  name missing from the array silently never runs)

**Explicitly untouched:** `lib/media/fal-client.ts`, `lib/media/media-selector.ts`,
`lib/engine/video-generator.ts`, `lib/api-router.ts`, `scripts/render-worker.ts`,
every route and page, the four other open specs.

## 6. Acceptance criteria

### Credentials (vitest)
- `T30-CRD-01` — `"id:secret"` splits into both parts; the header is exactly
  `Key <id>:<secret>`.
- `T30-CRD-02` — a secret **containing** a colon splits on the **first** colon
  only, so the secret survives intact.
- `T30-CRD-03` — an empty id, empty secret, or a string with no colon throws.
- `T30-CRD-04` — the secret never appears in an error message or a `MediaJob`.

### Submit/poll (vitest, `fetch` mocked)
- `T30-SUB-01` — POSTs to `https://api.higgsfield.ai/<endpointId>` with the auth
  header and the JSON body.
- `T30-SUB-02` — polls the **returned** `status_url`, not a reconstructed one.
- `T30-SUB-03` — a `status_url` on a different host is **refused** and the job
  fails (host-confusion guard).
- `T30-SUB-04` — `video.url` → `MediaAsset` with `kind: 'video'`,
  `provider: 'higgsfield'`, `generated: true`.
- `T30-SUB-05` — `image.url` and `images[0].url` both → `kind: 'image'`.
- `T30-SUB-06` — `input.prompt` is carried onto the asset's `prompt`.
- `T30-SUB-07` — exceeding `timeoutMs` returns a `failed` `MediaJob`, never a throw.
- `T30-SUB-08` — a poll failure returns a `failed` `MediaJob`, never a throw.
- `T30-SUB-09` — a submit non-OK **throws** (matching `fal-client.ts:45`).
- `T30-SUB-10` — a terminal `nsfw` returns `failed` with the reason and is not retried.

### The concurrency 400 — load-bearing
- `T30-CON-01` — `400` + `"Maximum number of concurrent requests (4) has been
  reached"` is reported as **retryable-busy**, distinguishable from a plain 400.
- `T30-CON-02` — a plain `400 Bad Request` (malformed input) is **not** classified
  as busy and is not retried.
- `T30-CON-03` — the busy error message names the cause so a caller can act on it.

### Estimate (vitest)
- `T30-EST-01` — `POST https://api.higgsfield.ai/estimate/<endpointId>` with the
  same body and auth returns `{ credits, usd }` parsed as numbers.
- `T30-EST-02` — a non-OK or unparseable response returns `null`, never throws
  (an estimate is advisory; it must not fail a render).
- `T30-EST-03` — `estimateHiggsfieldCost` returns `null` when unavailable so
  callers fall back to the existing rate table.

### Types + drift guards (`Tier 27`)
- `T30-TYP-01` — `MediaProvider` includes `'higgsfield'`.
- `T30-TYP-02` — `HiggsfieldSubmitOptions` mirrors `FalSubmitOptions`'s four
  fields with `endpointId` in place of `model`.
- `T30-SRC-01` — the legacy misspelled `higgsfiled/` endpoint appears nowhere in
  the source.
- `T30-SRC-02` — the client uses `https://api.higgsfield.ai/` and never
  `queue.fal.run`.
- `T30-SRC-03` — `'Tier 27: Higgsfield Client'` is present in **both** the
  `tiers` array and a `tests.push` block.
- `T30-SRC-04` — `T14-MPC-07` is updated to accept `'higgsfield'`.

### Live proof (manual — **requires your credentials**)
- `T30-LIVE-01` — a `settings` row is written with provider `higgsfield` and a
  `id:secret` value, read back through `getApiKey()`.
- `T30-LIVE-02` — `estimate()` on `higgsfield-ai/soul/v2/standard` returns a real
  `{credits, usd}`, and the figure is recorded in this spec.
- `T30-LIVE-03` — one real `submitAndWait()` completes and returns a
  `MediaAsset` whose URL is fetchable.
- `T30-LIVE-04` — **the returned output is downloaded immediately**, because
  §2d-3 guarantees only 7 days of retention. A URL persisted in
  `render_jobs.logs` without download is an accepted known limitation (§7).
- `T30-LIVE-05` — per-account model access is checked for the intended endpoint
  (an unavailable model returns `404`/`423`/`503`).

### No regression
- `T30-NOR-01` — `pnpm exec vitest run --no-file-parallelism` green.
- `T30-NOR-02` — `pnpm test` (201 e2e) green.
- `T30-NOR-03` — `pnpm lint:scoped` + `pnpm typecheck` clean, or proven
  pre-existing by a baseline run on the clean tree first.

## 7. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **7-day output retention is a silent time bomb** — a Higgsfield URL in `render_jobs.logs` is dead after a week, breaking re-render and library playback with no error | High | Stated in §2d-3. The render worker already downloads media inside `pollAndProcess`, so a *render* is unaffected. The accepted v1 limitation is: **never rely on a Higgsfield URL surviving in the DB** — download into `public/renders` as part of any future wiring. `T30-LIVE-04` verifies the download. Wiring into the render path (a later spec) must own this. |
| **Concurrency 400 misread as a malformed request** → permanent failure or a hot retry loop | High | `T30-CON-01/02/03` are load-bearing and the distinction is asserted both ways, so a regression to "all 400s are busy" fails just as loudly. |
| **No `Retry-After`, so self-throttling is guesswork** | Med | Not solvable client-side; the docs say the console is authoritative. Left as a caller concern. `submitAndWait` never auto-retries, so the worst case is one busy failure, not a storm. |
| **Per-account model access unknown** — the 82-entry catalog is not the entitlement list | Med | `T30-LIVE-05` checks the specific endpoint against your account before anything is built on it. No catalog work happens in this spec, so the blast radius is one endpoint. |
| **Credential in a single TEXT column** — a leaked `settings` row leaks both halves | Med | Matches how every other provider key is already stored; the renderer/worker are server-side, which is the vendor's stated requirement. Rotating means rewriting one row. |
| **The estimate endpoint is advisory, not binding** — docs say the per-account value is authoritative and prices can change | Low | `estimate()` returning `null` is a first-class path (`T30-EST-02`); the hardcoded `0.15` stays as fallback so nothing regresses. |
| **`T14-MPC-07` will fail** after adding the provider | Low | Expected and updated in the same change (`T30-SRC-04`). Not a regression. |
| **Pre-existing red** (`app/api/settings/keys/route.ts` — `logger` undefined) | Low | Baseline on the clean tree first; report both runs. Never claim a green that was not green before. |
| **vitest flakes at full-suite scale** | Low | `--no-file-parallelism`; one failing full run is not a signal — re-run the file alone, then the suite twice. |

## 8. Implementation order (next session, after sign-off)

1. Baseline `pnpm lint:scoped` + `pnpm typecheck` on the clean tree; record which
   failures are pre-existing so §6 can tell them from mine.
2. Failing tests for §6 (red) — `test/higgsfield-client.test.ts` + `'Tier 27'`.
3. `lib/media/types.ts` additions; `T30-TYP-*` green.
4. `lib/media/higgsfield-client.ts` credentials + submit/poll;
   `T30-CRD-*`, `T30-SUB-*` green.
5. Concurrency-400 classification; `T30-CON-*` green.
6. `estimate()` + `estimateHiggsfieldCost()`; `T30-EST-*` green.
7. Refactor.
8. `pnpm lint:scoped` → `pnpm typecheck` → `pnpm exec vitest run --no-file-parallelism` → `pnpm test`.
9. `T30-LIVE-*` — **needs your `keyId:secret`**; record the real estimate figure.
10. Update this spec with the final state, including the live numbers.

## 9. Open — needs your answer

1. **Do you have Higgsfield API credentials** (key ID + secret)? §6's live tests
   and step 9 are blocked without them; everything else is buildable and fully
   testable with injected credentials.
2. **fal + Higgsfield together — confirmed, both kept.** The fal catalog spec
   (`.opencode/spec-fal-video-model-catalog.md`) stays live and remains the right
   way to fix fal's deprecated endpoint. The only thing to be aware of is that
   the deprecated call at `lib/engine/video-generator.ts:249` stays broken until
   one of the two is built; this spec does not repair it.
