# Milestone 1 Remediation: Supabase Client & Auth Mock Strategy Report

**Explorer**: Explorer 1 (`explorer_m1_remediation_1`)  
**Mission**: Milestone 1 Remediation (Supabase Client & Auth Mocks)  
**Target Files**:
- `lib/supabase/client.ts`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `test/setup.ts`
- `test/pages/core/auth.test.tsx` (Downstream M2 verification)

---

## Executive Summary

During Gate 1 review, Reviewer 2 identified an integrity violation / facade mock harness: while `test/sanity.test.ts` passed, `test/setup.ts` completely omitted Supabase client mocks and environment variables. As a result, both auth pages (`app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx`) immediately crash upon mounting in JSDOM due to `@supabase/ssr` throwing an uncaught exception when `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` is undefined (`anonKey = ''`). Furthermore, without mocking `@/lib/supabase/client`, interactive operations (`signInWithPassword`, `signUp`) attempt real HTTP network calls against unconfigured endpoints, returning incompatible JSON structures from the global fetch fallback and crashing token deserializers.

This report documents the exact failure mechanisms down to source code line numbers and presents a comprehensive, battle-tested mock strategy for `process.env`, `@/lib/supabase/client`, and auth interactions.

---

## 1. Failure Mechanism Analysis

### 1.1 Synchronous Mount Crash Trace
In both `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx`:

```tsx
// app/(auth)/login/page.tsx:9-11
export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient() // <--- Synchronous execution during component render
```

```tsx
// app/(auth)/register/page.tsx:9-11
export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient() // <--- Synchronous execution during component render
```

Tracing `createClient()` into `lib/supabase/client.ts`:

1. **Storage Extraction**:
   ```typescript
   // lib/supabase/client.ts:48
   const custom = getCustomCredentialsFromStorage();
   ```
   In JSDOM, `typeof window !== 'undefined'`, so `localStorage.getItem('clipped_custom_supabase_config')` returns `null`. `getCustomCredentialsFromStorage()` returns `{ isCustom: false }`.

2. **URL Resolution**:
   ```typescript
   // lib/supabase/client.ts:49-54
   const url = (
     customUrl ||
     custom.url ||
     process.env.NEXT_PUBLIC_SUPABASE_URL ||
     'https://agafustlankeieewtvck.supabase.co'
   ).trim();
   ```
   Even if `NEXT_PUBLIC_SUPABASE_URL` is undefined, `url` falls back to the hardcoded default `'https://agafustlankeieewtvck.supabase.co'`.

3. **Anon Key Resolution (The Failure Point)**:
   ```typescript
   // lib/supabase/client.ts:56-61
   const anonKey = (
     customAnonKey ||
     custom.anonKey ||
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
     ''
   ).trim();
   ```
   In the test runner environment (`vitest run`), `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` is undefined. `anonKey` therefore resolves to the empty string `''`.

4. **SSR Client Instantiation**:
   ```typescript
   // lib/supabase/client.ts:63-67
   const cacheKey = `${url}::${anonKey}`;
   if (!clientCache.has(cacheKey)) {
     const client = createBrowserClient(url, anonKey); // <--- Invoked with anonKey = ''
     clientCache.set(cacheKey, client);
   }
   ```

5. **Fatal Exception in `@supabase/ssr`**:
   In `node_modules/@supabase/ssr/dist/main/createBrowserClient.js:19-21`:
   ```javascript
   if (!supabaseUrl || !supabaseKey) {
       throw new Error(`@supabase/ssr: Your project's URL and API key are required to create a Supabase client!\n\nCheck your Supabase project's API settings to find these values\n\nhttps://supabase.com/dashboard/project/_/settings/api`);
   }
   ```
   Because `supabaseKey` is `''` (falsy), `@supabase/ssr` immediately throws an unhandled `Error`. Because this occurs inside the top-level body of `<LoginPage />` and `<RegisterPage />`, React Testing Library's `render(<LoginPage />)` crashes synchronously with an unhandled exception before any DOM element is rendered.

---

### 1.2 Post-Mount Interaction Failure Modes (If Env Vars Were Added Without Module Mocks)
If a naive fix only defined `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` without mocking `@/lib/supabase/client`:

1. **Unwanted Real Network Requests**:
   `createBrowserClient` creates a real `@supabase/supabase-js` instance with GoTrue auth client. When the user clicks "Sign In" or "Sign Up":
   - `LoginPage.tsx:22`: `await supabase.auth.signInWithPassword({ email, password })`
   - `RegisterPage.tsx:25`: `await supabase.auth.signUp({ email, password })`
   These dispatch live HTTP POST requests to `https://agafustlankeieewtvck.supabase.co/auth/v1/token?grant_type=password` or `/auth/v1/signup`.

2. **Payload Deserialization Crash**:
   In `test/setup.ts:152`, the fallback fetch handler returns `{ success: true, data: [] }`.
   GoTrue expects a response structure containing `{ access_token, token_type, user, expires_in }`. Receiving `{ success: true, data: [] }` causes GoTrue internal validation to fail, setting corrupted state or throwing unhandled errors.

3. **Background Timer & Storage Leaks**:
   `createBrowserClient` activates automatic token refresh timers (`autoRefreshToken: true`) and cookie sync listeners. In headless JSDOM environments, these unresolved background timers prevent Vitest worker threads from exiting cleanly ("Worker process failed to exit gracefully").

4. **Zero Spyability / Programmability**:
   Test suites cannot easily spy on or mock return values of `supabase.auth.signInWithPassword` or `supabase.auth.signUp` (e.g. testing error messages like `"Invalid email or password."` or `"User already registered"`).

---

## 2. Comprehensive Mock Strategy

To guarantee robust, isolated, and highly testable behavior across all auth routes and client interactions, a 3-tiered strategy is required:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: ENVIRONMENT VARIABLES                   │
│  Sets valid fallback URLs and 3-part base64 JWT tokens on process.env   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    TIER 2: MODULE MOCK (@/lib/supabase/client)         │
│  - createClient(): returns shared, spyable mock client                 │
│  - getCustomCredentialsFromStorage(): spyable storage helper           │
│  - Exported constants: CUSTOM_CONFIG_STORAGE_KEY, COOKIE_KEYs          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    TIER 3: AUTH & POSTGREST INTERFACES                 │
│  - auth: signInWithPassword, signUp, signOut, getSession, getUser      │
│  - from(): chainable query builder supporting .select(), .single()     │
│  - storage: mock bucket operations (upload, getPublicUrl)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Tier 1: Environment Variables Specification
At the very top of `test/setup.ts`, define safe default values. The anon key must follow the valid 3-part base64 JWT structure used across Supabase:

```typescript
// test/setup.ts
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';

process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTIxMjksImV4cCI6MjEwMzY4ODEyOX0.Wt6whskptxFUlwAmrtIchFSIPWiDAl0DbVEiC1uvCqc';

process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA';
```

**Rationale**:
- Even if any module reads `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`, it will never be empty.
- Avoids token decoding crashes in any JWT utility.

---

### Tier 2 & 3: `@/lib/supabase/client` Mock Specification

The mock must satisfy all imports and consumer contracts from:
1. `app/(auth)/login/page.tsx` (`createClient`)
2. `app/(auth)/register/page.tsx` (`createClient`)
3. `lib/supabase/context.tsx` (`createClient`, `CUSTOM_CONFIG_STORAGE_KEY`, `CUSTOM_URL_COOKIE_KEY`, `CUSTOM_ANON_KEY_COOKIE_KEY`)
4. `lib/supabase/server.ts` & `lib/supabase/middleware.ts` (`CUSTOM_URL_COOKIE_KEY`, `CUSTOM_ANON_KEY_COOKIE_KEY`)
5. Unit tests wanting to spy on or mock return values (`createClient()`).

#### Query Builder Details
Must support chaining: `.select()`, `.insert()`, `.update()`, `.delete()`, `.eq()`, `.neq()`, `.is()`, `.in()`, `.order()`, `.limit()`, `.range()`, `.single()`, `.maybeSingle()`, and `then`able resolution.

#### Auth Details
Must return mock functions with default successful resolutions:
- `signInWithPassword`: resolves `{ data: { user: { id: 'mock-user-123', email: 'test@example.com' }, session: { access_token: 'mock-token' } }, error: null }`
- `signUp`: resolves `{ data: { user: { id: 'mock-user-123', email: 'test@example.com' }, session: null }, error: null }`
- `signOut`: resolves `{ error: null }`
- `getSession`: resolves `{ data: { session: null }, error: null }`
- `getUser`: resolves `{ data: { user: { id: 'mock-user-123', email: 'test@example.com' } }, error: null }`
- `onAuthStateChange`: returns `{ data: { subscription: { id: 'mock-sub', unsubscribe: vi.fn() } } }`
- `resetPasswordForEmail`: resolves `{ data: {}, error: null }`
- `updateUser`: resolves `{ data: { user: { id: 'mock-user-123' } }, error: null }`

---

## 3. Concrete Implementation in `test/setup.ts`

Here is the exact code block to be inserted into `test/setup.ts`:

```typescript
// ============================================================================
// Supabase Environment Variables Fallback
// ============================================================================
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTIxMjksImV4cCI6MjEwMzY4ODEyOX0.Wt6whskptxFUlwAmrtIchFSIPWiDAl0DbVEiC1uvCqc';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA';

// ============================================================================
// Supabase Client Mock (@/lib/supabase/client)
// ============================================================================
vi.mock('@/lib/supabase/client', () => {
  const createQueryBuilder = () => {
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      then: (resolve: any) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    };
    return builder;
  };

  const mockAuth = {
    signInWithPassword: vi.fn().mockResolvedValue({
      data: {
        user: { id: 'mock-user-123', email: 'test@example.com' },
        session: { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token' },
      },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: {
        user: { id: 'mock-user-123', email: 'test@example.com' },
        session: null,
      },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'mock-user-123', email: 'test@example.com' } },
      error: null,
    }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { id: 'mock-sub-1', unsubscribe: vi.fn() } },
    })),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'mock-user-123', email: 'test@example.com' } },
      error: null,
    }),
  };

  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'mock-file.mp4' }, error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock.storage/mock-file.mp4' } })),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  };

  const mockClientInstance = {
    auth: mockAuth,
    from: vi.fn(() => createQueryBuilder()),
    storage: mockStorage,
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  };

  return {
    createClient: vi.fn(() => mockClientInstance),
    getCustomCredentialsFromStorage: vi.fn(() => ({
      url: undefined,
      anonKey: undefined,
      isCustom: false,
    })),
    CUSTOM_CONFIG_STORAGE_KEY: 'clipped_custom_supabase_config',
    CUSTOM_URL_COOKIE_KEY: 'clipped_custom_supabase_url',
    CUSTOM_ANON_KEY_COOKIE_KEY: 'clipped_custom_supabase_anon_key',
  };
});
```

---

## 4. Test Verification Patterns for Milestone 2

When Milestone 2 implements `test/pages/core/auth.test.tsx`, the tests will exercise the following scenarios against this mock harness:

### 4.1 Login Route Mount & Positive Submission
```tsx
it('renders login form and authenticates successfully', async () => {
  const router = useRouter();
  const supabase = createClient();
  render(<LoginPage />);

  expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(router.push).toHaveBeenCalledWith('/dashboard');
    expect(router.refresh).toHaveBeenCalled();
  });
});
```

### 4.2 Login Route Error Handling
```tsx
it('displays error banner when authentication fails', async () => {
  const supabase = createClient();
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
    data: { user: null as any, session: null as any },
    error: { message: 'Invalid email or password.' } as any,
  });

  render(<LoginPage />);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@example.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
  });
});
```

### 4.3 Register Route Mount & Positive Submission
```tsx
it('renders registration form and registers successfully', async () => {
  const supabase = createClient();
  render(<RegisterPage />);

  expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newuser@example.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

  await waitFor(() => {
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'secret123',
    });
    expect(screen.getByText(/success! please check your email/i)).toBeInTheDocument();
  });
});
```

### 4.4 Register Route Error Handling
```tsx
it('displays error banner when registration fails', async () => {
  const supabase = createClient();
  vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
    data: { user: null as any, session: null as any },
    error: { message: 'User already registered' } as any,
  });

  render(<RegisterPage />);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'exists@example.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

  await waitFor(() => {
    expect(screen.getByText('User already registered')).toBeInTheDocument();
  });
});
```

---

## 5. Peer Subsystem Integration Checks

| Dependency | Interaction with `@/lib/supabase/client` Mock | Status / Compatibility |
|---|---|---|
| `lib/supabase/context.tsx` | Imports `createClient` and cookie/storage constants. `SupabaseProvider` calls `createClient(url, anonKey)` without throwing. | Fully compatible; constants and client mock prevent provider crashes. |
| `lib/supabase/server.ts` | Imports `CUSTOM_URL_COOKIE_KEY` and `CUSTOM_ANON_KEY_COOKIE_KEY`. | Fully compatible. |
| `lib/supabase/middleware.ts` | Imports `CUSTOM_URL_COOKIE_KEY` and `CUSTOM_ANON_KEY_COOKIE_KEY`. | Fully compatible. |
| `app/api/settings/supabase/route.ts` | Imports `CUSTOM_URL_COOKIE_KEY` and `CUSTOM_ANON_KEY_COOKIE_KEY`. | Fully compatible. |
| `app/(app)/settings/page.tsx` | Uses `useSupabase()` hook. Requires peer mock for `@/lib/supabase/context` (addressed by Reviewer 2 & peer explorer). | Handled cleanly in tandem. |
| `app/(app)/dashboard` & `planner` | Uses `@/lib/db`. Requires peer mock for `@/lib/db` (addressed by Reviewer 2 & peer explorer). | Handled cleanly in tandem. |

This complete strategy gives the implementation worker the exact code needed to remediate Milestone 1 and unblock Milestone 2.
