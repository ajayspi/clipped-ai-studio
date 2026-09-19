# Handoff Report: Milestone 3 Create Workflow Routes (Create Hub & Wizards)

## 1. Observation
1. **Create Hub Route (`app/(app)/create/page.tsx:1-73`)**:
   - `"use client"` directive on line 1.
   - Imports `useApiKeys` (`components/create/useApiKeys.ts`), `WORKFLOWS` (`components/create/workflow-definitions.ts`), `MissionPromptBar` (`components/create/MissionPromptBar.tsx`), and `WorkflowGrid` (`components/create/WorkflowGrid.tsx`).
   - Renders header with `h1` "Create Studio", `Sparkles` badge "10 Workflows", "Refresh Keys" button calling `refresh()`, and `Key` link to `/settings`.
   - Renders `MissionPromptBar` with "One-Click Automatic Mission", suggestion chips, and "Auto Generate" button submitting POST to `/api/workflows/mission`.
   - Renders `WorkflowGrid` passing `workflows={WORKFLOWS}` and `keyStatusMap={keys}`. Category filtering (5 categories), status filtering (Ready, Fallback, Unset), and search input filtering by title, description, and primaryProviders.
   - Evaluates workflow status via `evaluateWorkflowStatus`: displays green Ready pill if primary providers configured, amber Fallback pill if missing but hasFallback: true, or red Keys Needed pill. All 10 workflows define `hasFallback: true`.
2. **Four Wizard Page Routes**:
   - `app/(app)/create/ai-videos/page.tsx:1-11`: renders `<CreationWizard workflowType="ai-videos" />`.
   - `app/(app)/create/footage/page.tsx:1-12`: renders `<CreationWizard workflowType="footage" />`.
   - `app/(app)/create/images/page.tsx:1-11`: renders `<CreationWizard workflowType="images" />`.
   - `app/(app)/create/stories/page.tsx:1-11`: renders `<CreationWizard workflowType="stories" />`.
   - All 4 routes are client components (`"use client"`).
3. **Creation Wizard Component & Store (`components/wizard/CreationWizard.tsx:1-418`, `wizard-store.ts:1-386`)**:
   - State is managed via a global Zustand store `useWizardStore`.
   - On mount, `CreationWizard` synchronizes `workflowType` via `useEffect`: calls `w.reset()` and `w.set('workflowType', workflowType)`.
   - 5 steps in sequence:
     - Step 0 (`ScriptStep`): Subject input, Tone selector, Target Duration input, "Generate with AI" button, Narration textarea, word count.
     - Step 1 (`ScenesStep`): Empty state ("No scenes generated yet") vs draggable beat breakdown with `@dnd-kit/core` & `@dnd-kit/sortable`, candidate thumbnail/video preview, and "Re-break with AI" button.
     - Step 2 (`VoiceStep`): Synthesis provider tabs (OpenAI TTS, Azure Speech, ElevenLabs, Google Cloud, Free & Keyless), voice cards with Name/Language/Gender tags, interactive Play/Pause preview button using `fetch('/api/tts/preview')` and `new Audio()`, speech speed slider (0.75x-1.5x), background soundtrack select.
     - Step 3 (`SubtitlesStep`): Master burn-in toggle (`role="switch"`), animated word sandbox with 4 backdrops, 3 sub-tabs: 6 visual presets (Hormozi Pop, Cyber Neon, Minimalist Clean, Cinematic Boxed, Bold Impact, Retro Karaoke), interactive smartphone position selector (Top, Center, Bottom) with Y slider, and custom styling (colors, neon glow, stroke, background box).
     - Step 4 (`RenderStep`): Aspect ratio selector, Auto Publish checkbox, Final Review card, Incomplete badge vs green "Ready to generate" confirmation, and footer "Send to Queue" button submitting to `/api/workflows/generate`.
   - Auto-Pilot mode: `runAutoMode()` orchestrates script generation, scene analysis, and asset sourcing, then jumps directly to step 4.
   - Live Preview rail: renders `LivePlayer` or empty state ("Add scenes to see live preview").
4. **Existing Test Infrastructure (`PROJECT.md:1-135`, `test/setup.ts:1-471`, `test/pages/core/*`)**:
   - Vitest + RTL + JSDOM environment configured.
   - `test/setup.ts` already mocks `next/navigation`, `next/font`, `window.Audio`, `HTMLMediaElement.prototype.play/pause`, `ResizeObserver`, `IntersectionObserver`, `window.matchMedia`, `navigator.clipboard`, and provides global fetch routing for `/api/settings/keys` and `/api/tts/preview`.

## 2. Logic Chain
1. From Observation 1: The Create Hub (`create/page.tsx`) is a client component with rich interactive controls (prompt bar submission, category filtering, status pills, search query, gear icon navigation, refresh keys button). Therefore, `test/pages/create/create-hub.test.tsx` should test both visual rendering and interactive filtering, search, and navigation behaviors.
2. From Observation 2: The 4 wizard routes (`ai-videos`, `footage`, `images`, `stories`) are thin wrapper client components delegating to `<CreationWizard workflowType="..." />`. Therefore, testing each route requires verifying clean mounting, proper initialization of `workflowType` in the store, and rendering of the wizard interface.
3. From Observation 3: `CreationWizard` and all its steps rely on a shared singleton Zustand store (`useWizardStore`). Without resetting the store between tests, state modifications (e.g. progressing to step 4 or adding beats) persist across test cases and cause state bleeding. Therefore, calling `useWizardStore.getState().reset()` inside `beforeEach` is mandatory for deterministic test runs.
4. From Observation 3 & 4: `VoiceStep` plays audio via `new Audio()`, which is already mocked in `test/setup.ts`. Similarly, `fetch` handlers for `/api/tts/preview` and `/api/settings/keys` are already pre-wired in `test/setup.ts`. For `/api/workflows/mission`, `/api/v1/script`, and `/api/workflows/generate`, adding lightweight mock responses in the test files or spy handlers completes the harness.

## 3. Caveats
- **@dnd-kit in JSDOM**: Native drag-and-drop events do not fire automatically in JSDOM unless simulated with specific pointer events. However, testing the rendering of sorted items and store-driven beat lists does not require native drag simulation.
- **Auto-Pilot Network Latency**: `runAutoMode` performs 3 sequential fetch calls (`/api/v1/script`, `/api/v1/analyze`, `/api/v1/source`). In unit tests, mock handlers should resolve immediately.
- **Framer Motion Animations**: All animations run smoothly in JSDOM without throwing; no special animation mock is needed.

## 4. Conclusion
The Create Hub and Wizard routes are fully understood and ready for test implementation:
1. `test/pages/create/create-hub.test.tsx` will cover:
   - Header, 10 Workflows badge, refresh keys button, settings link.
   - One-Click Automatic Mission prompt bar (input, suggestions, submission to `/api/workflows/mission`).
   - Workflow grid rendering all 10 cards with badges, cost tiers, links, and status pills.
   - Category filtering (all, avatar-wb, ai-video, stock, automation).
   - Search query filtering and empty state handling.
   - API status indicator evaluation (fallback mode vs configured ready mode).
   - Settings gear icon navigation.
2. `test/pages/create/wizards.test.tsx` will cover:
   - Clean mount of all 4 wizard routes (`ai-videos`, `footage`, `images`, `stories`).
   - Step navigation (Script -> Scenes -> Voice -> Subtitles -> Render).
   - ScriptStep form inputs and AI generation trigger.
   - ScenesStep empty state and populated beat cards.
   - VoiceStep synthesis providers, voice cards, audio preview trigger, and speed slider.
   - SubtitlesStep master burn-in switch, visual presets, position mockup, and custom styling tabs.
   - RenderStep final review card, ready confirmation, and "Send to Queue" submission.
   - Auto-Pilot mode execution.

## 5. Verification Method
To independently verify the investigation findings:
1. Inspect `app/(app)/create/page.tsx` and verify line numbers 1-73 match the structure reported.
2. Inspect `app/(app)/create/{ai-videos,footage,images,stories}/page.tsx` to verify `<CreationWizard workflowType="..." />` usage.
3. Inspect `components/wizard/wizard-store.ts` to confirm `useWizardStore` initial state, actions, and `reset()` method.
4. Review detailed findings in `.agents/explorer_m3_1_gen2/analysis.md`.
5. Upon test implementation by the implementer, run `npx vitest run test/pages/create/create-hub.test.tsx test/pages/create/wizards.test.tsx`.
