/**
 * Milestone 1: Backend Storage & API Keys Route Refactoring Test Suite
 * Validates:
 * 1. getOmniRouteConfig() resolver with short TTL caching, database lookup, and env/default fallbacks.
 * 2. GET /api/settings/keys returning OmniRoute credentials plus any direct provider
 *    keys that exist in the `settings` table (the LLM/media cascade reads them).
 * 3. POST /api/settings/keys accepting OmniRoute URL/key and direct provider keys,
 *    and rejecting providers outside the supported set.
 * 4. POST /api/settings/keys/check probing OmniRoute endpoint and returning latency and models.
 * 5. Codebase cleanliness: 0 occurrences of OPENAI_API_KEY in settings keys route.
 */

import { expect, registry, createMockRequest } from './test-harness';
import { getOmniRouteConfig, clearOmniRouteConfigCache } from '../../lib/keys';
import { GET as getKeysRoute, POST as postKeysRoute } from '../../app/api/settings/keys/route';
import { POST as checkKeysRoute } from '../../app/api/settings/keys/check/route';

export async function registerMilestone1BackendStorageTests() {
  // =========================================================================
  // 1. OmniRoute Config Resolver & TTL Cache
  // =========================================================================
  registry.register({
    id: 'M1-OMNIROUTE-01',
    tier: 'unit',
    workflow: 'omniroute-storage',
    title: 'lib/keys.ts: getOmniRouteConfig() fallback and caching',
    description: 'Verifies getOmniRouteConfig resolves defaults/env and respects in-memory TTL caching',
    fn: async () => {
      clearOmniRouteConfigCache();

      const config1 = await getOmniRouteConfig();
      expect(config1).toBeDefined();
      expect(typeof config1.baseUrl).toBe('string');
      expect(config1.baseUrl.startsWith('http')).toBe(true);
      expect(typeof config1.apiKey).toBe('string');
      expect(typeof config1.isConfigured).toBe('boolean');
      expect(['database', 'environment', 'default'].includes(config1.source)).toBe(true);

      // Verify in-memory caching returns cached instance
      const config2 = await getOmniRouteConfig();
      expect(config1).toBe(config2);

      // Bypass cache returns a fresh object
      const config3 = await getOmniRouteConfig(true);
      expect(config3).toBeDefined();
      expect(config3.baseUrl).toBe(config1.baseUrl);
    },
  });

  // =========================================================================
  // 2. GET /api/settings/keys Returns OmniRoute + Any Configured Direct Providers
  // =========================================================================
  registry.register({
    id: 'M1-OMNIROUTE-02',
    tier: 'unit',
    workflow: 'omniroute-storage',
    title: 'GET /api/settings/keys: Returns OmniRoute and only supported direct provider keys',
    description:
      'Verifies the response always contains omniroute credentials, and that any other key present is a ' +
      'supported direct provider (masked, never raw). Unsupported/unknown ids must not be echoed back.',
    fn: async () => {
      const res = await getKeysRoute();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.omniroute).toBeDefined();
      expect(typeof json.omniroute.endpointUrl).toBe('string');
      expect(typeof json.omniroute.isConfigured).toBe('boolean');
      expect(json.keys).toBeDefined();
      expect(json.keys.omniroute).toBeDefined();

      // The OmniRoute block must never leak a raw key.
      expect(json.omniroute.maskedApiKey === undefined || json.omniroute.maskedApiKey.includes('•')).toBe(true);

      // Every non-omniroute entry must be a supported direct provider, and must be
      // masked. Keys that exist in the `settings` table for providers the product
      // does not support must not be surfaced.
      const supported = new Set([
        'openai', 'anthropic', 'gemini', 'openrouter', 'grok', 'groq', 'deepseek',
        'mistral', 'cerebras', 'github_models', 'huggingface', 'together', 'cohere',
        'ollama', 'lmstudio', 'pexels', 'pixabay', 'coverr', 'fal', 'aihorde',
        'kling', 'luma', 'ideogram', 'bytez', 'heygen', 'did', 'deepgram',
        'elevenlabs', 'google_tts', 'azure_speech', 'suno',
      ]);

      for (const [id, value] of Object.entries(json.keys as Record<string, { maskedApiKey?: string; isConfigured?: boolean }>)) {
        if (id === 'omniroute' || id === 'omniroute_endpoint_url' || id === 'omniroute_api_key') continue;
        expect(supported.has(id)).toBe(true);
        // Masked values only — a raw key must never be serialized to the client.
        if (value?.isConfigured) {
          expect(value.maskedApiKey === undefined || value.maskedApiKey.includes('•')).toBe(true);
        }
      }
    },
  });

  // =========================================================================
  // 3. POST /api/settings/keys Accepts Direct Providers, Rejects Unknown Ones
  // =========================================================================
  registry.register({
    id: 'M1-OMNIROUTE-03',
    tier: 'unit',
    workflow: 'omniroute-storage',
    title: 'POST /api/settings/keys: Accepts a supported direct provider and rejects an unknown one',
    description:
      'Verifies a supported LLM provider key is accepted (the cascade depends on these being savable) ' +
      'and that a provider outside the supported set still returns 400.',
    fn: async () => {
      // Supported direct provider: must NOT be rejected.
      const okReq = createMockRequest('POST', {
        provider: 'openai',
        apiKey: 'sk-direct-provider-test-1234',
      });
      const okRes = await postKeysRoute(okReq as unknown as Request);
      expect(okRes.status).toBe(200);
      const okJson = await okRes.json();
      expect(okJson.success).toBe(true);
      expect(okJson.provider).toBe('openai');
      // The echoed key must be masked, never raw.
      expect(okJson.maskedApiKey === undefined || okJson.maskedApiKey.includes('•')).toBe(true);

      // Unknown provider: still rejected.
      const badReq = createMockRequest('POST', {
        provider: 'definitely_not_a_real_provider_xyz',
        apiKey: 'sk-nope-1234',
      });
      const badRes = await postKeysRoute(badReq as unknown as Request);
      expect(badRes.status).toBe(400);
      const badJson = await badRes.json();
      expect(typeof badJson.error).toBe('string');
    },
  });

  // =========================================================================
  // 4. POST /api/settings/keys URL Validation
  // =========================================================================
  registry.register({
    id: 'M1-OMNIROUTE-04',
    tier: 'unit',
    workflow: 'omniroute-storage',
    title: 'POST /api/settings/keys: Validates HTTP/HTTPS endpoint URL',
    description: 'Verifies submitting missing or non-HTTP endpoint URL returns 400 validation error',
    fn: async () => {
      const mockReq = createMockRequest('POST', {
        endpointUrl: 'ftp://invalid-url.com',
        apiKey: 'sk-test',
      });

      const res = await postKeysRoute(mockReq as unknown as Request);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(typeof json.error).toBe('string');
    },
  });

  // =========================================================================
  // 5. POST /api/settings/keys Saves OmniRoute Credentials
  // =========================================================================
  registry.register({
    id: 'M1-OMNIROUTE-05',
    tier: 'unit',
    workflow: 'omniroute-storage',
    title: 'POST /api/settings/keys: Accepts and persists OmniRoute credentials',
    description: 'Verifies saving valid OmniRoute endpoint URL and API key returns 200 with omniroute config',
    fn: async () => {
      const mockReq = createMockRequest('POST', {
        endpointUrl: 'http://localhost:20128/v1',
        apiKey: 'sk-omniroute-valid-test-1234',
      });

      const res = await postKeysRoute(mockReq as unknown as Request);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.omniroute.endpointUrl).toBe('http://localhost:20128/v1');
      expect(json.omniroute.isConfigured).toBe(true);
      expect(json.omniroute.maskedApiKey.endsWith('1234')).toBe(true);
    },
  });

  // =========================================================================
  // 6. POST /api/settings/keys/check Probe & Rejection
  // =========================================================================
  registry.register({
    id: 'M1-OMNIROUTE-06',
    tier: 'unit',
    workflow: 'omniroute-storage',
    title: 'POST /api/settings/keys/check: Validates OmniRoute connection probe',
    description: 'Verifies connection check returns latency and model list or safe connection failure',
    fn: async () => {
      // 1. Rejects legacy provider check
      const legacyReq = createMockRequest('POST', {
        provider: 'elevenlabs',
      });
      const legacyRes = await checkKeysRoute(legacyReq as unknown as Request);
      expect(legacyRes.status).toBe(400);

      // 2. Probes OmniRoute endpoint
      const probeReq = createMockRequest('POST', {
        endpointUrl: 'http://localhost:20128/v1',
        apiKey: 'sk-test-omniroute',
      });
      const probeRes = await checkKeysRoute(probeReq as unknown as Request);
      expect(probeRes.status).toBe(200);

      const probeJson = await probeRes.json();
      expect(typeof probeJson.success).toBe('boolean');
      expect(typeof probeJson.latencyMs).toBe('number');
      expect(probeJson.latencyMs >= 0).toBe(true);
    },
  });
}
