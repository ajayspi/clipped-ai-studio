# preview

## Overview
Real-time TTS sample synthesis preview endpoint for auditioning voice IDs and languages.

## Interface
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:text] Defaults to sample introductory text if text is omitted
- [route.ts:defaults] Defaults provider to 'auto', language to 'en-US', speed to 1.0, volume to 100

## Side Effects
- [route.ts:ttsEngine.synthesize] Invokes TTSEngine generating synthetic audio buffer or provider audio

## Verification
- Run: `pnpm test`
