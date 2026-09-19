## 2026-09-17T03:41:30Z
You are Worker 2 for Milestone 1 Remediation (Complete Mock Harness Implementation) in Clipped.

Workspace directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped
Your working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m1_remediation
Authoritative request: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md
Project plan & contracts: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md
Reviewer 2 feedback: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\reviewer_m1_2\handoff.md
Remediation findings:
- Explorer 1 (Client & Auth): C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m1_remediation_1\report.md
- Explorer 2 (Context & Settings): C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m1_remediation_2\report.md
- Explorer 3 (Database & RSC): C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m1_remediation_3\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your write ownership (exclusive):
- `test/setup.ts`
- `test/sanity.test.ts`

Tasks:
1. Update `test/setup.ts` to include:
   a. Default environment variables for Supabase:
      `process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';`
      `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key';`
      `process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key';`
   b. Mock `@/lib/supabase/client`:
      Export `createClient`, `getCustomCredentialsFromStorage`, and constants `CUSTOM_CONFIG_STORAGE_KEY`, `CUSTOM_URL_COOKIE_KEY`, `CUSTOM_ANON_KEY_COOKIE_KEY` per Explorer 1 report.
   c. Mock `@/lib/supabase/context`:
      Export `SupabaseProvider` and `useSupabase` returning all 11 fields (`url`, `anonKey`, `isCustom`, `status`, `latencyMs`, `schemaStatus` with full table readiness, `setCustomConfig`, `resetToDefault`, `testConnection`, `refreshStatus`, `supabase`) per Explorer 2 report.
   d. Mock `@/lib/db`:
      Export `supabase`, `supabaseAdmin`, `getSupabase`, `getSupabaseAdmin` with a complete thenable, chainable query builder supporting `select`, `insert`, `update`, `upsert`, `delete`, `order`, `limit`, `eq`, `single`, etc., resolving `{ data: [], error: null, count: 0, status: 200, statusText: 'OK' }` (and `{ data: null, error: null }` for single) per Explorer 3 report.
   e. Ensure global fetch mock supports `/api/settings/supabase/test` returning healthy connection status.
2. Update `test/sanity.test.ts` to include assertions verifying:
   - `createClient()` from `@/lib/supabase/client` works without throwing.
   - `useSupabase()` from `@/lib/supabase/context` returns expected context object.
   - `supabase.from('render_jobs').select('*').order('created_at').limit(20)` from `@/lib/db` resolves to an array.
3. Run the test command:
   `node ./node_modules/vitest/vitest.mjs run` (or `pnpm.cmd test:unit`)
   Verify all tests pass with exit code 0.
4. Deliver your handoff report to `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m1_remediation\handoff.md`.
When done, notify parent with send_message.
