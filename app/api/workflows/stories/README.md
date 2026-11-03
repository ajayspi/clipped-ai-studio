# stories

## Overview
Multi-part episodic story series generator creating narrative scripts, hooks, and cliffhangers.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:topic] Rejects with 400 if topic is empty
- [route.ts:partsCount] Defaults to 3 parts
- [route.ts:orchestration_state] Explicitly sets 'planning' to ensure FFmpeg render worker never claims story plan

## Side Effects
- [route.ts:storiesOrchestrator.generateStorySeries] Generates story series scripts, cliffhangers, and visual styles in background
- [route.ts:supabase.from('render_jobs').update] Updates job status and logs.result in Supabase

## Verification
- Run: `pnpm test`
