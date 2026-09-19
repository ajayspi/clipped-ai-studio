# Milestone 3 Explorer Report: Interactive Studios & Mission Dynamic Route

**Agent**: Explorer M3-3 (`explorer_m3_3_gen2`)  
**Target Routes**:
1. `app/(app)/create/avatar/page.tsx` (Avatar to Video Studio)
2. `app/(app)/create/whiteboard/page.tsx` (Whiteboard Animation Studio)
3. `app/(app)/create/mission/[id]/page.tsx` (Autonomous Mission Progress Route)

**Test Specifications**:
- `test/pages/create/interactive.test.tsx` (Avatar & Whiteboard Studios)
- `test/pages/create/mission.test.tsx` (Mission [id] Dynamic Route)

---

## 1. Executive Summary

Milestone 3 focuses on verifying all creation workflows under `app/(app)/create/**`. As Explorer M3-3, this investigation analyzed the interactive visual studios (`avatar` and `whiteboard`) and the mission tracking dynamic route (`mission/[id]`).

### Key Findings:
1. **Avatar Studio (`create/avatar`)**:
   - Implements a pure Client Component with rich UI controls: 5 preset avatars (`AVATAR_PRESETS`), custom photo portrait URL inputs, 6 neural voices (`nova`, `onyx`, `rachel`, `josh`, `alloy`, `shimmer`), speed sliders (`0.75x` to `1.5x`), 5 compositing layouts (PiP bottom-right, PiP bottom-left, fullscreen, circular bubble, side by side), and 3 aspect ratios (`9:16`, `16:9`, `1:1`).
   - Live framing preview uses a CSS-simulated video container (not an HTML5 canvas element) with responsive aspect ratio, layered positioning, subtitle overlay, and pulsing audio wave bars.
   - Generation pipeline triggers a POST request to `/api/workflows/avatar`, redirecting to `/create/mission/[jobId]`.
   - Runs cleanly in JSDOM without missing DOM polyfills.

2. **Whiteboard Studio (`create/whiteboard`)**:
   - Implements a Client Component with 8 Gemini character archetypes, 5 whiteboard styles, 6 marker ink colors, a 9-pose reference grid, and a live progressive sketch canvas mockup.
   - **CRITICAL BUG/VULNERABILITY FOUND**: In `app/(app)/create/whiteboard/page.tsx`, `useEffect` calls `fetchCharacterSheet()` on mount. If the fetch response does not include a `poses` dictionary (for example, when running against the fallback mock in `test/setup.ts` returning `{ success: true, data: [] }`), line 390 (`const poseData = characterSheet.poses[pose.id]`) and line 427 (`characterSheet.poses[activePosePreview]`) throw an unhandled `TypeError: Cannot read properties of undefined (reading 'pose_1')`.
   - Tests and mocks MUST provide a valid `poses` dictionary for `/api/workflows/whiteboard/character-sheet`, or the component should implement defensive optional chaining (`characterSheet?.poses?.[pose.id]`).

3. **Mission Dynamic Route (`create/mission/[id]`)**:
   - **React 19 / Next.js 15 Dynamic Route Contract**: Route parameters are typed as `params: Promise<{ id: string }>`.
   - Line 18 explicitly calls `const unwrappedParams = use(params)` using React 19's `use()` hook.
   - **Suspense Requirement**: When tested in Vitest/RTL, `<MissionProgressPage params={Promise.resolve({ id: '...' })} />` **MUST** be wrapped in a `<React.Suspense fallback={...}>` boundary.
   - Implements a 1000ms polling loop to `/api/workflows/mission?id=...`. When `overallProgress === 100` or `job.error` is present, the interval automatically clears.
   - Features rich child components: `MissionHeader` (metadata, progress bar, retry, wizard handoff), `MissionStepper` (5-stage visualizer), `MissionLogConsole` (streaming execution logs with clipboard copy), and `MissionLivePreview` (completed `<video>` player or scene storyboard thumbnails).
   - "Manual / Edit in Wizard" hydrates Zustand store `useWizardStore` and navigates to `/create/footage`.

---

## 2. Deep Dive: Avatar Studio (`app/(app)/create/avatar/page.tsx`)

### 2.1 Component Structure & State
- **File**: `app/(app)/create/avatar/page.tsx`
- **Directive**: `"use client"`
- **Hooks**: `useRouter()`, `useState()`
- **Key State Variables**:
  - `avatarType`: `'preset' | 'custom_photo'` (default: `'preset'`)
  - `selectedAvatarId`: string (default: `'sarah_presenter'`)
  - `customImageUrl`: string (default: `''`)
  - `script`: string (default: initial studio launch narration, ~21 words)
  - `voice`: string (default: `'nova'`)
  - `speed`: number (default: `1.0`, range `0.75` - `1.5`)
  - `layout`: string (default: `'pip_bottom_right'`)
  - `aspectRatio`: string (default: `'9:16'`)
  - `generating`: boolean (default: `false`)
  - `statusMessage`: string (default: `''`)

### 2.2 Presets & Controls Matrix
- **Avatar Presets** (imported from `@/lib/engine/avatar-orchestrator`):
  - `sarah_presenter` (Sarah - Presenter)
  - `marcus_tech` (Marcus - Tech Anchor)
  - `alex_casual` (Alex - Creator)
  - `elena_pro` (Elena - Corporate Host)
  - `david_story` (David - Narrative Doc)
- **Neural Voices**:
  - `nova` (Nova: Warm & Engaging - Female, American)
  - `onyx` (Onyx: Deep & Authoritative - Male, American)
  - `rachel` (Rachel: Professional Presenter - Female, British)
  - `josh` (Josh: Dynamic & Youthful - Male, American)
  - `alloy` (Alloy: Neutral & Balanced - Neutral, American)
  - `shimmer` (Shimmer: Expressive & Clear - Female, American)
- **Compositing Layouts**:
  - `pip_bottom_right` (↘ PiP Bottom-Right)
  - `pip_bottom_left` (↙ PiP Bottom-Left)
  - `fullscreen` (🔲 Fullscreen Presenter)
  - `circular_bubble` (🫧 Circular Bubble)
  - `side_by_side` (◫ Side by Side)
- **Aspect Ratios**:
  - `9:16` (Vertical: Reels / TikTok)
  - `16:9` (Landscape: YouTube / Desktop)
  - `1:1` (Square: Instagram / Feed)

### 2.3 Live Framing Preview & Visual Elements
- **Simulated Video Frame**:
  - Rendered via a CSS container with dynamic `style={{ aspectRatio }}`.
  - No HTML5 `<canvas>` element or WebGL context is initialized; it uses pure DOM elements, Unsplash images, CSS gradients, and Tailwind positioning classes.
  - Subtitle banner: `"NEW AI-DRIVEN VIDEO PIPELINES"` Hormozi style badge.
  - Audio wave visualizer: 10 animated pulse bars with `Voice Sync: {voice.toUpperCase()}` and estimated duration.

### 2.4 Generation Pipeline Execution
```ts
const handleGenerate = async () => {
  if (!script.trim()) return;
  setGenerating(true);
  setStatusMessage("Synthesizing neural voice and initializing talking head compositing...");
  try {
    const res = await fetch("/api/workflows/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script,
        avatarType,
        avatarId: selectedAvatarId,
        customImageUrl: avatarType === "custom_photo" ? customImageUrl : undefined,
        layout,
        voice,
        speed,
        aspectRatio,
      }),
    });
    const data = await res.json();
    if (data.success && data.jobId) {
      setStatusMessage("Job created! Redirecting to Mission Progress...");
      router.push(`/create/mission/${data.jobId}`);
    } else {
      setStatusMessage(data.error || "Generation failed");
      setGenerating(false);
    }
  } catch (err: any) {
    setStatusMessage(err.message || "An error occurred");
    setGenerating(false);
  }
};
```

---

## 3. Deep Dive: Whiteboard Studio (`app/(app)/create/whiteboard/page.tsx`)

### 3.1 Component Structure & State
- **File**: `app/(app)/create/whiteboard/page.tsx`
- **Directive**: `"use client"`
- **Hooks**: `useRouter()`, `useState()`, `useEffect()`
- **Key State Variables**:
  - `prompt`: string (default: `"How neural networks learn: from simple weights to intelligence"`)
  - `archetype`: string (default: `'stickman'`)
  - `customDescription`: string (default: `''`)
  - `style`: string (default: `'monoline_marker'`)
  - `markerColor`: string (default: `'#1E293B'`)
  - `aspectRatio`: string (default: `'16:9'`)
  - `activePosePreview`: string (default: `'pose_1'`)
  - `characterSheet`: `CharacterSheet | null` (default: `null`)
  - `loadingSheet`: boolean (default: `false`)
  - `generating`: boolean (default: `false`)

### 3.2 Archetypes & Styles
- **Archetypes**:
  - `stickman` (Stickman Classic, ✏️)
  - `saint` (Saint / Philosopher, 📜)
  - `old man` (Elder Professor, 👴)
  - `founder` (Startup Founder, 💼)
  - `doctor` (Medical Doctor, 🩺)
  - `teacher` (Academic Teacher, 🎓)
  - `scientist` (Lab Scientist, 🧪)
  - `custom` (Custom Character, ✨) — reveals bespoke description input
- **Visual Styles**:
  - `monoline_marker` (Monoline Marker)
  - `blackboard_chalk` (Blackboard Chalk - dark slate theme)
  - `blueprint` (Blueprint Grid - navy / cyan theme)
  - `colored_doodle` (Colored Doodle)
  - `sketch_outline` (Rough Sketch)
- **Marker Colors**: Slate Dark (`#1E293B`), Royal Blue (`#2563EB`), Crimson Red (`#DC2626`), Emerald Green (`#16A34A`), Violet Purple (`#9333EA`), Amber Gold (`#D97706`).

### 3.3 Critical Vulnerability: Missing `poses` Property Crash
On component mount, `useEffect([archetype, style])` triggers `fetchCharacterSheet()`:
```ts
const fetchCharacterSheet = async () => {
  setLoadingSheet(true);
  try {
    const res = await fetch("/api/workflows/whiteboard/character-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archetype, customDescription: archetype === "custom" ? customDescription : undefined, style }),
    });
    const data = await res.json();
    if (data.success) {
      setCharacterSheet(data);
    }
  } catch (err) {
    console.error("Failed to load character sheet:", err);
  } finally {
    setLoadingSheet(false);
  }
};
```
In JSX (lines 388-443):
```tsx
) : characterSheet ? (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-2 ...">
      {POSE_NAMES.map((pose) => {
        const poseData = characterSheet.poses[pose.id]; // <--- LINE 390 CRASH IF poses IS UNDEFINED!
        ...
      })}
    </div>
    {characterSheet.poses[activePosePreview] && ( // <--- LINE 427 CRASH IF poses IS UNDEFINED!
```
**Why this matters in tests**:
In `test/setup.ts`, unknown endpoints default to:
`new Response(JSON.stringify({ success: true, data: [] }))`
If a test renders `<WhiteboardCreatePage />` without explicitly mocking `/api/workflows/whiteboard/character-sheet`:
1. `data.success` is `true`.
2. `setCharacterSheet({ success: true, data: [] })` executes.
3. On render, `characterSheet` is truthy, but `characterSheet.poses` is `undefined`.
4. Line 390 executes `characterSheet.poses[pose.id]` -> **Throws `TypeError: Cannot read properties of undefined (reading 'pose_1')`**.

**Resolution for test implementation**:
1. All tests rendering `WhiteboardCreatePage` must spy on `globalThis.fetch` and return a valid mock sheet containing `poses: { pose_1: { ... }, ... , pose_9: { ... } }`.
2. Recommend adding a defensive guard to `app/(app)/create/whiteboard/page.tsx`:
   - `if (data.success && data.poses) setCharacterSheet(data);`
   - Use optional chaining: `characterSheet?.poses?.[pose.id]` and `characterSheet?.poses?.[activePosePreview]`.

---

## 4. Deep Dive: Mission Dynamic Route (`app/(app)/create/mission/[id]/page.tsx`)

### 4.1 React 19 Dynamic Route Contract
In Next.js 15 with React 19, route parameters are asynchronous promises:
```tsx
export default function MissionProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const jobId = unwrappedParams.id;
```
- Line 3 imports `use` directly from `"react"` (`import React, { useEffect, useState, use } from "react"`).
- Line 18 invokes `const unwrappedParams = use(params)`.
- It does **not** use `await params` (which is only valid in async Server Components).
- It does **not** use `useParams()` from `next/navigation`.

### 4.2 Suspense Requirement in Headless Vitest
Because `use(params)` suspends until the promise resolves, rendering `<MissionProgressPage params={...} />` without a `<React.Suspense>` boundary in React 19 causes a React suspense violation or unhandled suspension warning.
**Contract for Vitest**:
```tsx
render(
  <React.Suspense fallback={<div>Loading mission params...</div>}>
    <MissionProgressPage params={Promise.resolve({ id: 'test-mission-123' })} />
  </React.Suspense>
);
```

### 4.3 Polling Engine & State Machine
```ts
const pollJobStatus = async () => {
  try {
    const res = await fetch(`/api/workflows/mission?id=${encodeURIComponent(jobId)}`);
    if (!res.ok) {
      if (res.status === 404 && !job) {
        // Fallback placeholder while orchestrator initializes
        setJob({ jobId, prompt: fallbackPrompt, currentStage: "script_generation", overallProgress: 10, steps: [...] });
      }
      return;
    }
    const json = await res.json();
    if (json.success) {
      setJob({ jobId: json.jobId, ... });
      setFetchError(null);
    }
  } catch (err: any) {
    console.warn("Polling error:", err);
  } finally {
    setLoading(false);
  }
};
```
- Polling runs immediately on mount and then every `1000ms` via `setInterval`.
- Termination condition:
  `if (job && (job.overallProgress === 100 || job.error)) clearInterval(interval);`
- In React Testing Library tests, unmounting the component triggers `return () => clearInterval(interval)`, preventing interval leaks.

### 4.4 Child Components Analysis
1. **`MissionHeader`**:
   - Displays mode badge ("Automatic Mission Mode"), status badge ("Completed (100%)", "Failed", or "In Progress (X%)"), aspect ratio, voice, style, and mission prompt.
   - Progress bar with dynamic fill (`style={{ width: '${Math.max(3, job.overallProgress)}%' }}`).
   - "Retry Mission" button: only rendered when `job.error` is present.
   - "Manual / Edit in Wizard" button: invokes `transferMissionToWizard(job, router)`.
2. **`MissionStepper`**:
   - Visualizes 5 pipeline stages:
     1. `script_generation` (Script Generation)
     2. `scene_planning` (Scene Decomposition)
     3. `asset_sourcing` (Asset Sourcing)
     4. `voice_synthesis` (Voice & Audio Synthesis)
     5. `video_composition` (Video Composition)
   - Accurately computes "X of 5 Stages Completed".
   - Displays stage logs and animated pulsing progress bars for `in_progress` steps.
3. **`MissionLogConsole`**:
   - Parses `startedAt`, `completedAt`, `log`, and `error` from steps.
   - Auto-scrolls to bottom via `scrollRef.current.scrollTop = scrollRef.current.scrollHeight`.
   - Has "Copy Logs" button calling `navigator.clipboard.writeText(text)` with a 2-second "Copied" feedback state.
   - Has Chevron toggle button to collapse and expand the console.
4. **`MissionLivePreview`**:
   - When completed and `job.videoUrl` is present: mounts `<video src={job.videoUrl} controls autoPlay loop />`.
   - When in progress with scenes: displays active scene background image/video, camera motion badge, subtitle narration beat, and scene thumbnail selector.
   - Thumbnail selector allows clicking through scenes, updating `selectedSceneIndex`.
5. **`transferMissionToWizard` (`MissionStateHandoff.ts`)**:
   - Maps `mission.scenes` into `Beat[]` format.
   - Hydrates `useWizardStore` with `workflowType: 'footage'`, `subject`, `narration`, `beats`, `aspectRatio`, `voice`.
   - Calls `router.push('/create/footage')`.

---

## 5. Test Architecture Specifications

### 5.1 Test File 1: `test/pages/create/interactive.test.tsx`

This file will contain two main test suites: `Avatar Studio` and `Whiteboard Studio`.

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AvatarCreatePage from '@/app/(app)/create/avatar/page';
import WhiteboardCreatePage from '@/app/(app)/create/whiteboard/page';

describe('Interactive Studio Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Avatar to Video Studio (app/(app)/create/avatar/page.tsx)', () => {
    it('renders initial studio layout, controls, and live framing preview', () => {
      render(<AvatarCreatePage />);
      expect(screen.getByText('Avatar to Video Studio')).toBeInTheDocument();
      expect(screen.getByText(/HeyGen \/ LivePortrait & Remotion PiP Ready/i)).toBeInTheDocument();
      expect(screen.getByText('Presenter Avatar Selection')).toBeInTheDocument();
      expect(screen.getByText('Spoken Script & Narration')).toBeInTheDocument();
      expect(screen.getByText('Neural Voice')).toBeInTheDocument();
      expect(screen.getByText('Compositing Layout')).toBeInTheDocument();
      expect(screen.getByText('Live Framing Canvas Preview')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate talking head avatar video/i })).toBeInTheDocument();
    });

    it('switches between Preset Avatars and Custom Photo tab', () => {
      render(<AvatarCreatePage />);
      expect(screen.getByText('Sarah (Presenter)')).toBeInTheDocument();

      const customPhotoTab = screen.getByRole('button', { name: /custom photo/i });
      fireEvent.click(customPhotoTab);

      expect(screen.getByPlaceholderText(/images.unsplash.com/i)).toBeInTheDocument();
      expect(screen.queryByText('Sarah (Presenter)')).not.toBeInTheDocument();

      const presetTab = screen.getByRole('button', { name: /preset avatars/i });
      fireEvent.click(presetTab);
      expect(screen.getByText('Sarah (Presenter)')).toBeInTheDocument();
    });

    it('updates presenter selection, voice, and layout preview', () => {
      render(<AvatarCreatePage />);
      const marcusButton = screen.getByText('Marcus (Tech Anchor)').closest('button');
      if (marcusButton) fireEvent.click(marcusButton);

      const voiceSelect = screen.getByRole('combobox');
      fireEvent.change(voiceSelect, { target: { value: 'onyx' } });
      expect(screen.getByText(/Voice Sync: ONYX/i)).toBeInTheDocument();

      const fullscreenLayout = screen.getByRole('button', { name: /fullscreen presenter/i });
      fireEvent.click(fullscreenLayout);
      expect(screen.getByText('Fullscreen Presenter')).toBeInTheDocument();
    });

    it('submits generation request and navigates to mission page on success', async () => {
      const router = useRouter();
      const mockPush = vi.spyOn(router, 'push');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, jobId: 'avatar-job-777' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<AvatarCreatePage />);
      const generateButton = screen.getByRole('button', { name: /generate talking head avatar video/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/create/mission/avatar-job-777');
      });
    });

    it('displays error message when generation fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, error: 'Provider quota exhausted' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<AvatarCreatePage />);
      const generateButton = screen.getByRole('button', { name: /generate talking head avatar video/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Provider quota exhausted')).toBeInTheDocument();
      });
    });
  });

  describe('Whiteboard Animation Studio (app/(app)/create/whiteboard/page.tsx)', () => {
    const mockCharacterSheet = {
      success: true,
      characterId: 'sheet-stickman-test',
      archetype: 'stickman',
      style: 'monoline_marker',
      sheetImageUrl: 'https://example.com/sheet.png',
      poses: {
        pose_1: { name: 'Neutral', description: 'Standing balanced', bbox: [0, 0, 333, 333], svgPath: 'M50,20 L50,70' },
        pose_2: { name: 'Pointing', description: 'Pointing to concept', bbox: [333, 0, 666, 333], svgPath: 'M50,20 L85,35' },
        pose_3: { name: 'Eureka', description: 'Idea discovery moment', bbox: [666, 0, 1000, 333], svgPath: 'M50,25 L75,35' },
        pose_4: { name: 'Explaining', description: 'Discourse & presenting', bbox: [0, 333, 333, 666], svgPath: 'M50,20 L80,45' },
        pose_5: { name: 'Reading', description: 'Reviewing scroll/book', bbox: [333, 333, 666, 666], svgPath: 'M50,20 L35,55' },
        pose_6: { name: 'Confused', description: 'Pondering & questioning', bbox: [666, 333, 1000, 666], svgPath: 'M50,20 L50,70' },
        pose_7: { name: 'Sitting', description: 'Seated posture', bbox: [0, 666, 333, 1000], svgPath: 'M50,20 L50,70' },
        pose_8: { name: 'Writing', description: 'Inscribing on board', bbox: [333, 666, 666, 1000], svgPath: 'M50,20 L50,70' },
        pose_9: { name: 'Blessing', description: 'Triumph & wisdom', bbox: [666, 666, 1000, 1000], svgPath: 'M50,20 L50,70' },
      },
    };

    it('loads and renders Gemini 9-pose character sheet on mount', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockCharacterSheet), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<WhiteboardCreatePage />);
      expect(screen.getByText('Whiteboard Animation Studio')).toBeInTheDocument();
      expect(screen.getByText(/Gemini Reference Engine Ready/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Consistent 9-Pose Reference Grid')).toBeInTheDocument();
        expect(screen.getByText('Neutral')).toBeInTheDocument();
        expect(screen.getByText('Eureka')).toBeInTheDocument();
      });
    });

    it('switches active pose and displays detailed bounding box metadata', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockCharacterSheet), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<WhiteboardCreatePage />);
      await waitFor(() => {
        expect(screen.getByText('Neutral')).toBeInTheDocument();
      });

      const eurekaButton = screen.getByRole('button', { name: /eureka/i });
      fireEvent.click(eurekaButton);

      expect(screen.getByText(/POSE_3: Eureka/i)).toBeInTheDocument();
      expect(screen.getByText(/Idea discovery moment/i)).toBeInTheDocument();
      expect(screen.getByText(/BBox: \[666, 0, 1000, 333\]/i)).toBeInTheDocument();
    });

    it('submits whiteboard generation job and navigates to mission page', async () => {
      const router = useRouter();
      const mockPush = vi.spyOn(router, 'push');

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('character-sheet')) {
          return new Response(JSON.stringify(mockCharacterSheet), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, jobId: 'whiteboard-job-555' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });

      render(<WhiteboardCreatePage />);
      const generateButton = screen.getByRole('button', { name: /generate whiteboard explainer video/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/create/mission/whiteboard-job-555');
      });
    });
  });
});
```

---

### 5.2 Test File 2: `test/pages/create/mission.test.tsx`

This file tests `MissionProgressPage` with React 19 `<React.Suspense>` and `params: Promise<{ id: string }>`.

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import MissionProgressPage from '@/app/(app)/create/mission/[id]/page';
import { useWizardStore } from '@/components/wizard/wizard-store';

describe('Mission Progress Dynamic Route (app/(app)/create/mission/[id]/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockMissionInProgress = {
    success: true,
    jobId: 'mission-test-1234567890',
    currentStage: 'scene_planning',
    overallProgress: 35,
    steps: [
      {
        stage: 'script_generation',
        label: 'Script Generation',
        status: 'completed',
        progress: 100,
        startedAt: '2026-09-17T00:00:00.000Z',
        completedAt: '2026-09-17T00:00:04.000Z',
        log: 'Narrative script synthesized successfully.',
      },
      {
        stage: 'scene_planning',
        label: 'Scene Decomposition',
        status: 'in_progress',
        progress: 40,
        startedAt: '2026-09-17T00:00:05.000Z',
        log: 'Decomposing story into 4 visual scenes...',
      },
      { stage: 'asset_sourcing', label: 'Asset Sourcing', status: 'pending', progress: 0 },
      { stage: 'voice_synthesis', label: 'Voice & Audio Synthesis', status: 'pending', progress: 0 },
      { stage: 'video_composition', label: 'Video Composition', status: 'pending', progress: 0 },
    ],
    data: {
      prompt: 'History of Deep Sea Exploration',
      aspectRatio: '9:16',
      style: 'cinematic',
      voice: 'onyx',
      script: 'Beneath the surface lies an alien abyss waiting to be discovered.',
      scenes: [
        { id: 'sc-1', text: 'Descending into the deep abyss.', duration: 5, cameraMotion: 'zoom_in' },
        { id: 'sc-2', text: 'Bioluminescent creatures emerge.', duration: 6, cameraMotion: 'pan_right' },
      ],
    },
  };

  it('renders within React 19 Suspense boundary and displays in-progress pipeline', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockMissionInProgress), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(
      <React.Suspense fallback={<div>Loading mission...</div>}>
        <MissionProgressPage params={Promise.resolve({ id: 'mission-test-1234567890' })} />
      </React.Suspense>
    );

    expect(screen.getByText('Back to Create Hub')).toHaveAttribute('href', '/create');

    await waitFor(() => {
      expect(screen.getByText('History of Deep Sea Exploration')).toBeInTheDocument();
      expect(screen.getByText(/In Progress \(35%\)/i)).toBeInTheDocument();
      expect(screen.getByText('Autonomous 5-Stage Pipeline')).toBeInTheDocument();
      expect(screen.getByText('1 of 5 Stages Completed')).toBeInTheDocument();
      expect(screen.getByText('Streaming Execution Console')).toBeInTheDocument();
      expect(screen.getByText('Beneath the surface lies an alien abyss waiting to be discovered.')).toBeInTheDocument();
    });
  });

  it('renders completed video player when overallProgress reaches 100', async () => {
    const mockCompletedMission = {
      ...mockMissionInProgress,
      overallProgress: 100,
      currentStage: 'video_composition',
      data: {
        ...mockMissionInProgress.data,
        videoUrl: 'https://storage.example.com/renders/deep_sea_final.mp4',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockCompletedMission), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(
      <React.Suspense fallback={<div>Loading mission...</div>}>
        <MissionProgressPage params={Promise.resolve({ id: 'mission-test-1234567890' })} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Completed (100%)')).toBeInTheDocument();
      const videoElement = document.querySelector('video');
      expect(videoElement).toBeInTheDocument();
      expect(videoElement).toHaveAttribute('src', 'https://storage.example.com/renders/deep_sea_final.mp4');
    });
  });

  it('displays error state and provides retry action when mission fails', async () => {
    const mockFailedMission = {
      ...mockMissionInProgress,
      error: 'Audio synthesis failed: ElevenLabs rate limit exceeded',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockFailedMission), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(
      <React.Suspense fallback={<div>Loading mission...</div>}>
        <MissionProgressPage params={Promise.resolve({ id: 'mission-test-1234567890' })} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry mission/i })).toBeInTheDocument();
      expect(screen.getByText(/Fatal error encountered: Audio synthesis failed/i)).toBeInTheDocument();
    });
  });

  it('transfers mission state to wizard store and navigates on Manual / Edit click', async () => {
    const router = useRouter();
    const mockPush = vi.spyOn(router, 'push');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockMissionInProgress), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(
      <React.Suspense fallback={<div>Loading mission...</div>}>
        <MissionProgressPage params={Promise.resolve({ id: 'mission-test-1234567890' })} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('History of Deep Sea Exploration')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /manual \/ edit in wizard/i });
    fireEvent.click(editButton);

    expect(useWizardStore.getState().workflowType).toBe('footage');
    expect(useWizardStore.getState().subject).toBe('History of Deep Sea Exploration');
    expect(mockPush).toHaveBeenCalledWith('/create/footage');
  });

  it('copies logs to clipboard when Copy Logs button is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockMissionInProgress), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(
      <React.Suspense fallback={<div>Loading mission...</div>}>
        <MissionProgressPage params={Promise.resolve({ id: 'mission-test-1234567890' })} />
      </React.Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Streaming Execution Console')).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /copy logs/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });
});
```

---

## 6. Synthesis & Strategic Guidance for Implementers

1. **Keep Interactive Tests in `test/pages/create/interactive.test.tsx`**:
   - Both Avatar and Whiteboard are specialized studio workflows with visual mockups and custom selection states. Co-locating them in `interactive.test.tsx` (as per `PROJECT.md` line 131) ensures logical separation from the step-by-step creation wizards and single-prompt generators.
2. **Keep Mission Tests in `test/pages/create/mission.test.tsx`**:
   - Mission route is the sole dynamic route (`[id]`) in the creation workflows, requiring the `Promise<{ id: string }>` harness, React 19 `<Suspense>`, and polling mock control.
3. **Whiteboard Defensive Coding**:
   - The implementer of `interactive.test.tsx` must either mock `/api/workflows/whiteboard/character-sheet` with a full 9-pose map or apply defensive checks in `app/(app)/create/whiteboard/page.tsx` line 390 and 427 (`characterSheet?.poses?.[pose.id]`). Applying both is best practice.
4. **Zustand Store Isolation**:
   - In `mission.test.tsx`, `transferMissionToWizard` mutates `useWizardStore`. In `beforeEach`, calling `useWizardStore.setState(initialState)` or resetting the store ensures test isolation.
