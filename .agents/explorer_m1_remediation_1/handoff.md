# Milestone 1 Remediation Handoff Report: Supabase Client & Auth Mocks

**Agent**: Explorer 1 (`explorer_m1_remediation_1`)  
**Type**: Hard Handoff  
**Mission**: Milestone 1 Remediation (Supabase Client & Auth Mocks)  
**Target Files**:
- `test/setup.ts`
- `lib/supabase/client.ts`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `report.md` (`.agents/explorer_m1_remediation_1/report.md`)

---

## 1. Observation

1. **`app/(auth)/login/page.tsx` Mount Call**:
   Lines 9–11:
   ```tsx
   export default function LoginPage() {
     const router = useRouter()
     const supabase = createClient()
   ```
   `createClient()` is called synchronously on component body evaluation.

2. **`app/(auth)/register/page.tsx` Mount Call**:
   Lines 9–11:
   ```tsx
   export default function RegisterPage() {
     const router = useRouter()
     const supabase = createClient()
   ```
   `createClient()` is called synchronously on component body evaluation.

3. **`lib/supabase/client.ts` Key Resolution**:
   Lines 56–67:
   ```typescript
   const anonKey = (
     customAnonKey ||
     custom.anonKey ||
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
     ''
   ).trim();

   const cacheKey = `${url}::${anonKey}`;
   if (!clientCache.has(cacheKey)) {
     const client = createBrowserClient(url, anonKey);
     clientCache.set(cacheKey, client);
   }
   ```
   When `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` is not defined in the runner environment, `anonKey` resolves to `''`.

4. **`node_modules/@supabase/ssr/dist/main/createBrowserClient.js` Exception**:
   Lines 19–21:
   ```javascript
   if (!supabaseUrl || !supabaseKey) {
       throw new Error(`@supabase/ssr: Your project's URL and API key are required to create a Supabase client!\n\nCheck your Supabase project's API settings to find these values\n\nhttps://supabase.com/dashboard/project/_/settings/api`);
   }
   ```
   Because `supabaseKey` is `''` (falsy), `@supabase/ssr` throws an unhandled `Error`, crashing any component invoking `createClient()` during test mount.

5. **`test/setup.ts` Current State**:
   Lines 1–157 contain zero instances of `process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `vi.mock('@/lib/supabase/client', ...)`.

6. **Exports Required by Consumer Modules**:
   In `lib/supabase/client.ts:4-6`:
   - `CUSTOM_CONFIG_STORAGE_KEY = 'clipped_custom_supabase_config'`
   - `CUSTOM_URL_COOKIE_KEY = 'clipped_custom_supabase_url'`
   - `CUSTOM_ANON_KEY_COOKIE_KEY = 'clipped_custom_supabase_anon_key'`
   - `getCustomCredentialsFromStorage()` (line 19)
   - `createClient()` (line 47)
   These constants and helpers are imported by `lib/supabase/context.tsx:6-11`, `lib/supabase/server.ts:3`, `lib/supabase/middleware.ts:3`, and `app/api/settings/supabase/route.ts:3`.

7. **Auth Method Calls**:
   - `app/(auth)/login/page.tsx:22`: `await supabase.auth.signInWithPassword({ email, password })`
   - `app/(auth)/register/page.tsx:25`: `await supabase.auth.signUp({ email, password })`

---

## 2. Logic Chain

1. *From Observation 1, 2, & 3*: Whenever `<LoginPage />` or `<RegisterPage />` is mounted in a headless test via React Testing Library (`render(<LoginPage />)`), `createClient()` executes synchronously in the component render phase.
2. *From Observation 3 & 5*: In the test runner environment (`vitest run`), `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` is undefined and `test/setup.ts` does not provide a default value or mock `@/lib/supabase/client`. As a result, `createClient()` passes `url` and `''` into `createBrowserClient(url, '')`.
3. *From Observation 4*: `createBrowserClient` encounters `!supabaseKey` and throws `Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!`. This uncaught exception crashes the component render immediately.
4. *From Observation 7*: Even if `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` was populated, unmocked `@supabase/supabase-js` would attempt live HTTP requests via `fetch` during form submission. Because `test/setup.ts` fetch fallback returns `{ success: true, data: [] }`, GoTrue fails to extract `access_token`, and tests cannot assert or control auth behavior.
5. *From Observation 6*: Any mock for `@/lib/supabase/client` in `test/setup.ts` must export `createClient`, `getCustomCredentialsFromStorage`, and the three constant strings (`CUSTOM_CONFIG_STORAGE_KEY`, `CUSTOM_URL_COOKIE_KEY`, `CUSTOM_ANON_KEY_COOKIE_KEY`) to prevent breaking sibling modules like `context.tsx`, `server.ts`, and `middleware.ts`.
6. *Conclusion*: Remediation requires adding both fallback environment variables and a comprehensive `@/lib/supabase/client` mock in `test/setup.ts`.

---

## 3. Caveats

- **Scope Boundary**: This investigation focuses specifically on `process.env.NEXT_PUBLIC_SUPABASE_*` and `@/lib/supabase/client` for auth routes (`login` and `register`). Mocks for `@/lib/supabase/context` (`useSupabase`) and `@/lib/db` (`supabase.from` for RSC routes like `dashboard` and `planner`) are complementary peer remediation tasks identified in Reviewer 2's report.
- **Assumptions**: We assume the test suite runs in JSDOM where `window` and `localStorage` are present.
- **Timer in Register Page**: Note that `RegisterPage.tsx:33` uses `setTimeout(() => router.push("/login"), 3000)`. When testing the redirect following registration in Milestone 2, tests must account for this timer (e.g. via `vi.advanceTimersByTime(3000)` or asserting the immediate success alert).

---

## 4. Conclusion

Milestone 1's mock harness in `test/setup.ts` must be updated with:
1. Default environment variables for `process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `process.env.SUPABASE_SERVICE_ROLE_KEY`.
2. A `vi.mock('@/lib/supabase/client', ...)` implementation exporting:
   - `createClient`: returns a shared, spyable mock client with `auth` (`signInWithPassword`, `signUp`, `signOut`, `getSession`, `getUser`, `onAuthStateChange`), fluent `from()` query builder, `storage`, and `channel` stubs.
   - `getCustomCredentialsFromStorage`: `vi.fn(() => ({ url: undefined, anonKey: undefined, isCustom: false }))`.
   - `CUSTOM_CONFIG_STORAGE_KEY`, `CUSTOM_URL_COOKIE_KEY`, and `CUSTOM_ANON_KEY_COOKIE_KEY`.

The detailed code implementation and downstream test verification patterns have been documented in `.agents/explorer_m1_remediation_1/report.md`.

---

## 5. Verification Method

To independently verify this strategy once applied to `test/setup.ts`:

1. **Verify Setup Harness**:
   Inspect `test/setup.ts` to ensure:
   - `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` are initialized.
   - `vi.mock('@/lib/supabase/client', ...)` is defined with all required exports.

2. **Run Test Suite**:
   Execute the Vitest test runner command:
   ```bash
   node ./node_modules/vitest/vitest.mjs run
   ```
   Confirm all test suites pass with exit code 0.

3. **Verify Auth Page Mount**:
   Create or run a component test importing `LoginPage` and `RegisterPage`:
   ```tsx
   import LoginPage from '@/app/(auth)/login/page';
   import RegisterPage from '@/app/(auth)/register/page';
   import { render } from '@testing-library/react';

   render(<LoginPage />);
   render(<RegisterPage />);
   ```
   Confirm that both components mount cleanly without throwing uncaught exceptions.

4. **Invalidation Conditions**:
   - `render(<LoginPage />)` throws `@supabase/ssr: Your project's URL and API key are required...`.
   - `createClient()` returns undefined or is not callable.
   - `CUSTOM_URL_COOKIE_KEY` is undefined when imported from `@/lib/supabase/client`.
