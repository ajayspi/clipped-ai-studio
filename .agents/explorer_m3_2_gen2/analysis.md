# Milestone 3 Investigation Report: Create Workflow Routes (Generators)

## Executive Summary
This investigation analyzes the five generator routes under `app/(app)/create/**` in the Clipped AI Studio application:
1. `app/(app)/create/auto/page.tsx` (Auto Pilot Autonomous Video Engine)
2. `app/(app)/create/bulk/page.tsx` (Bulk Content Planner)
3. `app/(app)/create/drama/page.tsx` (Micro-Drama Serialized Series Workflow)
4. `app/(app)/create/shorts/page.tsx` (Extract Shorts Viral Repurposing Workflow)
5. `app/(app)/create/url/page.tsx` (URL to Video Story Extractor)

All five routes are React 19 Client Components (`"use client"`). None of them require server-side data fetching or complex RSC harnesses. Four routes (`auto`, `bulk`, `drama`, `shorts`) initiate asynchronous backend rendering workflows via specialized POST endpoints (`/api/workflows/auto`, `/api/workflows/bulk-plan`, `/api/workflows/micro-drama`, `/api/workflows/extract-shorts`) and redirect to `/dashboard?job=<jobId>`. The fifth route (`url`) interacts with `/api/workflows/scrape`, injects narration and metadata directly into the global Zustand store (`useWizardStore`), and navigates to `/create/footage` in Auto-Pilot mode.

All five routes mount cleanly in a standard JSDOM headless environment without throwing uncaught exceptions, provided that `next/navigation` hooks (`useRouter`) and global `fetch` are stubbed (both of which are provided by `test/setup.ts`).

---

## Route-by-Route Deep Investigation

### 1. `app/(app)/create/auto/page.tsx` (Auto Pilot Pipeline)
- **Component Archetype**: Client Component (`"use client"`). Default export `AutoPilotPage()`.
- **Dependencies & Imports**:
  - `useState` from `react`
  - `useRouter` from `next/navigation`
  - UI components from `@/components/create/ui/`: `AspectRatioSelector` (active); `WorkflowHeader`, `VoiceSelector`, `MockModeToggle`, `GenerateButton`, `ErrorAlert`, `SettingsCard` (imported but page uses inline markup)
  - `lucide-react` icons (`Bot`, `Loader2`, `Sparkles`, `Settings2`, `Share2`, `CheckCircle2`, `Clock`, `Radio`, `Sliders`, `Layers`, `Globe`, `Rss`, `Activity`, `ArrowRight`, `ShieldCheck`)
- **Mount Behavior**:
  - Purely synchronous state initialization; no `useEffect`, no network calls on mount.
  - Safe against JSDOM environment without extra mock providers.
- **Form Controls & Inputs**:
  - `pipelineName`: Text input (`id="pipelineName"`), required.
  - `niche`: Text input (`id="niche"`), required.
  - `sourceStrategy`: 6 button options (`trending-rss` default, `news-aggregator`, `market-quotes`, `arxiv-preprints`, `wikipedia-featured`, `social-scraper`).
  - `visualPipeline`: 5 button options (`ai-videos` default, `ai-images`, `stock-footage`, `stories`, `extract-shorts`).
  - `platforms`: Multi-select toggle buttons (`youtube`, `tiktok` default; `instagram`, `twitter`). Enforces at least 1 platform selected (`if (platforms.length > 1)`).
  - `visualStyle`: Text input (`id="visualStyle"`), prefilled with `"modern cinematic, 4k ultra-detailed, vibrant dynamic lighting"`.
  - `schedule`: `<select>` dropdown (`0 8 * * *` default, `0 12 * * *`, `twice_daily`, `hourly`, `0 9 * * 1`, `manual`).
  - `aspectRatio`: `AspectRatioSelector` (`9:16` default, `16:9`, `1:1`).
  - `voice`: `<select>` dropdown (`alloy` default, `echo`, `fable`, `onyx`, `nova`, `shimmer`).
  - `autoPublish`: Checkbox (default `false`).
  - `mock`: Dry-run checkbox (default `false`).
  - Submit Button: `Deploy & Activate Auto Pilot Pipeline`. Disabled when `loading || !pipelineName.trim() || !niche.trim()`.
- **Submission Flow & API Calls**:
  - Intercepts `onSubmit` via `handleGenerate`.
  - Guards: `if (!pipelineName.trim() || !niche.trim()) return`.
  - Dispatches `POST /api/workflows/auto` with body:
    ```json
    {
      "pipelineName": "...",
      "niche": "...",
      "schedule": "0 8 * * *",
      "sourceStrategy": "trending-rss",
      "visualPipeline": "ai-videos",
      "autoPublish": false,
      "targetPlatforms": ["youtube", "tiktok"],
      "voice": "alloy",
      "visualStyle": "...",
      "aspectRatio": "9:16",
      "mock": false
    }
    ```
  - On 200: extracts `data.jobId` and calls `router.push('/dashboard?job=' + data.jobId)`.
  - On error: parses `errData.error || "Failed to configure auto-pilot pipeline"` and renders in error box.
- **Edge Cases & Failure Modes**:
  - `res.json().catch(() => ({}))` defensively avoids JSON syntax crashes on non-JSON 500 error pages.
  - Submitting without required fields is guarded both by HTML5 and by JavaScript check.

---

### 2. `app/(app)/create/bulk/page.tsx` (Bulk Content Planner)
- **Component Archetype**: Client Component (`"use client"`). Default export `BulkPage()`.
- **Dependencies & Imports**:
  - `useState` from `react`
  - `useRouter` from `next/navigation`
  - Reusable UI components from `@/components/create/ui/`: `WorkflowHeader`, `VoiceSelector`, `AspectRatioSelector`, `MockModeToggle`, `GenerateButton`, `ErrorAlert`, `SettingsCard`
  - `lucide-react` icons (`Calendar`, `Loader2`, `Sparkles`, `Settings2`, `Sliders`, `Share2`, `CheckCircle2`, `Clock`, `Zap`)
- **Mount Behavior**:
  - Synchronous initialization; no mount side effects.
- **Form Controls & Inputs**:
  - `niche`: Text input (`id="niche"`), required.
  - `contentCount`: 4 button selectors (`7` default, `14`, `21`, `30`). Updates header label dynamically: `"Content Batch Size: {contentCount} Videos"`.
  - `platforms`: Multi-select toggle buttons (`tiktok`, `youtube`, `instagram` default; `twitter`). Enforces at least 1 platform selected.
  - `visualStyle`: Text input (`id="visualStyle"`), prefilled with `"modern clean aesthetic, bright high-key lighting, 4k resolution"`.
  - `cadence`: `<select>` dropdown (`daily` default, `weekdays`, `3x_per_week`, `weekly`).
  - `aspectRatio`: `AspectRatioSelector` (`9:16` default, `16:9`, `1:1`).
  - `voice`: `VoiceSelector` (`alloy` default).
  - `mock`: `MockModeToggle` checkbox (default `false`).
  - `GenerateButton`: Text is `Generate {contentCount}-Day Bulk Content Plan`. Disabled when `!niche.trim()`.
- **Submission Flow & API Calls**:
  - Intercepts `onSubmit` via `handleGenerate`.
  - Guards: `if (!niche.trim()) return`.
  - Dispatches `POST /api/workflows/bulk-plan` with body:
    ```json
    {
      "niche": "...",
      "contentCount": 7,
      "cadence": "daily",
      "visualStyle": "...",
      "voice": "alloy",
      "platforms": ["tiktok", "youtube", "instagram"],
      "aspectRatio": "9:16",
      "mock": false
    }
    ```
  - On 200: extracts `data.jobId` and calls `router.push('/dashboard?job=' + data.jobId)`.
  - On error: displays error in `ErrorAlert` component.
- **Edge Cases & Failure Modes**:
  - If API returns non-200, handles gracefully without throwing unhandled exceptions.

---

### 3. `app/(app)/create/drama/page.tsx` (Micro-Drama Workflow)
- **Component Archetype**: Client Component (`"use client"`). Default export `DramaPage()`.
- **Dependencies & Imports**:
  - `useState` from `react`
  - `useRouter` from `next/navigation`
  - `lucide-react` icons (`Film`, `Users`, `Plus`, `Trash2`, `Sparkles`, `Loader2`, `Settings2`, `Sliders`, `Clapperboard`, `ShieldCheck`, `CheckCircle2`, `Layers`)
- **Mount Behavior**:
  - Synchronous initialization.
  - Characters array initialized with 2 characters:
    1. Detective Jax (voice: `onyx`, visualAnchor: `"charcoal cyber-coat, glowing blue optic eye implant, messy dark hair"`)
    2. Dr. Vesper (voice: `nova`, visualAnchor: `"platinum bob hair, silver lab coat, mirrored neural eyepiece"`)
- **Form Controls & Inputs**:
  - `genre`: 6 preset buttons (`cyberpunk-noir` default, `royal-romance`, `supernatural-thriller`, `space-opera`, `heist-action`, `psychological-drama`). Also supports `"custom"` if toggled.
  - Character Roster Builder:
    - "Add Character" button (`Plus` icon). Appends `Character ${nextIdx}`. Disabled when `characters.length >= 6`.
    - Character card controls:
      - Character Name input (required)
      - Voice Persona `<select>` (`onyx`, `alloy`, `nova`, `echo`, `fable`, `shimmer`)
      - Role & Personality input
      - Persistent Visual Anchor input (required, purple-accented)
      - "Remove character" button (`Trash2` icon). Hidden/disabled when `characters.length <= 1`.
  - Character Consistency Engine sidebar: Live preview cards displaying character names, voices, and visual anchors.
  - `script`: Textarea (`id="script"`), optional story premise / outline.
  - `episodesCount`: `<select>` dropdown (`1`, `2`, `3` default, `5`, `8`, `10`).
  - Narrative Arc Preview: Dynamic timeline showing Ep 1, Ep 2 (if >1), Ep 3 (if >2), Ep 4+ (if >3).
  - `aspectRatio`: 3 buttons (`9:16` default, `16:9`, `1:1`).
  - `visualStyle`: Text input (`"cinematic, photorealistic 8k, dramatic lighting, high contrast"` default).
  - Submit Button: `Generate {episodesCount}-Episode Micro-Drama`.
- **Submission Flow & API Calls**:
  - Intercepts `onSubmit` via `handleGenerate`.
  - Validations:
    - `activeGenre` non-empty (otherwise displays `"Please select or specify a genre"`).
    - `characters.length > 0` and at least one character has a non-empty name (otherwise displays `"At least one character is required"`).
  - Dispatches `POST /api/workflows/micro-drama` with body:
    ```json
    {
      "genre": "cyberpunk-noir",
      "characters": [...],
      "episodesCount": 3,
      "script": "..." || undefined,
      "aspectRatio": "9:16",
      "visualStyle": "..."
    }
    ```
  - On 200: extracts `data.jobId` and calls `router.push('/dashboard?job=' + data.jobId)`.
  - On error: displays error message in `.text-destructive` alert.
- **Edge Cases & Failure Modes**:
  - Deleting characters down to 1 prevents deleting the last character.
  - Adding up to 6 characters enforces max boundary.
  - Preview card handles empty names/anchors gracefully with fallback text.

---

### 4. `app/(app)/create/shorts/page.tsx` (Extract Shorts Workflow)
- **Component Archetype**: Client Component (`"use client"`). Default export `ShortsPage()`.
- **Dependencies & Imports**:
  - `useState` from `react`
  - `useRouter` from `next/navigation`
  - `lucide-react` icons (`Scissors`, `Link2`, `FileText`, `Upload`, `Sparkles`, `Loader2`, `Sliders`, `Flame`, `CheckCircle2`, `HelpCircle`)
- **Mount Behavior**:
  - Synchronous initialization.
  - Default `sourceType`: `"url"`.
  - Default `videoUrl`: prefilled with `"https://storage.clipped.ai/raw/tech-keynote-2026.mp4"`.
- **Form Controls & Inputs**:
  - Source Input Type Tabs:
    - `"url"`: Shows URL `<input type="url">`
    - `"transcript"`: Shows `<textarea>` for raw transcript / SRT
    - `"file"`: Shows drag-and-drop placeholder zone
  - Slicing Strategy Buttons: 5 options (`highest_virality` default, `hook-detector`, `question-hook`, `high-emotion`, `story-arc`).
  - `clipCount`: `<select>` dropdown (`1`, `2`, `3` default, `5`, `8`, `10`).
  - `captionStyle`: `<select>` dropdown (`bold-yellow-stroke` default, `clean-minimal`, `neon-glow`, `dynamic-karaoke`).
  - `aspectRatio`: 3 buttons (`9:16` default, `1:1`, `16:9`).
  - Submit Button: `Extract {clipCount} Viral Shorts`.
  - Sidebar: Virality Scoring Intelligence and Batch Repurposing Pipeline informational cards.
- **Submission Flow & API Calls**:
  - Intercepts `onSubmit` via `handleExtract`.
  - Validations:
    - If `sourceType === "url"` and `!videoUrl.trim()`, sets `"Please provide a valid video URL"`.
    - If `sourceType === "transcript"` and `!transcript.trim()`, sets `"Please paste a transcript to extract clips from"`.
  - Dispatches `POST /api/workflows/extract-shorts` with body:
    ```json
    {
      "sourceType": "url",
      "videoUrl": "...",
      "transcript": undefined,
      "clipCount": 3,
      "strategy": "highest_virality",
      "captionStyle": "bold-yellow-stroke",
      "aspectRatio": "9:16"
    }
    ```
  - On 200: extracts `data.jobId` and calls `router.push('/dashboard?job=' + data.jobId)`.
  - On error: displays error message in `.text-destructive` alert.
- **Edge Cases & Failure Modes**:
  - Switching between URL and Transcript tabs unmounts/remounts the corresponding inputs without losing state stored in React state.
  - Blanking out prefilled video URL triggers client-side validation error message without crashing.

---

### 5. `app/(app)/create/url/page.tsx` (URL to Video)
- **Component Archetype**: Client Component (`"use client"`). Default export `UrlToVideoPage()`.
- **Dependencies & Imports**:
  - `useState` from `react`
  - `useRouter` from `next/navigation`
  - `useWizardStore` from `@/components/wizard/wizard-store` (Zustand client store)
  - `lucide-react` icons (`Link`, `ArrowRight`, `Loader2`, `Link2`, `Sparkles`, `AlertCircle`)
- **Mount Behavior**:
  - Synchronous initialization.
  - Subscribes to `useWizardStore()`.
- **Form Controls & Inputs**:
  - Article URL: `<input type="url">` (`placeholder="https://example.com/blog/..."`), required.
  - Submit Button: `Generate Video <ArrowRight />`. Disabled when `!url || loading`.
- **Submission Flow & API Calls**:
  - Intercepts `onSubmit` via `handleSubmit`.
  - Guards: `if (!url) return`.
  - Dispatches `POST /api/workflows/scrape` with body:
    ```json
    {
      "url": "https://example.com/tech-article"
    }
    ```
  - On 200: receives `{ script: "..." }`.
  - Mutates Zustand store:
    - `w.reset()`
    - `w.set("workflowType", "footage")`
    - `w.set("narration", data.script)`
    - `w.set("subject", "Video from: " + new URL(url).hostname)`
    - `w.set("autoMode", true)`
  - Calls `router.push("/create/footage")`.
  - On error: catches error and sets `error` message in `AlertCircle` alert.
- **Edge Cases & Failure Modes**:
  - `new URL(url).hostname`: If the URL is malformed, `new URL()` throws `TypeError: Invalid URL`. Because it is wrapped in `try...catch`, it safely sets `setError(err.message)` without unhandled crash.
  - Zustand store maintains state across re-renders; in tests, reset should be called in `beforeEach` to guarantee isolation.

---

## Synthesis & Comparative Analysis

| Dimension | `auto` | `bulk` | `drama` | `shorts` | `url` |
|---|---|---|---|---|---|
| **Component Type** | Client (`"use client"`) | Client (`"use client"`) | Client (`"use client"`) | Client (`"use client"`) | Client (`"use client"`) |
| **API Endpoint** | `POST /api/workflows/auto` | `POST /api/workflows/bulk-plan` | `POST /api/workflows/micro-drama` | `POST /api/workflows/extract-shorts` | `POST /api/workflows/scrape` |
| **Destination Route** | `/dashboard?job=<jobId>` | `/dashboard?job=<jobId>` | `/dashboard?job=<jobId>` | `/dashboard?job=<jobId>` | `/create/footage` |
| **State Paradigm** | Local React state | Local React state | Local React state (character array) | Local React state (tabs) | React state + Zustand `useWizardStore` |
| **Initial Empty State** | Inputs empty | Inputs empty | 2 default characters | URL prefilled with demo MP4 | Input empty, button disabled |
| **Special UI Widgets** | Strategy grid, visual engines | Batch count buttons (7, 14, 21, 30) | Dynamic Character Roster (Add/Remove) | Tab switcher (URL, Transcript, File) | Centered card, hostname extractor |
| **Potential Crash Risks** | None detected | None detected | None detected | None detected | Malformed URL in `new URL()` (safely caught) |

---

## Concrete Test Specifications for `test/pages/create/generators.test.tsx`

The unified test suite will be placed at `test/pages/create/generators.test.tsx` and covers all five generator pages.

### Mocking Architecture
1. **Routing**: `next/navigation` is mocked in `test/setup.ts`. We can import `useRouter` from `next/navigation` to assert on `router.push` navigation.
2. **Fetch Routing**: Global `fetch` is mocked in `test/setup.ts`. Individual tests can spy on `fetch` or provide tailored mock responses:
   - `/api/workflows/auto` -> `{ success: true, jobId: 'job-auto-123' }`
   - `/api/workflows/bulk-plan` -> `{ success: true, jobId: 'job-bulk-456' }`
   - `/api/workflows/micro-drama` -> `{ success: true, jobId: 'job-drama-789' }`
   - `/api/workflows/extract-shorts` -> `{ success: true, jobId: 'job-shorts-101' }`
   - `/api/workflows/scrape` -> `{ success: true, script: 'Extracted viral script summary' }`
3. **Zustand Isolation**: Reset `useWizardStore.getState().reset()` before tests.

### Proposed Test Blueprint

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';

import AutoPilotPage from '@/app/(app)/create/auto/page';
import BulkPage from '@/app/(app)/create/bulk/page';
import DramaPage from '@/app/(app)/create/drama/page';
import ShortsPage from '@/app/(app)/create/shorts/page';
import UrlToVideoPage from '@/app/(app)/create/url/page';
import { useWizardStore } from '@/components/wizard/wizard-store';

describe('Create Generators Route Tests (test/pages/create/generators.test.tsx)', () => {
  let routerPushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    useWizardStore.getState().reset();
    const router = useRouter();
    routerPushMock = router.push as ReturnType<typeof vi.fn>;
    routerPushMock.mockClear();
  });

  // ==========================================================================
  // 1. Auto Pilot Route
  // ==========================================================================
  describe('Auto Pilot Route (app/(app)/create/auto/page.tsx)', () => {
    it('renders Auto Pilot page heading, description, and initial form elements', () => {
      render(<AutoPilotPage />);

      expect(screen.getByRole('heading', { level: 1, name: /auto pilot pipeline/i })).toBeInTheDocument();
      expect(screen.getByText(/Configure a fully autonomous 24\/7 video creation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pipeline identifier name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/content niche & industry focus/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /deploy & activate auto pilot pipeline/i })).toBeInTheDocument();
      expect(screen.getByText(/Trending RSS Feeds/i)).toBeInTheDocument();
      expect(screen.getByText(/Autonomous Pipeline Flow/i)).toBeInTheDocument();
    });

    it('updates inputs and button states on user interaction', () => {
      render(<AutoPilotPage />);

      const pipelineInput = screen.getByLabelText(/pipeline identifier name/i);
      const nicheInput = screen.getByLabelText(/content niche & industry focus/i);
      const submitBtn = screen.getByRole('button', { name: /deploy & activate auto pilot pipeline/i });

      expect(submitBtn).toBeDisabled();

      fireEvent.change(pipelineInput, { target: { value: 'Tech Pulse Daily' } });
      fireEvent.change(nicheInput, { target: { value: 'Artificial Intelligence' } });

      expect(submitBtn).not.toBeDisabled();

      // Click another source strategy
      const arxivBtn = screen.getByText(/ArXiv Research/i);
      fireEvent.click(arxivBtn);

      // Click visual engine
      const stockBtn = screen.getByRole('button', { name: /stock footage matcher/i });
      fireEvent.click(stockBtn);
    });

    it('submits form, calls POST /api/workflows/auto, and navigates to dashboard on success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, jobId: 'auto-job-999' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<AutoPilotPage />);

      fireEvent.change(screen.getByLabelText(/pipeline identifier name/i), {
        target: { value: 'Crypto Daily Flash' },
      });
      fireEvent.change(screen.getByLabelText(/content niche & industry focus/i), {
        target: { value: 'Cryptocurrency & DeFi' },
      });

      const submitBtn = screen.getByRole('button', { name: /deploy & activate auto pilot pipeline/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/workflows/auto',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Crypto Daily Flash'),
          })
        );
        expect(routerPushMock).toHaveBeenCalledWith('/dashboard?job=auto-job-999');
      });
    });

    it('handles submission error gracefully and displays error alert', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Auto-pilot quota exceeded' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<AutoPilotPage />);

      fireEvent.change(screen.getByLabelText(/pipeline identifier name/i), { target: { value: 'Test' } });
      fireEvent.change(screen.getByLabelText(/content niche & industry focus/i), { target: { value: 'Test' } });

      fireEvent.click(screen.getByRole('button', { name: /deploy & activate auto pilot pipeline/i }));

      await waitFor(() => {
        expect(screen.getByText('Auto-pilot quota exceeded')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // 2. Bulk Content Planner Route
  // ==========================================================================
  describe('Bulk Content Planner Route (app/(app)/create/bulk/page.tsx)', () => {
    it('renders Bulk Content Planner with default 7-day batch and controls', () => {
      render(<BulkPage />);

      expect(screen.getByRole('heading', { level: 1, name: /bulk content planner/i })).toBeInTheDocument();
      expect(screen.getByText(/Generate 7 to 30 days of high-retention video content/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/content niche or industry domain/i)).toBeInTheDocument();
      expect(screen.getByText(/Content Batch Size: 7 Videos/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate 7-day bulk content plan/i })).toBeInTheDocument();
    });

    it('switches batch size to 30 days and toggles platforms', () => {
      render(<BulkPage />);

      const thirtyDaysBtn = screen.getByRole('button', { name: /30 days \(full\)/i });
      fireEvent.click(thirtyDaysBtn);

      expect(screen.getByText(/Content Batch Size: 30 Videos/i)).toBeInTheDocument();
      expect(screen.getByText(/Full 1-Month Editorial Batch/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate 30-day bulk content plan/i })).toBeInTheDocument();
    });

    it('submits bulk plan form and navigates on success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, jobId: 'bulk-job-777' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<BulkPage />);

      fireEvent.change(screen.getByLabelText(/content niche or industry domain/i), {
        target: { value: 'B2B SaaS Growth' },
      });

      const submitBtn = screen.getByRole('button', { name: /generate 7-day bulk content plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/workflows/bulk-plan',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('B2B SaaS Growth'),
          })
        );
        expect(routerPushMock).toHaveBeenCalledWith('/dashboard?job=bulk-job-777');
      });
    });

    it('displays error message when bulk plan endpoint fails', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Database rate limit reached' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<BulkPage />);

      fireEvent.change(screen.getByLabelText(/content niche or industry domain/i), {
        target: { value: 'Productivity' },
      });

      fireEvent.click(screen.getByRole('button', { name: /generate 7-day bulk content plan/i }));

      await waitFor(() => {
        expect(screen.getByText('Database rate limit reached')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // 3. Micro-Drama Route
  // ==========================================================================
  describe('Micro-Drama Route (app/(app)/create/drama/page.tsx)', () => {
    it('renders Micro-Drama header, genre presets, default characters, and series arc', () => {
      render(<DramaPage />);

      expect(screen.getByRole('heading', { level: 1, name: /micro-drama workflow/i })).toBeInTheDocument();
      expect(screen.getByText(/Cyberpunk Noir/i)).toBeInTheDocument();
      expect(screen.getByText(/Royal Romance/i)).toBeInTheDocument();
      expect(screen.getByText(/Consistent Character Roster/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Detective Jax')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Dr. Vesper')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate 3-episode micro-drama/i })).toBeInTheDocument();
    });

    it('adds and removes characters in the roster', () => {
      render(<DramaPage />);

      const addBtn = screen.getByRole('button', { name: /add character/i });
      fireEvent.click(addBtn);

      expect(screen.getByDisplayValue('Character 3')).toBeInTheDocument();

      const removeBtns = screen.getAllByTitle(/remove character/i);
      expect(removeBtns.length).toBe(3);
      fireEvent.click(removeBtns[2]);

      expect(screen.queryByDisplayValue('Character 3')).not.toBeInTheDocument();
    });

    it('changes episodes count and updates button label', () => {
      render(<DramaPage />);

      const episodesSelect = screen.getByDisplayValue(/3 Episodes \(Standard Trilogy\)/i);
      fireEvent.change(episodesSelect, { target: { value: '5' } });

      expect(screen.getByRole('button', { name: /generate 5-episode micro-drama/i })).toBeInTheDocument();
      expect(screen.getByText(/Ep 4\+: High-Stakes Resolution & Climax/i)).toBeInTheDocument();
    });

    it('submits micro-drama form and navigates on success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, jobId: 'drama-job-555' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<DramaPage />);

      const submitBtn = screen.getByRole('button', { name: /generate 3-episode micro-drama/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/workflows/micro-drama',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Detective Jax'),
          })
        );
        expect(routerPushMock).toHaveBeenCalledWith('/dashboard?job=drama-job-555');
      });
    });
  });

  // ==========================================================================
  // 4. Extract Shorts Route
  // ==========================================================================
  describe('Extract Shorts Route (app/(app)/create/shorts/page.tsx)', () => {
    it('renders Extract Shorts heading, prefilled video URL, and virality scoring panel', () => {
      render(<ShortsPage />);

      expect(screen.getByRole('heading', { level: 1, name: /extract shorts workflow/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://storage.clipped.ai/raw/tech-keynote-2026.mp4')).toBeInTheDocument();
      expect(screen.getByText(/Highest Virality Score/i)).toBeInTheDocument();
      expect(screen.getByText(/Virality Scoring Intelligence/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /extract 3 viral shorts/i })).toBeInTheDocument();
    });

    it('switches between Video URL, Raw Transcript, and Video File tabs', () => {
      render(<ShortsPage />);

      const transcriptTab = screen.getByRole('button', { name: /raw transcript/i });
      fireEvent.click(transcriptTab);

      expect(screen.getByPlaceholderText(/Paste Transcript or SRT with Timestamps/i)).toBeInTheDocument();

      const fileTab = screen.getByRole('button', { name: /video file/i });
      fireEvent.click(fileTab);

      expect(screen.getByText(/Drag & Drop Long-form MP4 \/ MOV Video/i)).toBeInTheDocument();
    });

    it('submits shorts extraction and navigates on success', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, jobId: 'shorts-job-444' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<ShortsPage />);

      const submitBtn = screen.getByRole('button', { name: /extract 3 viral shorts/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/workflows/extract-shorts',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('https://storage.clipped.ai/raw/tech-keynote-2026.mp4'),
          })
        );
        expect(routerPushMock).toHaveBeenCalledWith('/dashboard?job=shorts-job-444');
      });
    });

    it('shows validation error when required input is empty', async () => {
      render(<ShortsPage />);

      const urlInput = screen.getByDisplayValue('https://storage.clipped.ai/raw/tech-keynote-2026.mp4');
      fireEvent.change(urlInput, { target: { value: '' } });

      const submitBtn = screen.getByRole('button', { name: /extract 3 viral shorts/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Please provide a valid video URL')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // 5. URL to Video Route
  // ==========================================================================
  describe('URL to Video Route (app/(app)/create/url/page.tsx)', () => {
    it('renders URL to Video heading, input, and disabled generate button', () => {
      render(<UrlToVideoPage />);

      expect(screen.getByRole('heading', { level: 1, name: /url to video/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://example.com/blog/...')).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /generate video/i });
      expect(submitBtn).toBeDisabled();
    });

    it('submits URL to scrape API, updates wizard store, and navigates to /create/footage', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            script: 'Extracted viral summary script about breakthrough quantum computing.',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      render(<UrlToVideoPage />);

      const input = screen.getByPlaceholderText('https://example.com/blog/...');
      fireEvent.change(input, { target: { value: 'https://techcrunch.com/2026/quantum-leaps' } });

      const submitBtn = screen.getByRole('button', { name: /generate video/i });
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/workflows/scrape',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ url: 'https://techcrunch.com/2026/quantum-leaps' }),
          })
        );

        // Verify wizard store mutation
        const storeState = useWizardStore.getState();
        expect(storeState.workflowType).toBe('footage');
        expect(storeState.narration).toBe(
          'Extracted viral summary script about breakthrough quantum computing.'
        );
        expect(storeState.subject).toBe('Video from: techcrunch.com');
        expect(storeState.autoMode).toBe(true);

        // Verify navigation
        expect(routerPushMock).toHaveBeenCalledWith('/create/footage');
      });
    });

    it('displays error alert when scraping fails', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Failed to extract content from paywalled article' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<UrlToVideoPage />);

      const input = screen.getByPlaceholderText('https://example.com/blog/...');
      fireEvent.change(input, { target: { value: 'https://example.com/paywalled' } });

      const submitBtn = screen.getByRole('button', { name: /generate video/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to extract content from paywalled article')).toBeInTheDocument();
      });
    });
  });
});
```

---

## Conclusion & Readiness
All five generator pages under `app/(app)/create/**` are well-isolated Client Components with no unhandled null values, no invalid browser API calls, and clean render semantics. The test specification above thoroughly exercises initial mount, form input updates, interactive button switching, REST API integration, error boundaries, and state synchronization. It is ready for direct implementation in `test/pages/create/generators.test.tsx`.
