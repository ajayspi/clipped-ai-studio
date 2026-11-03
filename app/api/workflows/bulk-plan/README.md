# bulk-plan

## Overview
Content planning utility generating structured multi-day short-form video schedules and scripts without queueing.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:niche] Rejects with 400 if niche is empty
- [route.ts:contentCount] Defaults to 7 content items
- [route.ts:writes queue] Utility route; does not write to render_jobs queue directly

## Side Effects
- [route.ts:bulkPlanner.generatePlan] Generates multi-day content plan using LLM orchestration

## Verification
- Run: `pnpm test`
