# Milestone 1 Remediation Handoff: Supabase Context & Settings Mocks

**Agent**: Explorer 2 (`explorer_m1_remediation_2`)  
**Task**: Milestone 1 Remediation — Investigate `useSupabase()` consumption in `app/(app)/settings/page.tsx` and formulate exact mock implementation for `@/lib/supabase/context`  
**Date**: 2026-09-17  

---

## 1. Observation

1. **`app/(app)/settings/page.tsx`**:
   - Line 38 imports:
     ```typescript
     import { useSupabase, TestConnectionResult } from "@/lib/supabase/context";
     ```
   - Lines 318–328 destructure `useSupabase()`:
     ```typescript
     const {
       url: activeSupabaseUrl,
       anonKey: activeSupabaseAnonKey,
       isCustom,
       status: supabaseStatus,
       latencyMs,
       schemaStatus,
       setCustomConfig,
       resetToDefault,
       testConnection,
     } = useSupabase();
     ```
   - Line 330: `const [dbUrlInput, setDbUrlInput] = useState(activeSupabaseUrl);`
   - Line 331: `const [dbKeyInput, setDbKeyInput] = useState(activeSupabaseAnonKey);`
   - Lines 351–354: Syncs state when `activeSupabaseUrl` or `activeSupabaseAnonKey` changes in `useEffect`.
   - Line 569: `const result = await testConnection(dbUrlInput, dbKeyInput);`
   - Line 596: `const result = await setCustomConfig(dbUrlInput, dbKeyInput);`
   - Line 620: `resetToDefault();`
   - Lines 979–998: Renders status badges based on `supabaseStatus` (`"testing"` | `"unreachable"`) and `isCustom`.
   - Line 1000: `latencyMs !== null && (...)`
   - Line 1014: Renders `{activeSupabaseUrl}`.
   - Lines 1152–1155: Renders table health checklist iterating over 6 core tables (`users`, `videos`, `render_jobs`, `api_credits`, `settings`, `scheduled_posts`) accessing `(dbTestResult?.schema || schemaStatus)?.tables?.[table.name]` and `missingTables`.

2. **`lib/supabase/context.tsx`**:
   - Lines 36–48: `SupabaseContextValue` defines 11 properties:
     - `supabase: SupabaseClient`
     - `url: string`
     - `anonKey: string`
     - `isCustom: boolean`
     - `status: SupabaseConnectionStatus`
     - `latencyMs: number | null`
     - `schemaStatus: SchemaStatus | null`
     - `setCustomConfig: (url: string, anonKey: string) => Promise<TestConnectionResult>`
     - `resetToDefault: () => void`
     - `testConnection: (url?: string, anonKey?: string) => Promise<TestConnectionResult>`
     - `refreshStatus: () => Promise<void>`
   - Line 67: `export function SupabaseProvider({ children }: { children: React.ReactNode })`
   - Lines 262–268:
     ```typescript
     export function useSupabase(): SupabaseContextValue {
       const context = useContext(SupabaseContext);
       if (!context) {
         throw new Error('useSupabase must be used within a SupabaseProvider');
       }
       return context;
     }
     ```

3. **`test/setup.ts`**:
   - Lines 1–157 currently configure Next.js routing mocks, Next.js font mocks, browser DOM polyfills, and a basic fetch mock.
   - Contains zero mocks for `@/lib/supabase/context`, `@/lib/supabase/client`, or fallback `process.env.NEXT_PUBLIC_SUPABASE_*` variables.

4. **`test/stress-test.test.tsx` & `test/sanity.test.ts`**:
   - Current tests pass (29/29 passed in Vitest), but neither test exercises client route components (`<SettingsPage />`, `<LoginPage />`, `<RegisterPage />`), masking the missing context mock until Milestone 2 route rendering tests are executed.

---

## 2. Logic Chain

1. *From Observation 1 & 2*: `SettingsPage` calls `useSupabase()` synchronously at top level before its loading gate check. Without a provider or mock, `useSupabase()` throws `Error: useSupabase must be used within a SupabaseProvider`.
2. *From Observation 2*: If a test attempted to wrap `<SettingsPage />` in the real `<SupabaseProvider>`, lines 67–81 of `lib/supabase/context.tsx` invoke `createClient(url, anonKey)` from `lib/supabase/client.ts`. Without `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`, `@supabase/ssr` throws `Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!`.
3. *From Observation 1*: `SettingsPage` accesses `url`, `anonKey`, `isCustom`, `status`, `latencyMs`, `schemaStatus`, `setCustomConfig`, `resetToDefault`, and `testConnection`. If any of these are missing or return malformed structures, accessing `tables` or calling `testConnection()` / `setCustomConfig()` throws `TypeError`.
4. *From Observation 1 & 2*: In addition to `SettingsPage`'s directly destructured fields, `SupabaseContextValue` also requires `supabase` and `refreshStatus`, which are consumed by auth status checks and other studio components.
5. *From Observation 3*: Adding a complete mock for `@/lib/supabase/context` in `test/setup.ts` providing `SupabaseProvider` (passthrough component) and `useSupabase` (returning a fully populated `mockContext`) allows `<SettingsPage />` to mount and render all tabs cleanly in headless JSDOM environments.

---

## 3. Caveats

- **Scope Boundary**: This investigation focuses specifically on `lib/supabase/context.tsx` and `app/(app)/settings/page.tsx`. Explorer 1 investigates `@/lib/supabase/client` and `@/lib/db`.
- **Custom Config State Isolation**: The mock returns static mock values by default. If a downstream test specifically mutates credentials via `setCustomConfig`, the mock function is a `vi.fn()` spy that resolves successfully; if a test requires persistent in-memory state switching across re-renders, the test can override the mock with `vi.mocked(useSupabase)`.
- **Framer Motion in JSDOM**: `SettingsPage` uses `framer-motion` (`AnimatePresence`, `motion.div`). Under Vitest JSDOM with React 19, `framer-motion` renders standard DOM nodes without throwing.

---

## 4. Conclusion

To enable `<SettingsPage />` (and any component wrapped in `<SupabaseProvider>` or consuming `useSupabase()`) to mount cleanly in headless test environments, Worker must add the following mock block to `test/setup.ts`:

```typescript
// Supabase Context & Provider Mock
vi.mock('@/lib/supabase/context', () => {
  const defaultUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
  const defaultAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key';

  const defaultSchemaStatus = {
    isHealthy: true,
    tables: {
      users: { exists: true },
      videos: { exists: true },
      render_jobs: { exists: true },
      api_credits: { exists: true },
      settings: { exists: true },
      scheduled_posts: { exists: true },
    },
    missingTables: [] as string[],
  };

  const defaultConnectionResult = {
    success: true,
    reachable: true,
    latencyMs: 42,
    url: defaultUrl,
    schema: defaultSchemaStatus,
    message: 'Connected successfully to Supabase.',
  };

  const mockContext = {
    supabase: {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: 'mock-user', email: 'test@example.com' }, session: {} },
          error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: 'mock-user', email: 'test@example.com' }, session: {} },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'mock-user', email: 'test@example.com' } },
          error: null,
        }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
    url: defaultUrl,
    anonKey: defaultAnonKey,
    isCustom: false,
    status: 'connected' as const,
    latencyMs: 42,
    schemaStatus: defaultSchemaStatus,
    setCustomConfig: vi.fn().mockResolvedValue({
      ...defaultConnectionResult,
      message: 'Custom Supabase credentials saved and active across Studio!',
    }),
    resetToDefault: vi.fn(),
    testConnection: vi.fn().mockResolvedValue(defaultConnectionResult),
    refreshStatus: vi.fn().mockResolvedValue(undefined),
  };

  return {
    SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
    useSupabase: () => mockContext,
  };
});
```

Additionally, `test/setup.ts`'s global `fetch` mock should handle `/api/settings/supabase/test` returning `defaultConnectionResult`.

---

## 5. Verification Method

To independently verify the mock implementation once applied by Worker:

1. **Test Runner Command**:
   ```bash
   node ./node_modules/vitest/vitest.mjs run
   ```
2. **Settings Component Mount Assertion**:
   Create or run a test case in `test/sanity.test.ts` or a route test file:
   ```typescript
   import React from 'react';
   import { render, screen } from '@testing-library/react';
   import SettingsPage from '@/app/(app)/settings/page.tsx';

   it('mounts SettingsPage without throwing useSupabase provider errors', async () => {
     render(<SettingsPage />);
     // Initially renders loading spinner, then resolves keys
     expect(document.body).toBeDefined();
   });
   ```
3. **Invalidation Conditions**:
   - If `render(<SettingsPage />)` throws `useSupabase must be used within a SupabaseProvider`, the context mock is missing or failing to resolve.
   - If `render(<SettingsPage />)` throws `Your project's URL and API key are required`, `lib/supabase/client` or fallback env vars are missing.
   - If `testConnection()` or table health rendering throws `Cannot read properties of undefined (reading 'tables')`, the schemaStatus mock structure is incomplete.
