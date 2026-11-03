# Code Video Studio

## Overview
Technical diagram and code animation studio wrapping the `TechDiagramStudio` component to render WaveDrom digital timing diagrams, animated architecture flowcharts, and syntax-highlighted code morph sequences.

## Interface
- [page.tsx:CodeVideoPage] Default client component hosting technical animation studio
- Depends on `TechDiagramStudio` from `components/2d-studio/TechDiagramStudio.tsx`

## Invariants
- [page.tsx:"use client"] Client component boundary ensuring WebGL and Canvas 2D animation contexts initialize in the browser

## Side Effects
- [None] Mounts client-side canvas and timing diagram rendering trees with no direct server mutations

## Verification
- Run: `node tests/e2e/standalone-runner.js`
