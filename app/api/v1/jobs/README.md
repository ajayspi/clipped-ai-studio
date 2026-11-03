# jobs

## Overview
Developer V1 API endpoint for querying paginated generation job statuses and calculated multi-provider costs.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:GET] export async function GET(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:limit] Limit clamped to maximum 100 (default 20)
- [route.ts:order] Orders jobs by created_at descending

## Side Effects
- [route.ts:supabase.from('render_jobs').select] Reads render_jobs records from Supabase

## Verification
- Run: `pnpm test`
