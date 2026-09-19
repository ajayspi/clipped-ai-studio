# Milestone 1 Remediation: Database & Server Component Mocks Handoff

**Agent**: Explorer 3 (`explorer_m1_remediation_3`)  
**Role**: Investigation & Synthesis  
**Milestone**: Milestone 1 Remediation (Database & Server Component Mocks)  
**Status**: COMPLETE  

---

## 1. Observation

1. **Reviewer 2 Finding on Unmocked DB Queries**:
   In `reviewer_m1_2/handoff.md:50-51`:
   > "In `app/(app)/dashboard/page.tsx:9-13` and `app/(app)/planner/page.tsx:11-14`, queries are executed via `supabase.from('render_jobs').select('*')` and `supabase.from('scheduled_posts').select('*')` using `supabase` from `@/lib/db`. If unmocked, `@supabase/supabase-js` dispatches an HTTP request to `/rest/v1/...`. The global fetch fallback in `test/setup.ts:152` returns `{ success: true, data: [] }`. PostgREST parses this body and returns `data = { success: true, data: [] }` (an Object, not an Array). In `dashboard/page.tsx:28`, `(jobs || []).map(...)` crashes with `TypeError: jobs.map is not a function`. In `planner/page.tsx:36`, `posts.filter(...)` crashes with `TypeError: posts.filter is not a function`."

2. **Query Structure in `app/(app)/dashboard/page.tsx`**:
   - Lines 9–13:
     ```typescript
     const { data: jobs } = await supabase
       .from('render_jobs')
       .select('*')
       .order('created_at', { ascending: false })
       .limit(20)
     ```
   - Lines 16–19:
     ```typescript
     const { data: dbWorkspaces } = await supabase
       .from('workspaces')
       .select('*')
       .order('created_at', { ascending: true })
     ```
   - Notice: Query 2 ends with `.order(...)` and has **NO** `.limit()`. The result is directly `await`ed.
   - Line 21: `(dbWorkspaces || []).map(...)`.
   - Line 28: `(jobs || []).map(...)`.

3. **Query Structure in `app/(app)/planner/page.tsx`**:
   - Lines 11–14:
     ```typescript
     const { data: scheduled } = await supabase
       .from('scheduled_posts')
       .select('*, render_jobs(logs)')
       .order('scheduled_for', { ascending: true });
     ```
   - Notice: The query ends with `.order(...)` and has **NO** `.limit()`. The result is directly `await`ed.
   - Line 20: `const posts = scheduled || [];`
   - Line 36: `const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_for), day));`

4. **Exports in `lib/db.ts`**:
   - Line 7: `export const supabase = createClient(...)`
   - Line 9: `export const supabaseAdmin = createClient(...)`
   - Line 16: `export function getSupabase(customUrl?: string, customKey?: string): SupabaseClient`
   - Line 22: `export function getSupabaseAdmin(customUrl?: string, customServiceKey?: string): SupabaseClient`

5. **Defect in Reviewer 2's Proposed Mock**:
   Reviewer 2 proposed:
   `limit: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null }))`
   In `app/api/jobs/route.ts:12-21`:
   ```typescript
   let query = supabaseAdmin
     .from('render_jobs')
     .select('*')
     .order('created_at', { ascending: false })
     .limit(limit);

   if (status) {
     query = query.eq('status', status);
   }
   ```
   If `.limit()` returns a Promise instead of the query builder itself, chaining `.eq()` after `.limit()` throws `TypeError: query.eq is not a function`.
   Furthermore, `insert`, `update`, `upsert`, `delete`, and filter operators (`is`, `in`, `range`, `maybeSingle`) were omitted from Reviewer 2's query builder.

---

## 2. Logic Chain

1. *From Observation 1 & 2*: `dashboard/page.tsx` performs two asynchronous database queries on initial render. Because it maps over `jobs` and `dbWorkspaces`, both queries must resolve to objects containing `{ data: Array, error: null }`. If unmocked, the global fetch mock returns `{ success: true, data: [] }` which causes `data` to be an Object rather than an Array, triggering `TypeError: (jobs || []).map is not a function`.
2. *From Observation 1 & 3*: `planner/page.tsx` performs a query on `scheduled_posts` without `.limit()`. It calls `posts.filter(...)` where `posts = scheduled || []`. If `scheduled` is an Object, `posts.filter` throws `TypeError: posts.filter is not a function`.
3. *From Observation 2 & 3*: Both `dashboard` (Query 2) and `planner` await the result of `.order(...)` without calling `.limit()`. Therefore, `.order()` must return a Thenable query builder.
4. *From Observation 5*: PostgREST query builders allow chaining in arbitrary orders (e.g. `.limit()` followed by `.eq()`, or `.select()` followed by `.insert()`). A mock that terminates chaining on `.limit()` breaks real application routes like `app/api/jobs/route.ts`.
5. *From Observation 4*: `@/lib/db` exports four symbols (`supabase`, `supabaseAdmin`, `getSupabase`, `getSupabaseAdmin`). The mock must export all four.
6. *Conclusion*: The `@/lib/db` mock must provide a query builder where all operations (`select`, `insert`, `update`, `upsert`, `delete`, `order`, `limit`, `eq`, `is`, `in`, `range`, etc.) return `builder` (`this`), and the builder implements the full Thenable protocol (`then`, `catch`, `finally`) resolving to `{ data: [], error: null, count: 0, status: 200, statusText: 'OK' }` (or `{ data: null, error: null }` if `.single()` / `.maybeSingle()` was called).

---

## 3. Caveats

1. **Static Mock vs Stateful Data Injection**:
   The default mock in `test/setup.ts` returns empty arrays (`data: []`). When a specific test suite (e.g. `test/pages/core/dashboard.test.tsx`) needs to test populated card rendering, the test can use `vi.spyOn(supabase, 'from')` or mock implementation to return specific fixture rows.
2. **date-fns v4 in Planner**:
   `app/(app)/planner/page.tsx:36` calls `new Date(p.scheduled_for)`. If fixtures contain invalid date strings, date-fns throws `Invalid time value`. With the default empty array (`data: []`), this code path is not triggered. Feature 24 in Milestone 4 addresses date parsing resilience.
3. **Client Component Modals**:
   `PlannerPage` mounts `<ScheduleModal jobs={[]} />`. Its internal `fetchJobs()` query executes only when `isOpen` becomes `true`. Because `ScheduleModal` imports `supabase` from `@/lib/db`, our mock covers it when opened.

---

## 4. Conclusion

The exact, robust mock for `@/lib/db` must be added to `test/setup.ts` as follows:

```typescript
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
    select: vi.fn().mockImplementation(() => builder),
    insert: vi.fn().mockImplementation(() => builder),
    update: vi.fn().mockImplementation(() => builder),
    upsert: vi.fn().mockImplementation(() => builder),
    delete: vi.fn().mockImplementation(() => builder),

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

    order: vi.fn().mockImplementation(() => builder),
    limit: vi.fn().mockImplementation(() => builder),
    range: vi.fn().mockImplementation(() => builder),
    abortSignal: vi.fn().mockImplementation(() => builder),

    single: vi.fn().mockImplementation(() => {
      currentData = null;
      return builder;
    }),
    maybeSingle: vi.fn().mockImplementation(() => {
      currentData = null;
      return builder;
    }),
    csv: vi.fn().mockImplementation(() => builder),

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

## 5. Verification Method

To verify this implementation after `worker_m1` updates `test/setup.ts`:

1. **Verify Query Builder Chaining**:
   ```typescript
   import { supabase, supabaseAdmin } from '@/lib/db';

   // Test 1: Dashboard Query 1
   const res1 = await supabase.from('render_jobs').select('*').order('created_at', { ascending: false }).limit(20);
   expect(Array.isArray(res1.data)).toBe(true);

   // Test 2: Dashboard Query 2 (No limit)
   const res2 = await supabase.from('workspaces').select('*').order('created_at', { ascending: true });
   expect(Array.isArray(res2.data)).toBe(true);

   // Test 3: Planner Query (No limit)
   const res3 = await supabase.from('scheduled_posts').select('*, render_jobs(logs)').order('scheduled_for', { ascending: true });
   expect(Array.isArray(res3.data)).toBe(true);

   // Test 4: Chained filter after limit
   const res4 = await supabaseAdmin.from('render_jobs').select('*').limit(10).eq('status', 'pending');
   expect(Array.isArray(res4.data)).toBe(true);
   ```

2. **Verify Server Component Resolution**:
   ```typescript
   import DashboardPage from '@/app/(app)/dashboard/page';
   import PlannerPage from '@/app/(app)/planner/page';
   import { render, screen } from '@testing-library/react';

   // Test DashboardPage resolution
   const resolvedDashboard = await DashboardPage();
   render(resolvedDashboard);
   expect(screen.getByText(/Studio Dashboard/i)).toBeInTheDocument();

   // Test PlannerPage resolution
   const resolvedPlanner = await PlannerPage();
   render(resolvedPlanner);
   expect(screen.getByText(/Content Calendar/i)).toBeInTheDocument();
   ```

3. **Run Unit Suite**:
   ```bash
   node ./node_modules/vitest/vitest.mjs run
   ```
   Ensure all tests pass with 0 exit code.
