# assets

## Overview
Generative asset and shot manager gallery organizing rendered videos into versioned stacks with shot regeneration.

## Interface
- [page.tsx:default] GenerativeAssetBoard React client component displaying grouped shots by version and prompt
- [page.tsx:ShotGroup] Subcomponent rendering video previews, version badges, prompt details, and regeneration action

## Invariants
- [page.tsx:groups] Stacks are grouped by shotId or fallback job id, sorting versions descending (V2 above V1)

## Side Effects
- [page.tsx:fetchJobs] Reads render_jobs from Supabase ordered by created_at descending
- [page.tsx:handleRegenerate] Sends POST request to /api/jobs/${jobId}/regenerate to spawn a new version

## Verification
- Run: `pnpm test`
