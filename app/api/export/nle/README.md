# nle

## Overview
Non-Linear Editor (NLE) timeline export API supporting OpenTimelineIO (OTIO v1.0) and Final Cut Pro XML (FCPXML v1.10) for professional workflows in DaVinci Resolve, Premiere Pro, and Apple Final Cut Pro.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:jobId] `jobId` parameter is strictly required; responds with 400 if omitted
- [route.ts:format] Default format is 'otio' JSON; returns 'fcpxml' when format='fcpxml'
- [route.ts:headers] Emits `Content-Disposition: attachment` with format-specific mime type

## Side Effects
- [route.ts:supabaseAdmin] Queries `render_jobs` by `id` to retrieve parsed `beats`, `audioUrl`, and `aspect_ratio`

## Verification
- Run: `pnpm exec vitest run test/otio-revideo.test.ts`
