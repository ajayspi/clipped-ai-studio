# Spec: fal video model catalog + selector

Status: DRAFT — awaiting sign-off. No code written yet.
Date: 2026-09-28
Slug: fal-video-model-catalog
File: `.opencode/spec-fal-video-model-catalog.md`

---

## 1. Goal

Replace the single hardcoded, now-**deprecated** fal video endpoint with a
**catalog of every fal video model**, each carrying its own pricing, resolution
tiers, duration limits, and capabilities. The user picks a model; the system
calls the right endpoint and estimates cost from real per-second rates.

The current code calls `fal-ai/kling-video/v1/standard/text-to-video`
(`lib/engine/video-generator.ts:249`). fal's own page for that endpoint says
**"This endpoint is deprecated — this model is no longer supported."** So this
is a live breakage, not a preference change.

Decisions taken:

| Decision | Choice |
|---|---|
| Models | **All** fal video models we could verify, organised by family |
| Default resolution | **1080p** (user choice) |
| Default model | `alibaba/wan-3.0/text-to-video` — newest Wan, 30s, audio included |
| Scope | Catalog + selector + cost estimator + un-break the dead endpoint |
| Out of scope | Motion transfer wiring, stickman spec integration (noted in §9) |

## 2. Non-goals

- **No new provider.** Everything here is fal. Kling-direct, Luma, Higgsfield
  and Veo-direct are untouched.
- **No per-model prompt engineering.** The catalog stores metadata; it does not
  rewrite prompts per model. Prompt construction stays in `lib/engine/prompts.ts`.
- **No live price fetching at runtime.** Prices are baked into the catalog as
  constants. fal's `llms.txt` is the source of truth when updating them; we do
  not call fal to get prices on every request.
- **No image models.** This spec is video only. `fal-ai/flux/*` etc. are out.
- **No audio models.** TTS stays in `lib/engine/tts.ts`.

## 3. The catalog (verified 2026-09-28)

Every price below was read from the model's own `llms.txt` or playground page
on fal.ai. Models are grouped by family. "—" means the model does not offer
that tier.

### Alibaba Wan

| Model ID | 480p | 720p | 1080p | Max dur | Audio | Notes |
|---|---|---|---|---|---|---|
| `alibaba/wan-3.0/text-to-video` | $0.05/s | $0.10/s | **$0.20/s** | 30s | included | 3 endpoints: t2v, i2v, ref2v |
| `alibaba/wan-3.0/image-to-video` | $0.05/s | $0.10/s | $0.20/s | 30s | included | |
| `alibaba/wan-3.0/reference-to-video` | $0.05/s | $0.10/s | $0.20/s | 30s | included | |
| `alibaba/wan-3.0-prime/text-to-video` | $0.068/s | $0.14/s | $0.28/s | 30s | included | faster turnaround |
| `alibaba/wan-3.0-prime/image-to-video` | $0.068/s | $0.14/s | $0.28/s | 30s | included | |
| `alibaba/wan-3.0-prime/reference-to-video` | $0.068/s | $0.14/s | $0.28/s | 30s | included | |
| `fal-ai/wan/v2.7/text-to-video` | — | $0.10/s | $0.15/s | 15s | native | multi-aspect |
| `fal-ai/wan/v2.7/reference-to-video` | — | $0.10/s | — | 15s | native | ⚠️ bills input+output |
| `fal-ai/wan/v2.2-a14b/text-to-video` | $0.04/s | $0.08/s | — | — | — | 16 fps, $0.06 at 580p |
| `fal-ai/wan/v2.2-a14b/image-to-video` | $0.04/s | $0.08/s | — | — | — | 16 fps |
| `fal-ai/wan-motion` | — | $0.06/s | — | — | — | motion transfer, +$0.08/call `enhance_identity` |

### Kling

| Model ID | Price | Max dur | Audio | Notes |
|---|---|---|---|---|
| `fal-ai/kling-video/v3/standard/text-to-video` | $0.084/s | 15s | +50% ($0.126/s) | $0.154/s w/ voice control |
| `fal-ai/kling-video/v3/pro/text-to-video` | TBD | 15s | yes | verify via llms.txt |
| `fal-ai/kling-video/v3/4k/text-to-video` | TBD | 15s | yes | verify via llms.txt |
| `fal-ai/kling-video/o3/standard/text-to-video` | TBD | 15s | yes | verify via llms.txt |
| `fal-ai/kling-video/o3/pro/text-to-video` | TBD | 15s | yes | verify via llms.txt |
| `fal-ai/kling-video/v1/standard/text-to-video` | $0.045/s | — | — | ☠️ **DEPRECATED — remove** |

### ByteDance Seedance

| Model ID | Price | Max dur | Audio | Notes |
|---|---|---|---|---|
| `bytedance/seedance-2.0/text-to-video` | TBD | 15s | yes | bare `bytedance/` namespace |
| `bytedance/seedance-2.0/image-to-video` | TBD | 15s | yes | |
| `bytedance/seedance-2.0/reference-to-video` | TBD | 15s | yes | |
| `bytedance/seedance-2.0/fast/text-to-video` | TBD | 15s | yes | |
| `bytedance/seedance-2.5/text-to-video` | TBD | 30s | yes | 6 variants |
| `bytedance/seedance-2.5/image-to-video` | TBD | 30s | yes | |
| `bytedance/seedance-2.5/reference-to-video` | TBD | 30s | yes | |
| `fal-ai/bytedance/seedance/v1.5/pro/text-to-video` | TBD | 15s | yes | older gen, `fal-ai/` prefix |
| `fal-ai/bytedance/seedance/v1/pro/text-to-video` | TBD | 15s | yes | |

### MiniMax

| Model ID | 480p | 768p | 2K | 4K | Max dur | Notes |
|---|---|---|---|---|---|---|
| `minimax/h3/text-to-video` | $0.05/s | $0.06/s | $0.13/s | $0.16/s | 15s | 2K native, 7 aspect ratios |
| `minimax/h3/image-to-video` | $0.05/s | $0.06/s | $0.13/s | $0.16/s | 15s | |
| `minimax/h3/reference-to-video` | $0.05/s | $0.06/s | $0.13/s | $0.16/s | 15s | 9 img + 3 video + 3 audio refs |
| `minimax/hailuo-2.3/standard/text-to-video` | TBD | TBD | TBD | TBD | 15s | verify |
| `minimax/hailuo-2.3/pro/text-to-video` | TBD | TBD | TBD | TBD | 15s | verify |

### xAI Grok

| Model ID | 480p | 720p | 1080p | Max dur | Notes |
|---|---|---|---|---|---|
| `xai/grok-imagine-video/v1.5/text-to-video` | $0.08/s | $0.14/s | $0.25/s | 15s | |
| `xai/grok-imagine-video/v1.5/image-to-video` | $0.08/s | $0.14/s | $0.25/s | 15s | +$0.01 per ref image |
| `xai/grok-imagine-video/v1.5/reference-to-video` | $0.08/s | $0.14/s | $0.25/s | 15s | |

### Alibaba Happy Horse

| Model ID | 720p | 1080p | Max dur | Notes |
|---|---|---|---|---|
| `alibaba/happy-horse/text-to-video` | $0.14/s | $0.28/s | 15s | native audio, 5 aspect ratios |
| `alibaba/happy-horse/image-to-video` | $0.14/s | $0.28/s | 15s | |
| `alibaba/happy-horse/reference-to-video` | $0.14/s | $0.28/s | 15s | |
| `alibaba/happy-horse/video-edit` | $0.14/s | $0.28/s | 15s | |

### Lightricks LTX

| Model ID | Pricing | Max dur | Notes |
|---|---|---|---|
| `fal-ai/ltx-2.3-22b/text-to-video` | $0.001605/MP | — | per-megapixel, not per-second; has camera LoRAs |
| `fal-ai/ltx-2.3-22b/image-to-video` | $0.001605/MP | — | |

### Google Veo

| Model ID | Pricing | Notes |
|---|---|---|
| `fal-ai/veo3.1` | TBD | verify via llms.txt |
| `fal-ai/veo3.1/lite` | TBD | verify via llms.txt |

### PixVerse

| Model ID | Pricing | Notes |
|---|---|---|
| `fal-ai/pixverse/v6/text-to-video` | TBD | verify via llms.txt |
| `fal-ai/pixverse/v6/image-to-video` | TBD | verify via llms.txt |

**TBD pricing** = the endpoint exists but I could not read a price from its
page. The catalog entry will carry `pricing: null` and the UI will show
"pricing unavailable" rather than a wrong number. These are flagged in §8.

## 4. Affected files

**New (1):**
- `lib/media/fal-video-models.ts` — the catalog: typed array of model metadata,
  lookup helpers, cost estimation

**Modified (7):**
- `lib/engine/video-generator.ts` — replace the hardcoded deprecated endpoint
  with a dynamic model lookup; add `model` to the request type
- `lib/engine/types.ts:81` — expand `AIVideoModel` union (or add a
  `FalVideoModel` type)
- `packages/schema/src/common.ts:133` — update `AIVideoModelSchema` enum
- `packages/schema/src/workflow.ts:7` — same enum (it is duplicated)
- `lib/engine/cost-estimator.ts:75` — replace hardcoded `0.15` with catalog lookup
- `lib/api-router.ts:475` — update the `models` array for the fal provider
- `app/(app)/create/auto/page.tsx:204` — update the "AI Video (Kling / Luma)"
  label and add a model selector

**Possibly modified (UI, depends on scope sign-off):**
- `components/create/workflow-definitions.ts` — provider labels
- `app/(app)/settings/page.tsx:83` — provider list
- `app/api/settings/keys/route.ts:49` — supported providers

**Explicitly untouched:** `scripts/render-worker.ts`, `supabase/migrations/*`,
`schema.sql`, `remotion/Composition.tsx`, `lib/media/fal-client.ts` (the client
itself is fine — it takes an endpoint id).

## 5. Expected behavior

### The catalog module

```ts
// lib/media/fal-video-models.ts

export interface FalVideoModel {
  id: string;                    // fal endpoint id, e.g. "alibaba/wan-3.0/text-to-video"
  displayName: string;           // "Wan 3.0"
  family: 'wan' | 'kling' | 'seedance' | 'minimax' | 'grok' | 'happy-horse' | 'ltx' | 'veo' | 'pixverse';
  kind: 'text-to-video' | 'image-to-video' | 'reference-to-video' | 'motion-transfer' | 'video-edit';
  pricing: Record<string, number> | null;  // { "480p": 0.05, "720p": 0.10, "1080p": 0.20 }
  pricingUnit: 'per-second' | 'per-megapixel' | null;
  maxDuration: number | null;    // seconds
  hasAudio: boolean;
  deprecated?: boolean;
  notes?: string;
}

export const FAL_VIDEO_MODELS: FalVideoModel[] = [ /* ... */ ];

export function getFalVideoModel(id: string): FalVideoModel | undefined;
export function estimateFalVideoCost(modelId: string, durationSec: number, resolution: string): number | null;
```

### The video generator

`generateWithFal` currently hardcodes:
```ts
model: 'fal-ai/kling-video/v1/standard/text-to-video',
```
It becomes:
```ts
const model = getFalVideoModel(request.model) ?? getFalVideoModel(DEFAULT_FAL_VIDEO_MODEL)!;
// ... pass model.id to fal-client
```

### The request type

`AIVideoModel` at `lib/engine/types.ts:81` is currently:
```ts
export type AIVideoModel = 'kling-v1' | 'luma-dream' | 'fal-flux';
```
It becomes a union of the catalog IDs (or a separate `FalVideoModel` type that
the request accepts alongside the existing values).

### The schema enum

`AIVideoModelSchema` in `packages/schema/src/common.ts:133` and
`packages/schema/src/workflow.ts:7` is `z.enum(['kling-v1', 'luma-dream', 'fal-flux'])`.
It must be regenerated or manually updated to include the new model IDs. **Note
the `dist/` build output** — `packages/schema/dist/common.js:105` and
`dist/workflow.js:6` are committed build artifacts that also carry the enum.

### The cost estimator

`lib/engine/cost-estimator.ts:75` hardcodes `'ai-videos': 0.15`. It becomes a
lookup into the catalog: `estimateFalVideoCost(modelId, duration, resolution)`.

### The UI

A model selector in the AI Video creation flow. The user picks a model from the
catalog; the selection is sent with the job request; the cost estimate updates
live from the catalog pricing.

## 6. Acceptance criteria

**Catalog integrity:**
- `T25-CATALOG-01` — `FAL_VIDEO_MODELS` contains ≥ 20 entries.
- `T25-CATALOG-02` — every entry has a non-empty `id`, `displayName`, `family`,
  and `kind`.
- `T25-CATALOG-03` — every entry with non-null `pricing` has at least one
  resolution tier with a positive number.
- `T25-CATALOG-04` — `fal-ai/kling-video/v1/standard/text-to-video` is either
  absent from the catalog or marked `deprecated: true`.
- `T25-CATALOG-05` — `getFalVideoModel` returns the correct entry for a known
  id and `undefined` for an unknown id.

**Cost estimation:**
- `T25-COST-01` — `estimateFalVideoCost('alibaba/wan-3.0/text-to-video', 30, '1080p')`
  returns `6.00` (30 × $0.20).
- `T25-COST-02` — `estimateFalVideoCost` returns `null` for a model with
  `pricing: null` (TBD pricing).
- `T25-COST-03` — `estimateFalVideoCost` returns `null` for an unknown model id.
- `T25-COST-04` — `estimateFalVideoCost` returns `null` for a resolution the
  model does not offer.

**Video generator:**
- `T25-GEN-01` — `generateWithFal` uses `getFalVideoModel(request.model)` and
  passes `model.id` to the fal client, not a hardcoded string.
- `T25-GEN-02` — when `request.model` is undefined, the generator falls back to
  `DEFAULT_FAL_VIDEO_MODEL`.
- `T25-GEN-03` — the deprecated `fal-ai/kling-video/v1/standard/text-to-video`
  string does not appear anywhere in `lib/engine/video-generator.ts`.

**Schema:**
- `T25-SCHEMA-01` — `AIVideoModelSchema` in `packages/schema/src/common.ts`
  includes at least one fal video model id.
- `T25-SCHEMA-02` — the built `packages/schema/dist/common.js` is regenerated
  (or manually patched) to match.

**Cost estimator:**
- `T25-EST-01` — `lib/engine/cost-estimator.ts` does not contain the literal
  `0.15` for `'ai-videos'`.
- `T25-EST-02` — the estimator uses `estimateFalVideoCost` from the catalog.

## 7. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **The `dist/` build artifacts drift from `src`.** `packages/schema/dist/*.js` are committed and carry the enum. | High | Regenerate with the package's build script, or patch `dist/` by hand and note it. Verify with a test that reads the built file. |
| **TBD pricing.** 12+ models have no verified price. | Med | `pricing: null` + UI shows "pricing unavailable". Never guess a number. |
| **The enum is duplicated** in `common.ts` and `workflow.ts`. | Med | Update both. A test asserts they match. |
| **20+ files reference "Kling"** in labels, provider lists, and the API router. | Med | The spec lists the known sites; a grep for `kling` after the change finds stragglers. |
| **LTX bills per-megapixel, not per-second.** The cost estimator assumes per-second. | Med | `pricingUnit: 'per-megapixel'` on the LTX entries; the estimator returns `null` for non-per-second models rather than guessing. |
| **Wan 2.7 ref-to-video bills input+output duration.** | Low | Noted in the catalog `notes` field; not handled in v1. |
| **Pre-existing red in the tree.** `pnpm typecheck` already fails on 2 errors in `app/api/settings/keys/route.ts` (`logger` undefined). | Low | Not caused by this change; do not claim a green typecheck. |

## 8. Open questions for implementation

1. **TBD pricing** — should I fetch the remaining ~12 models' `llms.txt` now,
   or ship with `null` and fill them in later? Fetching is ~12 more HTTP calls.
2. **Model selector UI** — a dropdown in the existing creation wizard, or a
   separate settings page? The wizard has a history of silent layout bugs.
3. **Should the catalog be in `packages/schema` or `lib/media`?** `lib/media`
   is where `fal-client.ts` and `media-selector.ts` live, so it is the natural
   home. But `packages/schema` is where shared types live. Leaning `lib/media`.
4. **The `AIVideoModel` union will be large** (30+ entries). Should it be a
   `z.enum` (exhaustive, breaks on new models) or a `z.string()` with a runtime
   check against the catalog (forgiving, but no compile-time safety)?

## 9. Related but out of scope

- **Motion transfer** (`fal-ai/wan-motion`) — the user wants this wired so a
  still character image can be driven by a performance video. That needs a
  driving-video asset pipeline that does not exist. Noted for a follow-up.
- **Stickman spec** (`.opencode/spec-stickman-workflow.md`) — the vector
  stickman workflow. If a video model is used for backgrounds, the catalog
  here is the natural source of model choices. Not integrated in this spec.
- **Higgsfield** — researched and priced; the user chose fal. Higgsfield's
  Genjutsu is 7–15× more expensive than `fal-ai/wan-motion` for the same job.
