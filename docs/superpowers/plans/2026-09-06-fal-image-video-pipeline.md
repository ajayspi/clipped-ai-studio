# Fal Image and Video Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reliable media pipeline that searches free image and stock sources, uses fal.ai for optional generated images/video, and composes selected images or clips into a rendered video for Clipped workflows.

**Architecture:** Keep OmniRoute as the text intelligence gateway. Add a provider-neutral media contract for image search, image generation, video generation, and asynchronous job polling; use Openverse/Pexels/Pixabay before generated images, and use fal.ai only when configured. Mission and image workflows consume the same scene-media selector, while Remotion renders either video clips or animated still images.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase settings, native `fetch`, fal.ai queue API, Openverse/Pexels/Pixabay APIs, Remotion, Vitest-compatible test files, FFmpeg already installed by the project Dockerfile.

**Spec:** Validated in-chat design from the preceding brainstorming session: OmniRoute remains the LLM gateway; Openverse/Pexels/Pixabay provide stock media; fal.ai provides optional generated images/video; selected images become animated Remotion scenes; all media retains provenance metadata.

## Global Constraints

- OmniRoute remains the only LLM gateway; do not add direct LLM provider calls to media code.
- External provider keys are optional and must resolve from Supabase settings first, then environment variables through `getApiKey()`.
- Never expose raw API keys in API responses, logs, scene metadata, or client bundles.
- A provider failure must advance to the next configured source or deterministic fallback; it must not fail an otherwise valid workflow unnecessarily.
- Every selected asset must retain provider, source URL, thumbnail/original URL, dimensions, license/attribution data when supplied, and whether it was generated.
- Do not advertise Pollinations video as supported until an executable submit/poll transport exists.
- Do not make a GPU, SadTalker, ComfyUI, or local video model a prerequisite for the hosted pipeline.
- Preserve existing `Scene`, `Video`, workflow, and API response fields unless an additive field is required.

---

## File Structure

- Create `lib/media/types.ts`: provider-neutral image/media/job contracts.
- Create `lib/media/fal-client.ts`: authenticated fal.ai queue submission, polling, timeout, and response normalization.
- Create `lib/media/image-sources.ts`: Openverse, Pexels, Pixabay, Pollinations, and AI Horde source adapters plus ordered fallback selection.
- Create `lib/media/media-selector.ts`: select a usable image/video asset for one scene and return provenance.
- Modify `lib/engine/types.ts`: add additive media provenance and image-aware scene fields.
- Modify `lib/engine/image-generator.ts`: delegate fal image generation to `fal-client.ts` and return normalized scene media.
- Modify `lib/engine/video-generator.ts`: delegate fal video generation to `fal-client.ts`, including image-to-video input.
- Modify `lib/engine/video-sourcer.ts`: use `getApiKey()` and add image search through the shared source layer.
- Modify `lib/engine/mission-orchestrator.ts`: use ordered image/video selection and pass image fields into the composition package.
- Modify `remotion/Composition.tsx`: render video or animated stills with stable timing and source-aware fallbacks.
- Modify `components/create/workflow-definitions.ts`: report capability-specific readiness instead of treating OmniRoute as proof that media providers exist.
- Modify `.env.example`: document optional fal, stock, and image-source credentials.
- Create `tests/media/fal-client.test.ts`: fal request, polling, timeout, and normalization tests.
- Create `tests/media/image-sources.test.ts`: source ordering, response normalization, license metadata, and failure fallback tests.
- Create `tests/media/media-selector.test.ts`: image/video selection behavior.
- Create `tests/media/remotion-composition.test.tsx`: image and video beat rendering contract tests.

## Interfaces

```ts
export type MediaProvider =
  | 'openverse'
  | 'pexels'
  | 'pixabay'
  | 'pollinations'
  | 'aihorde'
  | 'fal-ai';

export type MediaKind = 'image' | 'video';

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  provider: MediaProvider;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  title?: string;
  license?: string;
  attribution?: string;
  sourceUrl?: string;
  generated: boolean;
  prompt?: string;
}

export interface MediaJob {
  requestId: string;
  provider: 'fal-ai';
  model: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  asset?: MediaAsset;
  error?: string;
}

export interface FalSubmitOptions {
  model: string;
  input: Record<string, unknown>;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface ImageSourceQuery {
  query: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  limit?: number;
}
```

### Task 1: Add Media Contracts and Configuration

**Files:**
- Create: `lib/media/types.ts`
- Modify: `lib/engine/types.ts`
- Modify: `.env.example`
- Test: `tests/media/media-types.test.ts`

**Interfaces:**
- Produces `MediaAsset`, `MediaJob`, `FalSubmitOptions`, and `ImageSourceQuery` for Tasks 2–6.
- `Scene.imageUrl` and `Scene.videoUrl` remain supported; add `Scene.mediaAsset?: MediaAsset` rather than replacing them.

- [ ] **Step 1: Write the failing type contract test**

```ts
import type { MediaAsset } from '@/lib/media/types';

it('describes generated and licensed scene media with one contract', () => {
  const asset: MediaAsset = {
    id: 'openverse-123',
    kind: 'image',
    provider: 'openverse',
    url: 'https://example.test/image.jpg',
    generated: false,
    license: 'CC BY',
    attribution: 'Author',
  };
  expect(asset.kind).toBe('image');
  expect(asset.generated).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/media/media-types.test.ts`
Expected: FAIL because `lib/media/types.ts` and the media field do not exist.

- [ ] **Step 3: Implement the contracts and additive scene field**

Define the exact interfaces from the Interfaces section. Add `mediaAsset?: MediaAsset` to `Scene`. Add these optional environment entries to `.env.example`: `FAL_API_KEY`, `AIHORDE_API_KEY`, `HUGGINGFACE_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`.

- [ ] **Step 4: Run the focused test and type diagnostics**

Run: `node --test tests/media/media-types.test.ts`
Expected: PASS.

Run: `get_errors` for `lib/media/types.ts` and `lib/engine/types.ts`.
Expected: No errors.

### Task 2: Implement the fal.ai Queue Client

**Files:**
- Create: `lib/media/fal-client.ts`
- Test: `tests/media/fal-client.test.ts`

**Interfaces:**
- Consumes `FAL_API_KEY` through `getApiKey('fal', 'FAL_API_KEY')`.
- Produces `submitAndWait(options: FalSubmitOptions): Promise<MediaJob>`.
- Uses `POST https://queue.fal.run/{model}`, `GET https://queue.fal.run/{model}/requests/{requestId}/status`, and `GET https://queue.fal.run/{model}/requests/{requestId}`.

- [ ] **Step 1: Write failing queue-client tests**

```ts
import { submitAndWait } from '@/lib/media/fal-client';

it('submits, polls, and normalizes a completed fal video request', async () => {
  const fetchMock = mockFetch([
    jsonResponse({ request_id: 'req-1' }, 200, { 'x-fal-request-id': 'req-1' }),
    jsonResponse({ status: 'IN_PROGRESS' }),
    jsonResponse({ status: 'COMPLETED' }),
    jsonResponse({ video: { url: 'https://cdn.test/out.mp4' } }),
  ]);
  const result = await submitAndWait({ model: 'fal-ai/test-video', input: { prompt: 'test' }, pollIntervalMs: 0 });
  expect(result).toMatchObject({ status: 'completed', requestId: 'req-1' });
  expect(result.asset).toMatchObject({ kind: 'video', provider: 'fal-ai', url: 'https://cdn.test/out.mp4', generated: true });
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it('returns failed without leaking the API key', async () => {
  mockFetch([jsonResponse({ detail: 'bad request' }, 400)]);
  await expect(submitAndWait({ model: 'fal-ai/test', input: {} })).rejects.toThrow('fal.ai request failed');
  expect(consoleOutput()).not.toContain(process.env.FAL_API_KEY || '');
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `pnpm.cmd exec vitest run tests/media/fal-client.test.ts`
Expected: FAIL because the client is not implemented.

- [ ] **Step 3: Implement authenticated submit/poll behavior**

Use `getApiKey()`, send `Authorization: Key <key>`, validate non-empty model and input, normalize `COMPLETED`, `IN_PROGRESS`, `QUEUED`, and error statuses, enforce a bounded timeout, and parse image results from `images[0].url` and video results from `video.url`. Throw sanitized errors containing status and provider, never credentials.

- [ ] **Step 4: Run the tests and verify pass**

Run: `pnpm.cmd exec vitest run tests/media/fal-client.test.ts`
Expected: PASS.

### Task 3: Add Ordered Free Image Sources

**Files:**
- Create: `lib/media/image-sources.ts`
- Modify: `lib/engine/video-sourcer.ts`
- Test: `tests/media/image-sources.test.ts`

**Interfaces:**
- Produces `searchImages(query: ImageSourceQuery): Promise<MediaAsset[]>`.
- Default order is `openverse`, `pexels`, `pixabay`, `pollinations`, `aihorde`.
- Openverse requires no key; Pexels/Pixabay use `getApiKey()`; Pollinations uses a generated image URL; AI Horde uses its async generation endpoint when configured.

- [ ] **Step 1: Write failing normalization and fallback tests**

```ts
it('prefers Openverse and preserves attribution metadata', async () => {
  mockFetch([jsonResponse({ results: [{ id: '1', title: 'Lake', url: 'https://img.test/lake.jpg', thumbnail: 'https://img.test/thumb.jpg', width: 1200, height: 800, license: 'cc-by', creator: 'A' }] })]);
  const assets = await searchImages({ query: 'lake', aspectRatio: '16:9', limit: 1 });
  expect(assets[0]).toMatchObject({ provider: 'openverse', license: 'cc-by', attribution: 'A', generated: false });
});

it('continues through unavailable providers and reaches Pollinations', async () => {
  mockFetch([new Response('error', { status: 503 })]);
  const assets = await searchImages({ query: 'city', aspectRatio: '9:16', limit: 1 });
  expect(assets[0]).toMatchObject({ provider: 'pollinations', kind: 'image', generated: true });
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm.cmd exec vitest run tests/media/image-sources.test.ts`
Expected: FAIL because the source module is not implemented.

- [ ] **Step 3: Implement source adapters and safe ordering**

Normalize each provider into `MediaAsset`, filter invalid URLs, preserve Openverse license fields, call Pexels image search at `/v1/search`, call Pixabay image search at `/api/?key=...`, construct Pollinations URLs with encoded prompts and bounded dimensions, and skip AI Horde unless a key is available. A provider exception returns no assets and the selector continues.

- [ ] **Step 4: Extend VideoSourcer without breaking video search**

Keep `searchPexels`, `searchPixabay`, and `searchForKeywords` behavior intact, but resolve keys through `getApiKey()` and expose image lookup through the shared source module rather than duplicating HTTP normalization.

- [ ] **Step 5: Run focused tests and lint**

Run: `pnpm.cmd exec vitest run tests/media/image-sources.test.ts`
Expected: PASS.

Run: `& .\\node_modules\\.bin\\eslint.cmd lib/media/image-sources.ts lib/engine/video-sourcer.ts tests/media/image-sources.test.ts`
Expected: no output and exit code 0.

### Task 4: Add Scene Media Selection and fal Image/Video Adapters

**Files:**
- Create: `lib/media/media-selector.ts`
- Modify: `lib/engine/image-generator.ts`
- Modify: `lib/engine/video-generator.ts`
- Test: `tests/media/media-selector.test.ts`

**Interfaces:**
- Produces `selectSceneMedia(scene: Scene, options): Promise<MediaAsset>`.
- Produces `ImageGenerator.generateForScenes()` assets with `provider: 'fal-ai'` when fal is configured.
- Produces `VideoGenerator.generateAIVideo()` with a model-specific fal request and normalized completed output.

- [ ] **Step 1: Write failing selection tests**

```ts
it('selects stock image before generated image', async () => {
  mockSearchImages([{ id: 'stock-1', kind: 'image', provider: 'openverse', url: 'https://img.test/1.jpg', generated: false }]);
  const asset = await selectSceneMedia({ id: 's1', text: 'city', description: 'city', keywords: ['city'], duration: 4 }, { allowGenerated: true, aspectRatio: '9:16' });
  expect(asset.provider).toBe('openverse');
});

it('uses fal image generation when no source image is available', async () => {
  mockSearchImages([]);
  mockFalImage({ url: 'https://cdn.test/generated.png' });
  const asset = await selectSceneMedia({ id: 's1', text: 'city', description: 'city', keywords: ['city'], duration: 4 }, { allowGenerated: true, aspectRatio: '9:16' });
  expect(asset).toMatchObject({ provider: 'fal-ai', kind: 'image', generated: true });
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm.cmd exec vitest run tests/media/media-selector.test.ts`
Expected: FAIL because the selector and normalized fal path do not exist.

- [ ] **Step 3: Implement the selector**

Try existing scene video first when present, then `searchImages`, then fal image generation when `FAL_API_KEY` exists, then the existing Pollinations URL fallback. Return a single `MediaAsset`; do not silently classify a missing asset as a successful generated result.

- [ ] **Step 4: Replace direct fal HTTP code in ImageGenerator**

Build a fal image request from scene description, style, aspect ratio, and seed; call `submitAndWait`; convert the result to `scene.mediaAsset`, `scene.imageUrl`, and `scene.selectedVideo` for backward compatibility.

- [ ] **Step 5: Replace direct fal HTTP code in VideoGenerator**

Accept `characterSheetUrl` or a scene image URL as `image_url` for image-to-video models, select the configured model explicitly, call the queue client, and return a failed response or existing dry-run fallback only after the queue client reports failure.

- [ ] **Step 6: Run focused tests and diagnostics**

Run: `pnpm.cmd exec vitest run tests/media/media-selector.test.ts`
Expected: PASS.

Run: `get_errors` for `lib/media/media-selector.ts`, `lib/engine/image-generator.ts`, and `lib/engine/video-generator.ts`.
Expected: no errors.

### Task 5: Use Images in Mission and Remotion Composition

**Files:**
- Modify: `lib/engine/mission-orchestrator.ts`
- Modify: `remotion/Composition.tsx`
- Test: `tests/media/remotion-composition.test.tsx`

**Interfaces:**
- Mission asset stage stores `scene.mediaAsset` and continues populating `imageUrl`, `videoUrl`, and `selectedVideo` for existing consumers.
- Remotion receives beats with `imageUrl`, `videoUrl`, and optional `mediaAsset` fields.

- [ ] **Step 1: Write failing composition tests**

```tsx
it('renders an image beat when no video URL exists', () => {
  const tree = render(<MainComposition beats={[{ id: 'b1', text: 'caption', duration: 4, imageUrl: 'https://img.test/a.jpg' }]} />);
  expect(tree).toContainElement('img');
});

it('prefers video over image for the same beat', () => {
  const tree = render(<MainComposition beats={[{ id: 'b1', text: '', duration: 4, videoUrl: 'https://cdn.test/a.mp4', imageUrl: 'https://img.test/a.jpg' }]} />);
  expect(tree).toContainElement('video');
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm.cmd exec vitest run tests/media/remotion-composition.test.tsx`
Expected: FAIL because image animation and media provenance are not covered by the current component contract.

- [ ] **Step 3: Update mission asset sourcing**

For each scene, call `selectSceneMedia` after stock-video lookup. Prefer a real video asset, otherwise store the selected image and provenance. Preserve the existing deterministic Mixkit fallback when all media sources fail.

- [ ] **Step 4: Implement stable Ken Burns image rendering**

In `MainComposition`, choose video before image, render images inside an overflow-hidden container, and animate `scale` and `translateX/Y` from deterministic beat index values. Keep the beat duration unchanged and use `objectFit: 'cover'`. Do not resize layout based on media load state.

- [ ] **Step 5: Run focused tests and a production type check**

Run: `pnpm.cmd exec vitest run tests/media/remotion-composition.test.tsx`
Expected: PASS.

Run: `pnpm.cmd exec tsc --noEmit`
Expected: no TypeScript errors introduced by the media pipeline.

### Task 6: Wire Workflow Capability Status and Documentation

**Files:**
- Modify: `components/create/workflow-definitions.ts`
- Modify: `app/api/settings/keys/route.ts`
- Modify: `README.md`
- Modify: `.env.example`
- Test: `tests/media/workflow-capabilities.test.ts`

**Interfaces:**
- Workflow readiness reports missing media capability keys separately from OmniRoute readiness.
- Settings API accepts and masks `fal`, `aihorde`, `pexels`, `pixabay`, and `huggingface` credentials, while keyless Openverse/Pollinations remain available without stored credentials.

- [ ] **Step 1: Write failing capability tests**

```ts
it('does not mark AI video ready from OmniRoute alone', () => {
  const status = evaluateWorkflowStatus(WORKFLOW_DEFINITIONS['ai-videos'], { omniroute: configuredOmniRoute() });
  expect(status.missingProviders).toContain('fal');
});

it('marks stock footage ready with Openverse fallback and OmniRoute', () => {
  const status = evaluateWorkflowStatus(WORKFLOW_DEFINITIONS.footage, { omniroute: configuredOmniRoute() });
  expect(status.fallbackAvailable).toBe(true);
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm.cmd exec vitest run tests/media/workflow-capabilities.test.ts`
Expected: FAIL because OmniRoute currently satisfies every primary provider unconditionally.

- [ ] **Step 3: Implement capability-aware readiness**

Represent media capabilities as optional fallback groups: text capability is satisfied by OmniRoute; stock images by Openverse; stock video by Pexels/Pixabay/Openverse/Mixkit; generated image/video by fal or another configured adapter. Keep warnings actionable and do not require every provider in a fallback group.

- [ ] **Step 4: Document setup and privacy/licensing requirements**

Document the provider order, required variables, fal.ai trial/paid nature, Openverse attribution retention, and the fact that generated media URLs may expire and should be downloaded to durable storage before final rendering.

- [ ] **Step 5: Run the complete focused validation**

Run: `pnpm.cmd exec vitest run tests/media`
Expected: all media tests pass.

Run: `& .\\node_modules\\.bin\\eslint.cmd components/create/workflow-definitions.ts app/api/settings/keys/route.ts lib/media/*.ts lib/engine/image-generator.ts lib/engine/video-generator.ts remotion/Composition.tsx`
Expected: no output and exit code 0.

---

## Verification Checklist

- [ ] A mission can produce a video using only OmniRoute plus Openverse/Mixkit and the existing keyless TTS fallback.
- [ ] A configured Pexels or Pixabay key improves stock-video selection without changing the LLM path.
- [ ] A configured fal key can generate an image and an asynchronous video result through the queue client.
- [ ] fal errors and timeouts fall back without exposing credentials.
- [ ] Image-only scenes render as animated stills with subtitles and stable timing.
- [ ] Openverse attribution and license metadata survive scene selection.
- [ ] Workflow readiness no longer claims that OmniRoute alone proves fal, stock, or avatar capabilities.
- [ ] No SadTalker, ComfyUI, Wan, or GPU dependency is introduced by this plan.
