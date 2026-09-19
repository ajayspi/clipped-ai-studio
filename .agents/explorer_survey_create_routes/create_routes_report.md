# Comprehensive Survey Report: Create Workflow Routes (`app/(app)/create/**`)

**Agent**: Explorer 3 (Create Workflow Routes Explorer)  
**Date**: 2026-09-17  
**Workspace**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`  
**Target Routes**: All `page.tsx` routes under `app/(app)/create/**`

---

## 1. Executive Summary

A comprehensive, code-level survey was conducted across all video generation workflow routes located under `app/(app)/create/**` in the Clipped codebase. In total, **13 `page.tsx` routes** were identified and inspected (the 12 routes explicitly specified in the prompt plus the root `/create` studio hub).

### Key Architectural Findings:
1. **100% Client Components**: Every single `page.tsx` under `app/(app)/create/**` is declared with `"use client"`. None are React Server Components (RSC).
2. **Three Core Page Archetypes**:
   - **Wizard Wrapper Routes (4 routes)**: `ai-videos`, `footage`, `images`, and `stories` are lightweight 10-line wrappers rendering `<CreationWizard workflowType="..." />`. They share Zustand-backed state management (`useWizardStore`), multi-step wizard logic, and `framer-motion` step transitions.
   - **Standalone Generator Forms (5 routes)**: `auto`, `bulk`, `drama`, `shorts`, and `url` maintain local React form states with customizable sliders, selectors (`AspectRatioSelector`, `VoiceSelector`), and direct `fetch` submissions to dedicated workflow backend endpoints (`/api/workflows/*`).
   - **Interactive Canvas & Reference Studios (2 routes)**: `avatar` and `whiteboard` provide real-time UI framing/drawing simulations. `whiteboard` interacts with Google Gemini 9-pose SVG reference sheets; `avatar` provides multi-layout PiP / talking-head previews.
   - **Dynamic Mission Polling View (1 route)**: `mission/[id]` monitors autonomous generation execution via React 19 `use(params)` and active `setInterval` polling to `/api/workflows/mission?id=...`.
   - **Create Hub (1 route)**: `/create` serves as the entry portal featuring the 1-Click `MissionPromptBar` and `WorkflowGrid` evaluating API key health via `/api/settings/keys`.
3. **React 19 & Next.js 16 Dynamic Route Special Case**:
   `app/(app)/create/mission/[id]/page.tsx` accepts `params: Promise<{ id: string }>` and calls `use(params)` from React 19 alongside `useSearchParams()` from `next/navigation`. Headless RTL tests must wrap this route in `<React.Suspense>` and supply `params` as a resolved Promise (`Promise.resolve({ id: "..." })`) to avoid runtime suspension crashes.
4. **Transitive Server / Database Imports in Client Pages**:
   `app/(app)/create/avatar/page.tsx` imports `AVATAR_PRESETS` from `@/lib/engine/avatar-orchestrator`. This orchestrator module transitively imports `@/lib/db` (initializing Supabase client). Headless unit tests must either ensure dummy environment variables for Supabase exist or mock `@/lib/engine/avatar-orchestrator`.

---

## 2. Inventory & Route Breakdown Matrix

| Route Path | Component Type | Expected Params | Key Navigation Hooks | Primary External Services & APIs | Headless Mount Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `app/(app)/create/page.tsx` | `'use client'` | None | Indirect (`useRouter` in children) | `GET /api/settings/keys`, `localStorage` | Low (Fetch handled in effect) |
| `app/(app)/create/auto/page.tsx` | `'use client'` | None | `useRouter` | `POST /api/workflows/auto` | Low (No mount effects) |
| `app/(app)/create/ai-videos/page.tsx` | `'use client'` | None | `useRouter` (in Wizard) | `useWizardStore`, `framer-motion` | Low (Clean mount) |
| `app/(app)/create/avatar/page.tsx` | `'use client'` | None | `useRouter` | Transitive `@/lib/db`, `POST /api/workflows/avatar` | Medium (Transitive Supabase init) |
| `app/(app)/create/bulk/page.tsx` | `'use client'` | None | `useRouter` | `POST /api/workflows/bulk-plan` | Low (No mount effects) |
| `app/(app)/create/drama/page.tsx` | `'use client'` | None | `useRouter` | `POST /api/workflows/drama` | Low (No mount effects) |
| `app/(app)/create/footage/page.tsx` | `'use client'` | None | `useRouter` (in Wizard) | `useWizardStore`, `framer-motion` | Low (Clean mount) |
| `app/(app)/create/images/page.tsx` | `'use client'` | None | `useRouter` (in Wizard) | `useWizardStore`, `framer-motion` | Low (Clean mount) |
| `app/(app)/create/shorts/page.tsx` | `'use client'` | None | `useRouter` | `POST /api/workflows/extract-shorts` | Low (No mount effects) |
| `app/(app)/create/stories/page.tsx` | `'use client'` | None | `useRouter` (in Wizard) | `useWizardStore`, `framer-motion` | Low (Clean mount) |
| `app/(app)/create/url/page.tsx` | `'use client'` | None | `useRouter` | `POST /api/workflows/scrape`, `useWizardStore` | Low (No mount effects) |
| `app/(app)/create/whiteboard/page.tsx` | `'use client'` | None | `useRouter` | `POST /api/workflows/whiteboard/character-sheet` (in mount effect) | Medium (Mount fetch trigger) |
| `app/(app)/create/mission/[id]/page.tsx` | `'use client'` | `params: Promise<{ id: string }>` | `useSearchParams`, `use(params)` | Polling `GET /api/workflows/mission?id=...`, `setInterval` | High (`use()` + Suspense + Polling) |

---

## 3. In-Depth Survey per Route

### 1. `app/(app)/create/page.tsx` (Create Studio Hub)
- **File**: `app/(app)/create/page.tsx` (Lines 1–73)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None (accepts `{}`).
- **Navigation Hooks**:
  - Direct: Uses Next.js `<Link href="/settings">` (line 44).
  - Indirect: Child components `MissionPromptBar` and `WorkflowCard` consume `useRouter()`.
- **Dependencies & APIs Consumed**:
  - `useApiKeys` hook (`components/create/useApiKeys.ts`): Triggers `fetch("/api/settings/keys")` inside `useEffect` on mount. Accesses `localStorage.getItem("clipped_api_keys_cache_v1")` and `localStorage.setItem(...)`.
  - `MissionPromptBar` (`components/create/MissionPromptBar.tsx`): Form submission calls `fetch("/api/workflows/mission", { method: "POST", ... })`. Uses `crypto.randomUUID()` for fallback URL routing.
  - `WorkflowGrid` (`components/create/WorkflowGrid.tsx`): Evaluates 10 workflows against active API key statuses.
- **Mock Requirements for Headless RTL**:
  - `next/navigation`: Mock `useRouter` with `{ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }`.
  - Global `fetch`: Mock `GET /api/settings/keys` returning `{ keys: {} }` to prevent unhandled network rejection.
  - `localStorage`: Basic mock or standard jsdom `window.localStorage`.
- **Initial Mount Crash Risks**:
  - `useApiKeys` wraps `localStorage` in `try...catch` and catches fetch failures (`console.warn`).
  - No uncaught crash risk on initial mount.

---

### 2. `app/(app)/create/auto/page.tsx` (Auto-Pilot Pipeline)
- **File**: `app/(app)/create/auto/page.tsx` (Lines 1–415)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: `useRouter` from `next/navigation` (line 4).
- **Dependencies & APIs Consumed**:
  - Form submission posts payload to `/api/workflows/auto` and routes to `/dashboard?job=${data.jobId}`.
  - Uses UI subcomponents: `WorkflowHeader`, `VoiceSelector`, `AspectRatioSelector`, `MockModeToggle`, `GenerateButton`, `ErrorAlert`, `SettingsCard` (all clean functional components).
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
  - No special context wrapper needed.
- **Initial Mount Crash Risks**:
  - All form states initialize with valid primitives/arrays (`pipelineName: ""`, `schedule: "0 8 * * *"`, `platforms: ["youtube", "tiktok"]`).
  - No `useEffect` on mount.
  - Initial render is completely safe.

---

### 3. `app/(app)/create/ai-videos/page.tsx` (AI Videos via CreationWizard)
- **File**: `app/(app)/create/ai-videos/page.tsx` (Lines 1–11)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**:
  - Indirect: `useRouter` from `next/navigation` inside `CreationWizard` (line 12, 26 of `CreationWizard.tsx`).
- **Dependencies & APIs Consumed**:
  - Renders `<CreationWizard workflowType="ai-videos" />`.
  - Store: `useWizardStore` (Zustand). On mount:
    ```ts
    useEffect(() => {
      if (w.workflowType !== workflowType) {
        w.reset()
        w.set('workflowType', workflowType)
      }
    }, [workflowType])
    ```
  - Animation: `framer-motion` (`motion.div`, `AnimatePresence`, `motion.button`).
  - Sub-views:
    - Mounts on Step 0: `<ScriptStep />` (inputs for subject, tone, targetDuration, narration).
    - Step 1: `<ScenesStep />`, Step 2: `<VoiceStep />`, Step 3: `<SubtitlesStep />`, Step 4: `<RenderStep />`.
    - Live Preview rail: `<LivePlayer />` is only rendered when `w.beats.length > 0`. On mount, `w.beats` is empty, displaying fallback dashed container.
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
  - Store Hygiene: Reset `useWizardStore.getState().reset()` before or after each test run to avoid cross-test pollution.
- **Initial Mount Crash Risks**:
  - Clean. No unhandled null accesses.

---

### 4. `app/(app)/create/avatar/page.tsx` (Avatar to Video Studio)
- **File**: `app/(app)/create/avatar/page.tsx` (Lines 1–523)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: `useRouter` from `next/navigation` (line 4, 65).
- **Dependencies & APIs Consumed**:
  - Imports `AVATAR_PRESETS` from `@/lib/engine/avatar-orchestrator` (line 20).
  - Submissions call `fetch("/api/workflows/avatar", { method: "POST", ... })`.
  - Live framing preview renders simulated HTML `<img>` elements and interactive layout toggles (`pip_bottom_right`, `pip_bottom_left`, `fullscreen`, `circular_bubble`, `side_by_side`).
  - Audio visualizer simulated via pure Tailwind CSS pulses (`animate-pulse`).
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
  - **Transitive Supabase Client Handling**:
    `lib/engine/avatar-orchestrator.ts` imports `@/lib/db`, which executes `createClient(defaultSupabaseUrl, defaultSupabaseAnonKey)`. The test runner must ensure that `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` are defined (or `@/lib/db` / `@/lib/engine/avatar-orchestrator` is mocked) to prevent module initialization failures.
- **Initial Mount Crash Risks**:
  - Look at lines 81–82:
    ```ts
    const selectedPreset =
      AVATAR_PRESETS.find((p) => p.id === selectedAvatarId) || AVATAR_PRESETS[0];
    ```
    and line 125:
    ```ts
    : selectedPreset.previewUrl;
    ```
    If `AVATAR_PRESETS` was an empty array, `selectedPreset` would be `undefined`, throwing `TypeError: Cannot read properties of undefined (reading 'previewUrl')`.
    In the codebase, `AVATAR_PRESETS` contains 4 static presets (`sarah_presenter`, `marcus_tech`, `alex_casual`, `emma_lifestyle`), so it does not crash under standard imports.
  - No mount effects (`useEffect`). Mounts cleanly.

---

### 5. `app/(app)/create/bulk/page.tsx` (Bulk Content Planner)
- **File**: `app/(app)/create/bulk/page.tsx` (Lines 1–233)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: `useRouter` from `next/navigation` (line 4, 26).
- **Dependencies & APIs Consumed**:
  - Submits to `POST /api/workflows/bulk-plan`.
  - Imports UI components: `WorkflowHeader`, `VoiceSelector`, `AspectRatioSelector`, `MockModeToggle`, `GenerateButton`, `ErrorAlert`, `SettingsCard`.
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
- **Initial Mount Crash Risks**:
  - Zero crash risk. Initial states are numbers/strings/arrays (`contentCount: 7`, `platforms: [...]`). No mount effects.

---

### 6. `app/(app)/create/drama/page.tsx` (Micro-Drama Series)
- **File**: `app/(app)/create/drama/page.tsx` (Lines 1–471)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: `useRouter` from `next/navigation` (line 4, 37).
- **Dependencies & APIs Consumed**:
  - Submits to `POST /api/workflows/micro-drama`.
  - Maintains `characters: CharacterInput[]` in local state, initialized with 2 characters: Detective Jax and Dr. Vesper.
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
- **Initial Mount Crash Risks**:
  - Zero crash risk. State defaults are pre-populated. No `useEffect` on mount.

---

### 7. `app/(app)/create/footage/page.tsx` (Stock Footage Matcher)
- **File**: `app/(app)/create/footage/page.tsx` (Lines 1–12)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: Indirect via `CreationWizard`.
- **Dependencies & APIs Consumed**:
  - Renders `<CreationWizard workflowType="footage" />`.
  - Consumes `useWizardStore` and renders Step 0 (`<ScriptStep />`).
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
  - `useWizardStore.getState().reset()` in test lifecycle.
- **Initial Mount Crash Risks**:
  - Zero crash risk.

---

### 8. `app/(app)/create/images/page.tsx` (Flux AI Images + Motion)
- **File**: `app/(app)/create/images/page.tsx` (Lines 1–11)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: Indirect via `CreationWizard`.
- **Dependencies & APIs Consumed**:
  - Renders `<CreationWizard workflowType="images" />`.
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
  - `useWizardStore.getState().reset()` in test lifecycle.
- **Initial Mount Crash Risks**:
  - Zero crash risk.

---

### 9. `app/(app)/create/shorts/page.tsx` (Extract Shorts Workflow)
- **File**: `app/(app)/create/shorts/page.tsx` (Lines 1–388)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: `useRouter` from `next/navigation` (line 4, 34).
- **Dependencies & APIs Consumed**:
  - Submits to `POST /api/workflows/extract-shorts`.
  - Static constants `STRATEGIES`, `CAPTION_STYLES`.
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
- **Initial Mount Crash Risks**:
  - Zero crash risk. State defaults (`videoUrl: "https://storage.clipped.ai/raw/tech-keynote-2026.mp4"`, `strategy: "highest_virality"`, `captionStyle: "bold-yellow-stroke"`) are non-null.

---

### 10. `app/(app)/create/stories/page.tsx` (Multi-Part Stories)
- **File**: `app/(app)/create/stories/page.tsx` (Lines 1–11)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: Indirect via `CreationWizard`.
- **Dependencies & APIs Consumed**:
  - Renders `<CreationWizard workflowType="stories" />`.
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
  - `useWizardStore.getState().reset()` in test lifecycle.
- **Initial Mount Crash Risks**:
  - Zero crash risk.

---

### 11. `app/(app)/create/url/page.tsx` (URL to Video)
- **File**: `app/(app)/create/url/page.tsx` (Lines 1–123)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: `useRouter` from `next/navigation` (line 5, 12).
- **Dependencies & APIs Consumed**:
  - Consumes `useWizardStore` directly to pre-hydrate narration before pushing to `/create/footage`.
  - Submits to `POST /api/workflows/scrape`.
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
  - `useWizardStore.getState().reset()` in test lifecycle.
- **Initial Mount Crash Risks**:
  - Initial mount is clean (form with URL input and submit button).
  - NOTE: On submission, line 39 runs `new URL(url).hostname`. If testing form submission, test cases must supply a valid URL string to prevent an unhandled URL parsing error.

---

### 12. `app/(app)/create/whiteboard/page.tsx` (Whiteboard Animation Studio)
- **File**: `app/(app)/create/whiteboard/page.tsx` (Lines 1–523)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**: None.
- **Navigation Hooks**: `useRouter` from `next/navigation` (line 4, 79).
- **Dependencies & APIs Consumed**:
  - **Mount Effect Execution**:
    ```ts
    // Lines 118-120
    useEffect(() => {
      fetchCharacterSheet();
    }, [archetype, style]);
    ```
    On mount, `fetchCharacterSheet()` calls `fetch("/api/workflows/whiteboard/character-sheet", { method: "POST", ... })`.
  - On submit: calls `fetch("/api/workflows/whiteboard", { method: "POST", ... })`.
  - Renders SVG paths for poses: `<svg><path d={poseData.svgPath} ... /></svg>`.
- **Mock Requirements for Headless RTL**:
  - `useRouter`: Mock `{ push: vi.fn() }`.
  - **Global `fetch` Mock**:
    Provide a mock response for `POST /api/workflows/whiteboard/character-sheet`:
    ```ts
    {
      success: true,
      characterId: "stickman",
      archetype: "stickman",
      sheetImageUrl: "https://example.com/sheet.png",
      style: "monoline_marker",
      poses: {
        pose_1: { name: "Neutral", description: "Standing", bbox: [0, 0, 100, 100], svgPath: "M 10 10 L 90 90" },
        pose_2: { name: "Pointing", description: "Pointing", bbox: [0, 0, 100, 100], svgPath: "M 20 20 L 80 80" }
      }
    }
    ```
- **Initial Mount Crash Risks**:
  - Even if `fetch` is unmocked or fails, `fetchCharacterSheet()` has a `try...catch` logging to `console.error`.
  - `characterSheet` defaults to `null`.
  - The JSX strictly guards pose accesses:
    - Line 385: `: characterSheet ? (`
    - Line 427: `{characterSheet.poses[activePosePreview] && (`
    - Line 475: `{characterSheet?.poses[activePosePreview]?.svgPath && (`
  - While `loadingSheet` is true or `characterSheet` is null, it displays `<div className="h-64 flex items-center justify-center text-slate-500 text-xs">No sheet loaded</div>` without crashing.

---

### 13. `app/(app)/create/mission/[id]/page.tsx` (Mission Progress Dynamic Route)
- **File**: `app/(app)/create/mission/[id]/page.tsx` (Lines 1–222)
- **Component Nature**: Client Component (`"use client"`).
- **Parameters**:
  - Expects `params: Promise<{ id: string }>` (lines 14–16).
  - Unwrapped inside the component body using React 19 `use()`:
    ```ts
    const unwrappedParams = use(params);
    const jobId = unwrappedParams.id;
    ```
- **Navigation Hooks**:
  - `useSearchParams` from `next/navigation` (line 20).
  - Child component `MissionHeader` uses `useRouter` (in `transferMissionToWizard`).
- **Dependencies & APIs Consumed**:
  - **Effect 1 (Query Param Fallback Trigger)**:
    Checks `searchParams.get("prompt")` and `searchParams.get("autoStart") === "true"`:
    If true, fires `fetch("/api/workflows/mission", { method: "POST", body: ... })`.
  - **Effect 2 (Status Polling Engine)**:
    Calls `pollJobStatus()` immediately on mount.
    Starts a 1000ms polling interval via `setInterval(...)`:
    ```ts
    const interval = setInterval(() => {
      if (job && (job.overallProgress === 100 || job.error)) {
        clearInterval(interval);
        return;
      }
      pollJobStatus();
    }, 1000);
    return () => clearInterval(interval);
    ```
    Inside `pollJobStatus()`: calls `fetch("/api/workflows/mission?id=${encodeURIComponent(jobId)}")`.
  - **Subcomponents**:
    - `MissionHeader`: Progress percentage, retry button, "Edit in Wizard" handoff.
    - `MissionStepper`: 5-stage status visualizer (Script, Scene Planning, Asset Sourcing, Voice, Video Composition).
    - `MissionLogConsole`: Live terminal display, clipboard copy button (`navigator.clipboard.writeText`).
    - `MissionLivePreview`: Storyboard scene cards, `<video>` element or `<img>` media previews.
    - `MissionStateHandoff`: Bridges mission data to `useWizardStore` and calls `router.push('/create/footage')`.
- **Mock Requirements for Headless RTL**:
  - **React 19 `params` Contract**:
    Must pass `params={Promise.resolve({ id: "mission-test-job-42" })}`. Passing a non-promise `{ id: "..." }` will throw `promise.then is not a function`.
  - **React `<Suspense>` Boundary**:
    Must wrap the component in `<React.Suspense fallback={<div>Loading...</div>}>` because `use(params)` suspends until the promise resolves.
  - **`next/navigation` Mocks**:
    - `useSearchParams`: mock returning `new URLSearchParams()` (with `.get()` method).
    - `useRouter`: mock returning `{ push: vi.fn() }`.
  - **Global `fetch` Mock**:
    Mock `GET /api/workflows/mission?id=...` returning:
    ```json
    {
      "success": true,
      "jobId": "mission-test-job-42",
      "currentStage": "scene_planning",
      "overallProgress": 40,
      "steps": [
        { "stage": "script_generation", "label": "Script Generation", "status": "completed", "progress": 100 },
        { "stage": "scene_planning", "label": "Scene Decomposition", "status": "in_progress", "progress": 50 }
      ],
      "data": {
        "prompt": "Test Video Topic",
        "aspectRatio": "9:16",
        "voice": "alloy",
        "style": "cinematic"
      }
    }
    ```
  - **Timer & Cleanup Discipline**:
    Because an active `setInterval` is launched on mount, tests must cleanly unmount the component (triggering `clearInterval`) or use Vitest fake timers (`vi.useFakeTimers()`).
  - **Browser API Stubs**:
    - `navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }`
    - `window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)`
- **Initial Mount Crash Risks**:
  - **Crash Risk 1 (Missing Suspense)**: Without `<Suspense>`, React 19 throws an unhandled boundary crash when `use(params)` suspends.
  - **Crash Risk 2 (Undefined jobId)**: In line 156, `jobId.substring(0, 13)` is executed. If `params` resolves to an object without `id`, `jobId.substring` will throw `TypeError: Cannot read properties of undefined (reading 'substring')`.
  - **Crash Risk 3 (Missing useSearchParams mock)**: Next.js App Router components calling `useSearchParams()` throw if executed outside App Router context unless mocked.

---

## 4. Cross-Cutting Patterns & Shared Architecture

### 4.1. CreationWizard Consolidation
4 of the 12 create routes (`ai-videos`, `footage`, `images`, `stories`) do not implement proprietary page layouts; they instantiate `<CreationWizard workflowType="..." />`.
- **Implication for Headless Test Suite**:
  Testing these 4 routes verifies that the wrapper mounts, passes the correct `workflowType` prop to `CreationWizard`, and that `CreationWizard` initializes into Step 0 (`<ScriptStep />`).
  Extensive step-by-step testing (Scenes, Voice, Subtitles, Render) can either be tested once against `CreationWizard.test.tsx` or parameterized across all 4 route files.

### 4.2. Next.js 16 & React 19 Parity
Next.js 16 changed page route `params` and `searchParams` to asynchronous Promises:
- Ordinary static routes accept `{}`.
- Dynamic route `mission/[id]` explicitly declares `params: Promise<{ id: string }>`.
- Unit tests for `mission/[id]` must strictly test with a Promise parameter rather than a plain object.

### 4.3. API Endpoint Dependency Map
The create routes make calls to the following backend API routes:
- `/api/settings/keys` (Create Hub)
- `/api/workflows/auto` (Auto-Pilot)
- `/api/workflows/bulk-plan` (Bulk Planner)
- `/api/workflows/micro-drama` (Micro-Drama)
- `/api/workflows/extract-shorts` (Shorts)
- `/api/workflows/scrape` (URL to Video)
- `/api/workflows/avatar` (Avatar)
- `/api/workflows/whiteboard` & `/api/workflows/whiteboard/character-sheet` (Whiteboard)
- `/api/workflows/mission` (Mission dispatch and polling)
- `/api/v1/script`, `/api/v1/analyze`, `/api/v1/source`, `/api/workflows/generate` (CreationWizard)

---

## 5. Recommended Mock Context Wrapper & RTL Harness Design

To ensure reliable, headless execution of all 13 Create routes without uncaught boundary crashes, the following unified mock test wrapper is recommended for Milestone 2 and Milestone 4:

### Recommended RTL Test Helper (`tests/helpers/create-test-wrapper.tsx`):
```tsx
import React, { Suspense } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { vi } from "vitest";

// Mock next/navigation
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: "/create",
};

export const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/create",
  useSearchParams: () => mockSearchParams,
  useParams: () => ({}),
}));

// Browser API Polyfills & Stubs
if (typeof window !== "undefined") {
  if (!window.HTMLMediaElement.prototype.play) {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  }
  if (!navigator.clipboard) {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  }
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<div data-testid="test-suspense-fallback">Loading...</div>}>
      {children}
    </Suspense>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}
```

---

## 6. Implementation Checklist for Subsequent Milestones

- [ ] **Create Test Infrastructure**: Ensure Vitest, JSDOM, and `@testing-library/react` are configured with the navigation and media element stubs.
- [ ] **CreationWizard Store Hygiene**: Implement an `afterEach(() => { useWizardStore.getState().reset(); })` hook in all wizard route tests.
- [ ] **Mission Polling Cleanup**: In `mission/[id].test.tsx`, wrap the test in `renderWithProviders(<MissionProgressPage params={Promise.resolve({ id: "test-job-1" })} />)` and ensure `mockFetch` returns a resolved job state to prevent runaway polling intervals.
- [ ] **Avatar Supabase Isolation**: Provide mock fallback values for `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` in `vitest.setup.ts`.
- [ ] **Whiteboard Mount Fetch**: In `whiteboard.test.tsx`, mock `POST /api/workflows/whiteboard/character-sheet` so the 9-pose grid mounts with rendered SVG elements.
