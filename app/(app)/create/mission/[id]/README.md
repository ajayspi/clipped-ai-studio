# [id]

## Overview
Dynamic mission execution tracking page that polls asynchronous generation status and presents live stages, logs, and video preview.

## Interface
- [page.tsx:default] MissionProgressPage React client component accepting dynamic route params Promise<{ id: string }> | { id: string }
- [./components/README.md:components] Relative link to child presentation components for header, stepper, console, preview, and store handoff

## Invariants
- [page.tsx:unwrappedParams] Params must be unwrapped via React 19 use() hook when provided as a Promise
- [page.tsx:pollJobStatus] Initial 404 response initializes fallback placeholder job state (currentStage: 'script_generation', overallProgress: 10) instead of throwing
- [page.tsx:useEffect] Auto-start triggered if prompt and autoStart='true' query parameters are present in search params

## Side Effects
- [page.tsx:pollJobStatus] Periodic polling GET requests to /api/workflows/mission?id=${jobId} every 3 seconds
- [page.tsx:autoStart] Issues background POST request to /api/workflows/mission on mount when autoStart flag is set

## Verification
- Run: `pnpm test`
