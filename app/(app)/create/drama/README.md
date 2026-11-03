# drama

## Overview
Episodic micro-drama generator building multi-part serialized arcs with consistent characters and semantic visual anchors.

## Interface
- [page.tsx:default] DramaPage React client component with genre selector, character roster builder, and episode count selector
- [page.tsx:CharacterInput] Interface defining name: string, description: string, visualAnchor: string, voice: string
- [page.tsx:GENRE_PRESETS] Constant array defining presets (cyberpunk-noir, royal-romance, supernatural-thriller, space-opera, heist-action, psychological-drama)

## Invariants
- [page.tsx:characters] Character roster allows minimum 1 and maximum 6 characters, each requiring non-empty visual anchor strings
- [page.tsx:episodesCount] Episode count choices are clamped to 1, 2, 3, 5, 8, or 10 episodes

## Side Effects
- [page.tsx:handleGenerate] Sends POST request to /api/workflows/micro-drama with series premise, character anchors, and episode count
- [page.tsx:router.push] Navigates to /dashboard?job=${jobId} on successful job submission

## Verification
- Run: `pnpm test`
