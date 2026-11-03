# 2D Stick Figure Animation & Character Studio

## Overview
Comprehensive 2D deterministic animation studio providing 11-point skeletal kinematics, character wardrobe styling, multi-generational companion animals, Anime.js stroke vector tracing, and screenplay choreography auto-direction.

## Interface
- [page.tsx:StickFigureStudioPage] Default client component hosting the multi-modal 2D studio
- [page.tsx:activeView] View selector state switching between `"script" | "creator" | "kinematics" | "tracing"`
- [page.tsx:activeMood] Mood palette state controlling visual lighting/color presets
- Sub-components:
  - `ScriptToVideoStudio` (`components/2d-studio/ScriptToVideoStudio.tsx`)
  - `CharacterCreator` (`components/2d-studio/CharacterCreator.tsx`)
  - `StickFigureCanvas` (`components/2d-studio/StickFigureCanvas.tsx`)
  - `StrokeTracerCanvas` (`components/2d-studio/StrokeTracerCanvas.tsx`)

## Invariants
- [page.tsx:ZeroGPUCompute] Strictly executes deterministic 2D Canvas math and procedural Web Audio foley without cloud GPU dependencies ($0 compute)
- [page.tsx:ViewNavigation] Retains active configuration and state across tab transitions

## Side Effects
- [page.tsx:Canvas2D] Real-time rendering of vector skeletal rigs and animated stroke paths
- [page.tsx:Clipboard] Copies screenplay choreography JSON definitions to system clipboard

## Verification
- Run: `node tests/e2e/standalone-runner.js`
