# [id]

## Overview
Developer V1 API endpoint for polling individual video render job status, artifacts, and cost ledger.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:GET] export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse>

## Invariants
- [route.ts:params] Next.js 16 dynamic parameter params must be awaited before extracting id
- [route.ts:costEstimation] Computes granular breakdown of LLM, TTS, video assets, and compute costs

## Side Effects
- [route.ts:supabase.from('render_jobs').select] Reads render_jobs record from Supabase by ID

## Verification
- Run: `pnpm test`
