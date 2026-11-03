# avatar

## Overview
Talking avatar video generator creating presenter overlays with picture-in-picture layouts and background media.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>
- [route.ts:GET] export async function GET(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:script] Rejects with 400 if script is empty
- [route.ts:orchestration_state] Explicitly sets 'planning' on initial insert
- [route.ts:mock] If mock is true, immediately awaits and returns completed avatar video

## Side Effects
- [route.ts:supabase.from('render_jobs').insert] Inserts job in Supabase
- [route.ts:avatarOrchestrator.generateAvatarVideo] Generates talking avatar video and audio in background

## Verification
- Run: `pnpm test`
