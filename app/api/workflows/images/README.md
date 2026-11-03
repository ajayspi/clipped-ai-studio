# images

## Overview
Terminal AI image sequence generation workflow producing visual storyboard assets without FFmpeg video rendering.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:script] Rejects with 400 if script is missing
- [route.ts:orchestration_state] Explicitly sets terminal state 'completed' on initial insert so FFmpeg render worker never claims it

## Side Effects
- [route.ts:sceneMatcher.analyzeScript] Analyzes script to extract scene breakdown
- [route.ts:imageGenerator.generateForScenes] Generates images for each scene in background
- [route.ts:enqueueRenderJob] Updates job status to completed with analysis payload in logs

## Verification
- Run: `pnpm test`
