# v2v

## Overview
Video-to-video AI restyling studio transforming raw video clips into anime, 3D, claymation, or cyberpunk aesthetics.

## Interface
- [page.tsx:default] VideoToVideoPage React client component with source video URL, restyle prompt, and strength slider

## Invariants
- [page.tsx:sourceVideoUrl] Requires non-empty video source URL before processing

## Side Effects
- [page.tsx:handleGenerate] Sends POST request to /api/workflows/v2v with video URL and transformation prompt
- [page.tsx:router.push] Navigates to /dashboard?job=${jobId} on job enqueue

## Verification
- Run: `pnpm test`
