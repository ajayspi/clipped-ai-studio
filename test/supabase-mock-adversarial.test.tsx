import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Imports under test
import {
  createClient,
  getCustomCredentialsFromStorage,
  CUSTOM_CONFIG_STORAGE_KEY,
  CUSTOM_URL_COOKIE_KEY,
  CUSTOM_ANON_KEY_COOKIE_KEY,
} from '@/lib/supabase/client';
import { useSupabase, SupabaseProvider } from '@/lib/supabase/context';
import { supabase, supabaseAdmin, getSupabase, getSupabaseAdmin } from '@/lib/db';

// Real components from Milestone 2 to stress-test mount & execution
import LoginPage from '@/app/(auth)/login/page';
import RegisterPage from '@/app/(auth)/register/page';
import DashboardPage from '@/app/(app)/dashboard/page';
import PlannerPage from '@/app/(app)/planner/page';

describe('Adversarial Stress Test: Supabase Mock Harness Remediation', () => {
  // ==========================================================================
  // Section 1: Auth Operations Stress Suite
  // ==========================================================================
  describe('Auth Operations Contract & State', () => {
    it('verifies client.auth.signInWithPassword returns valid user and session structure', async () => {
      const client = createClient();
      const res = await client.auth.signInWithPassword({
        email: 'user@example.com',
        password: 'securepassword123',
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data.user).toBeDefined();
      expect(res.data.user?.id).toBe('mock-user-123');
      expect(res.data.user?.email).toBe('test@example.com');
      expect(res.data.session).toBeDefined();
      expect(res.data.session?.access_token).toBe('mock-access-token');
      expect(res.data.session?.refresh_token).toBe('mock-refresh-token');
    });

    it('verifies client.auth.signUp returns valid user and null session structure', async () => {
      const client = createClient();
      const res = await client.auth.signUp({
        email: 'newuser@example.com',
        password: 'securepassword123',
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data.user).toBeDefined();
      expect(res.data.user?.id).toBe('mock-user-123');
      expect(res.data.user?.email).toBe('test@example.com');
      expect(res.data.session).toBeNull();
    });

    it('verifies client.auth.signOut resolves cleanly with null error', async () => {
      const client = createClient();
      const res = await client.auth.signOut();
      expect(res).toBeDefined();
      expect(res.error).toBeNull();
    });

    it('verifies client.auth.getSession returns session object structure without throwing', async () => {
      const client = createClient();
      const res = await client.auth.getSession();
      expect(res).toBeDefined();
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data.session).toBeNull();
    });

    it('verifies client.auth.getUser, updateUser, resetPasswordForEmail, and onAuthStateChange', async () => {
      const client = createClient();

      const userRes = await client.auth.getUser();
      expect(userRes.error).toBeNull();
      expect(userRes.data.user?.email).toBe('test@example.com');

      const updateRes = await client.auth.updateUser({ email: 'updated@example.com' });
      expect(updateRes.error).toBeNull();
      expect(updateRes.data.user?.id).toBe('mock-user-123');

      const resetRes = await client.auth.resetPasswordForEmail('user@example.com');
      expect(resetRes.error).toBeNull();
      expect(resetRes.data).toBeDefined();

      const { data } = client.auth.onAuthStateChange(() => {});
      expect(data.subscription).toBeDefined();
      expect(typeof data.subscription.unsubscribe).toBe('function');
      expect(() => data.subscription.unsubscribe()).not.toThrow();
    });

    it('verifies auth methods are uniform across @/lib/supabase/client, @/lib/supabase/context, and @/lib/db', () => {
      const clientAuth = createClient().auth;
      const contextAuth = useSupabase().supabase.auth;
      const dbAuth = supabase.auth;
      const adminAuth = supabaseAdmin.auth;
      const factoryAuth = getSupabase().auth;
      const factoryAdminAuth = getSupabaseAdmin().auth;

      const instances = [clientAuth, contextAuth, dbAuth, adminAuth, factoryAuth, factoryAdminAuth];

      for (const inst of instances) {
        expect(typeof inst.signInWithPassword).toBe('function');
        expect(typeof inst.signUp).toBe('function');
        expect(typeof inst.signOut).toBe('function');
        expect(typeof inst.getSession).toBe('function');
        expect(typeof inst.getUser).toBe('function');
        expect(typeof inst.onAuthStateChange).toBe('function');
      }
    });

    it('verifies admin auth operations (listUsers, getUserById, deleteUser, createUser)', async () => {
      const { admin } = supabaseAdmin.auth;
      expect(admin).toBeDefined();

      const listRes = await admin.listUsers();
      expect(listRes.error).toBeNull();
      expect(Array.isArray(listRes.data.users)).toBe(true);

      const getRes = await admin.getUserById('mock-user-123');
      expect(getRes.error).toBeNull();
      expect(getRes.data.user).toBeNull();

      const delRes = await admin.deleteUser('mock-user-123');
      expect(delRes.error).toBeNull();

      const createRes = await admin.createUser({ email: 'new@example.com' });
      expect(createRes.error).toBeNull();
    });
  });

  // ==========================================================================
  // Section 2: useSupabase Hook Contract Stress Suite
  // ==========================================================================
  describe('useSupabase() Hook Contract', () => {
    it('provides all 11 required fields conforming to SupabaseContextValue', () => {
      const ctx = useSupabase();

      // 1. supabase client instance
      expect(ctx.supabase).toBeDefined();
      expect(typeof ctx.supabase.from).toBe('function');
      expect(typeof ctx.supabase.auth.signInWithPassword).toBe('function');

      // 2. url
      expect(typeof ctx.url).toBe('string');
      expect(ctx.url.length).toBeGreaterThan(0);

      // 3. anonKey
      expect(typeof ctx.anonKey).toBe('string');
      expect(ctx.anonKey.length).toBeGreaterThan(0);

      // 4. isCustom
      expect(typeof ctx.isCustom).toBe('boolean');
      expect(ctx.isCustom).toBe(false);

      // 5. status
      expect(ctx.status).toBe('connected');

      // 6. latencyMs
      expect(typeof ctx.latencyMs).toBe('number');
      expect(ctx.latencyMs).toBe(42);

      // 7. schemaStatus with complete 6-table schema
      expect(ctx.schemaStatus).toBeDefined();
      expect(ctx.schemaStatus?.isHealthy).toBe(true);
      expect(ctx.schemaStatus?.missingTables).toEqual([]);
      const expectedTables = [
        'users',
        'videos',
        'render_jobs',
        'api_credits',
        'settings',
        'scheduled_posts',
      ];
      for (const table of expectedTables) {
        expect(ctx.schemaStatus?.tables[table]).toBeDefined();
        expect(ctx.schemaStatus?.tables[table]?.exists).toBe(true);
      }

      // 8. setCustomConfig
      expect(typeof ctx.setCustomConfig).toBe('function');

      // 9. resetToDefault
      expect(typeof ctx.resetToDefault).toBe('function');

      // 10. testConnection
      expect(typeof ctx.testConnection).toBe('function');

      // 11. refreshStatus
      expect(typeof ctx.refreshStatus).toBe('function');
    });

    it('testConnection returns a fully populated TestConnectionResult', async () => {
      const ctx = useSupabase();
      const result = await ctx.testConnection();

      expect(result.success).toBe(true);
      expect(result.reachable).toBe(true);
      expect(typeof result.latencyMs).toBe('number');
      expect(result.schema).toBeDefined();
      expect(result.schema?.isHealthy).toBe(true);
      expect(result.schema?.tables.render_jobs.exists).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('setCustomConfig resolves with success message', async () => {
      const ctx = useSupabase();
      const result = await ctx.setCustomConfig('https://custom.supabase.co', 'new-key');

      expect(result.success).toBe(true);
      expect(result.reachable).toBe(true);
      expect(result.message).toContain('active across Studio');
    });

    it('SupabaseProvider renders children and allows child context consumption', () => {
      function ConsumerComponent() {
        const { status, latencyMs, schemaStatus } = useSupabase();
        return (
          <div data-testid="context-consumer">
            <span>Status: {status}</span>
            <span>Latency: {latencyMs}ms</span>
            <span>Healthy: {schemaStatus?.isHealthy ? 'yes' : 'no'}</span>
          </div>
        );
      }

      render(
        <SupabaseProvider>
          <ConsumerComponent />
        </SupabaseProvider>
      );

      expect(screen.getByTestId('context-consumer')).toBeInTheDocument();
      expect(screen.getByText('Status: connected')).toBeInTheDocument();
      expect(screen.getByText('Latency: 42ms')).toBeInTheDocument();
      expect(screen.getByText('Healthy: yes')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Section 3: Query Chaining & Database Operations Stress Suite
  // ==========================================================================
  describe('Query Chaining on @/lib/db', () => {
    it("executes authoritative query: supabase.from('render_jobs').select('*').order('created_at', { ascending: false }).limit(20)", async () => {
      const query = supabase
        .from('render_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const result = await query;

      expect(result).toBeDefined();
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.status).toBe(200);
      expect(result.statusText).toBe('OK');
      expect(result.count).toBe(0);
    });

    it('supports deep arbitrary chaining of filter operators, ordering, limits, and abortSignal', async () => {
      const controller = new AbortController();

      const result = await supabase
        .from('render_jobs')
        .select('id, status, logs, created_at')
        .eq('status', 'completed')
        .neq('user_id', 'anon-123')
        .gt('created_at', '2026-01-01')
        .gte('attempts', 1)
        .lt('duration', 120)
        .lte('retry_count', 3)
        .like('title', '%ai%')
        .ilike('title', '%clip%')
        .is('deleted_at', null)
        .in('type', ['reel', 'short'])
        .contains('tags', ['trending'])
        .containedBy('flags', ['active', 'verified'])
        .match({ category: 'tech' })
        .not('is_archived', 'is', true)
        .or('priority.eq.high,status.eq.queued')
        .filter('metadata->views', 'gt', 500)
        .textSearch('title', 'viral')
        .order('created_at', { ascending: false })
        .range(0, 19)
        .limit(20)
        .abortSignal(controller.signal);

      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.status).toBe(200);
    });

    it('supports .single() and .maybeSingle() returning data as null rather than array', async () => {
      const singleRes = await supabase
        .from('render_jobs')
        .select('*')
        .eq('id', 'job-abc')
        .single();

      expect(singleRes.error).toBeNull();
      expect(singleRes.data).toBeNull();
      expect(singleRes.count).toBe(0);

      const maybeRes = await supabase
        .from('users')
        .select('*')
        .eq('email', 'test@example.com')
        .maybeSingle();

      expect(maybeRes.error).toBeNull();
      expect(maybeRes.data).toBeNull();
      expect(maybeRes.count).toBe(0);
    });

    it('supports mutative operations: insert, update, upsert, delete with thenable resolution', async () => {
      const insertRes = await supabase.from('render_jobs').insert({
        id: 'job-1',
        status: 'queued',
      });
      expect(insertRes.error).toBeNull();

      const updateRes = await supabase
        .from('render_jobs')
        .update({ status: 'completed' })
        .eq('id', 'job-1');
      expect(updateRes.error).toBeNull();

      const upsertRes = await supabase
        .from('render_jobs')
        .upsert({ id: 'job-1', status: 'processing' });
      expect(upsertRes.error).toBeNull();

      const deleteRes = await supabase.from('render_jobs').delete().eq('id', 'job-1');
      expect(deleteRes.error).toBeNull();
    });

    it('supports storage bucket operations: upload, getPublicUrl, download, remove', async () => {
      const bucket = supabase.storage.from('videos');
      expect(bucket).toBeDefined();

      const uploadRes = await bucket.upload('video.mp4', new Blob());
      expect(uploadRes.error).toBeNull();
      expect(uploadRes.data?.path).toBe('mock-file.mp4');

      const urlRes = bucket.getPublicUrl('video.mp4');
      expect(urlRes.data.publicUrl).toContain('mock-file.mp4');

      const downloadRes = await bucket.download('video.mp4');
      expect(downloadRes.error).toBeNull();
      expect(downloadRes.data).toBeInstanceOf(Blob);

      const removeRes = await bucket.remove(['video.mp4']);
      expect(removeRes.error).toBeNull();
    });

    it('supports realtime channel subscription and rpc execution', async () => {
      const channel = supabase.channel('room-1');
      expect(channel).toBeDefined();
      channel.on('broadcast', { event: 'ping' }, () => {});
      channel.subscribe();
      expect(() => channel.unsubscribe()).not.toThrow();
      expect(() => supabase.removeChannel(channel)).not.toThrow();

      const rpcRes = await supabase.rpc('get_service_metrics', { period: 'day' });
      expect(rpcRes.error).toBeNull();
      expect(rpcRes.data).toBeNull();
    });

    it('supports parallel asynchronous database queries via Promise.all', async () => {
      const [jobsRes, workspacesRes, postsRes] = await Promise.all([
        supabase.from('render_jobs').select('*').limit(5),
        supabase.from('workspaces').select('*').order('name'),
        supabase.from('scheduled_posts').select('*'),
      ]);

      expect(Array.isArray(jobsRes.data)).toBe(true);
      expect(Array.isArray(workspacesRes.data)).toBe(true);
      expect(Array.isArray(postsRes.data)).toBe(true);
    });
  });

  // ==========================================================================
  // Section 4: Real Component Mount & Execution Stress Suite
  // ==========================================================================
  describe('Milestone 2 Real Route Stress: Mount & Execution', () => {
    it('mounts <LoginPage /> without unhandled exceptions or Supabase SSR errors', () => {
      expect(() => render(<LoginPage />)).not.toThrow();
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('mounts <RegisterPage /> without unhandled exceptions or Supabase SSR errors', () => {
      expect(() => render(<RegisterPage />)).not.toThrow();
      expect(screen.getByText('Create an account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('executes async DashboardPage() server component without Array method crashes', async () => {
      // In Next.js App Router, DashboardPage is an async Server Component function
      const element = await DashboardPage();
      expect(React.isValidElement(element)).toBe(true);

      // Render the resulting element to ensure children render safely
      const { container } = render(element);
      expect(container).toBeDefined();
      expect(screen.getByText(/Studio Dashboard|Dashboard/i)).toBeInTheDocument();
    });

    it('executes async PlannerPage() server component without posts.filter crashes', async () => {
      // In Next.js App Router, PlannerPage is an async Server Component function
      const element = await PlannerPage();
      expect(React.isValidElement(element)).toBe(true);

      // Render the resulting element to ensure children render safely
      const { container } = render(element);
      expect(container).toBeDefined();
      expect(screen.getByText('Content Calendar')).toBeInTheDocument();
    });
  });
});
