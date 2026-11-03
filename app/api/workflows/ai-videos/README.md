# ai-videos

## Overview
Generative AI video pipeline wrapper dispatching single-prompt video synthesis requests to external model providers.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:script] Rejects with 400 if neither script nor prompt is provided
- [route.ts:orchestration_state] Explicitly sets 'planning' to ensure FFmpeg render worker does not claim single-prompt AI video job

## Side Effects
- [route.ts:videoGenerator.generateAIVideo] Calls external generative video models in background
- [route.ts:supabase.from('render_jobs').update] Updates job status and logs.result in Supabase

## Verification
- Run: `pnpm test`
