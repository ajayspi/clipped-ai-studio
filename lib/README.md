# lib

## Overview
Shared library foundation containing database client singletons, OmniRoute configuration resolution, quota management, smart provider routing, diagnostic logging, and child subsystems.

## Interface
- [lib/db.ts:supabase] export const supabase: SupabaseClient
- [lib/db.ts:supabaseAdmin] export const supabaseAdmin: SupabaseClient
- [lib/db.ts:getSupabase] export function getSupabase(customUrl?: string, customKey?: string): SupabaseClient
- [lib/db.ts:getSupabaseAdmin] export function getSupabaseAdmin(customUrl?: string, customServiceKey?: string): SupabaseClient
- [lib/api-router.ts:checkProviderHealth] export async function checkProviderHealth(providerId: string, apiKey?: string): Promise<HealthStatus>
- [lib/api-router.ts:getBestProvider] export async function getBestProvider(category: string, preferred?: string): Promise<RouterResult | null>
- [lib/api-router.ts:getAllProviderHealth] export async function getAllProviderHealth(apiKeys: Map<string, string>): Promise<Array<ProviderConfig & HealthStatus & { apiKey?: string }>>
- [lib/api-router.ts:PROVIDER_REGISTRY] export const PROVIDER_REGISTRY: ProviderConfig[]
- [lib/keys.ts:getOmniRouteConfig] export async function getOmniRouteConfig(bypassCache?: boolean): Promise<OmniRouteConfig>
- [lib/keys.ts:getApiKey] export async function getApiKey(provider: string, envVarName?: string): Promise<string | undefined>
- [lib/keys.ts:clearOmniRouteConfigCache] export function clearOmniRouteConfigCache(): void
- [lib/quotas.ts:quotaManager] export const quotaManager: QuotaManager
- [lib/quotas.ts:checkUserQuota] export const checkUserQuota: (userId: string, provider?: string) => Promise<QuotaCheckResult>
- [lib/quotas.ts:consumeQuota] export const consumeQuota: (userId: string, count?: number, provider?: string) => Promise<QuotaConsumptionResult>
- [lib/quotas.ts:refundQuota] export const refundQuota: (userId: string, count?: number, provider?: string) => Promise<QuotaCheckResult>
- [lib/quotas.ts:getUserUsage] export const getUserUsage: (userId: string) => Promise<UserUsageRecord>
- [lib/quotas.ts:resetMonthlyQuota] export const resetMonthlyQuota: (userId: string, provider?: string) => Promise<QuotaCheckResult>
- [lib/quotas.ts:QuotaExceededError] export class QuotaExceededError extends Error
- [lib/logger.ts:createLogger] export function createLogger(scope: string): Logger
- [lib/logger.ts:log] export const log: Logger
- [lib/logger.ts:redact] export function redact(value: unknown): unknown
- [lib/logger.ts:readLogTail] export function readLogTail(which?: 'app' | 'error', lines?: number): { file: string; lines: string[]; error: string | null; exists: boolean }
- [lib/utils.ts:cn] export function cn(...inputs: ClassValue[]): string
- [lib/ai/README.md] AI Generation & Character Sheet Animation
- [lib/engine/README.md] Video Generation & Multi-Provider Pipeline Engine
- [lib/jobs/README.md] Background Render-Job Leases & Queue Enqueuing
- [lib/media/README.md] Stock Media Sourcing & fal.ai / Higgsfield Queue Clients
- [lib/publishing/README.md] Social Media Video Publishing & Rate Limiting
- [lib/supabase/README.md] Supabase Client Singletons, Context, Middleware & Session Management

## Invariants
- [lib/db.ts:supabaseAdmin] Uses service role key with disabled auto-refresh and session persistence for server-side operations.
- [lib/keys.ts:getOmniRouteConfig] Checks DB settings -> ENV -> default (http://127.0.0.1:20128); strips trailing slashes and /v1.
- [lib/quotas.ts:consumeQuota] Enforces free tier limit (3 videos/month); checks monthly reset due date; throws QuotaExceededError when limit is reached.
- [lib/logger.ts:resolveRootDir] Probes for real package.json to prevent stub __dirname bugs in Next.js server runtime bundles. Redacts API tokens, keys, bearer headers, and passwords.
- [lib/api-router.ts:getBestProvider] Evaluates providers by priority and returns the first healthy endpoint.

## Side Effects
- Reads and updates Supabase tables (settings, users, api_credits).
- Appends logs to local filesystem (logs/app.log, logs/error.log).
- Outbound HTTP health check probes to AI providers.

## Verification
- Run: `pnpm test`
