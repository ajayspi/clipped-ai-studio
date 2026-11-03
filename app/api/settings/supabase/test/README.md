# test

## Overview
Supabase connectivity and schema verification probe validating project reachability and core database table integrity.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:POST] export async function POST(request: Request): Promise<NextResponse>

## Invariants
- [route.ts:CORE_TABLES] Tests existence of exactly 6 core schema tables: ['videos', 'render_jobs', 'settings', 'api_credits', 'scheduled_posts', 'users']
- [route.ts:URL protocol] Requires valid HTTP or HTTPS protocol URL; rejects other protocols or malformed strings with 400
- [route.ts:isHealthy] Health is strictly false if missingTables is non-empty

## Side Effects
- [route.ts:fetch] Pings target Supabase endpoint at /auth/v1/health or /rest/v1/ measuring latency
- [route.ts:probeClient.from] Executes test select queries against each of the 6 core tables

## Verification
- Run: `pnpm test`
