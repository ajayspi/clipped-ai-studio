# character-sheet

## Overview
Character design utility synthesizing multi-pose reference sheets for whiteboard animation avatars.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:claimable] Plan-only utility; does not insert into render_jobs queue

## Side Effects
- [route.ts:geminiCharacterGenerator.generateCharacterSheet] Invokes Gemini image model to synthesize multi-pose character sheet

## Verification
- Run: `pnpm test`
