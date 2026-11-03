# jobs

## Overview
Job management endpoint for querying and partitioning active, completed, and failed render jobs for UI queues.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:GET] export async function GET(req: Request): Promise<NextResponse>
- [route.ts:getThumbnailForWorkflow] function getThumbnailForWorkflow(type: string): string

## Invariants
- [route.ts:limit] Limit parameter defaults to 50
- [route.ts:queued] Partitions jobs with status 'pending', 'generating_plan', or 'processing' into queued list
- [route.ts:order] Orders records by created_at descending

## Side Effects
- [route.ts:supabaseAdmin.from('render_jobs').select] Reads render_jobs from Supabase via admin client

## Verification
- Run: `pnpm test`
