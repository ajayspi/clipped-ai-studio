# reddit

## Overview
Reddit story to viral short video workflow fetching top posts and rendering text-overlay narration over gameplay footage.

## Interface
- [page.tsx:default] RedditToVideoPage React client component with Reddit URL input, voice selector, and gameplay background selector

## Invariants
- [page.tsx:url] Must match valid Reddit post URL structure

## Side Effects
- [page.tsx:handleGenerate] Sends POST request to /api/workflows/reddit with target post URL
- [page.tsx:router.push] Navigates to /dashboard?job=${jobId} on successful submission

## Verification
- Run: `pnpm test`
