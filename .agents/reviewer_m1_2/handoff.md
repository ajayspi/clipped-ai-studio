# Milestone 1 Review & Adversarial Challenge Report

**Reviewer**: Reviewer 2 (`reviewer_m1_2`)  
**Milestone**: Milestone 1 (Test Infrastructure & Mock Harness Setup)  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Review & Challenge Summary

| Item | Result |
|---|---|
| **Verdict** | **REQUEST_CHANGES** |
| **Overall Risk Assessment** | **HIGH** |
| **Integrity Checks** | **1 Critical Finding (INTEGRITY VIOLATION / Facade Implementation)** |
| **Test Runner Execution** | Pass (`node ./node_modules/vitest/vitest.mjs run` — 4/4 passed in 3.42s) |
| **M1 Scope Compliance** | Incomplete (`test/setup.ts` omits Supabase client, context, and DB mocks required by R2 & PROJECT.md) |

---

## 2. Findings

### [Critical] Finding 1: Incomplete Mock Harness — Supabase Client, Context, and DB Query Mocks Omitted (INTEGRITY VIOLATION)

- **What**: Worker `worker_m1_infra` created a partial mock harness in `test/setup.ts` and passed a bespoke `test/sanity.test.ts` (which tests only an empty `<div>`, `next/navigation`, browser DOM stubs, and a mock fetch), but completely omitted Supabase client context, Supabase provider mocks, and database mocks. The worker claimed in their handoff that *"Downstream workers (Milestone 2 for core routes and Milestone 3 for create workflows) can immediately begin writing route render tests against this harness."* In reality, **5 out of 7 core routes in Milestone 2 (`login`, `register`, `settings`, `dashboard`, `planner`) will immediately crash on mount or query execution** if tested against this harness.
- **Where**:
  - `test/setup.ts`: lines 1–157 (completely lacks mocks for `@/lib/supabase/client`, `@/lib/supabase/context`, `@/lib/db`, or fallback env vars).
  - `lib/supabase/client.ts`: lines 59–65.
  - `node_modules/@supabase/ssr/dist/main/createBrowserClient.js`: lines 19–21.
  - `lib/supabase/context.tsx`: lines 262–268.
  - `app/(app)/dashboard/page.tsx`: lines 9–14 and 28.
  - `app/(app)/planner/page.tsx`: lines 11–15 and 36.
- **Why (Mechanisms of Failure)**:
  1. **Auth Pages Crash on Mount**:
     In `app/(auth)/login/page.tsx:11` and `app/(auth)/register/page.tsx:11`, `const supabase = createClient()` executes synchronously on component render. In `lib/supabase/client.ts:59`, `anonKey` falls back to `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''`. Because `NEXT_PUBLIC_SUPABASE_ANON_KEY` is undefined in the test runner environment and `test/setup.ts` neither sets env vars nor mocks `@/lib/supabase/client`, `createBrowserClient(url, '')` is invoked. In `@supabase/ssr/dist/main/createBrowserClient.js:19-21`:
     ```javascript
     if (!supabaseUrl || !supabaseKey) {
         throw new Error(`@supabase/ssr: Your project's URL and API key are required to create a Supabase client!...`);
     }
     ```
     This throws an uncaught exception, immediately crashing `<LoginPage />` and `<RegisterPage />` renders.
  2. **Settings Page Crashes on Mount**:
     In `app/(app)/settings/page.tsx:328`, `useSupabase()` is invoked at the component top level. In `lib/supabase/context.tsx:265`:
     ```typescript
     if (!context) {
       throw new Error('useSupabase must be used within a SupabaseProvider');
     }
     ```
     Because `test/setup.ts` provides no global mock or provider wrapper for `useSupabase` / `@/lib/supabase/context`, `<SettingsPage />` crashes on mount. Moreover, wrapping it in real `<SupabaseProvider>` would trigger Failure 1 because `<SupabaseProvider>` calls `createClient()` from `lib/supabase/client.ts`.
  3. **Server Components (Dashboard & Planner) Crash on Query Resolution**:
     In `app/(app)/dashboard/page.tsx:9-13` and `app/(app)/planner/page.tsx:11-14`, queries are executed via `supabase.from('render_jobs').select('*')` and `supabase.from('scheduled_posts').select('*')` using `supabase` from `@/lib/db`. If unmocked, `@supabase/supabase-js` dispatches an HTTP request to `/rest/v1/...`. The global fetch fallback in `test/setup.ts:152` returns `{ success: true, data: [] }`. PostgREST parses this body and returns `data = { success: true, data: [] }` (an Object, not an Array). In `dashboard/page.tsx:28`, `(jobs || []).map(...)` crashes with `TypeError: jobs.map is not a function`. In `planner/page.tsx:36`, `posts.filter(...)` crashes with `TypeError: posts.filter is not a function`.
- **Suggestion**:
  Worker must update `test/setup.ts` with the necessary mocks specified in `PROJECT.md` Feature 2 & Architecture Layer:
  1. Define default environment variables:
     ```typescript
     process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key';
     ```
  2. Mock `@/lib/supabase/client`:
     ```typescript
     vi.mock('@/lib/supabase/client', () => ({
       createClient: vi.fn(() => ({
         auth: {
           signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user' }, session: {} }, error: null }),
           signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user' }, session: {} }, error: null }),
           signOut: vi.fn().mockResolvedValue({ error: null }),
           getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
           getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
           onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
         },
         from: vi.fn(() => ({
           select: vi.fn().mockReturnThis(),
           order: vi.fn().mockReturnThis(),
           limit: vi.fn().mockResolvedValue({ data: [], error: null }),
           eq: vi.fn().mockReturnThis(),
           single: vi.fn().mockResolvedValue({ data: null, error: null }),
         })),
       })),
       getCustomCredentialsFromStorage: vi.fn(() => ({ isCustom: false })),
     }));
     ```
  3. Mock `@/lib/supabase/context`:
     ```typescript
     vi.mock('@/lib/supabase/context', () => {
       const mockContext = {
         supabase: {
           auth: {
             signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
             signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
             signOut: vi.fn().mockResolvedValue({ error: null }),
           },
         },
         url: 'https://agafustlankeieewtvck.supabase.co',
         anonKey: 'mock-anon-key',
         isCustom: false,
         status: 'connected',
         latencyMs: 42,
         schemaStatus: { isHealthy: true, tables: {}, missingTables: [] },
         setCustomConfig: vi.fn().mockResolvedValue({ success: true, reachable: true }),
         resetToDefault: vi.fn(),
         testConnection: vi.fn().mockResolvedValue({ success: true, reachable: true }),
         refreshStatus: vi.fn().mockResolvedValue(undefined),
       };
       return {
         SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
         useSupabase: () => mockContext,
       };
     });
     ```
  4. Mock `@/lib/db`:
     ```typescript
     vi.mock('@/lib/db', () => {
       const createQueryBuilder = () => ({
         select: vi.fn().mockReturnThis(),
         order: vi.fn().mockReturnThis(),
         limit: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
         eq: vi.fn().mockReturnThis(),
         single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
         then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
       });
       const mockDb = { from: vi.fn(() => createQueryBuilder()) };
       return {
         supabase: mockDb,
         supabaseAdmin: mockDb,
         getSupabase: () => mockDb,
         getSupabaseAdmin: () => mockDb,
       };
     });
     ```

---

### [Major] Finding 2: Self-Certifying Sanity Test with Zero Application Integration

- **What**: `test/sanity.test.ts` only mounts an artificial dummy component (`SanityComponent`) defined locally inside the test file, completely avoiding exercising any actual application client component, auth component, or hook.
- **Where**: `test/sanity.test.ts` (lines 5–20)
- **Why**: The sanity test self-certifies that React Testing Library renders in JSDOM, but leaves the entire application boundary untested.
- **Suggestion**: Add a test case in `test/sanity.test.ts` verifying that `createClient()` from `@/lib/supabase/client` and `useSupabase()` from `@/lib/supabase/context` can be called without error.

---

### [Minor] Finding 3: Fragile Request Handling in Global Fetch Fallback

- **What**: `test/setup.ts:122` accesses `input.url` assuming `input` is an object with a `url` property if it is not a string or `URL` instance.
- **Where**: `test/setup.ts:122`
- **Why**: If a non-standard or primitive object is passed to `fetch`, this can produce `undefined` URL parsing.
- **Suggestion**: Use `const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as any)?.url || String(input);`.

---

## 3. Observation

1. **Test Runner Command Execution**:
   - Command: `node ./node_modules/vitest/vitest.mjs run`
   - Result: Exit code 0, 1 test file passed (`test/sanity.test.ts`), 4 tests passed in 3.42s.
     ```
      RUN  v3.2.7 C:/Users/vigilare/.gemini/antigravity/scratch/clipped
      ✓ test/sanity.test.ts (4 tests) 46ms
      Test Files  1 passed (1)
           Tests  4 passed (4)
        Start at  03:27:58
        Duration  3.42s
     ```
2. **`test/setup.ts` Content**:
   - Contains: `@testing-library/jest-dom/vitest`, `next/navigation` mock (`useRouter`, `usePathname`, `useSearchParams`, `useParams`), `next/font` stubs, `ResizeObserver`, `IntersectionObserver`, `matchMedia`, `navigator.clipboard`, `HTMLMediaElement.prototype.play`/`pause`/`load`, `window.Audio`, and `fetch` mock for `/api/workspaces`, `/api/jobs`, `/api/settings/keys`, `/api/workflows/mission`.
   - Lines 1–157 contain **zero** occurrences of `supabase`, `@/lib/supabase/client`, `@/lib/supabase/context`, or `@/lib/db`.
3. **`lib/supabase/client.ts` & `@supabase/ssr`**:
   - `createClient()` calls `createBrowserClient(url, anonKey)`.
   - `anonKey` defaults to `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''`.
   - `@supabase/ssr/dist/main/createBrowserClient.js:19-21` throws:
     `if (!supabaseUrl || !supabaseKey) throw new Error("@supabase/ssr: Your project's URL and API key are required to create a Supabase client!...")`.
4. **`lib/supabase/context.tsx`**:
   - Line 264: `if (!context) throw new Error('useSupabase must be used within a SupabaseProvider')`.
5. **`app/(app)/dashboard/page.tsx` & `app/(app)/planner/page.tsx`**:
   - `dashboard/page.tsx:9-28`: `const { data: jobs } = await supabase.from('render_jobs').select('*')...; const videos = (jobs || []).map(...)`.
   - `planner/page.tsx:11-36`: `const { data: scheduled } = await supabase.from('scheduled_posts').select('*')...; const posts = scheduled || []; posts.filter(...)`.
   - Current fetch fallback returns `{ success: true, data: [] }`, causing PostgREST `data` to be an Object rather than an Array.

---

## 4. Logic Chain

1. *Observation 1 & 2*: Vitest runner executes cleanly and passes `test/sanity.test.ts`, verifying that the basic Node/JSDOM harness works.
2. *Observation 2 & 3*: Routes `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx` call `createClient()` from `@/lib/supabase/client` on initial render.
3. *Observation 3*: Without `NEXT_PUBLIC_SUPABASE_ANON_KEY` or a mock for `@/lib/supabase/client`, `createBrowserClient` in `@supabase/ssr` throws an uncaught `Error` during component initialization.
4. *Observation 4*: Route `app/(app)/settings/page.tsx` calls `useSupabase()` on render. Without a context mock, it throws `Error: useSupabase must be used within a SupabaseProvider`.
5. *Observation 5*: Routes `app/(app)/dashboard/page.tsx` and `app/(app)/planner/page.tsx` query `supabase` from `@/lib/db`. Because `test/setup.ts` fetch mock returns `{ success: true, data: [] }` rather than an Array, `jobs.map` and `posts.filter` throw type errors.
6. *Conclusion*: Because Milestone 2 cannot proceed without these mocks, Milestone 1 is incomplete and contains a facade/shortcut violation. Changes must be requested.

---

## 5. Caveats

- Vitest runner configuration (`vitest.config.mts`) and package dependencies (`package.json`) are correct and properly set up.
- Media playback polyfills (`HTMLMediaElement`, `window.Audio`) and `next/navigation` mocks in `test/setup.ts` are well-formed and sufficient for the audio preview in `settings` and dynamic mission routes.
- The failure is strictly localized to the omitted Supabase and database mock harness.

---

## 6. Conclusion

The implementation of Milestone 1 provides a functioning base runner, but **fails to deliver the complete mock harness required by R2 and PROJECT.md**. Specifically, the omission of Supabase client, SupabaseProvider, and `@/lib/db` mocks leaves downstream Milestone 2 core routes unable to render in headless isolation.

**Verdict**: **REQUEST_CHANGES**

---

## 7. Verification Method

To verify the resolution of these findings after Worker fixes them:
1. Ensure `test/setup.ts` includes the required mocks for `@/lib/supabase/client`, `@/lib/supabase/context`, and `@/lib/db`, as well as fallback `process.env.NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Run the unit test suite:
   ```bash
   node ./node_modules/vitest/vitest.mjs run
   ```
3. Confirm all tests pass with exit code 0.
4. Verify that importing and calling `createClient()` from `@/lib/supabase/client`, `useSupabase()` from `@/lib/supabase/context`, and `supabase.from('render_jobs').select('*')` from `@/lib/db` in a test file succeeds without throwing.
