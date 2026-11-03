# supabase

## Overview
Custom Supabase configuration status resolver reading cookie-based dynamic database credentials.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:GET] export async function GET(): Promise<NextResponse>
- [route.ts:POST] export async function POST(request: Request): Promise<NextResponse>

## Invariants
- [route.ts:GET] Evaluates custom credentials from cookies CUSTOM_URL_COOKIE_KEY and CUSTOM_ANON_KEY_COOKIE_KEY before falling back to env vars
- [route.ts:maskedAnonKey] Masks anon key exposing only last 4 digits

## Side Effects
- [route.ts:POST] Forwards request payload to /api/settings/supabase/test endpoint

## Verification
- Run: `pnpm test`
