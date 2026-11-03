# workflows

## Overview
Core video workflow subsystem orchestrating 14 distinct video creation, planning, scripting, and queueing pipelines.

## Interface
- generate: ./generate/README.md
- mission: ./mission/README.md
- images: ./images/README.md
- auto: ./auto/README.md
- stories: ./stories/README.md
- ai-videos: ./ai-videos/README.md
- micro-drama: ./micro-drama/README.md
- extract-shorts: ./extract-shorts/README.md
- whiteboard: ./whiteboard/README.md
- avatar: ./avatar/README.md
- bulk-plan: ./bulk-plan/README.md
- scrape: ./scrape/README.md

## Invariants
- [workflows:table] Distinguishes queue-writing claimable routes (generate, bulk-plan/push), plan-only routes (auto, stories, ai-videos, micro-drama, extract-shorts, whiteboard, avatar, mission, whiteboard/character-sheet), terminal routes (images), and pure utilities (bulk-plan, scrape)

## Side Effects
- None

## Verification
- Run: `pnpm test`
