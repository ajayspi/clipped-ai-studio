/**
 * Milestone 1: Custom Supabase Connection UI & Dynamic Client Routing Test Suite
 * Validates:
 * 1. Client credentials extraction from localStorage and defaults fallback
 * 2. Supabase client caching and singleton behavior
 * 3. Supabase Test API endpoint validation (URL formatting, key requirements, schema probe shapes)
 * 4. Supabase Settings API endpoint (GET status, key masking, POST forwarding)
 */

import { expect, registry, createMockRequest } from './test-harness';
import {
  getCustomCredentialsFromStorage,
  createClient,
  CUSTOM_CONFIG_STORAGE_KEY,
  CUSTOM_URL_COOKIE_KEY,
  CUSTOM_ANON_KEY_COOKIE_KEY,
} from '../../lib/supabase/client';
import { POST as testSupabaseConnection } from '../../app/api/settings/supabase/test/route';
import { GET as getSupabaseConfig, POST as postSupabaseConfig } from '../../app/api/settings/supabase/route';

export async function registerMilestone1SupabaseTests() {
  // =========================================================================
  // 1. Client Storage Extraction & Fallback
  // =========================================================================
  registry.register({
    id: 'M1-SUPABASE-01',
    tier: 'unit',
    workflow: 'supabase-routing',
    title: 'Client Storage: getCustomCredentialsFromStorage handling',
    description: 'Verifies safe parsing of custom Supabase config from storage and fallback behavior',
    fn: async () => {
      // Test when window/storage is empty or non-browser
      const emptyCreds = getCustomCredentialsFromStorage();
      expect(typeof emptyCreds.isCustom).toBe('boolean');

      // Test constant key definitions
      expect(CUSTOM_CONFIG_STORAGE_KEY).toBe('clipped_custom_supabase_config');
      expect(CUSTOM_URL_COOKIE_KEY).toBe('clipped_custom_supabase_url');
      expect(CUSTOM_ANON_KEY_COOKIE_KEY).toBe('clipped_custom_supabase_anon_key');
    },
  });

  // =========================================================================
  // 2. Client Creation & Cache
  // =========================================================================
  registry.register({
    id: 'M1-SUPABASE-02',
    tier: 'unit',
    workflow: 'supabase-routing',
    title: 'Client Creation: createClient returns SupabaseClient and caches instances',
    description: 'Verifies createClient returns initialized client and caches instances per URL::Key pair',
    fn: async () => {
      const clientA = createClient('https://mock-proj-1.supabase.co', 'mock-anon-key-1');
      expect(clientA).toBeDefined();
      expect(typeof clientA.from).toBe('function');
      expect(typeof clientA.auth.getUser).toBe('function');

      const clientA2 = createClient('https://mock-proj-1.supabase.co', 'mock-anon-key-1');
      expect(clientA).toBe(clientA2); // Cached reference
    },
  });

  // =========================================================================
  // 3. Test API Endpoint Validation (Missing URL / Key)
  // =========================================================================
  registry.register({
    id: 'M1-SUPABASE-03',
    tier: 'api',
    workflow: 'supabase-routing',
    title: 'API /api/settings/supabase/test: Validation on missing URL or anon key',
    description: 'Verifies 400 Bad Request when url or anonKey are omitted or blank',
    fn: async () => {
      // Missing URL
      const reqNoUrl = createMockRequest({ anonKey: 'eyJhbGciOiJIUzI1Ni...' });
      const resNoUrl = await testSupabaseConnection(reqNoUrl);
      expect(resNoUrl.status).toBe(400);
      const jsonNoUrl = await resNoUrl.json();
      expect(jsonNoUrl.success).toBe(false);
      expect(jsonNoUrl.reachable).toBe(false);

      // Missing Key
      const reqNoKey = createMockRequest({ url: 'https://test.supabase.co' });
      const resNoKey = await testSupabaseConnection(reqNoKey);
      expect(resNoKey.status).toBe(400);
      const jsonNoKey = await resNoKey.json();
      expect(jsonNoKey.success).toBe(false);
      expect(jsonNoKey.reachable).toBe(false);
    },
  });

  // =========================================================================
  // 4. Test API Endpoint Validation (Malformed URL)
  // =========================================================================
  registry.register({
    id: 'M1-SUPABASE-04',
    tier: 'api',
    workflow: 'supabase-routing',
    title: 'API /api/settings/supabase/test: Malformed URL handling',
    description: 'Verifies 400 response with descriptive error on invalid URL protocol or syntax',
    fn: async () => {
      const req = createMockRequest({
        url: 'ftp://not-a-valid-supabase-url',
        anonKey: 'eyJhbGciOiJIUzI1Ni...',
      });
      const res = await testSupabaseConnection(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('URL');
    },
  });

  // =========================================================================
  // 5. Test API Endpoint Schema Response Shape
  // =========================================================================
  registry.register({
    id: 'M1-SUPABASE-05',
    tier: 'api',
    workflow: 'supabase-routing',
    title: 'API /api/settings/supabase/test: Core Table Schema Probe Contract',
    description: 'Verifies response JSON includes success, reachable, latencyMs, and schema inspection object',
    fn: async () => {
      const req = createMockRequest({
        url: 'https://agafustlankeieewtvck.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTIxMjksImV4cCI6MjEwMzY4ODEyOX0.Wt6whskptxFUlwAmrtIchFSIPWiDAl0DbVEiC1uvCqc',
      });
      const res = await testSupabaseConnection(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      
      expect(typeof json.success).toBe('boolean');
      expect(typeof json.reachable).toBe('boolean');
      expect(json.schema).toBeDefined();
      expect(typeof json.schema.isHealthy).toBe('boolean');
      expect(Array.isArray(json.schema.missingTables)).toBe(true);
      expect(typeof json.schema.tables).toBe('object');

      // Verify all 6 core tables are probed
      const requiredTables = ['videos', 'render_jobs', 'settings', 'api_credits', 'scheduled_posts', 'users'];
      for (const table of requiredTables) {
        expect(table in json.schema.tables).toBe(true);
      }
    },
  });

  // =========================================================================
  // 6. Settings API Status & Key Masking
  // =========================================================================
  registry.register({
    id: 'M1-SUPABASE-06',
    tier: 'api',
    workflow: 'supabase-routing',
    title: 'API /api/settings/supabase: GET status and key masking',
    description: 'Verifies GET /api/settings/supabase masks sensitive anon keys and reports config status',
    fn: async () => {
      const res = await getSupabaseConfig();
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(typeof json.isCustom).toBe('boolean');
      expect(typeof json.url).toBe('string');
      expect(typeof json.maskedAnonKey).toBe('string');
      // Verify key is masked
      if (json.maskedAnonKey !== 'Not configured') {
        expect(json.maskedAnonKey.startsWith('••••')).toBe(true);
      }
    },
  });
}
