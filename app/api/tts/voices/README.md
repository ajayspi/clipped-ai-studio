# voices

## Overview
Voice catalog querying endpoint returning available TTS voices grouped by provider and language.

## Interface
- [route.ts:GET] export async function GET(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:supportedProviders] Supports providers ['azure', 'openai', 'elevenlabs', 'google', 'keyless']
- [route.ts:supportedLanguages] Supports 8 locales across English and Indian languages (en-US, en-IN, hi-IN, ta-IN, te-IN, kn-IN, bn-IN, mr-IN)

## Side Effects
- None

## Verification
- Run: `pnpm test`
