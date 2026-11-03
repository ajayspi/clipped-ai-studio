# whiteboard

## Overview
Whiteboard animation workflow generating stickman/monoline marker drawing sequences and character sheets.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>
- [route.ts:GET] export async function GET(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:prompt] Rejects with 400 if prompt is empty
- [route.ts:orchestration_state] Inserts with orchestration_state: 'planning' to ensure FFmpeg worker never claims storyboard-only job
- [route.ts:mock] If mock is true, returns completed storyboard immediately

## Side Effects
- [route.ts:supabase.from('render_jobs').insert] Inserts job in Supabase
- [route.ts:whiteboardOrchestrator.generateWhiteboard] Generates whiteboard storyboards, drawings, and character sheets in background

## Verification
- Run: `pnpm test`
