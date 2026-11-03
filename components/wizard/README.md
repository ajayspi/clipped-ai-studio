# wizard

## Overview
Interactive 5-step video generation wizard (Script, Scenes, Voice, Subtitles, Render) with real-time preview player and Zustand state store.

## Interface
- [CreationWizard.tsx:CreationWizard] - Master wizard shell managing step progression, viewport layout sizing, auto-pilot mode, and live preview drawer.
- [wizard-store.ts:useWizardStore] - Zustand store hook providing reactive state and actions for the video creation pipeline.
- [wizard-store.ts:STEPS] - Ordered constant defining wizard steps: script, scenes, voice, subs, render.
- [wizard-store.ts:SUBTITLE_PRESETS] - Configuration presets for Hormozi, Cyber Neon, Minimalist, Cinematic, Bold, and Karaoke subtitle styles.
- [ScriptStep.tsx:ScriptStep] - Step 1 component for configuring video format, tone, target duration, subject, and AI narration generation.
- [ScenesStep.tsx:ScenesStep] - Step 2 component for drag-and-drop beat reordering, footage candidate selection, and beat duration editing.
- [VoiceStep.tsx:VoiceStep] - Step 3 component for selecting narration voice providers and sampling audio previews.
- [SubtitlesStep.tsx:SubtitlesStep] - Step 4 component for customizing subtitle typography, positioning, animation presets, and colors.
- [RenderStep.tsx:RenderStep] - Step 5 component for inspecting final video parameters, duration, and queue dispatch.
- [LivePlayer.tsx:LivePlayer] - Real-time video preview player simulating aspect ratios, beat footage, and subtitle styling overlays.

## Invariants
- [CreationWizard.tsx:T21-FLOW-01] - Step body container must carry flex-1 and min-h-0 with overflow-y-auto so the scroll container shrinks inside the flex card without overflowing.
- [CreationWizard.tsx:T21-FLOW-03] - Step card and inner wrapper must be shrinkable flex columns (flex flex-col min-h-0) preventing card collapse to 1px.
- [CreationWizard.tsx:T21-FLOW-04] - Live Preview <aside> must include shrink-0 and viewport height bounding (max-h-) to avoid pushing the step card below the fold on mobile and tablet.
- [CreationWizard.tsx:T21-FLOW-05] - Must not use AnimatePresence mode='wait' or initial={{ opacity: 0 }} on the step body container to ensure step content remains readable without dependent enter animations.
- [CreationWizard.tsx:T21-FLOW-06] - The stepper <nav> parent wrapper must never use lg:flex-row, keeping the progress bar stacked horizontally above the workspace.

## Side Effects
- [ScriptStep.tsx:generateScript] - Issues POST request to /api/v1/script to generate narration script and keyword lists.
- [VoiceStep.tsx:fetchVoicePreview] - Issues POST request to /api/tts/preview and plays audio via new Audio().
- [CreationWizard.tsx:handleSubmit] - Submits workflow configurations to /api/workflows/generate or /api/workflows/auto.

## Verification
- Run: `pnpm test`
