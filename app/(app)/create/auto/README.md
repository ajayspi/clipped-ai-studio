# auto

## Overview
1-click hands-off Auto Pilot creation interface orchestrating prompt-to-video autonomous pipelines.

## Interface
- [page.tsx:default] AutoPilotPage React client component with prompt input, aspect ratio selector, voice selection, and model configuration

## Invariants
- [page.tsx:aspectRatio] Supported aspect ratios are constrained to 9:16, 16:9, or 1:1
- [page.tsx:FAL_VIDEO_MODELS] Video generation models resolve against configured Fal model catalog

## Side Effects
- [page.tsx:handleGenerate] Submits POST request to /api/workflows/auto or /api/workflows/mission to enqueue autonomous video render jobs
- [page.tsx:router.push] Redirects user to /create/mission/${jobId} or /dashboard upon successful job initiation

## Verification
- Run: `pnpm test`
