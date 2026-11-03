# components

## Overview
Specialized presentation components and client store handoff utilities for the multi-stage autonomous video mission progress page.

## Interface
- [MissionHeader.tsx:MissionHeader] React component rendering mission title, status pill badges, aspect ratio, voice, style metadata, retry button, and edit-in-wizard action
- [MissionHeader.tsx:MissionHeaderProps] Component props interface requiring job: MissionJobState and optional onRetry: () => void
- [MissionStepper.tsx:MissionStepper] React component displaying visual 5-stage progress pipeline with status icons and stage logs
- [MissionStepper.tsx:MissionStepperProps] Component props interface requiring steps: MissionStepStatus[] and currentStage: MissionStage
- [MissionStepper.tsx:STAGE_META] Metadata record mapping stage identifiers (script_generation, scene_planning, asset_sourcing, voice_synthesis, video_composition) to titles, subtitles, and icons
- [MissionLogConsole.tsx:MissionLogConsole] React component rendering collapsible terminal output with timestamped entries and clipboard copy
- [MissionLogConsole.tsx:MissionLogConsoleProps] Component props interface requiring steps: MissionStepStatus[] and optional error: string
- [MissionLogConsole.tsx:LogEntry] Interface defining id, time, level ('INFO' | 'SUCCESS' | 'WARN' | 'ERROR'), stage, and message
- [MissionLivePreview.tsx:MissionLivePreview] React component presenting scene breakdown timeline, live playback box, and total duration
- [MissionLivePreview.tsx:MissionLivePreviewProps] Component props interface requiring job: MissionJobState
- [MissionStateHandoff.ts:transferMissionToWizard] Utility converting MissionJobState scenes into wizard Beat candidate models, hydrating useWizardStore, and navigating to /create/footage

## Invariants
- [MissionHeader.tsx:isCompleted] isCompleted strictly requires job.overallProgress === 100 && !job.error
- [MissionHeader.tsx:isFailed] isFailed strictly requires Boolean(job.error)
- [MissionStepper.tsx:defaultStages] Exactly 5 pipeline stages are maintained in strict sequence (script_generation -> scene_planning -> asset_sourcing -> voice_synthesis -> video_composition)
- [MissionLivePreview.tsx:aspectClass] Container aspect ratio maps to aspect-video (16:9), aspect-square (1:1), or aspect-[9/16] (9:16)
- [MissionStateHandoff.ts:transferMissionToWizard] Sets workflowType to 'footage', sets furthestStep to 4, and initializes step to 1 if scenes exist or 0 otherwise

## Side Effects
- [MissionHeader.tsx:handleEditInWizard] Dispatches transferMissionToWizard, mutating Zustand store and triggering router push
- [MissionHeader.tsx:onRetry] Executes caller retry callback when mission error is present
- [MissionLogConsole.tsx:navigator.clipboard] Writes plain-text serialized log messages to system clipboard
- [MissionStateHandoff.ts:useWizardStore.setState] Directly mutates global Zustand client store and invokes router.push('/create/footage')

## Verification
- Run: `pnpm test`
