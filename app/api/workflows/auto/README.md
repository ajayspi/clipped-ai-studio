# auto

## Overview
Auto-Pilot pipeline orchestration route generating scheduled recurring video publishing plans for specific niches.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:pipelineName/niche] Rejects with 400 if pipelineName or niche is empty
- [route.ts:orchestration_state] Explicitly sets 'planning' so FFmpeg render worker never claims plan-only job

## Side Effects
- [route.ts:supabase.from('render_jobs').insert] Inserts job in Supabase
- [route.ts:autoPilot.executePipeline] Runs auto-pilot pipeline generator in background
- [route.ts:supabase.from('render_jobs').update] Updates job status and logs.result in Supabase

## Verification
- Run: `pnpm test`
