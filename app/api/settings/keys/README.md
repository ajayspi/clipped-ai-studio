# keys

## Overview
Provider API key configuration manager with masked key presentation, validation, and in-memory cache eviction.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:GET] export async function GET(): Promise<NextResponse>
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:SUPPORTED_EXTERNAL_PROVIDERS] Whitelist validation for supported LLM, stock media, voice, video, and brand kit providers
- [route.ts:maskKey] Masks sensitive keys retaining only sk- prefix and/or last 4 characters
- [route.ts:upsertSettingRow] Restricts settings write payload strictly to valid table columns (id, provider, api_key, is_active, updated_at)

## Side Effects
- [route.ts:supabaseAdmin.from('settings')] Reads and persists provider credentials in Supabase settings table
- [route.ts:clearOmniRouteConfigCache] Evicts in-memory OmniRoute configuration cache on update

## Verification
- Run: `pnpm test`
