import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  createClient,
  getCustomCredentialsFromStorage,
  CUSTOM_CONFIG_STORAGE_KEY,
  CUSTOM_URL_COOKIE_KEY,
  CUSTOM_ANON_KEY_COOKIE_KEY,
} from '@/lib/supabase/client';
import { useSupabase, SupabaseProvider } from '@/lib/supabase/context';
import { supabase, supabaseAdmin, getSupabase, getSupabaseAdmin } from '@/lib/db';

function SanityComponent() {
  return React.createElement(
    'div',
    { 'data-testid': 'sanity-root' },
    React.createElement('h1', null, 'Clipped Test Harness Active'),
    React.createElement('p', null, 'Vitest, React Testing Library, and JSDOM are operational.')
  );
}

describe('Test Infrastructure Sanity Suite', () => {
  it('renders a basic React component in JSDOM using @testing-library/react', () => {
    render(React.createElement(SanityComponent));
    expect(screen.getByTestId('sanity-root')).toBeInTheDocument();
    expect(screen.getByText('Clipped Test Harness Active')).toBeInTheDocument();
    expect(screen.getByText(/Vitest, React Testing Library, and JSDOM are operational/i)).toBeInTheDocument();
  });

  it('provides working Next.js navigation mocks', async () => {
    const { useRouter, usePathname, useSearchParams, useParams } = await import('next/navigation');
    const router = useRouter();
    expect(router).toBeDefined();
    expect(typeof router.push).toBe('function');
    expect(typeof router.replace).toBe('function');
    expect(usePathname()).toBe('/');
    expect(useSearchParams()).toBeInstanceOf(URLSearchParams);
    expect(useParams()).toEqual({});
  });

  it('provides working browser and DOM API polyfills', () => {
    expect(typeof window.ResizeObserver).toBe('function');
    expect(typeof window.IntersectionObserver).toBe('function');
    expect(typeof window.matchMedia).toBe('function');
    expect(typeof navigator.clipboard.writeText).toBe('function');
    expect(typeof window.Audio).toBe('function');
    expect(typeof window.HTMLMediaElement.prototype.play).toBe('function');
    expect(typeof window.HTMLMediaElement.prototype.pause).toBe('function');
  });

  it('provides working global fetch fallback mock and supabase test endpoint', async () => {
    const resKeys = await fetch('/api/settings/keys');
    const dataKeys = await resKeys.json();
    expect(resKeys.status).toBe(200);
    expect(dataKeys.success).toBe(true);

    const resTest = await fetch('/api/settings/supabase/test');
    const dataTest = await resTest.json();
    expect(resTest.status).toBe(200);
    expect(dataTest.success).toBe(true);
    expect(dataTest.reachable).toBe(true);
    expect(dataTest.schema.isHealthy).toBe(true);
    expect(dataTest.schema.tables.users.exists).toBe(true);
  });

  it('verifies createClient() from @/lib/supabase/client works without throwing', () => {
    expect(() => createClient()).not.toThrow();
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(typeof client.auth.signInWithPassword).toBe('function');
    expect(typeof client.auth.signUp).toBe('function');
    expect(typeof client.from).toBe('function');

    expect(CUSTOM_CONFIG_STORAGE_KEY).toBe('clipped_custom_supabase_config');
    expect(CUSTOM_URL_COOKIE_KEY).toBe('clipped_custom_supabase_url');
    expect(CUSTOM_ANON_KEY_COOKIE_KEY).toBe('clipped_custom_supabase_anon_key');
    expect(getCustomCredentialsFromStorage()).toEqual({
      url: undefined,
      anonKey: undefined,
      isCustom: false,
    });
  });

  it('verifies useSupabase() from @/lib/supabase/context returns expected context object', () => {
    const ctx = useSupabase();
    expect(ctx).toBeDefined();
    expect(ctx.url).toBeDefined();
    expect(ctx.anonKey).toBeDefined();
    expect(ctx.isCustom).toBe(false);
    expect(ctx.status).toBe('connected');
    expect(ctx.latencyMs).toBe(42);
    expect(ctx.schemaStatus).toBeDefined();
    expect(ctx.schemaStatus?.isHealthy).toBe(true);
    expect(ctx.schemaStatus?.tables.users.exists).toBe(true);
    expect(ctx.schemaStatus?.tables.render_jobs.exists).toBe(true);
    expect(typeof ctx.setCustomConfig).toBe('function');
    expect(typeof ctx.resetToDefault).toBe('function');
    expect(typeof ctx.testConnection).toBe('function');
    expect(typeof ctx.refreshStatus).toBe('function');
    expect(ctx.supabase).toBeDefined();

    // Verify SupabaseProvider renders children
    const { container } = render(
      React.createElement(SupabaseProvider, null, React.createElement('span', null, 'child-content'))
    );
    expect(container.textContent).toContain('child-content');
  });

  it("verifies supabase.from('render_jobs').select('*').order('created_at').limit(20) from @/lib/db resolves to an array", async () => {
    const result = await supabase
      .from('render_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.status).toBe(200);

    // Also verify unconstrained query (without .limit) works cleanly
    const unconstrained = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true });
    expect(Array.isArray(unconstrained.data)).toBe(true);

    // Verify single() resolves data as null
    const singleResult = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', 'mock-id')
      .single();
    expect(singleResult.data).toBeNull();
    expect(singleResult.error).toBeNull();

    // Verify admin and factory exports
    expect(supabaseAdmin).toBeDefined();
    expect(getSupabase()).toBeDefined();
    expect(getSupabaseAdmin()).toBeDefined();
  });
});
