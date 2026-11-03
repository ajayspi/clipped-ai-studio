# queue

## Overview
Dedicated render queue dashboard with live polling, progress indicators, download links, deletion, and multilingual video dubbing.

## Interface
- [page.tsx:default] QueuePage React client component with tabs for active, completed, and failed jobs
- [page.tsx:RenderJob] Interface defining id, title, status, progress, workflow_type, created_at, output_url, clip_count
- [page.tsx:STATUS_CONFIG] Status metadata record mapping status enums to icons, colors, and badge backgrounds

## Invariants
- [page.tsx:activeJobs] Active jobs filter matches pending, generating_plan, or processing statuses
- [page.tsx:fetchJobs] Polling interval executes every 8 seconds, deferred on mount via setTimeout(..., 0)

## Side Effects
- [page.tsx:fetchJobs] Issues GET requests to /api/jobs to fetch current queue state
- [page.tsx:handleDeleteJob] Issues DELETE request to /api/jobs/${id} to delete render jobs
- [page.tsx:handleDubSubmit] Issues POST request to /api/jobs/${dubbingJobId}/dub with selected target languages

## Verification
- Run: `pnpm test`
