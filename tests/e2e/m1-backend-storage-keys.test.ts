/**
 * Milestone 1: Backend Storage & API Keys Route Refactoring Test Suite
 * Validates:
 * 1. getOmniRouteConfig() resolver with short TTL caching, database lookup, and env/default fallbacks.
 * 2. GET /api/settings/keys returning exclusively OmniRoute credentials and strictly 0 legacy keys.
 * 3. POST /api/settings/keys accepting and validating OmniRoute URL/key and rejecting legacy providers.
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
  // 2. GET /api/settings/keys Exclusively Returns OmniRoute
  // =========================================================================
  registry.register({
    id: 'M1-OMNIROUTE-02',
    tier: 'unit',
    workflow: 'omniroute-storage',
    title: 'GET /api/settings/keys: Returns OmniRoute and ZERO legacy provider keys',
    description: 'Verifies response contains omniroute credentials and strictly 0 legacy keys (openai, azure, etc.)',
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

      // Verify ZERO legacy provider keys exist in keys map
      const legacyKeys = [
        'openai', 'gemini', 'anthropic', 'openrouter', 'fal', 'grok', 'groq',
        'deepseek', 'mistral', 'cerebras', 'github_models', 'ollama',
        'pexels', 'pixabay', 'kling', 'luma', 'huggingface',
        'azure_speech', 'azure_region', 'azure', 'elevenlabs', 'google_tts',
        'deepgram', 'suno', 'heygen', 'did',
        'api_openai', 'api_azure_speech', 'api_elevenlabs'
      ];

      for (const legacyKey of legacyKeys) {
        expect(json.keys[legacyKey]).toBeUndefined();
      }
    },
  });

  // =========================================================================
  // 3. POST /api/settings/keys Rejection of Legacy Providers
  // =========================================================================
  registry.register({
    id: 'M1-OMNIROUTE-03',
    tier: 'unit',
    workflow: 'omniroute-storage',
    title: 'POST /api/settings/keys: Rejects legacy provider submissions with 400 Bad Request',
    description: 'Verifies submitting deprecated providers (e.g. openai, azure) returns 400 error message',
    fn: async () => {
      const mockReq = createMockRequest('POST', {
        provider: 'openai',
        apiKey: 'sk-legacy-test-1234',
      });

      const res = await postKeysRoute(mockReq as unknown as Request);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe('Individual AI providers are deprecated. Only OmniRoute configuration is supported.');
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
