# micro-drama

## Overview
Micro-drama serial script generator creating multi-character dialogue scenes and visual character anchors.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:genre] Rejects with 400 if genre is missing
- [route.ts:characters] Provides default protagonist with visual anchor if characters array is empty
- [route.ts:orchestration_state] Explicitly sets 'planning' to prevent render worker from claiming series plan

## Side Effects
- [route.ts:dramaOrchestrator.generateDramaSeries] Synthesizes episodic drama script and character anchors in background
- [route.ts:supabase.from('render_jobs').update] Updates job status and logs.result in Supabase

## Verification
- Run: `pnpm test`
