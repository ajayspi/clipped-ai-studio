# 3D Pre-visualization Studio

## Overview
Director pre-visualization and camera blockout engine using a zero-dependency HTML5 Canvas 3D perspective projection pipeline with interactive camera orbital control, focal length toggles, ground perspective grid, and stand-in actor volumes.

## Interface
- [page.tsx:PrevisPage] Default client component hosting camera blockout and spatial planning studio
- [page.tsx:script] State holding cinematic screenplay or scene description
- [page.tsx:aspectRatio] State controlling framing ratio (`16:9`, `9:16`, `2.39:1`)
- [page.tsx:canvasRef] React ref bound to HTML5 `<canvas>` rendering target

## Invariants
- [page.tsx:Zero3DDependency] Must run purely on native HTML5 Canvas 2D perspective transformation math without requiring external `@react-three/fiber` or `three` bundles
- [page.tsx:OrbitalMath] Computes perspective projection via trigonometric spherical coordinates: camera distance, azimuth, and elevation

## Side Effects
- [page.tsx:requestAnimationFrame] Drives continuous rendering animation loop on canvas
- [page.tsx:fetch] Dispatches scene blockout payloads to `/api/workflows/cinema` on generation

## Verification
- Run: `node tests/e2e/standalone-runner.js`
