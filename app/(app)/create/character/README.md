# character

## Overview
IP-Adapter character consistency studio ensuring identical facial features and mascots across multi-scene generations.

## Interface
- [page.tsx:default] CharacterConsistencyPage React client component with image reference upload, style prompt, and aspect ratio selector

## Invariants
- [page.tsx:referenceImage] Requires reference portrait image input or URL before allowing generation submission

## Side Effects
- [page.tsx:handleGenerate] Sends POST request to /api/workflows/character with image reference and prompt payload
- [page.tsx:router.push] Navigates to /dashboard?job=${jobId} upon queue acceptance

## Verification
- Run: `pnpm test`
