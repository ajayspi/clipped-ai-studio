# Papercraft Studio

## Overview
Vox-style procedural cutout and multi-layer origami explainer studio, wrapping `PapercraftStudio` to render paper tear geometries, drop-shadow depth planes, and stop-motion kinetic transforms.

## Interface
- [page.tsx:PapercraftStudioPage] Default client component hosting papercraft explainer studio
- Depends on `PapercraftStudio` from `components/2d-studio/PapercraftStudio.tsx`

## Invariants
- [page.tsx:Navigation] Provides direct breadcrumb return navigation to `/create`
- [page.tsx:"use client"] Client component boundary ensuring procedural canvas filters and animation loops run client-side

## Side Effects
- [None] Renders procedural canvas without direct external network side effects

## Verification
- Run: `node tests/e2e/standalone-runner.js`
