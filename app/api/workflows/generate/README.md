# generate

## Overview
Primary video generation queue ingestion route for CreationWizard persisting beats, camera moves, and subtitle styling.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:script] Rejects with 400 if script is missing
- [route.ts:submittedBeats] Destructures and preserves submitted beats; normalizes shotType via normalizeShotType and cameraMove via normalizeCameraMove
- [route.ts:orchestration_state] Explicitly sets plain state string: 'qc_pending' if beats are submitted, or 'planning' if beatless. Never writes an object.
- [route.ts:hasBeats] When beats are supplied by wizard, skips re-planning and returns immediately

## Side Effects
- [route.ts:supabase.from('render_jobs').insert] Inserts render job row into Supabase with normalized beats and configurations in logs

## Verification
- Run: `pnpm test`
