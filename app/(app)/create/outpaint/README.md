# outpaint

## Overview
Spatial video outpainting pipeline converting horizontal (16:9) video footage into vertical (9:16) formats using generative borders.

## Interface
- [page.tsx:default] OutpaintingPage React client component with video URL input, border prompt, and target aspect ratio selector

## Invariants
- [page.tsx:sourceVideoUrl] Requires valid HTTPS video URL before initiating spatial expansion

## Side Effects
- [page.tsx:handleGenerate] Sends POST request to /api/workflows/outpaint with video source and aspect parameters
- [page.tsx:router.push] Navigates to /dashboard?job=${jobId} upon job creation

## Verification
- Run: `pnpm test`
