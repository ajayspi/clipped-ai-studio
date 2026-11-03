# extract-shorts

## Overview
Long-form video and transcript slicer identifying viral hooks and extracting short-form clip candidates.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:sourceType] Rejects with 400 if sourceType is missing
- [route.ts:source] Rejects with 400 if neither transcript nor videoUrl is provided
- [route.ts:orchestration_state] Explicitly sets 'planning' so worker does not claim extraction suggestions

## Side Effects
- [route.ts:shortsExtractor.extractShorts] Extracts viral clip candidates from video/transcript in background
- [route.ts:supabase.from('render_jobs').update] Updates job status and logs.result in Supabase

## Verification
- Run: `pnpm test`
