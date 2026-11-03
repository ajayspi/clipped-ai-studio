# generate

## Overview
Developer V1 public video generation API offering authenticated non-blocking job submission, script enrichment, and webhook notification.

## Interface
- [route.ts:dynamic] export const dynamic = 'force-dynamic'
- [route.ts:POST] export async function POST(req: Request): Promise<NextResponse>

## Invariants
- [route.ts:auth] Requires Authorization: Bearer <key> or x-api-key header; returns 401 if missing
- [route.ts:prompt] Prompt is required non-empty string; returns 400 if missing
- [route.ts:orchestration_state] Inserts with orchestration_state: 'planning', promoted in after() to 'qc_pending' once beats are written
- [route.ts:beats fallback] Emits single fallback beat if enrichment fails or is disabled to prevent worker empty concat crash
- [route.ts:status] Returns HTTP 202 Accepted with statusUrl: /api/v1/jobs/${jobId}

## Side Effects
- [route.ts:supabase.from('videos').insert] Inserts record into videos table in Supabase
- [route.ts:supabase.from('render_jobs').insert] Inserts record into render_jobs table in Supabase
- [route.ts:after] Asynchronously executes LLM script enrichment in background
- [route.ts:dispatchWebhook] Dispatches HMAC SHA-256 signed webhook to webhookUrl if configured

## Verification
- Run: `pnpm test`
