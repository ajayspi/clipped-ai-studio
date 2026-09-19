import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

// ============================================================================
// 1. Supabase Environment Variables Fallback
// ============================================================================
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key';

// ============================================================================
// 2. Next.js Routing Mocks
// ============================================================================
vi.mock('next/navigation', () => {
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  };

  return {
    useRouter: () => router,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  };
});

// ============================================================================
// 3. Next.js Font Mocks
// ============================================================================
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans', className: 'font-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono', className: 'font-mono' }),
  Inter: () => ({ variable: '--font-inter', className: 'font-sans' }),
  Roboto: () => ({ variable: '--font-roboto', className: 'font-sans' }),
}));

vi.mock('next/font/local', () => ({
  default: () => ({ variable: '--font-local', className: 'font-local' }),
}));

vi.mock('next/font', () => ({
  localFont: () => ({ variable: '--font-local', className: 'font-local' }),
}));

// ============================================================================
// 4. Browser & DOM API Polyfills
// ============================================================================
// ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];
  takeRecords = vi.fn(() => []);
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// window.Audio & HTMLMediaElement
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();

class MockAudio {
  src = '';
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
  currentTime = 0;
  duration = 0;
  volume = 1;
  muted = false;
  paused = true;
  ended = false;

  constructor(src?: string) {
    if (src) this.src = src;
  }
}
(window as any).Audio = MockAudio;
(globalThis as any).Audio = MockAudio;

// ============================================================================
// 5. Shared Query Builder & Client Helpers
// ============================================================================
function createMockQueryBuilder(initialData: any = []) {
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

    // Ordering, Pagination & Limits
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
      const result = {
        data: currentData,
        error: null,
        count: Array.isArray(currentData) ? currentData.length : currentData ? 1 : 0,
        status: 200,
        statusText: 'OK',
      };
      return Promise.resolve(result).then(onfulfilled, onrejected);
    }),
    catch: vi.fn().mockImplementation((onrejected?: any) => {
      const result = {
        data: currentData,
        error: null,
        count: Array.isArray(currentData) ? currentData.length : currentData ? 1 : 0,
        status: 200,
        statusText: 'OK',
      };
      return Promise.resolve(result).catch(onrejected);
    }),
    finally: vi.fn().mockImplementation((onfinally?: any) => {
      const result = {
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

function createMockSupabaseInstance() {
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
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: { provider: 'google', url: 'https://mock.oauth/provider' },
      error: null,
    }),
    updateUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'mock-user-123', email: 'test@example.com' } },
      error: null,
    }),
    admin: {
      listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
      getUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      deleteUser: vi.fn().mockResolvedValue({ data: null, error: null }),
      createUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };

  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'mock-file.mp4' }, error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock.storage/mock-file.mp4' } })),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  };

  return {
    auth: mockAuth,
    from: vi.fn((_table?: string) => createMockQueryBuilder([])),
    storage: mockStorage,
    rpc: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  };
}

// ============================================================================
// 6. Supabase Client Mock (@/lib/supabase/client)
// ============================================================================
vi.mock('@/lib/supabase/client', () => {
  const mockClientInstance = createMockSupabaseInstance();

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

// ============================================================================
// 7. Supabase Context Mock (@/lib/supabase/context)
// ============================================================================
vi.mock('@/lib/supabase/context', () => {
  const defaultUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
  const defaultAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key';

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
    supabase: createMockSupabaseInstance(),
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

// ============================================================================
// 8. Supabase Database Mock (@/lib/db)
// ============================================================================
vi.mock('@/lib/db', () => {
  const mockDb = createMockSupabaseInstance();
  return {
    supabase: mockDb,
    supabaseAdmin: mockDb,
    getSupabase: vi.fn(() => mockDb),
    getSupabaseAdmin: vi.fn(() => mockDb),
  };
});

// ============================================================================
// 9. Global Fetch Fallback Mock
// ============================================================================
if (!globalThis.fetch || typeof globalThis.fetch !== 'function') {
  globalThis.fetch = vi.fn();
}

globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as any)?.url || String(input);

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

  if (url.includes('/api/workspaces')) {
    return new Response(JSON.stringify({ success: true, workspaces: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/api/jobs')) {
    return new Response(JSON.stringify({ success: true, completed: [], queued: [], failed: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/api/settings/keys')) {
    return new Response(JSON.stringify({ success: true, keys: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/api/workflows/mission')) {
    return new Response(JSON.stringify({ success: true, mission: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/api/settings/health')) {
    return new Response(
      JSON.stringify({
        success: true,
        providers: [],
        summary: { total: 0, healthy: 0, offline: 0, byCategory: {} },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (url.includes('/api/tts/preview')) {
    return new Response(
      JSON.stringify({
        success: true,
        audioUrl: 'mock-audio-url',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ success: true, data: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
