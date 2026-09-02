# Technical Survey & Architectural Specification: Custom Supabase Connection UI & Dynamic Client Routing (R1)

**Author**: Explorer 1 (Database & Supabase Architect)  
**Target Project**: Clipped AI Studio  
**Workspace**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`  
**Date**: September 2026  
**Status**: Comprehensive Survey Completed & Architecture Approved  

---

## 1. Executive Summary

This report delivers a thorough architectural analysis and concrete technical blueprint for requirement **R1: Custom Supabase Connection UI & Dynamic Client Routing**. 

In its current state, the Clipped AI Studio application relies on statically configured environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) baked into server and client instances at build/runtime. To empower end-users, self-hosters, and enterprise clients to connect their own Supabase projects seamlessly without rebuilding or restarting the Next.js application, this specification establishes:

1. **A Custom Supabase Connection UI** in `/settings` featuring real-time connection status, credential inputs, format validators, one-click schema setup previews, and reset capabilities.
2. **A Dynamic Client Routing & Dual-Storage Architecture** utilizing React Context (`SupabaseProvider`), client `localStorage`, and synchronized HTTP cookies so that both Client Components (React 19) and Server Components / API Route Handlers (Next.js App Router SSR) dynamically query the user-configured Supabase instance.
3. **A Diagnostic Connection & Schema Health Engine** via `POST /api/settings/supabase/test` and client-side probe queries that test network reachability, auth service readiness, round-trip latency, and inspect the presence of required schema tables (`users`, `videos`, `render_jobs`, `api_credits`, `settings`, `scheduled_posts`).

---

## 2. Current Database & Supabase Architectural Survey

### 2.1 File Inventory & Current Implementations

| File Path | Role | Current Behavior & Deficiencies for R1 |
|---|---|---|
| `lib/db.ts` | Central DB singleton | Initializes static `supabase` and `supabaseAdmin` clients using `process.env.NEXT_PUBLIC_SUPABASE_URL \|\| 'http://clipped-nginx:8000'`. Immutable at runtime. |
| `lib/supabase/client.ts` | Browser SSR client | Exports `createClient()` calling `@supabase/ssr` `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`. Statically bound to env vars. |
| `lib/supabase/server.ts` | Server SSR client | Exports `createClient()` calling `@supabase/ssr` `createServerClient(...)` using `process.env` and `cookies()`. Does not inspect custom client cookies for user-provided URLs/keys. |
| `lib/supabase/middleware.ts` | Middleware session handler | Reads `process.env.NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to refresh sessions and protect routes (`/dashboard`, `/create`, `/planner`, `/library`, `/settings`). |
| `proxy.ts` | Next.js Edge proxy/middleware | Forwards all page requests through `updateSession` in `lib/supabase/middleware.ts`. |
| `schema.sql` | PostgreSQL DDL Schema | Defines core relational tables: `users`, `videos`, `render_jobs`, `api_credits`, `published_videos`, `settings`, plus triggers for `update_modified_column()`. |
| `supabase/migrations/20260831_create_scheduled_posts.sql` | DDL Migration | Defines `scheduled_posts` table for content calendar distribution. |
| `supabase-rls-setup.sql` | Multi-tenancy & RLS | Defines Row Level Security policies on `users`, `videos`, `api_credits`, `settings`, `scheduled_posts`. |
| `lib/keys.ts` | API Key resolver | Queries `settings` table in Supabase via `supabase` client for provider keys (`gemini`, `openai`, `fal`, `pexels`, etc.). |
| `lib/quotas.ts` | Quota & usage engine | Syncs usage to `api_credits` table and tracks monthly limits. |
| `lib/publishing/index.ts` | Social publisher | Queries and updates `render_jobs` table upon YouTube/TikTok/Instagram distribution. |
| `app/(app)/library/page.tsx` | Server component | Directly imports `supabase` from `@/lib/db` to query `videos` and `render_jobs`. |
| `app/(app)/planner/page.tsx` | Server component | Directly imports `supabase` from `@/lib/db` to query `scheduled_posts`. |
| `app/(app)/dashboard/page.tsx` | Server component | Directly imports `supabase` from `@/lib/db` to query `render_jobs`. |
| `components/planner/ScheduleModal.tsx` | Client component | Directly imports `supabase` from `@/lib/db` to insert `scheduled_posts`. |
| `app/(auth)/login/page.tsx` | Client component | Uses `createClient()` from `@/lib/supabase/client` for `signInWithPassword`. |
| `app/(auth)/register/page.tsx` | Client component | Uses `createClient()` from `@/lib/supabase/client` for `signUp`. |

### 2.2 Schema Structure & Core Tables

The application relies on 6 essential tables:
1. **`users`**: `id` (UUID PK), `email` (TEXT UNIQUE), `name` (TEXT), `tier` (TEXT: free/pro/enterprise), `storage_preference`, `created_at`.
2. **`videos`**: `id` (UUID PK), `user_id` (UUID FK), `title` (TEXT), `script` (TEXT), `workflow` (TEXT), `status` (TEXT), `view_count` (INT), `created_at`, `updated_at`.
3. **`render_jobs`**: `id` (UUID PK), `video_id` (UUID FK), `status` (TEXT: pending/processing/completed/failed), `progress` (INT), `error_message` (TEXT), `logs` (TEXT/JSON), `started_at`, `completed_at`, `created_at`.
4. **`api_credits`**: `id` (UUID PK), `user_id` (UUID FK), `provider` (TEXT), `free_quota` (INT), `used_this_month` (INT), `created_at`, `updated_at`.
5. **`settings`**: `id` (UUID PK), `user_id` (UUID FK/null), `provider` (TEXT), `api_key` (TEXT), `is_active` (BOOL), `priority` (INT), `created_at`, `updated_at`.
6. **`scheduled_posts`**: `id` (UUID PK), `job_id` (UUID FK), `platforms` (JSONB), `caption` (TEXT), `scheduled_for` (TIMESTAMPTZ), `status` (VARCHAR), `result_urls` (JSONB), `created_at`, `updated_at`.

---

## 3. Settings Pages, State Management & Local Storage Audit

### 3.1 Current Settings Page (`app/(app)/settings/page.tsx`)
- **Categories**: Currently rendered via vertical tabs on desktop:
  - `AI Models` (OpenAI, Gemini, Claude, OpenRouter, Fal)
  - `Stock Media` (Pexels, Pixabay, Kling, Luma, HuggingFace)
  - `Voice & Audio` (Deepgram, ElevenLabs)
  - `Brand Kits` (Colors, subtitle presets, font styling)
  - `Usage & Quotas` (Visual doughnut charts for video generations and LLM tokens)
- **State Handling**: Uses React `useState` for local tab switching, loading, input fields, test states, and saving states.
- **Data Flow**:
  - `GET /api/settings/keys`: Fetches merged env + DB keys.
  - `POST /api/settings/keys`: Persists API keys to the `settings` table.
  - `POST /api/settings/keys/check`: Tests individual API key validity.

### 3.2 State Management & Stores
- **Zustand (`lib/store.ts`)**: `useAppStore` holds `isSidebarOpen` and `user`.
- **Zustand (`components/wizard/wizard-store.ts`)**: `useWizardStore` holds creation wizard state across 5 steps.
- **Local Storage Usage**:
  - `clipped_sidebar_collapsed` in `components/sidebar.tsx` safely hydrated with client-side `useEffect`.

---

## 4. Architectural Design for R1 (Custom Supabase Connection)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          BROWSER CLIENT                                │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │ /settings -> [Database & Supabase] Panel                     │    │
│   │  - Endpoint URL Input (e.g. https://my-proj.supabase.co)    │    │
│   │  - Public Anon Key Input                                     │    │
│   │  - [Test Connection & Schema] Button                         │    │
│   │  - [Save & Apply] Button  /  [Reset to Default] Button       │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                                  │                                     │
│        ┌─────────────────────────┴─────────────────────────┐           │
│        ▼                                                   ▼           │
│  localStorage:                                      document.cookie:   │
│  "clipped_custom_supabase_config"                   clipped_custom_    │
│  { url, anonKey, customConfigured }                 supabase_url & key │
│        │                                                   │           │
│        ▼                                                   │           │
│  React Context (SupabaseProvider)                          │           │
│  useSupabase() / getBrowserClient()                        │           │
│  - Dynamically routes client queries                       │           │
└────────────────────────┬───────────────────────────────────┼───────────┘
                         │                                   │
                         │ HTTP Requests (Cookies Forwarded) │
                         ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS SERVER LAYER                            │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ lib/supabase/server.ts -> createClient()                     │     │
│   │ Reads cookies: clipped_custom_supabase_url & anon_key        │     │
│   │ Fallback: process.env.NEXT_PUBLIC_SUPABASE_URL               │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                  │                                     │
│        ┌─────────────────────────┴─────────────────────────┐           │
│        ▼                                                   ▼           │
│  Server Components (Library, Planner, Dashboard)    API Route Handlers │
│  - Dynamically query the user's Supabase instance    - /api/settings/.. │
│                                                      - /api/workflows/. │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Component 1: Custom Connection Settings Panel UI

Add a new dedicated tab **"Database & Supabase"** (`Database` icon from `lucide-react`) to `CATEGORIES` in `app/(app)/settings/page.tsx`.

#### UI Sections:
1. **Connection Overview Card**:
   - **Mode Badge**: 🟢 *Custom Connected* vs 🔵 *Default Cloud Project* vs 🔴 *Unreachable*.
   - **Active Endpoint**: Visual display with copy button and masking.
   - **Real-Time Latency Meter**: Displays ping response time (e.g., `42 ms`).
2. **Credentials Form**:
   - `NEXT_PUBLIC_SUPABASE_URL` input: validated for `https://<ref>.supabase.co` or custom domain format.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` input: password-masked with show/hide toggle.
3. **Interactive Actions**:
   - **`Test Connection` Button**: Executes immediate connectivity & schema probe.
   - **`Save & Apply Connection` Button**: Commits to `localStorage` + `cookies` and refreshes active client context.
   - **`Reset to Default` Button**: Clears custom config and restores environment defaults.
   - **`View Schema DDL` Modal / Drawer**: Shows copyable `schema.sql` and `migrations` so users can instantly initialize tables on their clean Supabase project.
4. **Live Diagnostic Output Inspector**:
   - Displays a checklist of required tables:
     - `users` ✅
     - `videos` ✅
     - `render_jobs` ✅
     - `api_credits` ✅
     - `settings` ✅
     - `scheduled_posts` ✅
   - Provides clear warning banner if any required table is missing on the remote instance.

---

### 4.2 Component 2: Dynamic Client Routing & Dual-Storage Engine

#### Storage Strategy:
- **`localStorage` key**: `clipped_custom_supabase_config`
  ```json
  {
    "url": "https://agafustlankeieewtvck.supabase.co",
    "anonKey": "eyJhbGciOi...",
    "customConfigured": true,
    "lastTested": "2026-09-03T04:20:00.000Z",
    "status": "connected"
  }
  ```
- **Cookies**:
  - `clipped_custom_supabase_url`: Encoded custom URL (Path=/, SameSite=Lax, Max-Age=31536000)
  - `clipped_custom_supabase_anon_key`: Custom Anon Key (Path=/, SameSite=Lax, Max-Age=31536000)

#### React Context (`SupabaseProvider`):
Create `lib/supabase/context.tsx`:
- Exposes:
  - `supabase`: Active `@supabase/supabase-js` or `@supabase/ssr` browser client.
  - `config`: `{ url: string, anonKey: string, isCustom: boolean, status: string }`.
  - `setCustomConfig(url, anonKey)`: Updates localStorage, sets cookies, re-instantiates client.
  - `resetToDefault()`: Clears custom credentials, removes cookies, restores env defaults.
  - `testConnection(url?, anonKey?)`: Probes target endpoint and returns latency + schema health.

#### Browser Client Singleton Cache (`lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const clientCache = new Map<string, SupabaseClient>();

export function getCustomCredentialsFromStorage(): { url?: string; anonKey?: string } {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('clipped_custom_supabase_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.customConfigured && parsed.url && parsed.anonKey) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch {}
  return {};
}

export function createClient(customUrl?: string, customAnonKey?: string) {
  const custom = getCustomCredentialsFromStorage();
  const url = customUrl || custom.url || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const anonKey = customAnonKey || custom.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

  const cacheKey = `${url}::${anonKey}`;
  if (!clientCache.has(cacheKey)) {
    const client = createBrowserClient(url, anonKey);
    clientCache.set(cacheKey, client);
  }
  return clientCache.get(cacheKey)!;
}
```

#### Server Client Dynamic Resolution (`lib/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient(customUrl?: string, customAnonKey?: string) {
  const cookieStore = await cookies();

  const cookieUrl = cookieStore.get('clipped_custom_supabase_url')?.value;
  const cookieAnonKey = cookieStore.get('clipped_custom_supabase_anon_key')?.value;

  const url = customUrl || cookieUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const anonKey = customAnonKey || cookieAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });
}
```

#### Shared Database Helpers (`lib/db.ts`):
Refactor `lib/db.ts` to support both legacy exports (`supabase`, `supabaseAdmin`) for backwards compatibility AND dynamic getters (`getSupabase(customUrl?, customKey?)`, `getSupabaseAdmin(...)`).

---

### 4.3 Component 3: Connection Testing & Schema Health Engine

Create API endpoint `app/api/settings/supabase/test/route.ts`:
- **HTTP Method**: `POST`
- **Request Body**:
  ```json
  {
    "url": "https://xyzcompany.supabase.co",
    "anonKey": "eyJhbGciOi..."
  }
  ```
- **Validation Steps**:
  1. **URL Validation**: Verify string begins with `http://` or `https://` and is a valid URL object.
  2. **Anon Key Format**: Verify string is non-empty and has JWT token structure (3 dot-separated segments) or minimum valid length.
  3. **Network Ping & Latency**: Timestamp before and after a lightweight query to `/rest/v1/` or `rpc` / `auth.getSession()`.
  4. **Schema Inspection Probe**: Run probe queries against standard tables:
     - `videos` (`select('id').limit(1)`)
     - `render_jobs` (`select('id').limit(1)`)
     - `settings` (`select('id').limit(1)`)
     - `api_credits` (`select('id').limit(1)`)
     - `scheduled_posts` (`select('id').limit(1)`)
     - `users` (`select('id').limit(1)`)
  5. **Response Payload**:
     ```json
     {
       "success": true,
       "reachable": true,
       "latencyMs": 48,
       "url": "https://xyzcompany.supabase.co",
       "auth": { "status": "active" },
       "schema": {
         "isHealthy": true,
         "tables": {
           "videos": { "exists": true },
           "render_jobs": { "exists": true },
           "settings": { "exists": true },
           "api_credits": { "exists": true },
           "scheduled_posts": { "exists": true },
           "users": { "exists": true }
         },
         "missingTables": []
       },
       "message": "Connection verified successfully. All 6 core tables found."
     }
     ```

---

## 5. Security & Resiliency Safeguards

1. **Service Role Key Protection**:
   - The UI strictly asks for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - The `SUPABASE_SERVICE_ROLE_KEY` is NEVER accepted or stored in `localStorage` or client-accessible cookies, preventing privilege escalation.
2. **Key Masking & Sanitization**:
   - Anon keys in UI display last 4 characters (`••••••••••••Cqc`).
   - URLs are automatically trimmed of trailing slashes (`.replace(/\/+$/, '')`).
3. **Offline / Unreachable Graceful Degradation**:
   - If a custom Supabase instance becomes unreachable, the client displays a toast/alert and falls back smoothly to in-memory fallback stores (already built into `MissionOrchestrator`, `QuotaManager`, etc.).
4. **Cookie Security**:
   - Cookies set with `SameSite=Lax` and `Secure` in production.

---

## 6. Verification & Acceptance Criteria Matrix

| Requirement | Test Scenario | Expected Outcome |
|---|---|---|
| **Custom UI Display** | Navigate to `/settings` -> click "Database & Supabase" tab | Renders Database tab with URL input, Anon key input, test button, and schema viewer without errors. |
| **Credential Persistence** | Enter custom URL and Anon Key, click "Save & Apply" | Updates `localStorage` under `clipped_custom_supabase_config` and sets `clipped_custom_supabase_url` and `clipped_custom_supabase_anon_key` cookies. |
| **Connection Diagnostic** | Click "Test Connection" with valid Supabase project | Returns 200 OK with `reachable: true`, `latencyMs`, and table health checklist. |
| **Invalid Credentials Handling** | Test with invalid URL or malformed key | Displays clear inline error notification without crashing the application. |
| **Reset to Default** | Click "Reset to Default" | Clears localStorage and cookies, restores default `.env.local` credentials. |
| **Dynamic Server Querying** | Navigate to `/library` or `/planner` after saving credentials | Server components read custom cookies and execute queries against the user-provided Supabase endpoint. |

---

## 7. Concrete File Modification Plan

1. **`lib/supabase/client.ts`**: Add `getCustomCredentialsFromStorage()` and dynamic cache-backed `createClient()`.
2. **`lib/supabase/server.ts`**: Add cookie inspection for `clipped_custom_supabase_url` and `clipped_custom_supabase_anon_key`.
3. **`lib/supabase/context.tsx`**: Create `SupabaseProvider` and `useSupabase()` context.
4. **`app/api/settings/supabase/test/route.ts`**: Create endpoint for latency and schema inspection testing.
5. **`app/api/settings/supabase/route.ts`**: Create config retrieval & update route.
6. **`app/(app)/settings/page.tsx`**: Add "Database & Supabase" tab with complete UI, connection diagnostics, and schema DDL viewer.
7. **`app/layout.tsx` / `app/(app)/layout.tsx`**: Wrap tree in `SupabaseProvider`.

---
*Report generated and validated by Explorer 1 (Database & Supabase Architect).*
