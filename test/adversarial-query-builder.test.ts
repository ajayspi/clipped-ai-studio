import { describe, it, expect, vi } from 'vitest';
import { supabase, supabaseAdmin, getSupabase, getSupabaseAdmin } from '@/lib/db';

// postgrest-js's static types only model the canonical chain order
// (from → select → filters → transforms). These adversarial tests drive the
// setup mock's thenable, which accepts ANY chain order, so chains that leave
// canonical order (limit first, catch/finally mid-chain, etc.) are viewed
// through this permissive thenable with a concrete awaited result shape.
interface QueryResult {
  data: unknown;
  error: { message: string } | null;
  status: number;
  statusText: string;
  count: number | null;
  customFlag?: boolean;
}

interface PermissiveBuilderMethods {
  then: <R = QueryResult>(
    onfulfilled?: (value: QueryResult) => R | PromiseLike<R>,
    onrejected?: (reason: unknown) => R | PromiseLike<R>
  ) => Promise<R>;
  catch: <R = QueryResult>(onrejected?: (reason: unknown) => R | PromiseLike<R>) => Promise<QueryResult | R>;
  finally: (onfinally?: (() => void) | undefined | null) => Promise<QueryResult>;
}

interface PermissiveBuilderChain {
  [method: string]: (...args: unknown[]) => PermissiveBuilder;
}

type PermissiveBuilder = PermissiveBuilderMethods & PermissiveBuilderChain;

describe('Adversarial Verification: Thenable Query Builder in @/lib/db', () => {
  describe('1. Arbitrary Method Chaining Order', () => {
    it('handles standard chaining: select -> eq -> order -> limit', async () => {
      const query = supabase
        .from('render_jobs')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(typeof query.then).toBe('function');
      const res = await query;
      expect(res.error).toBeNull();
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.status).toBe(200);
      expect(res.statusText).toBe('OK');
    });

    it('handles reversed/permuted chaining: limit -> order -> eq -> select', async () => {
      const res = await (supabase as unknown as PermissiveBuilder)
        .from('render_jobs')
        .limit(5)
        .order('created_at')
        .eq('user_id', 'usr-123')
        .select('id, title');

      expect(res.error).toBeNull();
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('handles chaining with single() at the end', async () => {
      const res = await supabase
        .from('users')
        .select('*')
        .eq('id', 'usr-123')
        .order('created_at')
        .limit(1)
        .single();

      expect(res.error).toBeNull();
      expect(res.data).toBeNull();
      expect(res.count).toBe(0);
    });

    it('handles chaining with single() in the middle: select -> single -> limit -> order -> eq', async () => {
      const res = await (supabase as unknown as PermissiveBuilder)
        .from('render_jobs')
        .select('*')
        .single()
        .limit(10)
        .order('created_at')
        .eq('id', 'job-abc');

      expect(res.error).toBeNull();
      expect(res.data).toBeNull();
    });

    it('handles maybeSingle() anywhere in chain', async () => {
      const res = await (supabase as unknown as PermissiveBuilder)
        .from('settings')
        .select('*')
        .eq('key', 'groq_api_key')
        .maybeSingle()
        .limit(1);

      expect(res.error).toBeNull();
      expect(res.data).toBeNull();
    });

    it('handles all relational filter operators in a single chained call', async () => {
      const controller = new AbortController();
      const res = await supabase
        .from('analytics')
        .select('*')
        .eq('a', 1)
        .neq('b', 2)
        .gt('c', 3)
        .gte('d', 4)
        .lt('e', 5)
        .lte('f', 6)
        .like('g', '%pattern%')
        .ilike('h', '%PATTERN%')
        .is('i', null)
        .in('j', [1, 2, 3])
        .contains('k', ['val'])
        .containedBy('l', ['val1', 'val2'])
        .match({ m: 1 })
        .not('n', 'eq', 2)
        .or('x.eq.1,y.eq.2')
        .filter('z', 'eq', 3)
        .textSearch('search_col', 'video clip')
        .range(0, 19)
        .abortSignal(controller.signal)
        .csv();

      expect(res.error).toBeNull();
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('handles mutation operators: insert, update, upsert, delete with chained filters', async () => {
      const insertRes = await supabase
        .from('render_jobs')
        .insert({ title: 'New Job' })
        .select()
        .single();
      expect(insertRes.error).toBeNull();

      const updateRes = await supabase
        .from('render_jobs')
        .update({ status: 'processing' })
        .eq('id', 'job-1')
        .select();
      expect(updateRes.error).toBeNull();

      const upsertRes = await supabase
        .from('settings')
        .upsert({ key: 'theme', value: 'dark' })
        .select();
      expect(upsertRes.error).toBeNull();

      const deleteRes = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', 'post-1');
      expect(deleteRes.error).toBeNull();
    });
  });

  describe('2. Thenable / Promise Contract Compliance', () => {
    it('conforms to Promises/A+ thenable protocol', () => {
      const query = supabase.from('videos').select('*') as unknown as PermissiveBuilder;
      expect(typeof query.then).toBe('function');
      expect(typeof query.catch).toBe('function');
      expect(typeof query.finally).toBe('function');
    });

    it('resolves cleanly when chained with native .then(onFulfilled)', async () => {
      let callbackRan = false;
      const res = await supabase
        .from('videos')
        .select('*')
        .eq('status', 'ready')
        .then((result) => {
          callbackRan = true;
          return { ...result, customFlag: true };
        });

      expect(callbackRan).toBe(true);
      expect(res.customFlag).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('handles native .then(onFulfilled, onRejected)', async () => {
      const onFulfilled = vi.fn((r) => r.data);
      const onRejected = vi.fn();
      const data = await supabase
        .from('videos')
        .select('*')
        .then(onFulfilled, onRejected);

      expect(onFulfilled).toHaveBeenCalled();
      expect(onRejected).not.toHaveBeenCalled();
      expect(Array.isArray(data)).toBe(true);
    });

    it('handles .catch() without throwing', async () => {
      const catchHandler = vi.fn();
      const res = await (supabase.from('videos').select('*') as unknown as PermissiveBuilder)
        .catch(catchHandler);

      expect(catchHandler).not.toHaveBeenCalled();
      expect(res.error).toBeNull();
    });

    it('handles .finally() callback', async () => {
      const finallyHandler = vi.fn();
      const res = await (supabase.from('videos').select('*') as unknown as PermissiveBuilder)
        .finally(finallyHandler);

      expect(finallyHandler).toHaveBeenCalled();
      expect(res.error).toBeNull();
    });

    it('works seamlessly inside Promise.all()', async () => {
      const [r1, r2, r3] = await Promise.all([
        supabase.from('users').select('*').limit(1),
        supabase.from('render_jobs').select('*').order('created_at').limit(5),
        supabase.from('settings').select('*').single(),
      ]);

      expect(Array.isArray(r1.data)).toBe(true);
      expect(Array.isArray(r2.data)).toBe(true);
      expect(r3.data).toBeNull();
    });

    it('works seamlessly inside Promise.race()', async () => {
      const winner = await Promise.race([
        supabase.from('users').select('*'),
        supabase.from('videos').select('*'),
      ]);

      expect(winner.error).toBeNull();
      expect(Array.isArray(winner.data)).toBe(true);
    });

    it('works seamlessly inside Promise.allSettled()', async () => {
      const results = await Promise.allSettled([
        supabase.from('workspaces').select('*'),
        supabase.from('api_credits').select('*').single(),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
    });

    it('supports multiple sequential awaits on the same query builder instance', async () => {
      const query = supabase.from('render_jobs').select('*').limit(2);
      const res1 = await query;
      const res2 = await query;

      expect(res1).toEqual(res2);
      expect(Array.isArray(res1.data)).toBe(true);
    });

    it('unpacks automatically when returned from an async function', async () => {
      async function getJobs() {
        return supabase.from('render_jobs').select('*').eq('active', true);
      }

      const res = await getJobs();
      expect(res.error).toBeNull();
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe('3. Alternate DB Exports & Edge Arguments', () => {
    it('handles queries on supabaseAdmin', async () => {
      const res = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', 'admin-id')
        .single();

      expect(res.error).toBeNull();
      expect(res.data).toBeNull();
    });

    it('handles queries on getSupabase() and getSupabaseAdmin() factories', async () => {
      const client = getSupabase();
      const admin = getSupabaseAdmin();

      const r1 = await client.from('render_jobs').select('*').limit(1);
      const r2 = await admin.from('settings').select('*').limit(1);

      expect(Array.isArray(r1.data)).toBe(true);
      expect(Array.isArray(r2.data)).toBe(true);
    });

    it('handles from() with undefined or empty string without crashing', async () => {
      const res1 = await (supabase.from as any)().select('*');
      const res2 = await supabase.from('').select('*');

      expect(Array.isArray(res1.data)).toBe(true);
      expect(Array.isArray(res2.data)).toBe(true);
    });

    it('maintains isolation between distinct from() calls', async () => {
      const q1 = supabase.from('table_a').select('*').single();
      const q2 = supabase.from('table_b').select('*');

      const res1 = await q1;
      const res2 = await q2;

      // q1 was single(), so data is null
      expect(res1.data).toBeNull();
      // q2 was unconstrained, so data is array
      expect(Array.isArray(res2.data)).toBe(true);
    });
  });

  describe('4. Server Component (RSC) Integration Verification', () => {
    it('successfully executes DashboardPage() RSC data fetch using the mock query builder', async () => {
      const { default: DashboardPage } = await import('@/app/(app)/dashboard/page');
      const element = await DashboardPage();
      expect(element).toBeDefined();
    }, 15000);

    it('successfully executes PlannerPage() RSC data fetch using the mock query builder', async () => {
      const { default: PlannerPage } = await import('@/app/(app)/planner/page');
      const element = await PlannerPage();
      expect(element).toBeDefined();
    }, 15000);
  });
});
