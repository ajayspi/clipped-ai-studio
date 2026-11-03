# library

## Overview
Asset library and workspace manager organizing rendered videos into folders, polling active queue status, and supporting folder moves.

## Interface
- [page.tsx:default] LibraryPage React client component with workspace folder chips, active queue drawer, and video card grid
- [page.tsx:QueueJob] Interface defining id, thumbnail, title, workflow_type, and status
- [page.tsx:LibraryVideo] Interface defining id, video_id, thumbnail, title, workspace_id, workspace_name, created_at
- [page.tsx:STATUS_COLORS] Status color map for pending, generating_plan, processing, completed, and failed
- [page.tsx:STATUS_LABELS] Status text label map

## Invariants
- [page.tsx:queuedJobs] Auto-polling runs on an 8-second interval when queuedJobs.length > 0 and pauses when 0
- [page.tsx:loadLibraryData] Initial load is deferred by one macrotask (setTimeout 0) to avoid synchronous setState inside effect

## Side Effects
- [page.tsx:fetchJobs] Issues GET requests to /api/jobs to refresh job statuses
- [page.tsx:loadLibraryData] Issues GET requests to /api/workspaces to load user workspaces
- [page.tsx:handleCreateFolder] Issues POST request to /api/workspaces to create a new workspace folder

## Verification
- Run: `pnpm test`
