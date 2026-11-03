# cinema

## Overview
Cinema Studio (Director's Console) interface inspired by Open-Higgsfield-AI. Provides filmmaker optical physics (lens focal lengths 14mm-200mm, apertures f/0.95-f/16, sensor gates), 3D camera choreography, lighting schemes, film stock LUTs, and a multi-image character/scene consistency rig (up to 14 references).

## Interface
- [page.tsx:default] export default function CinemaStudioPage(): JSX.Element

## Invariants
- [page.tsx:references] Clamps active semantic reference image assets to a maximum of 14 slots
- [page.tsx:duration] Enforces shot duration range between 2 seconds and 10 seconds
- [page.tsx:subject] Requires non-empty scene subject string before submission

## Side Effects
- [page.tsx:fetch] POSTs shot configuration to `/api/workflows/cinema` and routes to `/dashboard?job=${jobId}`

## Verification
- Run: `pnpm exec vitest run test/cinema-director.test.ts`
