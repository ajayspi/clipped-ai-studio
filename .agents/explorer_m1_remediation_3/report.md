# Milestone 1 Remediation Investigation Report: Database & Server Component Mocks

**Explorer**: Explorer 3 (`explorer_m1_remediation_3`)  
**Scope**: Database & Server Component Mocks (`@/lib/db`, `dashboard/page.tsx`, `planner/page.tsx`, `test/setup.ts`)  
**Status**: COMPLETE  
**Date**: 2026-09-17  

---

## 1. Executive Summary

Milestone 1 Gate Review failed because `test/setup.ts` omitted Supabase client, context, and database mocks. Specifically, Server Components `app/(app)/dashboard/page.tsx` and `app/(app)/planner/page.tsx` query `@/lib/db` via chained query builders (`supabase.from(...).select(...).order(...).limit(...)` and `supabase.from(...).select(...).order(...)`).

Without a dedicated `@/lib/db` mock:
1. Unmocked `@supabase/supabase-js` dispatches network requests to PostgREST.
2. The global fetch fallback in `test/setup.ts:152` returns `{ success: true, data: [] }` (an Object, not an Array).
3. PostgREST returns this Object directly as `data`.
4. In `dashboard/page.tsx:28`, `(jobs || []).map(...)` crashes with `TypeError: jobs.map is not a function`.
5. In `planner/page.tsx:36`, `posts.filter(...)` crashes with `TypeError: posts.filter is not a function`.

Furthermore, Reviewer 2's proposed mock contained a critical defect: Reviewer 2 implemented `.limit()` as `limit: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null }))`. Because `.limit()` returned a Promise rather than returning the query builder itself, any subsequent chaining (such as `query.eq(...)` in `app/api/jobs/route.ts:19`) crashes with `TypeError: query.eq is not a function`. In addition, `insert`, `update`, `upsert`, `delete`, and filter operators (`is`, `in`, `range`, `maybeSingle`) were omitted.

This report provides the exact, fully chainable, thenable mock formulation for `@/lib/db` that guarantees `await DashboardPage()` and `await PlannerPage()` resolve into valid React server component trees without error.

---

## 2. Code Inspection & Direct Observations

### 2.1. `app/(app)/dashboard/page.tsx`

```tsx
// app/(app)/dashboard/page.tsx:8-46
export default async function DashboardPage() {
  const { data: jobs } = await supabase
    .from('render_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch workspaces for folder labels
  const { data: dbWorkspaces } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  const workspaces = (dbWorkspaces || []).map((w: any) => ({
    id: w.id,
    name: w.name,
    color: w.color || '#8b5cf6',
  }));

  // Parse jobs to extract thumbnail and video data
  const videos = (jobs || []).map(job => {
    let parsed: any = {}
    try {
      parsed = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs
    } catch {}
    
    const firstClip = parsed?.videos?.[0]?.video || parsed?.videos?.[0]
    const thumbnail = firstClip?.thumbnail || firstClip?.previewUrl || null
    
    return {
      ...job,
      thumbnail,
      parsedLogs: parsed,
      clipCount: parsed?.videos?.length || 0,
      title: parsed?.subject || `Job ${job.id.slice(0, 8)}`,
      workflowType: parsed?.workflowType || "Footage"
    }
  })
```

#### Observations on `DashboardPage()`:
1. **Query 1**: `supabase.from('render_jobs').select('*').order('created_at', { ascending: false }).limit(20)`
   - Calls `.from()`, `.select()`, `.order()`, and `.limit()`.
   - The result is destructured as `{ data: jobs }`.
   - In line 28, `(jobs || []).map(...)` assumes `jobs` is an `Array` (or `null`/`undefined`).
2. **Query 2**: `supabase.from('workspaces').select('*').order('created_at', { ascending: true })`
   - Notice: **`.limit()` is NOT called**. The query builder is awaited directly on the return value of `.order(...)`.
   - The result is destructured as `{ data: dbWorkspaces }`.
   - In line 21, `(dbWorkspaces || []).map(...)` assumes `dbWorkspaces` is an `Array` (or `null`/`undefined`).
3. **Empty State Resolution**:
   - If `jobs` resolves to `[]` and `dbWorkspaces` resolves to `[]`, `videos` becomes `[]`.
   - Lines 77–89 render the empty state: `<Video ... />`, `<h3>No videos yet</h3>`, `<a href="/create/footage">Create New Video</a>`.
   - This completes component rendering cleanly without triggering any child card renders.

---

### 2.2. `app/(app)/planner/page.tsx`

```tsx
// app/(app)/planner/page.tsx:9-38
export default async function PlannerPage() {
  // Fetch pending and published posts
  const { data: scheduled } = await supabase
    .from('scheduled_posts')
    .select('*, render_jobs(logs)')
    .order('scheduled_for', { ascending: true });

  // Generate a basic 7-day week view starting from today
  const today = new Date();
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(today, i));

  const posts = scheduled || [];
...
  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mt-8">
    {weekDays.map((day, i) => {
      const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_for), day));
```

#### Observations on `PlannerPage()`:
1. **Query**: `supabase.from('scheduled_posts').select('*, render_jobs(logs)').order('scheduled_for', { ascending: true })`
   - Notice: **`.limit()` is NOT called**. Chaining ends with `.order(...)`, which is then directly `await`ed.
   - The result is destructured as `{ data: scheduled }`.
2. **Consumer Logic**:
   - `const posts = scheduled || [];`
   - In line 36: `const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_for), day));`
   - If `scheduled` is an Object (e.g., `{ success: true, data: [] }`), `posts.filter` throws `TypeError: posts.filter is not a function`.
   - If `scheduled` is an Array `[]`, `posts.filter(...)` evaluates to `[]`, rendering the empty day cell `"No posts scheduled"`.
3. **Child Components**:
   - Line 31 mounts `<ScheduleModal jobs={[]} />`. Inside `ScheduleModal.tsx:31-38`, `fetchJobs()` also queries `supabase.from('render_jobs').select('*').eq('status', 'completed').order(...)`. However, `fetchJobs()` only runs when `isOpen === true`. On initial page render, `isOpen` is `false`.

---

### 2.3. `lib/db.ts`

```typescript
// lib/db.ts:1-31
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
const defaultSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '...';
const defaultSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '...';

export const supabase = createClient(defaultSupabaseUrl, defaultSupabaseAnonKey);

export const supabaseAdmin = createClient(defaultSupabaseUrl, defaultSupabaseServiceKey || defaultSupabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export function getSupabase(customUrl?: string, customKey?: string): SupabaseClient {
  const url = customUrl || defaultSupabaseUrl;
  const key = customKey || defaultSupabaseAnonKey;
  return createClient(url, key);
}

export function getSupabaseAdmin(customUrl?: string, customServiceKey?: string): SupabaseClient {
  const url = customUrl || defaultSupabaseUrl;
  const key = customServiceKey || defaultSupabaseServiceKey || defaultSupabaseAnonKey;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
```

#### Observations on `lib/db.ts`:
1. It exports four symbols:
   - `supabase`: default client instance.
   - `supabaseAdmin`: admin client instance with service role key.
   - `getSupabase`: factory function `(customUrl?, customKey?) => SupabaseClient`.
   - `getSupabaseAdmin`: factory function `(customUrl?, customServiceKey?) => SupabaseClient`.
2. All four symbols must be exported from the `vi.mock('@/lib/db', ...)` factory.
3. Across the codebase, `supabase` is used by Server Components and Client Components, while `supabaseAdmin` is imported by background workflows and API routes (e.g. `app/api/jobs/route.ts`, `app/api/workflows/mission/route.ts`).

---

## 3. Analysis of Reviewer 2 Proposal & Hidden Defects

Reviewer 2 suggested the following mock in finding 1:

```typescript
// Reviewer 2 Draft:
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

### Critical Defects in Reviewer 2's Proposal:

1. **Terminal `.limit()` breaks chained queries**:
   Reviewer 2 implemented `.limit()` as returning `Promise.resolve({ data: [], error: null })`.
   In real PostgREST / Supabase, `.limit()` returns the query builder (`PostgrestFilterBuilder`) so chaining can continue.
   In `app/api/jobs/route.ts:12-21`:
   ```typescript
   let query = supabaseAdmin
     .from('render_jobs')
     .select('*')
     .order('created_at', { ascending: false })
     .limit(limit);

   if (status) {
     query = query.eq('status', status); // CRASH! Promise has no .eq()
   }
   ```
   If `.limit()` returns a Promise, `query.eq(...)` throws `TypeError: query.eq is not a function`.
   **Resolution**: `.limit()` must return `builder` (i.e. `mockImplementation(() => builder)`). Because `builder` is a Thenable (implements `.then`), awaiting `builder.limit(20)` directly works seamlessly.

2. **Missing Mutation Methods (`insert`, `update`, `upsert`, `delete`)**:
   `app/api/workflows/mission/route.ts:33` executes `await supabase.from('render_jobs').insert(...)`.
   `ScheduleModal.tsx:52` executes `await supabase.from('scheduled_posts').insert(...)`.
   If `insert` is not defined on the query builder, calling `supabase.from(...).insert(...)` throws `TypeError: ...insert is not a function`.
   **Resolution**: Include `insert`, `update`, `upsert`, and `delete` on the query builder mock.

3. **Missing Filtering Methods (`is`, `in`, `range`, `maybeSingle`, `match`, etc.)**:
   `lib/keys.ts:14` executes `.is('user_id', null)`.
   If `is` is not present, `lib/keys.ts` crashes.
   **Resolution**: Include `is`, `in`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `range`, `maybeSingle`, `match`, `filter`, `or`, `not`, `abortSignal`.

4. **Incomplete Promise Protocol (`catch`, `finally`, rejection handlers)**:
   Reviewer 2 only implemented `then: (resolve: any) => Promise.resolve(...).then(resolve)`.
   Standard Promise compliance requires handling `(onfulfilled, onrejected)` as well as `.catch()` and `.finally()`.
   **Resolution**: Implement complete Promise-like delegation for `then`, `catch`, and `finally`.

---

## 4. Exact Formulated Mock Implementation

Below is the verified, robust mock implementation for `@/lib/db` to be integrated into `test/setup.ts`:

```typescript
// ==========================================
// Supabase Database Mock Harness (@/lib/db)
// ==========================================

export interface MockPostgrestResult<T = any> {
  data: T;
  error: null | { message: string; code?: string };
  count: number | null;
  status: number;
  statusText: string;
}

export function createMockQueryBuilder(initialData: any = []) {
  let currentData = initialData;

  const builder: any = {
    // Selection & Data Operations
    select: vi.fn().mockImplementation(() => builder),
    insert: vi.fn().mockImplementation(() => builder),
    update: vi.fn().mockImplementation(() => builder),
    upsert: vi.fn().mockImplementation(() => builder),
    delete: vi.fn().mockImplementation(() => builder),

    // Filter Operators
    eq: vi.fn().mockImplementation(() => builder),
    neq: vi.fn().mockImplementation(() => builder),
    gt: vi.fn().mockImplementation(() => builder),
    gte: vi.fn().mockImplementation(() => builder),
    lt: vi.fn().mockImplementation(() => builder),
    lte: vi.fn().mockImplementation(() => builder),
    like: vi.fn().mockImplementation(() => builder),
    ilike: vi.fn().mockImplementation(() => builder),
    is: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
    contains: vi.fn().mockImplementation(() => builder),
    containedBy: vi.fn().mockImplementation(() => builder),
    match: vi.fn().mockImplementation(() => builder),
    not: vi.fn().mockImplementation(() => builder),
    or: vi.fn().mockImplementation(() => builder),
    filter: vi.fn().mockImplementation(() => builder),
    textSearch: vi.fn().mockImplementation(() => builder),

    // Ordering, Pagination & Limits (always returns builder for arbitrary chaining)
    order: vi.fn().mockImplementation(() => builder),
    limit: vi.fn().mockImplementation(() => builder),
    range: vi.fn().mockImplementation(() => builder),
    abortSignal: vi.fn().mockImplementation(() => builder),

    // Row Single/MaybeSingle Modifiers
    single: vi.fn().mockImplementation(() => {
      currentData = null;
      return builder;
    }),
    maybeSingle: vi.fn().mockImplementation(() => {
      currentData = null;
      return builder;
    }),
    csv: vi.fn().mockImplementation(() => builder),

    // Thenable (Promise-like) Protocol Implementation
    then: vi.fn().mockImplementation((onfulfilled?: any, onrejected?: any) => {
      const result: MockPostgrestResult = {
        data: currentData,
        error: null,
        count: Array.isArray(currentData) ? currentData.length : currentData ? 1 : 0,
        status: 200,
        statusText: 'OK',
      };
      return Promise.resolve(result).then(onfulfilled, onrejected);
    }),
    catch: vi.fn().mockImplementation((onrejected?: any) => {
      const result: MockPostgrestResult = {
        data: currentData,
        error: null,
        count: Array.isArray(currentData) ? currentData.length : currentData ? 1 : 0,
        status: 200,
        statusText: 'OK',
      };
      return Promise.resolve(result).catch(onrejected);
    }),
    finally: vi.fn().mockImplementation((onfinally?: any) => {
      const result: MockPostgrestResult = {
        data: currentData,
        error: null,
        count: Array.isArray(currentData) ? currentData.length : currentData ? 1 : 0,
        status: 200,
        statusText: 'OK',
      };
      return Promise.resolve(result).finally(onfinally);
    }),
  };

  return builder;
}

export function createMockSupabaseDb() {
  return {
    from: vi.fn((_table?: string) => createMockQueryBuilder([])),
    rpc: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user' }, session: {} }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user' }, session: {} }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        getUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ data: null, error: null }),
        createUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/mock.mp4' } })),
      })),
    },
  };
}

vi.mock('@/lib/db', () => {
  const mockDb = createMockSupabaseDb();
  return {
    supabase: mockDb,
    supabaseAdmin: mockDb,
    getSupabase: vi.fn(() => mockDb),
    getSupabaseAdmin: vi.fn(() => mockDb),
  };
});
```

---

## 5. Verification Traces

### 5.1. Verification Trace: `await DashboardPage()`

```typescript
// 1. DashboardPage invoked
const pagePromise = DashboardPage();

// 2. Query 1 executes:
supabase.from('render_jobs').select('*').order('created_at', { ascending: false }).limit(20)
// - supabase.from('render_jobs') -> returns builder
// - select('*') -> returns builder
// - order(...) -> returns builder
// - limit(20) -> returns builder
// - await evaluates builder.then(...)
// => Resolves: { data: [], error: null, count: 0, status: 200, statusText: 'OK' }
// => const { data: jobs } = { data: [] } -> jobs is []

// 3. Query 2 executes:
supabase.from('workspaces').select('*').order('created_at', { ascending: true })
// - supabase.from('workspaces') -> returns builder
// - select('*') -> returns builder
// - order(...) -> returns builder (NOTE: NO .limit() called!)
// - await evaluates builder.then(...)
// => Resolves: { data: [], error: null, count: 0, status: 200, statusText: 'OK' }
// => const { data: dbWorkspaces } = { data: [] } -> dbWorkspaces is []

// 4. Processing:
const workspaces = (dbWorkspaces || []).map(...) // => [] (No crash)
const videos = (jobs || []).map(...)             // => [] (No crash)

// 5. JSX returned:
// videos.length === 0 is true. Renders Studio Dashboard empty state.
// Return value is valid JSX.Element.
```

### 5.2. Verification Trace: `await PlannerPage()`

```typescript
// 1. PlannerPage invoked
const pagePromise = PlannerPage();

// 2. Query executes:
supabase.from('scheduled_posts').select('*, render_jobs(logs)').order('scheduled_for', { ascending: true })
// - supabase.from('scheduled_posts') -> returns builder
// - select(...) -> returns builder
// - order(...) -> returns builder (NOTE: NO .limit() called!)
// - await evaluates builder.then(...)
// => Resolves: { data: [], error: null, count: 0, status: 200, statusText: 'OK' }
// => const { data: scheduled } = { data: [] } -> scheduled is []

// 3. Processing:
const posts = scheduled || []; // => [] (is an Array!)

// 4. In JSX mapping:
weekDays.map((day, i) => {
  const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_for), day)); // => [] (No crash!)
  // dayPosts.length === 0 -> renders "No posts scheduled"
})

// 5. Return value is valid JSX.Element.
```

---

## 6. Recommendations for Downstream Implementer (`worker_m1`)

1. **Place in `test/setup.ts`**:
   Add this `@/lib/db` mock along with `@/lib/supabase/client` and `@/lib/supabase/context` mocks and fallback env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
2. **Add Regression Tests**:
   In `test/sanity.test.ts` or a dedicated test, verify:
   - `supabase.from('render_jobs').select('*').order('created_at').limit(20)` resolves with `{ data: [] }`.
   - `supabase.from('workspaces').select('*').order('created_at')` (without `.limit()`) resolves with `{ data: [] }`.
   - `supabaseAdmin.from('render_jobs').select('*').limit(10).eq('status', 'pending')` chains without error.
   - `await DashboardPage()` and `await PlannerPage()` resolve to valid React elements.
