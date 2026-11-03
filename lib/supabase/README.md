# supabase

## Overview
Supabase SSR clients, React context provider with custom credential switching, cookie session synchronization, and route protection middleware.

## Interface
- [lib/supabase/client.ts:createClient] export function createClient(customUrl?: string, customAnonKey?: string): SupabaseClient
- [lib/supabase/client.ts:getCustomCredentialsFromStorage] export function getCustomCredentialsFromStorage(): { url?: string; anonKey?: string; isCustom: boolean }
- [lib/supabase/client.ts:CUSTOM_CONFIG_STORAGE_KEY] export const CUSTOM_CONFIG_STORAGE_KEY: string
- [lib/supabase/client.ts:CUSTOM_URL_COOKIE_KEY] export const CUSTOM_URL_COOKIE_KEY: string
- [lib/supabase/client.ts:CUSTOM_ANON_KEY_COOKIE_KEY] export const CUSTOM_ANON_KEY_COOKIE_KEY: string
- [lib/supabase/context.tsx:SupabaseProvider] export function SupabaseProvider({ children }: { children: React.ReactNode }): JSX.Element
- [lib/supabase/context.tsx:useSupabase] export function useSupabase(): SupabaseContextValue
- [lib/supabase/context.tsx:SupabaseContextValue] export interface SupabaseContextValue
- [lib/supabase/context.tsx:TestConnectionResult] export interface TestConnectionResult
- [lib/supabase/context.tsx:SchemaStatus] export interface SchemaStatus
- [lib/supabase/middleware.ts:updateSession] export async function updateSession(request: NextRequest): Promise<NextResponse>
- [lib/supabase/server.ts:createClient] export async function createClient(customUrl?: string, customAnonKey?: string): Promise<SupabaseClient>

## Invariants
- [lib/supabase/client.ts:createClient] Client instances are memoized in an in-memory cache keyed by `${url}::${anonKey}` to prevent redundant instances.
- [lib/supabase/context.tsx:useSupabase] Must be invoked inside SupabaseProvider component tree or throws an error.
- [lib/supabase/middleware.ts:updateSession] Redirects unauthenticated users trying to access /dashboard, /create, /planner, /library, or /settings to /login, and redirects authenticated users on auth routes to /dashboard.

## Side Effects
- [lib/supabase/context.tsx:setCookies] Modifies browser document.cookie and localStorage with custom Supabase endpoints.
- [lib/supabase/middleware.ts:updateSession] Refreshes session tokens via network requests to Supabase auth service.

## Verification
- Run: `pnpm test`
