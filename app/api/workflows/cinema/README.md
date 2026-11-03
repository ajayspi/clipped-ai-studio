# cinema

## Overview
Cinema Director workflow route inspired by Open-Higgsfield-AI. Compiles filmmaker optical physics (lens focal length, aperture, sensor size), 3D camera choreography, lighting schemes, film stock LUTs, and multi-image character reference rigs into director-grade generative video prompts.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:subject] Subject is strictly required; responds with 400 when missing or empty
- [route.ts:previewOnly] Returns compiled prompt without queueing when previewOnly is true
- [route.ts:orchestration_state] Inserts render_jobs with `orchestration_state: 'planning'` to prevent premature FFmpeg worker claim

## Side Effects
- [route.ts:supabase] Inserts job record into `render_jobs` with compiled cinema parameters and initial beats

## Verification
- Run: `pnpm exec vitest run test/cinema-director.test.ts`
