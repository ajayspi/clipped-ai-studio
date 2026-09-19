# Explorer 2 Investigation Report: Supabase Context & Settings Mocks

**Explorer**: Explorer 2 (`explorer_m1_remediation_2`)  
**Milestone**: Milestone 1 Remediation (Gate 1 Failure Resolution)  
**Subject**: Supabase Context (`lib/supabase/context.tsx`) & Settings Page (`app/(app)/settings/page.tsx`) Mock Harness Formulation  
**Date**: 2026-09-17  

---

## 1. Executive Summary

During Gate 1 review, Reviewer 2 identified a critical mock harness deficiency in `test/setup.ts`. While the test runner passed `test/sanity.test.ts`, `test/setup.ts` lacked any mock for `@/lib/supabase/context`. Consequently, attempting to mount `app/(app)/settings/page.tsx` causes an immediate uncaught exception on line 328:
```
Error: useSupabase must be used within a SupabaseProvider
```
Furthermore, attempting to wrap `<SettingsPage />` with the real `<SupabaseProvider>` from `lib/supabase/context.tsx` fails because `SupabaseProvider` invokes `createClient()` from `lib/supabase/client.ts`, which throws when `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing in headless test environments:
```
Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

This report provides the complete analysis of every property and method consumed from `useSupabase()` by `<SettingsPage />`, the full type contract of `SupabaseContextValue`, and the exact, drop-in mock implementation for `@/lib/supabase/context` (`SupabaseProvider`, `useSupabase`).

---

## 2. Codebase Inspection & Line-by-Line Evidence

### 2.1 Consumer: `app/(app)/settings/page.tsx`

In `app/(app)/settings/page.tsx`, `useSupabase()` is imported and invoked at the component top level:

- **Line 38**:
  ```typescript
  import { useSupabase, TestConnectionResult } from "@/lib/supabase/context";
  ```
- **Lines 318–328**:
  ```typescript
  // Supabase Context & State
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

Notice that `useSupabase()` is invoked **before** the initial loading check (`if (loading) return <Loader2 ... />` at line 644). If `useSupabase()` throws, the component will crash on render before even mounting its fallback spinner.

### 2.2 Provider & Context Definition: `lib/supabase/context.tsx`

`lib/supabase/context.tsx` defines the context interface, default behaviors, and provider:

- **Lines 13–48**:
  ```typescript
  export type SupabaseConnectionStatus = 'connected' | 'default' | 'unreachable' | 'testing';

  export interface TableStatus {
    exists: boolean;
    error?: string | null;
  }

  export interface SchemaStatus {
    isHealthy: boolean;
    tables: Record<string, TableStatus>;
    missingTables: string[];
  }

  export interface TestConnectionResult {
    success: boolean;
    reachable: boolean;
    latencyMs: number | null;
    url?: string;
    schema?: SchemaStatus;
    message: string;
    error?: string;
  }

  export interface SupabaseContextValue {
    supabase: SupabaseClient;
    url: string;
    anonKey: string;
    isCustom: boolean;
    status: SupabaseConnectionStatus;
    latencyMs: number | null;
    schemaStatus: SchemaStatus | null;
    setCustomConfig: (url: string, anonKey: string) => Promise<TestConnectionResult>;
    resetToDefault: () => void;
    testConnection: (url?: string, anonKey?: string) => Promise<TestConnectionResult>;
    refreshStatus: () => Promise<void>;
  }
  ```
- **Lines 67–81**:
  ```typescript
  export function SupabaseProvider({ children }: { children: React.ReactNode }) {
    const defaultUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co').trim();
    const defaultAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    const [url, setUrl] = useState<string>(defaultUrl);
    const [anonKey, setAnonKey] = useState<string>(defaultAnonKey);
    // ...
    const supabase = useMemo(() => {
      return createClient(url, anonKey);
    }, [url, anonKey]);
  ```
- **Lines 262–268**:
  ```typescript
  export function useSupabase(): SupabaseContextValue {
    const context = useContext(SupabaseContext);
    if (!context) {
      throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
  }
  ```

---

## 3. Comprehensive Analysis of Consumed Properties & Methods

The following table details every property and method consumed from `useSupabase()` by `<SettingsPage />`, including its type, usage in `page.tsx`, and required mock behavior:

| Property / Method | Type Signature | Usage in `SettingsPage` | Required Mock Behavior |
|---|---|---|---|
| **`url`** (destructured as `activeSupabaseUrl`) | `string` | - Line 330: `const [dbUrlInput, setDbUrlInput] = useState(activeSupabaseUrl);`<br>- Lines 351–354: Syncs state in `useEffect` when `activeSupabaseUrl` updates.<br>- Line 1014: Rendered in active endpoint display banner.<br>- Line 1017: Passed to `handleCopyUrl(activeSupabaseUrl)` on "Copy URL" button click. | Return standard Supabase URL string, e.g. `'https://agafustlankeieewtvck.supabase.co'`. |
| **`anonKey`** (destructured as `activeSupabaseAnonKey`) | `string` | - Line 331: `const [dbKeyInput, setDbKeyInput] = useState(activeSupabaseAnonKey);`<br>- Lines 351–354: Syncs state in `useEffect` when `activeSupabaseAnonKey` updates.<br>- Line 1074: Rendered as input value for Anon Key field. | Return valid JWT mock string, e.g. `'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key'`. |
| **`isCustom`** | `boolean` | - Line 988: Conditional badge rendering: `isCustom ? (🟢 Custom Connected) : (🔵 Default Cloud Project)`. | Return `false` (default) or boolean. |
| **`status`** (destructured as `supabaseStatus`) | `SupabaseConnectionStatus` (`'connected'` \| `'default'` \| `'unreachable'` \| `'testing'`) | - Line 979: Evaluates `supabaseStatus === "testing"`.<br>- Line 983: Evaluates `supabaseStatus === "unreachable"`.<br>- Line 996: Renders `🔵 Default Cloud Project` when `'default'` or `'connected'` with `!isCustom`. | Return `'connected'` or `'default'`. |
| **`latencyMs`** | `number \| null` | - Line 1000: Conditionally renders latency badge `{latencyMs}ms` when `latencyMs !== null`. | Return a numeric value (e.g. `42`) to verify badge rendering, or `null`. |
| **`schemaStatus`** | `SchemaStatus \| null` | - Lines 1152–1155: Renders status for 6 core tables (`users`, `videos`, `render_jobs`, `api_credits`, `settings`, `scheduled_posts`).<br>- `tableInfo = (dbTestResult?.schema \|\| schemaStatus)?.tables?.[table.name]`<br>- `isMissing = (dbTestResult?.schema \|\| schemaStatus)?.missingTables?.includes(table.name)`<br>- Renders `Ready` badge if table exists and is not missing. | Return `{ isHealthy: true, tables: { users: { exists: true }, videos: { exists: true }, render_jobs: { exists: true }, api_credits: { exists: true }, settings: { exists: true }, scheduled_posts: { exists: true } }, missingTables: [] }`. |
| **`testConnection`** | `(url?: string, anonKey?: string) => Promise<TestConnectionResult>` | - Line 569: `const result = await testConnection(dbUrlInput, dbKeyInput)` in `handleTestDbConnection()`.<br>- Line 571: Reads `result.reachable`, `result.schema?.isHealthy`, `result.message`. | Return `vi.fn().mockResolvedValue({ success: true, reachable: true, latencyMs: 42, url: '...', schema: { isHealthy: true, tables: { ... }, missingTables: [] }, message: 'Connected successfully to Supabase.' })`. |
| **`setCustomConfig`** | `(url: string, anonKey: string) => Promise<TestConnectionResult>` | - Line 596: `const result = await setCustomConfig(dbUrlInput, dbKeyInput)` in `handleSaveDbConnection()`.<br>- Line 598: Reads `result.reachable`, `result.message`. | Return `vi.fn().mockResolvedValue({ success: true, reachable: true, latencyMs: 42, url: '...', schema: { isHealthy: true, tables: { ... }, missingTables: [] }, message: 'Custom Supabase credentials saved and active across Studio!' })`. |
| **`resetToDefault`** | `() => void` | - Line 620: Calls `resetToDefault()` in `handleResetDbConnection()`.<br>- Clears test results and sets feedback banner. | Return `vi.fn()`. |
| **`supabase`** | `SupabaseClient` | - Required field on `SupabaseContextValue`. Used by auth listeners, session queries, and data components. | Mock object containing `auth` (`signInWithPassword`, `signUp`, `signOut`, `getSession`, `getUser`, `onAuthStateChange`) and `from` (chainable `select`, `order`, `limit`, `eq`, `single`). |
| **`refreshStatus`** | `() => Promise<void>` | - Required field on `SupabaseContextValue`. Called to re-verify status on demand. | Return `vi.fn().mockResolvedValue(undefined)`. |
| **`SupabaseProvider`** | `React.ComponentType<{ children: React.ReactNode }>` | - Top-level provider imported in `app/layout.tsx:5` and used around route components. | Return passthrough component: `({ children }: { children: React.ReactNode }) => children`. |

---

## 4. Exact Mock Implementation for `@/lib/supabase/context`

The following code block is the exact, drop-in mock implementation formulated for `test/setup.ts`:

```typescript
// ─── Supabase Context & Provider Mock ─────────────────────────────────────────
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

### 4.1 Global Fetch Fallback Augmentation for Connection Testing

In addition to mocking `@/lib/supabase/context`, if any component or hook dispatches an HTTP POST request to `/api/settings/supabase/test` via `fetch`, `test/setup.ts`'s global `fetch` mock should also handle it:

```typescript
if (url.includes('/api/settings/supabase/test')) {
  return new Response(
    JSON.stringify({
      success: true,
      reachable: true,
      latencyMs: 42,
      schema: {
        isHealthy: true,
        tables: {
          users: { exists: true },
          videos: { exists: true },
          render_jobs: { exists: true },
          api_credits: { exists: true },
          settings: { exists: true },
          scheduled_posts: { exists: true },
        },
        missingTables: [],
      },
      message: 'Connected successfully to Supabase.',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

---

## 5. Verification Assessment: Mounting `<SettingsPage />`

With this mock in place, tracing the lifecycle of `<SettingsPage />`:

1. **Mount & State Initialization**:
   - `useSupabase()` returns `mockContext`.
   - `dbUrlInput` is initialized to `'https://agafustlankeieewtvck.supabase.co'`.
   - `dbKeyInput` is initialized to `'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key'`.
   - Initial loading state renders `<Loader2 />`.
2. **Effects & Key Fetching**:
   - `fetchKeys()` runs and receives `{ success: true, keys: {} }` from `test/setup.ts`.
   - `loading` becomes `false`.
3. **Render Tabs & UI**:
   - Renders tab buttons including `Database & Supabase`.
   - Switching to `Database & Supabase` tab evaluates:
     - `supabaseStatus` (`'connected'`) & `!isCustom` -> displays `🔵 Default Cloud Project`.
     - `latencyMs` (`42`) -> displays `42ms` badge.
     - `activeSupabaseUrl` -> displays active URL.
     - `schemaStatus.tables` for `users`, `videos`, `render_jobs`, `api_credits`, `settings`, `scheduled_posts` -> all display `Ready`.
4. **Interactive Actions**:
   - "Test Connection": calls `testConnection(dbUrlInput, dbKeyInput)`, resolves `result.reachable = true`, sets feedback message.
   - "Save & Apply Connection": calls `setCustomConfig(dbUrlInput, dbKeyInput)`, resolves `result.reachable = true`, sets success feedback.
   - "Reset to Default": calls `resetToDefault()`, resets feedback.

Zero uncaught exceptions occur; all DOM assertions can safely test elements across tabs.
