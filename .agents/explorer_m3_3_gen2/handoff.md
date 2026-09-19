# Handoff Report: Explorer M3-3 (Interactive Studios & Mission Dynamic Route)

## 1. Observation

1. **Avatar Studio (`app/(app)/create/avatar/page.tsx`)**:
   - `"use client"` component importing `AVATAR_PRESETS` from `@/lib/engine/avatar-orchestrator` (lines 20-21).
   - Contains 5 presets, 6 neural voices (`VOICES` lines 22-29), 5 layouts (`LAYOUTS` lines 31-62), speed slider `0.75` - `1.5`, and 3 aspect ratios (`9:16`, `16:9`, `1:1`).
   - Line 416-490: Live framing canvas is rendered via CSS composition in a `<div style={{ aspectRatio }}>` with responsive layout positioning, subtitle badge, and animated pulse audio bars. It does **not** instantiate an HTML5 canvas or WebGL context.
   - Line 93-111: `handleGenerate` submits a POST to `/api/workflows/avatar` and on `{ success: true, jobId }` calls `router.push('/create/mission/${data.jobId}')`.

2. **Whiteboard Studio (`app/(app)/create/whiteboard/page.tsx`)**:
   - `"use client"` component with 8 archetypes (`ARCHETYPES` lines 38-47), 5 styles (`STYLES` lines 49-55), 6 marker colors (`MARKER_COLORS` lines 57-64), and 9 poses (`POSE_NAMES` lines 66-76).
   - Lines 118-120: `useEffect(() => { fetchCharacterSheet(); }, [archetype, style])` invokes POST `/api/workflows/whiteboard/character-sheet`.
   - **Critical Vulnerability**: Lines 388-393:
     ```tsx
     {POSE_NAMES.map((pose) => {
       const poseData = characterSheet.poses[pose.id];
     ```
     And Line 427:
     ```tsx
     {characterSheet.poses[activePosePreview] && (
     ```
     If the fetch response is truthy but lacks `poses` (such as the default fallback in `test/setup.ts` lines 466-469 returning `{ success: true, data: [] }`), line 390 throws an unhandled `TypeError: Cannot read properties of undefined (reading 'pose_1')`.

3. **Mission Dynamic Route (`app/(app)/create/mission/[id]/page.tsx`)**:
   - `"use client"` component with signature `params: Promise<{ id: string }>` (lines 13-17).
   - Line 3 imports `use` from React: `import React, { useEffect, useState, use } from "react";`.
   - Line 18 unwraps params using React 19's `use` hook: `const unwrappedParams = use(params); const jobId = unwrappedParams.id;`.
   - Polling engine (lines 46-120): Immediately calls `pollJobStatus()` (`/api/workflows/mission?id=${jobId}`) and polls every 1000ms. Line 111 terminates the interval when `job.overallProgress === 100 || job.error`.
   - Child components:
     - `MissionHeader` (lines 8, 179): metadata badges, overall progress bar, Retry button (when error), Manual/Edit in Wizard button.
     - `MissionStepper` (lines 9, 185): 5-stage pipeline visualizer (`script_generation`, `scene_planning`, `asset_sourcing`, `voice_synthesis`, `video_composition`).
     - `MissionLogConsole` (lines 10, 186): execution logs, severity coloring, auto-scroll via `scrollRef.current.scrollTop = scrollRef.current.scrollHeight`, and copy button using `navigator.clipboard.writeText(text)`.
     - `MissionLivePreview` (lines 11, 191): completed video player `<video src={job.videoUrl} controls autoPlay loop />` or scene storyboard breakdown with thumbnail selector.
     - `transferMissionToWizard` in `MissionStateHandoff.ts`: converts scenes to `Beat[]`, hydrates `useWizardStore`, and calls `router.push('/create/footage')`.

4. **Global Setup Harness (`test/setup.ts`)**:
   - Already provides polyfills for `navigator.clipboard.writeText`, `window.HTMLMediaElement.prototype.play/pause`, `window.Audio`, `ResizeObserver`, `IntersectionObserver`, `matchMedia`, `next/navigation` hooks (`useRouter`, `useSearchParams`, `usePathname`, `useParams`).

---

## 2. Logic Chain

1. **Avatar Studio Verification**:
   - `AvatarCreatePage` depends only on React state, `AVATAR_PRESETS`, and `useRouter`.
   - Because its framing preview is CSS-driven and does not touch WebGL or unmocked media elements, it mounts synchronously in JSDOM without crashing.
   - Headless unit testing can assert all input controls, layout selections, tab switching, and router push to `/create/mission/[jobId]`.

2. **Whiteboard Studio Verification & Bug Mitigation**:
   - `WhiteboardCreatePage` immediately executes `fetchCharacterSheet()` on mount.
   - When the fetch response succeeds, `setCharacterSheet(data)` is called.
   - Accessing `characterSheet.poses[pose.id]` (line 390) assumes `characterSheet.poses` is an object.
   - In Vitest, if `/api/workflows/whiteboard/character-sheet` returns the default `{ success: true, data: [] }`, `characterSheet.poses` is `undefined`, causing an immediate fatal TypeError.
   - Therefore, the test suite `test/pages/create/interactive.test.tsx` **must** mock `/api/workflows/whiteboard/character-sheet` with a complete 9-pose map (`pose_1` through `pose_9`), AND the implementer should add optional chaining guards in `WhiteboardCreatePage` (`characterSheet?.poses?.[pose.id]`).

3. **Mission Route React 19 & Suspense Contract**:
   - Because `params` is a `Promise` unwrapped with `use(params)`, React 19 suspends the component until the promise resolves.
   - Headless rendering in Vitest requires `<React.Suspense fallback={...}>` around `<MissionProgressPage params={Promise.resolve({ id: '...' })} />`.
   - Polling uses `setInterval(..., 1000)`. Because `useEffect` returns `() => clearInterval(interval)`, unmounting the test component or completing the job (`overallProgress === 100`) clears the timer cleanly without leaks.
   - "Manual / Edit in Wizard" interacts with `useWizardStore` (Zustand), so tests can verify both store mutation and navigation to `/create/footage`.

---

## 3. Caveats

1. **No Canvas Context**: Despite naming conventions referencing "Canvas", neither `AvatarCreatePage` nor `WhiteboardCreatePage` mounts an HTML5 `<canvas>` element requiring `getContext('2d')` polyfilling in JSDOM.
2. **Timer Mocking**: While `pollJobStatus` uses `setInterval` (1000ms), standard RTL `waitFor()` against resolved fetch promises handles state updates naturally without requiring `vi.useFakeTimers()`, though `vi.useFakeTimers()` can be used if explicit interval advancement is tested.
3. **Zustand Store Cleanup**: `useWizardStore` is a singleton store in memory. Tests verifying `transferMissionToWizard` should reset store state in `beforeEach` to prevent cross-test contamination.

---

## 4. Conclusion

1. Implement `test/pages/create/interactive.test.tsx` covering:
   - `AvatarCreatePage`: initial mount, preset vs custom photo switching, voice & speed adjustments, layout switching, submission to `/api/workflows/avatar`, navigation to mission page, and error handling.
   - `WhiteboardCreatePage`: initial mount with mocked 9-pose character sheet, archetype/style switching, active pose inspection (with bounding box metadata), ink color palette selection, submission to `/api/workflows/whiteboard`, and router push.
2. Implement `test/pages/create/mission.test.tsx` covering:
   - React 19 `<React.Suspense>` rendering with `params={Promise.resolve({ id: '...' })}`.
   - Initial loading state, in-progress 5-stage pipeline, completed state with `<video>` playback, failed state with Retry button, execution console copy-to-clipboard, and handoff to footage wizard.
3. Add a defensive check to `app/(app)/create/whiteboard/page.tsx` (`characterSheet?.poses?.[pose.id]`) to safeguard against API responses that omit `poses`.

---

## 5. Verification Method

To independently verify after test implementation:

1. **Inspect Target Files**:
   - `test/pages/create/interactive.test.tsx`
   - `test/pages/create/mission.test.tsx`
   - `app/(app)/create/whiteboard/page.tsx`
2. **Execute Headless Unit Tests**:
   - Run: `npx vitest run test/pages/create/interactive.test.tsx test/pages/create/mission.test.tsx`
   - Verification criteria:
     - 100% of test suites pass with 0 unhandled exceptions or unhandled rejections.
     - No unhandled React 19 Suspense boundary errors.
     - No `Cannot read properties of undefined (reading 'pose_1')` TypeErrors.
3. **Invalidation Conditions**:
   - If `test/pages/create/interactive.test.tsx` fails to mock `/api/workflows/whiteboard/character-sheet`, Whiteboard will crash.
   - If `MissionProgressPage` is rendered without `<React.Suspense>`, React 19 will throw an unhandled Suspense exception.
