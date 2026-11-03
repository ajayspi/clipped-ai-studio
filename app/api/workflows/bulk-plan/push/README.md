# push

## Overview
Batch job queueing route converting a bulk content plan into active render jobs.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:items] Rejects with 400 if items array is empty or missing

## Side Effects
- [route.ts:pushBulkPlanToQueue] Enqueues active render jobs into Supabase render_jobs table

## Verification
- Run: `pnpm test`
