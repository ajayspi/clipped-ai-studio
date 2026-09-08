/**
 * Adversarial Empirical Verification Suite for Milestone 2:
 * External Voice Provider Key Resolution & Fallback Cascade
 *
 * Requirements:
 * - R3.2 Subtitle Effects Rendering in Video Output
 * - R3.3 External Voice Settings & API Key Reflection
 *
 * Target: lib/engine/tts.ts
 * - resolveVoiceProviderApiKey()
 * - TTSEngine.synthesize()
 * - Provider routing: azure, elevenlabs, google, openai, omniroute, keyless, mock
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// TypeScript loader hook
if (!require.extensions['.ts']) {
  try {
    const ts = require('typescript');
    require.extensions['.ts'] = function (module, filename) {
      let source = fs.readFileSync(filename, 'utf8');
      source = source.replace(/from\s+['"]@\/([^'"]+)['"]/g, (match, p1) => {
        const rel = path.relative(path.dirname(filename), path.resolve(__dirname, '../', p1)).replace(/\\/g, '/');
        const prefix = rel.startsWith('.') ? rel : './' + rel;
        return `from '${prefix}'`;
      });
      const result = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true,
        },
        fileName: filename,
      });
      module._compile(result.outputText, filename);
    };
  } catch (e) {
    console.warn('TypeScript loader hook error:', e?.message);
  }
}

// Track unhandled promise rejections
let unhandledRejections = [];
process.on('unhandledRejection', (reason) => {
  console.error('CRITICAL UNHANDLED REJECTION:', reason);
  unhandledRejections.push(reason);
});

// Test Framework
const testResults = [];
let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testResults.push({ name, passed: true, durationMs });
    console.log(`  [PASS] ${name} (${durationMs}ms)`);
    passedCount++;
  } catch (err) {
    const durationMs = Date.now() - start;
    testResults.push({ name, passed: false, durationMs, error: err?.message || String(err) });
    console.error(`  [FAIL] ${name} (${durationMs}ms)`);
    console.error(`         Error: ${err?.message || err}`);
    failedCount++;
  }
}

const {
  resolveVoiceProviderApiKey,
  TTSEngine,
} = require('../lib/engine/tts');

const dbModule = require('../lib/db');
const { supabase, supabaseAdmin } = dbModule;

// Helpers for Supabase DB Mocking
let mockDbRows = null;
let mockDbError = null;

function setDbMock(rows, error = null) {
  mockDbRows = rows;
  mockDbError = error;
}

function clearDbMock() {
  mockDbRows = null;
  mockDbError = null;
}

function installDbHook(client) {
  if (!client) return;
  const orig = client.from.bind(client);
  client.from = function (table) {
    if (table === 'settings' && (mockDbRows !== null || mockDbError !== null)) {
      return {
        select: () => ({
          in: async (col, values) => {
            if (mockDbError) {
              return { data: null, error: mockDbError };
            }
            const matched = (mockDbRows || []).filter(r => values.includes(r.provider));
            return { data: matched, error: null };
          },
        }),
      };
    }
    return orig(table);
  };
}

installDbHook(supabaseAdmin);
installDbHook(supabase);

// Helpers for global.fetch Mocking
const originalFetch = global.fetch;
let activeFetchMock = null;

function mockFetch(handler) {
  activeFetchMock = handler;
  global.fetch = async (url, options) => {
    if (activeFetchMock) {
      return activeFetchMock(url, options);
    }
    return originalFetch(url, options);
  };
}

function restoreFetch() {
  activeFetchMock = null;
  global.fetch = originalFetch;
}

// Backup process.env
const originalEnv = { ...process.env };

function cleanEnvKeys() {
  delete process.env.AZURE_SPEECH_KEY;
  delete process.env.AZURE_SPEECH_API_KEY;
  delete process.env.AZURE_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.XI_API_KEY;
  delete process.env.GOOGLE_TTS_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OMNIROUTE_API_KEY;
  delete process.env.OMNIROUTE_KEY;
}

const ttsEngine = new TTSEngine();

async function runAll() {
  console.log('================================================================');
  console.log('🔥 STARTING ADVERSARIAL STRESS TEST: VOICE PROVIDER KEYS & FALLBACK');
  console.log('================================================================\n');

  // ============================================================================
  // SUITE 1: Dynamic Key Resolution Precedence & DB/Env Edge Cases
  // ============================================================================
  console.log('--- SUITE 1: Dynamic Key Resolution Precedence & DB/Env Edge Cases ---');

  await test('1.1 Explicit request.apiKey wins over Supabase DB and environment', async () => {
    cleanEnvKeys();
    process.env.AZURE_SPEECH_KEY = 'env-azure-key';
    setDbMock([{ provider: 'azure_speech', api_key: 'db-azure-key', is_active: true }]);

    const res = await resolveVoiceProviderApiKey('azure_speech', 'explicit-azure-key');
    assert.strictEqual(res.source, 'request');
    assert.strictEqual(res.apiKey, 'explicit-azure-key');
    assert.strictEqual(res.providerCanonical, 'azure_speech');

    clearDbMock();
  });

  await test('1.2 Supabase settings table key wins over environment variable when request key is omitted', async () => {
    cleanEnvKeys();
    process.env.ELEVENLABS_API_KEY = 'env-eleven-key';
    setDbMock([{ provider: 'elevenlabs', api_key: 'db-eleven-key', is_active: true }]);

    const res = await resolveVoiceProviderApiKey('elevenlabs');
    assert.strictEqual(res.source, 'database');
    assert.strictEqual(res.apiKey, 'db-eleven-key');
    assert.strictEqual(res.providerCanonical, 'elevenlabs');

    clearDbMock();
  });

  await test('1.3 Inactive DB key (is_active: false) is skipped and falls back to environment variable', async () => {
    cleanEnvKeys();
    process.env.GOOGLE_TTS_API_KEY = 'env-google-key';
    setDbMock([{ provider: 'google_tts', api_key: 'db-disabled-google-key', is_active: false }]);

    const res = await resolveVoiceProviderApiKey('google_tts');
    assert.strictEqual(res.source, 'environment');
    assert.strictEqual(res.apiKey, 'env-google-key');
    assert.strictEqual(res.providerCanonical, 'google_tts');

    clearDbMock();
  });

  await test('1.4 Inactive DB key with no environment variable falls back to source: none', async () => {
    cleanEnvKeys();
    setDbMock([{ provider: 'openai', api_key: 'db-disabled-key', is_active: false }]);

    const res = await resolveVoiceProviderApiKey('openai');
    assert.strictEqual(res.source, 'none');
    assert.strictEqual(res.apiKey, undefined);
    assert.strictEqual(res.providerCanonical, 'openai');

    clearDbMock();
  });

  await test('1.5 Empty/whitespace DB key is ignored and falls back to environment variable', async () => {
    cleanEnvKeys();
    process.env.AZURE_SPEECH_KEY = 'env-azure-valid';
    setDbMock([
      { provider: 'azure_speech', api_key: '   ', is_active: true },
      { provider: 'azure', api_key: '', is_active: true },
    ]);

    const res = await resolveVoiceProviderApiKey('azure_speech');
    assert.strictEqual(res.source, 'environment');
    assert.strictEqual(res.apiKey, 'env-azure-valid');

    clearDbMock();
  });

  await test('1.6 Fallback across multiple aliases in settings table (first active is picked)', async () => {
    cleanEnvKeys();
    setDbMock([
      { provider: 'azure', api_key: '', is_active: true },
      { provider: 'api_azure', api_key: 'db-api-azure-active', is_active: true },
      { provider: 'azure_speech', api_key: 'db-azure-speech-later', is_active: true },
    ]);

    const res = await resolveVoiceProviderApiKey('azure');
    assert.strictEqual(res.source, 'database');
    assert.strictEqual(res.apiKey, 'db-api-azure-active');
    assert.strictEqual(res.providerCanonical, 'azure_speech');

    clearDbMock();
  });

  await test('1.7 Supabase query error does not crash and falls back cleanly to environment', async () => {
    cleanEnvKeys();
    process.env.OPENAI_API_KEY = 'env-openai-fallback';
    setDbMock(null, new Error('Database connection reset or settings table missing'));

    const res = await resolveVoiceProviderApiKey('openai');
    assert.strictEqual(res.source, 'environment');
    assert.strictEqual(res.apiKey, 'env-openai-fallback');

    clearDbMock();
  });

  await test('1.8 When DB and environment both lack keys, returns source: none and undefined apiKey', async () => {
    cleanEnvKeys();
    setDbMock([]);

    const res = await resolveVoiceProviderApiKey('azure_speech');
    assert.strictEqual(res.source, 'none');
    assert.strictEqual(res.apiKey, undefined);
    assert.strictEqual(res.providerCanonical, 'azure_speech');

    clearDbMock();
  });

  // ============================================================================
  // SUITE 2: Provider Aliasing & Unsupported Providers
  // ============================================================================
  console.log('\n--- SUITE 2: Provider Aliasing & Unsupported Providers ---');

  await test('2.1 Normalizes azure variants: azure, azure_speech, api_azure, AZURE', async () => {
    cleanEnvKeys();
    clearDbMock();
    for (const alias of ['azure', 'azure_speech', 'api_azure', 'api_azure_speech', 'AZURE', ' Azure_Speech ']) {
      const res = await resolveVoiceProviderApiKey(alias);
      assert.strictEqual(res.providerCanonical, 'azure_speech', `Alias ${alias} must resolve to azure_speech`);
    }
  });

  await test('2.2 Normalizes google variants: google, google_tts, api_google, GOOGLE', async () => {
    cleanEnvKeys();
    clearDbMock();
    for (const alias of ['google', 'google_tts', 'api_google', 'api_google_tts', 'GOOGLE_TTS', ' Google ']) {
      const res = await resolveVoiceProviderApiKey(alias);
      assert.strictEqual(res.providerCanonical, 'google_tts', `Alias ${alias} must resolve to google_tts`);
    }
  });

  await test('2.3 Normalizes elevenlabs variants: elevenlabs, eleven_labs, api_elevenlabs, ELEVENLABS', async () => {
    cleanEnvKeys();
    clearDbMock();
    for (const alias of ['elevenlabs', 'eleven_labs', 'api_elevenlabs', 'ELEVENLABS', ' Eleven_Labs ']) {
      const res = await resolveVoiceProviderApiKey(alias);
      assert.strictEqual(res.providerCanonical, 'elevenlabs', `Alias ${alias} must resolve to elevenlabs`);
    }
  });

  await test('2.4 Normalizes openai variants: openai, api_openai, OPENAI', async () => {
    cleanEnvKeys();
    clearDbMock();
    for (const alias of ['openai', 'api_openai', 'OPENAI', ' OpenAi ']) {
      const res = await resolveVoiceProviderApiKey(alias);
      assert.strictEqual(res.providerCanonical, 'openai', `Alias ${alias} must resolve to openai`);
    }
  });

  await test('2.5 Handles unsupported/unknown provider strings without throwing', async () => {
    cleanEnvKeys();
    clearDbMock();
    for (const unk of ['bogus_tts', 'custom_voice_xyz', '', '   ', null, undefined]) {
      const res = await resolveVoiceProviderApiKey(unk);
      assert(typeof res === 'object', 'Must return an object');
      assert.strictEqual(res.apiKey, undefined);
      assert.strictEqual(res.source, 'none');
    }
  });

  // ============================================================================
  // SUITE 3: Provider Synthesis Routing with Missing Keys
  // ============================================================================
  console.log('\n--- SUITE 3: Provider Synthesis Routing with Missing Keys ---');

  await test('3.1 Requesting azure with missing key cascades cleanly without throwing', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Adversarial testing missing Azure Speech credentials.',
      provider: 'azure',
      language: 'en-US',
    });

    assert.strictEqual(res.success, true);
    assert(res.audioBuffer instanceof Buffer && res.audioBuffer.length > 0);
    assert(res.duration > 0);
    assert(['omniroute', 'keyless', 'mock'].includes(res.providerUsed));
    const azureAttempt = res.metadata.providerAttempts.find(p => p.provider === 'azure');
    assert(azureAttempt, 'Must record azure attempt in providerAttempts');
    assert.strictEqual(azureAttempt.status, 'failed');
    assert(azureAttempt.error.includes('Azure Speech API key is not configured'));
  });

  await test('3.2 Requesting elevenlabs with missing key cascades cleanly without throwing', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Adversarial testing missing ElevenLabs credentials.',
      provider: 'elevenlabs',
      language: 'en-US',
    });

    assert.strictEqual(res.success, true);
    assert(res.audioBuffer instanceof Buffer && res.audioBuffer.length > 0);
    const attempt = res.metadata.providerAttempts.find(p => p.provider === 'elevenlabs');
    assert(attempt, 'Must record elevenlabs attempt');
    assert.strictEqual(attempt.status, 'failed');
    assert(attempt.error.includes('ElevenLabs API key is not configured'));
  });

  await test('3.3 Requesting google with missing key cascades cleanly without throwing', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Adversarial testing missing Google TTS credentials.',
      provider: 'google',
      language: 'en-US',
    });

    assert.strictEqual(res.success, true);
    assert(res.audioBuffer instanceof Buffer && res.audioBuffer.length > 0);
    const attempt = res.metadata.providerAttempts.find(p => p.provider === 'google');
    assert(attempt, 'Must record google attempt');
    assert.strictEqual(attempt.status, 'failed');
    assert(attempt.error.includes('Google TTS API key is not configured'));
  });

  await test('3.4 Requesting openai with missing key cascades cleanly without throwing', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Adversarial testing missing OpenAI credentials.',
      provider: 'openai',
      language: 'en-US',
    });

    assert.strictEqual(res.success, true);
    assert(res.audioBuffer instanceof Buffer && res.audioBuffer.length > 0);
    const attempt = res.metadata.providerAttempts.find(p => p.provider === 'openai');
    assert(attempt, 'Must record openai attempt');
    assert.strictEqual(attempt.status, 'failed');
    assert(attempt.error.includes('OpenAI API key is not configured'));
  });

  await test('3.5 Requesting unknown provider cascades to omniroute -> keyless/mock without crashing', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Testing unsupported provider fallback cascade.',
      provider: 'bogus_provider_999',
      language: 'en-US',
    });

    assert.strictEqual(res.success, true);
    assert(res.audioBuffer instanceof Buffer && res.audioBuffer.length > 0);
    assert(['omniroute', 'keyless', 'mock'].includes(res.providerUsed));
  });

  // ============================================================================
  // SUITE 4: Provider Synthesis with HTTP Errors (401, 403, 429, 500)
  // ============================================================================
  console.log('\n--- SUITE 4: Provider Synthesis with HTTP Errors (401, 403, 429, 500) ---');

  await test('4.1 Azure Speech HTTP 401 Unauthorized cascades without throwing', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('speech.microsoft.com')) {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        };
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Testing Azure HTTP 401 recovery.',
        provider: 'azure',
        apiKey: 'invalid-azure-key',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      assert(res.audioBuffer.length > 0);
      const attempt = res.metadata.providerAttempts.find(p => p.provider === 'azure');
      assert(attempt, 'Must record azure attempt');
      assert.strictEqual(attempt.status, 'failed');
      assert(attempt.error.includes('HTTP 401'));
    } finally {
      restoreFetch();
    }
  });

  await test('4.2 Azure Speech HTTP 500 Internal Server Error cascades without throwing', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('speech.microsoft.com')) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        };
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Testing Azure HTTP 500 server crash recovery.',
        provider: 'azure',
        apiKey: 'azure-key-valid-format',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      const attempt = res.metadata.providerAttempts.find(p => p.provider === 'azure');
      assert.strictEqual(attempt.status, 'failed');
      assert(attempt.error.includes('HTTP 500'));
    } finally {
      restoreFetch();
    }
  });

  await test('4.3 ElevenLabs HTTP 401 Unauthorized cascades without throwing', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('api.elevenlabs.io')) {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        };
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Testing ElevenLabs 401 recovery.',
        provider: 'elevenlabs',
        apiKey: 'bad-eleven-key',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      const attempt = res.metadata.providerAttempts.find(p => p.provider === 'elevenlabs');
      assert.strictEqual(attempt.status, 'failed');
      assert(attempt.error.includes('HTTP 401'));
    } finally {
      restoreFetch();
    }
  });

  await test('4.4 Google TTS HTTP 403 Forbidden cascades without throwing', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('texttospeech.googleapis.com')) {
        return {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        };
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Testing Google TTS 403 recovery.',
        provider: 'google',
        apiKey: 'forbidden-google-key',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      const attempt = res.metadata.providerAttempts.find(p => p.provider === 'google');
      assert.strictEqual(attempt.status, 'failed');
      assert(attempt.error.includes('HTTP 403'));
    } finally {
      restoreFetch();
    }
  });

  await test('4.5 OpenAI TTS HTTP 429 Rate Limited cascades without throwing', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('api.openai.com')) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        };
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Testing OpenAI 429 rate limit recovery.',
        provider: 'openai',
        apiKey: 'rate-limited-key',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      const attempt = res.metadata.providerAttempts.find(p => p.provider === 'openai');
      assert.strictEqual(attempt.status, 'failed');
      assert(attempt.error.includes('HTTP 429'));
    } finally {
      restoreFetch();
    }
  });

  // ============================================================================
  // SUITE 5: Network Timeouts & Aborted Connections
  // ============================================================================
  console.log('\n--- SUITE 5: Network Timeouts & Aborted Connections ---');

  await test('5.1 Azure Speech fetch network timeout / connection abort cascades cleanly', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('speech.microsoft.com')) {
        throw new Error('fetch failed: connect ETIMEDOUT 20.190.159.0:443');
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Testing Azure network timeout resilience.',
        provider: 'azure',
        apiKey: 'azure-key-valid',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      const attempt = res.metadata.providerAttempts.find(p => p.provider === 'azure');
      assert.strictEqual(attempt.status, 'failed');
      assert(attempt.error.includes('ETIMEDOUT'));
    } finally {
      restoreFetch();
    }
  });

  await test('5.2 ElevenLabs fetch DNS resolution failure cascades cleanly', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('elevenlabs.io')) {
        throw new Error('getaddrinfo ENOTFOUND api.elevenlabs.io');
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Testing ElevenLabs DNS error resilience.',
        provider: 'elevenlabs',
        apiKey: 'eleven-key-valid',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      const attempt = res.metadata.providerAttempts.find(p => p.provider === 'elevenlabs');
      assert.strictEqual(attempt.status, 'failed');
      assert(attempt.error.includes('ENOTFOUND'));
    } finally {
      restoreFetch();
    }
  });

  await test('5.3 Google Cloud TTS socket hangup cascades cleanly', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('googleapis.com')) {
        throw new Error('socket hang up');
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Testing Google socket hangup resilience.',
        provider: 'google',
        apiKey: 'google-key-valid',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      const attempt = res.metadata.providerAttempts.find(p => p.provider === 'google');
      assert.strictEqual(attempt.status, 'failed');
      assert(attempt.error.includes('socket hang up'));
    } finally {
      restoreFetch();
    }
  });

  await test('5.4 Simultaneous failure of external provider AND OmniRoute falls back to Keyless/Mock', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('speech.microsoft.com')) {
        throw new Error('Azure network down');
      }
      if (url.includes('20128') || url.includes('/v1/audio/speech')) {
        throw new Error('OmniRoute gateway unreachable');
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Testing complete upstream failure fallback cascade.',
        provider: 'azure',
        apiKey: 'azure-key-valid',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      assert(res.audioBuffer instanceof Buffer && res.audioBuffer.length > 0);
      assert(['keyless', 'mock'].includes(res.providerUsed));
    } finally {
      restoreFetch();
    }
  });

  // ============================================================================
  // SUITE 6: Valid Synthesis Flow & Payload Integrity
  // ============================================================================
  console.log('\n--- SUITE 6: Valid Synthesis Flow & Payload Integrity ---');

  const mockMp3Buffer = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x23TSSE\x00\x00\x00\x0f\x00\x00\x03Lavf58.29.100\xff\xfb\x90\x44\x00\x00\x00\x00');

  await test('6.1 Azure Speech with valid key & mocked response returns provider: azure', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('speech.microsoft.com')) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => mockMp3Buffer.buffer,
        };
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Valid Azure Speech synthesis output test.',
        provider: 'azure',
        apiKey: 'valid-mock-azure-key',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.providerUsed, 'azure');
      assert.strictEqual(res.format, 'mp3');
      assert(res.audioBuffer instanceof Buffer);
      assert(res.audioUrl.startsWith('data:audio/mp3;base64,'));
      assert(res.duration > 0);
    } finally {
      restoreFetch();
    }
  });

  await test('6.2 ElevenLabs with valid key & mocked response returns provider: elevenlabs', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('api.elevenlabs.io')) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => mockMp3Buffer.buffer,
        };
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Valid ElevenLabs synthesis output test.',
        provider: 'elevenlabs',
        apiKey: 'valid-mock-eleven-key',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.providerUsed, 'elevenlabs');
      assert.strictEqual(res.format, 'mp3');
      assert(res.audioBuffer instanceof Buffer);
      assert(res.audioUrl.startsWith('data:audio/mp3;base64,'));
      assert(res.duration > 0);
    } finally {
      restoreFetch();
    }
  });

  await test('6.3 Google Cloud TTS with valid key & mocked response returns provider: google', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('texttospeech.googleapis.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ audioContent: mockMp3Buffer.toString('base64') }),
        };
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Valid Google Cloud TTS synthesis output test.',
        provider: 'google',
        apiKey: 'valid-mock-google-key',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.providerUsed, 'google');
      assert.strictEqual(res.format, 'mp3');
      assert(res.audioBuffer instanceof Buffer);
      assert(res.audioUrl.startsWith('data:audio/mp3;base64,'));
      assert(res.duration > 0);
    } finally {
      restoreFetch();
    }
  });

  await test('6.4 OpenAI TTS with valid key & mocked response returns provider: openai', async () => {
    cleanEnvKeys();
    mockFetch((url) => {
      if (url.includes('api.openai.com')) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => mockMp3Buffer.buffer,
        };
      }
      return originalFetch(url);
    });

    try {
      const res = await ttsEngine.synthesize({
        text: 'Valid OpenAI TTS synthesis output test.',
        provider: 'openai',
        apiKey: 'valid-mock-openai-key',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.providerUsed, 'openai');
      assert.strictEqual(res.format, 'mp3');
      assert(res.audioBuffer instanceof Buffer);
      assert(res.audioUrl.startsWith('data:audio/mp3;base64,'));
      assert(res.duration > 0);
    } finally {
      restoreFetch();
    }
  });

  // ============================================================================
  // SUITE 7: Voice ID Inference & Input Defense
  // ============================================================================
  console.log('\n--- SUITE 7: Voice ID Inference & Input Defense ---');

  await test('7.1 JennyNeural voiceId auto-infers Azure provider', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Testing provider inference for JennyNeural.',
      voiceId: 'en-US-JennyNeural',
    });

    assert.strictEqual(res.success, true);
    const attempted = res.metadata.providerAttempts.map(p => p.provider);
    assert(attempted.includes('azure'), 'Must attempt Azure provider');
  });

  await test('7.2 Rachel voiceId auto-infers ElevenLabs provider', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Testing provider inference for Rachel.',
      voiceId: 'rachel',
    });

    assert.strictEqual(res.success, true);
    const attempted = res.metadata.providerAttempts.map(p => p.provider);
    assert(attempted.includes('elevenlabs'), 'Must attempt ElevenLabs provider');
  });

  await test('7.3 Wavenet voiceId auto-infers Google TTS provider', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Testing provider inference for Wavenet.',
      voiceId: 'en-US-Wavenet-D',
    });

    assert.strictEqual(res.success, true);
    const attempted = res.metadata.providerAttempts.map(p => p.provider);
    assert(attempted.includes('google'), 'Must attempt Google provider');
  });

  await test('7.4 Shimmer voiceId auto-infers OpenAI provider', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Testing provider inference for Shimmer.',
      voiceId: 'shimmer',
    });

    assert.strictEqual(res.success, true);
    const attempted = res.metadata.providerAttempts.map(p => p.provider);
    assert(attempted.includes('openai'), 'Must attempt OpenAI provider');
  });

  await test('7.5 free-guy voiceId auto-infers Keyless provider directly', async () => {
    cleanEnvKeys();
    clearDbMock();

    const res = await ttsEngine.synthesize({
      text: 'Testing provider inference for Keyless.',
      voiceId: 'free-guy',
    });

    assert.strictEqual(res.success, true);
    assert(['keyless', 'mock'].includes(res.providerUsed));
  });

  await test('7.6 Azure SSML escaping protects against XML tag injection', async () => {
    cleanEnvKeys();
    let capturedSsml = '';
    mockFetch((url, options) => {
      if (url.includes('speech.microsoft.com')) {
        capturedSsml = options.body;
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => mockMp3Buffer.buffer,
        };
      }
      return originalFetch(url);
    });

    try {
      const maliciousText = '<break time="10s"/> & "hello" <script>alert(1)</script>';
      const res = await ttsEngine.synthesize({
        text: maliciousText,
        provider: 'azure',
        apiKey: 'azure-key-123',
        language: 'en-US',
      });

      assert.strictEqual(res.success, true);
      assert(capturedSsml.includes('&lt;break time=&quot;10s&quot;/&gt; &amp; &quot;hello&quot; &lt;script&gt;alert(1)&lt;/script&gt;'));
      assert(!capturedSsml.includes('<break time="10s"/>'));
    } finally {
      restoreFetch();
    }
  });

  await test('7.7 Extreme length input (3,000 chars) synthesizes without truncation error', async () => {
    cleanEnvKeys();
    clearDbMock();

    const longText = 'This is an empirical stress test of text synthesis capacity. '.repeat(50);
    const res = await ttsEngine.synthesize({
      text: longText,
      mock: true,
    });

    assert.strictEqual(res.success, true);
    assert(res.characterCount >= 3000);
    assert(res.duration > 50);
  });

  await test('7.8 Zero unhandled promise rejections recorded throughout test execution', async () => {
    assert.strictEqual(
      unhandledRejections.length,
      0,
      `Expected 0 unhandled promise rejections, found ${unhandledRejections.length}: ${JSON.stringify(unhandledRejections)}`
    );
  });

  // Restore environment
  process.env = originalEnv;

  console.log('\n================================================================');
  console.log(`🏁 ADVERSARIAL TEST RESULTS: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Test runner fatal crash:', err);
  process.exit(1);
});
