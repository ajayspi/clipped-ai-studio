# Handoff Report — Explorer 1 (Database & Supabase Architect)

## 1. Observation

1. **Static Client & Server Initialization**:
   - `lib/supabase/client.ts` (lines 3-8):
     ```typescript
     export function createClient() {
       return createBrowserClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
       )
     }
     ```
   - `lib/supabase/server.ts` (lines 4-9):
     ```typescript
     export async function createClient() {
       const cookieStore = await cookies()
       return createServerClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
         ...
     ```
   - `lib/db.ts` (lines 3-7):
     ```typescript
     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://clipped-nginx:8000';
     const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-local-anon-key';
     const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
     export const supabase = createClient(supabaseUrl, supabaseAnonKey);
     ```
2. **Environment Variable Configuration**:
   - In `.env.local` (lines 1-3):
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://agafustlankeieewtvck.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
3. **Settings Page Layout & State Management**:
   - `app/(app)/settings/page.tsx` (lines 15-28):
     Categories are `["AI Models", "Stock Media", "Voice & Audio", "Brand Kits", "Usage & Quotas"]`.
     No database / custom Supabase connection panel currently exists.
4. **Database Schema & Table Structure**:
   - `schema.sql` (lines 7-93) and `supabase/migrations/20260831_create_scheduled_posts.sql`:
     Core tables are `users`, `videos`, `render_jobs`, `api_credits`, `published_videos`, `settings`, `scheduled_posts`.
5. **Server Components Direct Querying**:
   - `app/(app)/library/page.tsx` (lines 2, 10-17), `app/(app)/planner/page.tsx` (lines 2, 11-15), `app/(app)/dashboard/page.tsx` (lines 2, 10-15) directly import `supabase` from `@/lib/db`.

---

## 2. Logic Chain

1. From **Observation 1 & 2**, Supabase clients in both browser (`lib/supabase/client.ts`) and server (`lib/supabase/server.ts`, `lib/db.ts`) are currently hard-coded to read only from `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`. Changing credentials in the UI would have no effect unless client routing dynamically intercepts and overrides these values.
2. From **Observation 3**, `app/(app)/settings/page.tsx` lacks a dedicated "Database & Supabase" configuration section. Adding a tab for Database Settings with custom URL and anon key inputs, live latency testing, schema validation, and reset buttons directly fulfills the R1 UI requirement.
3. From **Observation 1 & 5**, Next.js Server Components (`/library`, `/planner`, `/dashboard`) execute on the server during request rendering and cannot read client-side `localStorage`. To enable full dynamic routing for both client and server components without breaking SSR, credentials must be stored in `localStorage` on the client AND synchronized to HTTP cookies (`clipped_custom_supabase_url`, `clipped_custom_supabase_anon_key`).
4. From **Observation 4**, testing a custom Supabase connection requires verifying both generic reachability (HTTP/auth) and specific schema compatibility against the 6 core tables (`users`, `videos`, `render_jobs`, `api_credits`, `settings`, `scheduled_posts`). A dedicated API route `POST /api/settings/supabase/test` and client-side probe query provide this diagnostics capability.

---

## 3. Caveats

- **Service Role Key Security**: Custom connection UI must only ask for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Users should not input `SUPABASE_SERVICE_ROLE_KEY` in the browser client for security reasons.
- **RLS Configuration**: When users switch to an external clean Supabase instance, they will need the schema and RLS policies created. Providing a copyable schema viewer / helper in the settings UI mitigates setup errors.

---

## 4. Conclusion

The technical design for R1 (Custom Supabase Connection UI & Dynamic Client Routing) is fully formulated and documented in `survey_report.md`. It requires:
1. Creating `lib/supabase/context.tsx` (`SupabaseProvider` and `useSupabase()` hook).
2. Refactoring `lib/supabase/client.ts` to dynamically resolve from `localStorage` with client caching.
3. Refactoring `lib/supabase/server.ts` to inspect cookies before falling back to environment variables.
4. Implementing `POST /api/settings/supabase/test` for connection and schema health diagnostics.
5. Updating `app/(app)/settings/page.tsx` with a new "Database & Supabase" management panel.

---

## 5. Verification Method

1. **File Inspection**:
   - Inspect `survey_report.md` at `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_db\survey_report.md` to review the architectural design, diagrams, API contracts, and implementation plan.
2. **Implementation Verification (Downstream Implementer)**:
   - Run `pnpm dev` or test runner `node tests/e2e/standalone-runner.js`.
   - In browser: open `/settings`, click "Database & Supabase" tab, input custom Supabase credentials, click "Test Connection" -> observe latency and schema checklist -> click "Save & Apply" -> observe cookies and localStorage updated -> navigate to `/library` and verify data is fetched from the custom instance.
