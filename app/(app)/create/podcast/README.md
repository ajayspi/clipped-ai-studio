# podcast

## Overview
Audio podcast to video converter generating animated waveforms, speaker labels, and dynamic subtitles from audio feeds.

## Interface
- [page.tsx:default] PodcastWorkflowPage React client component with podcast RSS/audio URL input, visual layout picker, and subtitle selector

## Invariants
- [page.tsx:url] Requires audio source URL or direct podcast link

## Side Effects
- [page.tsx:handleGenerate] Sends POST request to /api/workflows/podcast with episode audio and formatting parameters
- [page.tsx:router.push] Navigates to /create/mission/${jobId} or /dashboard upon job creation

## Verification
- Run: `pnpm test`
