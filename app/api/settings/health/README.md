# health

## Overview
Real-time and cached provider health probing and priority configuration endpoint across all registered AI integrations.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:GET] export async function GET(): Promise<NextResponse>
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:categories] Evaluates health and active provider priority across categories ['llm', 'image', 'voice', 'media', 'video', 'music']
- [route.ts:POST] Supports action types: 'toggle', 'update', 'check', and 'check_all'

## Side Effects
- [route.ts:checkProviderHealth] Issues network health checks to provider endpoints measuring latency and availability
- [route.ts:supabaseAdmin.from('settings').update] Updates is_active and priority flags in Supabase settings table

## Verification
- Run: `pnpm test`
