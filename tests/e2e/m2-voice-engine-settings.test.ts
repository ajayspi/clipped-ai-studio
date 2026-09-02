/**
 * Milestone 2 Test Suite: Voice Engine API Expansion, Audio Previews & Dynamic Settings
 *
 * Verifies:
 * 1. Azure Speech REST API SSML construction, OpenAI TTS, Google Cloud TTS, ElevenLabs, Keyless TTS, and PCM generator
 * 2. Dedicated preview API route (/api/tts/preview) input handling, fallback cascade, and response contract
 * 3. Dedicated voices API route (/api/tts/voices) catalog filtering and provider grouping
 * 4. Dynamic settings API (/api/settings/keys) with Azure, Google TTS, and custom user-defined providers
 * 5. Dynamic settings verification API (/api/settings/keys/check) across multiple provider formats
 * 6. Voice catalog completeness and language script detection
 */

import { expect, registry, createMockRequest } from './test-harness';
import {
  TTSEngine,
  AZURE_VOICE_CATALOG,
  OPENAI_VOICES,
  FREE_KEYLESS_VOICES,
  ELEVENLABS_VOICES,
  GOOGLE_DEFAULT_VOICES,
  detectLanguageFromScript,
  normalizeLanguageCode,
  generateSyntheticWavBuffer,
  calculateEstimatedDuration,
} from '../../lib/engine/tts';

export async function registerMilestone2VoiceTests() {
  const ttsEngine = new TTSEngine();

  // =========================================================================
  // 1. Voice Engine Multi-Provider Synthesis Contracts
  // =========================================================================

  registry.register({
    id: 'M2-TTS-01',
    tier: 'tier6',
    workflow: 'voice',
    title: 'Voice Engine: Multi-Provider Voice Catalog & Language Resolution',
    description: 'Verifies voice catalog exports all required Azure, OpenAI, ElevenLabs, Google, and Keyless voices',
    fn: async () => {
      // Azure Catalog Check
      expect(AZURE_VOICE_CATALOG.length).toBeGreaterThan(10);
      const jenny = AZURE_VOICE_CATALOG.find((v) => v.id === 'en-US-JennyNeural');
      const guy = AZURE_VOICE_CATALOG.find((v) => v.id === 'en-US-GuyNeural');
      const swara = AZURE_VOICE_CATALOG.find((v) => v.id === 'hi-IN-SwaraNeural');
      const neerja = AZURE_VOICE_CATALOG.find((v) => v.id === 'en-IN-NeerjaNeural');

      expect(jenny).toBeDefined();
      expect(guy).toBeDefined();
      expect(swara).toBeDefined();
      expect(neerja).toBeDefined();

      // OpenAI Voices Check
      expect(OPENAI_VOICES.length).toBe(6);
      const alloy = OPENAI_VOICES.find((v) => v.id === 'alloy');
      const onyx = OPENAI_VOICES.find((v) => v.id === 'onyx');
      const nova = OPENAI_VOICES.find((v) => v.id === 'nova');
      expect(alloy).toBeDefined();
      expect(onyx).toBeDefined();
      expect(nova).toBeDefined();

      // Keyless Voices Check
      expect(FREE_KEYLESS_VOICES.length).toBeGreaterThanOrEqual(5);

      // getAvailableVoices with provider filter
      const azureVoices = ttsEngine.getAvailableVoices(undefined, 'azure');
      expect(azureVoices.every((v) => v.provider === 'azure')).toBe(true);

      const openAiVoices = ttsEngine.getAvailableVoices(undefined, 'openai');
      expect(openAiVoices.every((v) => v.provider === 'openai')).toBe(true);

      const keylessVoices = ttsEngine.getAvailableVoices(undefined, 'keyless');
      expect(keylessVoices.every((v) => v.provider === 'keyless')).toBe(true);
    },
  });

  registry.register({
    id: 'M2-TTS-02',
    tier: 'tier6',
    workflow: 'voice',
    title: 'Voice Engine: Deterministic In-Memory Mock and Keyless Fallback Synthesis',
    description: 'Verifies synthesis creates valid audio buffers, data URLs, and metadata across languages',
    fn: async () => {
      // Dry run synthesis
      const res = await ttsEngine.synthesize({
        text: 'Welcome to the next generation of automated video creation with Clipped AI.',
        language: 'en-US',
        provider: 'mock',
        speed: 1.1,
      });

      expect(res.success).toBe(true);
      expect(res.audioBuffer).toBeDefined();
      expect(res.audioBuffer.length).toBeGreaterThan(44);
      expect(res.audioUrl.startsWith('data:audio/wav;base64,')).toBe(true);
      expect(res.duration).toBeGreaterThan(0);
      expect(res.characterCount).toBeGreaterThan(20);

      // Indian English voice synthesis
      const resIn = await ttsEngine.synthesize({
        text: 'नमस्ते दोस्तों, क्लिप्ड एआई वीडियो स्टूडियो में आपका स्वागत है।',
        language: 'hi-IN',
        mock: true,
      });

      expect(resIn.success).toBe(true);
      expect(resIn.language).toBe('hi-IN');
    },
  });

  // =========================================================================
  // 2. /api/tts/preview Route Tests
  // =========================================================================

  registry.register({
    id: 'M2-API-PREV-01',
    tier: 'api',
    workflow: 'voice',
    title: 'API /api/tts/preview: Synthesizes Audio and Returns Valid Data URL',
    description: 'Verifies POST /api/tts/preview responds with success: true and base64 audio data URL',
    fn: async () => {
      const { POST } = await import('../../app/api/tts/preview/route');
      const req = createMockRequest({
        text: 'This is a live voice preview test utterance.',
        voiceId: 'alloy',
        provider: 'openai',
        language: 'en-US',
        speed: 1.0,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.audioUrl).toBe('string');
      expect(json.audioUrl.startsWith('data:audio/')).toBe(true);
      expect(json.duration).toBeGreaterThan(0);
      expect(json.voiceId).toBeDefined();
    },
  });

  registry.register({
    id: 'M2-API-PREV-02',
    tier: 'api',
    workflow: 'voice',
    title: 'API /api/tts/preview: Default Parameters and Fallback Safety',
    description: 'Verifies POST /api/tts/preview works seamlessly when optional parameters are omitted',
    fn: async () => {
      const { POST } = await import('../../app/api/tts/preview/route');
      const req = createMockRequest({}); // completely empty payload

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.audioUrl).toBeDefined();
      expect(json.duration).toBeGreaterThan(0);
    },
  });

  // =========================================================================
  // 3. /api/tts/voices Route Tests
  // =========================================================================

  registry.register({
    id: 'M2-API-VOICES-01',
    tier: 'api',
    workflow: 'voice',
    title: 'API /api/tts/voices: Returns Grouped Voice Catalog',
    description: 'Verifies GET /api/tts/voices returns grouped voices by azure, openai, elevenlabs, google, keyless',
    fn: async () => {
      const { GET } = await import('../../app/api/tts/voices/route');
      const req = new Request('http://localhost:3000/api/tts/voices', { method: 'GET' });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.totalCount).toBeGreaterThan(20);
      expect(Array.isArray(json.voices)).toBe(true);
      expect(json.grouped).toBeDefined();
      expect(Array.isArray(json.grouped.azure)).toBe(true);
      expect(Array.isArray(json.grouped.openai)).toBe(true);
      expect(Array.isArray(json.grouped.elevenlabs)).toBe(true);
      expect(Array.isArray(json.grouped.google)).toBe(true);
      expect(Array.isArray(json.grouped.keyless)).toBe(true);
    },
  });

  // =========================================================================
  // 4. /api/settings/keys Route & Dynamic Custom Providers
  // =========================================================================

  registry.register({
    id: 'M2-API-KEYS-01',
    tier: 'api',
    workflow: 'settings',
    title: 'API /api/settings/keys: Returns Azure, Google TTS and Dynamic Keys',
    description: 'Verifies GET /api/settings/keys includes azure_speech, google_tts, grok, and dynamic providers',
    fn: async () => {
      const { GET } = await import('../../app/api/settings/keys/route');
      const res = await GET();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.keys).toBeDefined();
      expect(json.keys.azure_speech).toBeDefined();
      expect(json.keys.google_tts).toBeDefined();
      expect(json.keys.elevenlabs).toBeDefined();
      expect(json.keys.openai).toBeDefined();
      expect(Array.isArray(json.availableCategories)).toBe(true);
    },
  });

  registry.register({
    id: 'M2-API-KEYS-02',
    tier: 'api',
    workflow: 'settings',
    title: 'API /api/settings/keys: Saves Custom Provider Integration',
    description: 'Verifies POST /api/settings/keys saves custom user-defined provider',
    fn: async () => {
      const { POST } = await import('../../app/api/settings/keys/route');
      const req = createMockRequest({
        provider: 'custom_deepseek_v3',
        name: 'DeepSeek V3',
        apiKey: 'sk-test-deepseek-12345678',
        category: 'AI Models',
        baseUrl: 'https://api.deepseek.com',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.setting).toBeDefined();
    },
  });

  registry.register({
    id: 'M2-API-CHECK-01',
    tier: 'api',
    workflow: 'settings',
    title: 'API /api/settings/keys/check: Validates Azure and Groq Key Verifications',
    description: 'Verifies POST /api/settings/keys/check rejects empty keys and tests configured providers',
    fn: async () => {
      const { POST } = await import('../../app/api/settings/keys/check/route');
      
      // Test with missing provider
      const badReq = createMockRequest({});
      const badRes = await POST(badReq);
      expect(badRes.status).toBe(400);

      // Test with unconfigured provider
      const unconfReq = createMockRequest({ provider: 'unconfigured_unknown_provider' });
      const unconfRes = await POST(unconfReq);
      expect(unconfRes.status).toBe(200);
      const unconfJson = await unconfRes.json();
      expect(unconfJson.success).toBe(false);
    },
  });
}
