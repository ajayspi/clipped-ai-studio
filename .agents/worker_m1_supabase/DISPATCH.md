## 2026-09-02T22:56:00Z
Objective: Implement Milestone 1 (Custom Supabase Connection UI & Dynamic Client Routing):
1. Create `lib/supabase/context.tsx`:
   - React Context (`SupabaseProvider` and `useSupabase()` hook) providing dynamic access to the active Supabase client.
   - Manages state: `url`, `anonKey`, `isCustom`, `status` ('connected' | 'default' | 'unreachable' | 'testing'), `latencyMs`.
   - Helper functions: `setCustomConfig(url, anonKey)`, `resetToDefault()`, `testConnection(url?, anonKey?)`.
   - Persists custom configuration in `localStorage` under `clipped_custom_supabase_config` and in cookies (`clipped_custom_supabase_url`, `clipped_custom_supabase_anon_key`) for seamless SSR compatibility.
2. Update `lib/supabase/client.ts`:
   - Implement `getCustomCredentialsFromStorage()`.
   - Update `createClient()` to dynamically prioritize custom credentials from `localStorage` if set, otherwise falling back to environment variables.
3. Update `lib/supabase/server.ts`:
   - Inspect incoming cookies for `clipped_custom_supabase_url` and `clipped_custom_supabase_anon_key` before falling back to `process.env`.
4. Wrap application in `SupabaseProvider`:
   - Update `app/layout.tsx` or `app/(app)/layout.tsx` to include `SupabaseProvider`.
5. Create `app/api/settings/supabase/test/route.ts`:
   - `POST` endpoint that accepts `{ url, anonKey }`, validates URL and key structure, performs a real latency ping & probe queries to core tables (`videos`, `render_jobs`, `settings`, `api_credits`, `scheduled_posts`, `users`), and returns `{ success, reachable, latencyMs, schema: { isHealthy, tables, missingTables }, message }`.
6. Create `app/api/settings/supabase/route.ts`:
   - `GET` to retrieve current server/env or cookie-based Supabase configuration status (masking sensitive keys).
   - `POST` to test or validate configuration.
7. Update `app/(app)/settings/page.tsx`:
   - Add a new "Database & Supabase" tab in settings.
   - Include: Active Status badge (🟢 Custom Connected / 🔵 Default Cloud Project / 🔴 Unreachable), latency display, URL input, Anon Key input (with password reveal toggle), "Test Connection" button, "Save & Apply Connection" button, "Reset to Default" button, and Schema DDL viewer drawer/dialog showing required SQL.
   - Provide live feedback on test results (latency, table health checklist).

Scope Boundaries:
- Exclusively own `lib/supabase/context.tsx`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `app/api/settings/supabase/`, and the Database tab in `app/(app)/settings/page.tsx`.
- Do not modify voice engine or subtitles components.
