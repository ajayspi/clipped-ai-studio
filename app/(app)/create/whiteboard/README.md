# whiteboard

## Overview
Whiteboard animation explainer studio driven by Google Gemini 9-pose character reference consistency and progressive sketch canvas.

## Interface
- [page.tsx:default] WhiteboardCreatePage React client component with topic prompt, archetype picker, style options, and 9-pose preview canvas
- [page.tsx:ARCHETYPES] Constant array defining archetypes (stickman, saint, old man, founder, doctor, teacher, scientist, custom)
- [page.tsx:STYLES] Constant array defining whiteboard styles (monoline_marker, blackboard_chalk, blueprint, colored_doodle, sketch_outline)
- [page.tsx:MARKER_COLORS] Constant array defining marker ink colors and hex codes
- [page.tsx:POSE_NAMES] Constant array defining the 9 canonical poses (pose_1 through pose_9)
- [page.tsx:CharacterSheet] Interface defining characterId, archetype, sheetImageUrl, poses, style
- [page.tsx:CharacterPose] Interface defining name, description, bbox: [number, number, number, number], svgPath?: string

## Invariants
- [page.tsx:poses] Canvas coordinates normalized to [0, 0, 1000, 1000] bounding boxes with 9 fixed pose identifiers
- [page.tsx:style] Aspect ratio maps dynamically to 9/12 for 9:16 portrait, 1/1 for square, and 16/9 for landscape

## Side Effects
- [page.tsx:fetchCharacterSheet] Sends POST request to /api/workflows/whiteboard/character-sheet to retrieve or generate 9-pose SVG paths
- [page.tsx:handleGenerate] Sends POST request to /api/workflows/whiteboard with prompt, archetype, style, and marker color
- [page.tsx:router.push] Navigates to /create/mission/${jobId} upon job creation

## Verification
- Run: `pnpm test`
