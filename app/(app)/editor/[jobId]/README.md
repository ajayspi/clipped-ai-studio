# Timeline Job Editor Page

## Overview
Non-Linear Video Editor (NLE) page that queries a specific render job from Supabase, extracts presentation metadata and emotional tension curves via `extractJobPresentation`, displays completed video playback with View Transition continuity, and mounts the interactive `TimelineEditor`.

## Interface
- [page.tsx:EditorPage] Default async React Server Component loading job and mounting timeline editor
- [page.tsx:TensionCurve] SVG component graphing narrative emotional intensity points over scene indices
- Integrates with `extractJobPresentation` (`lib/engine/job-presentation.ts`) and `TimelineEditor` (`components/timeline/TimelineEditor.tsx`)

## Invariants
- [page.tsx:JobAuthorization] Job must exist in `render_jobs` table; missing records return Next.js `notFound()` 404
- [page.tsx:AllowedStates] Restricts editing to editable orchestration states (`queued`, `planning`, `completed`, `qc_pending`, `processing`, `generating_plan`, `pending`, `claimed`, `rendering`, `retryable`, `ready`, `draft`)
- [page.tsx:AsyncParams] Awaits `props.params` Promise to satisfy Next.js 15+ App Router route constraints

## Side Effects
- [page.tsx:supabase] Performs server-side SELECT on Supabase `render_jobs` table for job record by `jobId`

## Verification
- Run: `node tests/e2e/standalone-runner.js`
