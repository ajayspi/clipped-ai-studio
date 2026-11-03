# shorts

## Overview
Long-form video viral shorts extractor identifying high-retention hooks and cutting clips from URLs or raw transcripts.

## Interface
- [page.tsx:default] ShortsPage React client component with mode switcher ('url' vs 'transcript'), duration target, and hook threshold

## Invariants
- [page.tsx:transcript] Transcript input must contain non-whitespace text when operating in transcript mode; empty or whitespace-only input blocks submission
- [page.tsx:videoUrl] Video URL must contain non-whitespace URL when operating in url mode; empty input blocks submission

## Side Effects
- [page.tsx:handleExtract] Sends POST request to /api/workflows/extract-shorts with transcript/URL and target shorts count
- [page.tsx:router.push] Navigates to /dashboard?job=${jobId} upon queueing

## Verification
- Run: `pnpm test`
