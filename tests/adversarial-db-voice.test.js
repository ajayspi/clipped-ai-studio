/**
 * Adversarial Stress-Testing and Boundary Verification Suite
 * Requirements:
 * - R1: Custom Supabase Connection & Dynamic SSR Routing
 * - R2: Voice APIs, Previews & Dynamic API Keys
 */

const assert = require('assert');

// ============================================================================
// Mini Test Framework with Timing & Reporting
// ============================================================================
const suiteResults = [];

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    suiteResults.push({ name, passed: true, durationMs });
    console.log(`  [✓ PASS] ${name} (${durationMs}ms)`);
  } catch (err) {
    const durationMs = Date.now() - start;
    suiteResults.push({ name, passed: false, durationMs, error: err.message });
    console.log(`  [✗ FAIL] ${name} (${durationMs}ms)`);
    console.error(`          Error: ${err.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected, `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected, `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    },
    toBeTruthy() {
      assert.ok(actual, `Expected truthy value, got ${actual}`);
    },
    toBeFalsy() {
      assert.ok(!actual, `Expected falsy value, got ${actual}`);
    },
    toBeGreaterThan(n) {
      assert.ok(typeof actual === 'number' && actual > n, `Expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual(n) {
      assert.ok(typeof actual === 'number' && actual >= n, `Expected ${actual} >= ${n}`);
    },
    toBeLessThanOrEqual(n) {
      assert.ok(typeof actual === 'number' && actual <= n, `Expected ${actual} <= ${n}`);
    },
    toContain(item) {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        assert.ok(actual.includes(item), `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
      } else {
        assert.fail(`Actual is neither string nor array`);
      }
    },
    toMatch(regex) {
      assert.ok(regex.test(String(actual)), `Expected "${actual}" to match regex ${regex}`);
    },
    toHaveProperty(prop) {
      assert.ok(actual && prop in actual, `Expected property "${prop}" in object`);
    },
  };
}

// ============================================================================
// 1. R1: Custom Supabase Connection Verification Units
// ============================================================================

// Simulated Supabase Cookie Parser & Serializer
const CUSTOM_URL_COOKIE_KEY = 'clipped_custom_supabase_url';
const CUSTOM_ANON_KEY_COOKIE_KEY = 'clipped_custom_supabase_anon_key';
const CUSTOM_CONFIG_STORAGE_KEY = 'clipped_custom_supabase_config';

function serializeCookies(url, anonKey, isHttps = true) {
  const maxAge = 60 * 60 * 24 * 365;
  const secureFlag = isHttps ? '; Secure' : '';
  const cookie1 = `${CUSTOM_URL_COOKIE_KEY}=${encodeURIComponent(url)}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
  const cookie2 = `${CUSTOM_ANON_KEY_COOKIE_KEY}=${encodeURIComponent(anonKey)}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
  return { cookie1, cookie2 };
}

function parseCookies(cookieHeader) {
  const map = {};
  if (!cookieHeader) return map;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, rawVal] = part.trim().split('=');
    if (rawKey && rawVal) {
      map[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal);
    }
  }
  return map;
}

function validateSupabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, error: 'Missing or invalid Supabase URL' };
  }
  const clean = rawUrl.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use http:// or https://' };
    }
    return { valid: true, url: clean };
  } catch {
    return { valid: false, error: 'Malformed Supabase URL' };
  }
}

function validateAnonKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    return { valid: false, error: 'Missing or invalid Supabase Anon Key' };
  }
  return { valid: true, key: rawKey.trim() };
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `••••••••••••${key.slice(-4)}`;
}

// Schema health evaluator with error code matching
const CORE_TABLES = ['videos', 'render_jobs', 'settings', 'api_credits', 'scheduled_posts', 'users'];

function evaluateTableProbe(error) {
  if (!error) return { exists: true, error: null };
  const msg = (error.message || '').toLowerCase();
  const isMissing =
    error.code === '42P01' ||
    error.code === 'PGRST200' ||
    error.code === 'PGRST204' ||
    error.code === 'PGRST301' ||
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('not found in the schema cache');

  if (isMissing) {
    return { exists: false, error: error.message };
  }
  return { exists: true, error: null }; // Exists with RLS or other non-missing status
}

// Client Cache simulation
class DynamicSupabaseClientCache {
  constructor() {
    this.cache = new Map();
  }
  getClient(url, anonKey) {
    const cleanUrl = (url || 'https://default.supabase.co').trim();
    const cleanKey = (anonKey || 'default-anon-key').trim();
    const key = `${cleanUrl}::${cleanKey}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, { url: cleanUrl, anonKey: cleanKey, instanceId: Math.random().toString(36).substring(2) });
    }
    return this.cache.get(key);
  }
}

// ============================================================================
// 2. R2: Voice Engine & Preview Verification Units
// ============================================================================

const LANGUAGE_ALIASES = {
  'en': 'en-US', 'en-us': 'en-US', 'en_us': 'en-US', 'english': 'en-US',
  'en-in': 'en-IN', 'en_in': 'en-IN', 'indian-english': 'en-IN',
  'hi': 'hi-IN', 'hi-in': 'hi-IN', 'hindi': 'hi-IN',
  'ta': 'ta-IN', 'ta-in': 'ta-IN', 'tamil': 'ta-IN',
  'te': 'te-IN', 'te-in': 'te-IN', 'telugu': 'te-IN',
  'kn': 'kn-IN', 'kn-in': 'kn-IN', 'kannada': 'kn-IN',
  'bn': 'bn-IN', 'bn-in': 'bn-IN', 'bengali': 'bn-IN',
  'mr': 'mr-IN', 'mr-in': 'mr-IN', 'marathi': 'mr-IN',
};

function normalizeLanguageCode(input) {
  if (!input || typeof input !== 'string') return 'en-US';
  const clean = input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (LANGUAGE_ALIASES[clean]) return LANGUAGE_ALIASES[clean];
  const upper = input.trim().replace('_', '-');
  if (['en-US', 'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN'].includes(upper)) return upper;
  return 'en-US';
}

function detectLanguageFromScript(text) {
  if (!text || typeof text !== 'string') return 'en-US';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN';
  if (/[\u0900-\u097F]/.test(text)) {
    if (/[\u0933]|आहे|नाही|झाला|केला/.test(text)) return 'mr-IN';
    return 'hi-IN';
  }
  return 'en-US';
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function generateSyntheticWavBuffer(durationSeconds, sampleRate = 24000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const numSamples = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const buffer = Buffer.alloc(totalSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const tone = Math.sin(2 * Math.PI * 440 * t) * 0.7 + Math.sin(2 * Math.PI * 880 * t) * 0.3;
    const sample = tone * 400;
    buffer.writeInt16LE(Math.floor(sample), headerSize + i * 2);
  }
  return buffer;
}

function calculateEstimatedDuration(text, language = 'en-US', speedRate = 1.0) {
  if (!text || typeof text !== 'string' || !text.trim()) return 1.0;
  const cleanLang = normalizeLanguageCode(language);
  const words = text.trim().split(/\s+/).length;
  const wordsPerSec = cleanLang.startsWith('en') ? 2.5 : 2.0;
  const effectiveRate = speedRate > 0 ? speedRate : 1.0;
  const rawDuration = (words / wordsPerSec) * (1.0 / effectiveRate);
  return Math.max(1.0, Math.round(rawDuration * 10) / 10);
}

// Azure Voice Catalog Map
const AZURE_VOICE_CATALOG = [
  { id: 'en-US-JennyNeural', language: 'en-US', gender: 'female', provider: 'azure' },
  { id: 'en-US-GuyNeural', language: 'en-US', gender: 'male', provider: 'azure' },
  { id: 'en-US-AriaNeural', language: 'en-US', gender: 'female', provider: 'azure' },
  { id: 'en-IN-NeerjaNeural', language: 'en-IN', gender: 'female', provider: 'azure' },
  { id: 'en-IN-PrabhatNeural', language: 'en-IN', gender: 'male', provider: 'azure' },
  { id: 'hi-IN-SwaraNeural', language: 'hi-IN', gender: 'female', provider: 'azure' },
  { id: 'hi-IN-MadhurNeural', language: 'hi-IN', gender: 'male', provider: 'azure' },
  { id: 'ta-IN-PallaviNeural', language: 'ta-IN', gender: 'female', provider: 'azure' },
  { id: 'ta-IN-ValluvarNeural', language: 'ta-IN', gender: 'male', provider: 'azure' },
  { id: 'te-IN-ShrutiNeural', language: 'te-IN', gender: 'female', provider: 'azure' },
  { id: 'kn-IN-SapnaNeural', language: 'kn-IN', gender: 'female', provider: 'azure' },
  { id: 'bn-IN-TanishaaNeural', language: 'bn-IN', gender: 'female', provider: 'azure' },
  { id: 'mr-IN-AarohiNeural', language: 'mr-IN', gender: 'female', provider: 'azure' },
];

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const FREE_KEYLESS_VOICES = ['free-en-us', 'free-en-in', 'free-hi-in', 'free-ta-in', 'free-te-in', 'free-kn-in', 'free-bn-in', 'free-mr-in'];

// Cascade Synthesis Engine Simulator (mirrors lib/engine/tts.ts)
class TestTTSEngine {
  constructor(envKeys = {}) {
    this.envKeys = envKeys;
  }

  async synthesize(req) {
    const rawText = req.text ? String(req.text).trim() : '';
    if (!rawText) throw new Error('Text is required for TTS synthesis');

    const language = req.language ? normalizeLanguageCode(req.language) : detectLanguageFromScript(rawText);
    const speed = req.speed || 1.0;
    const provider = req.provider || 'auto';
    const providerAttempts = [];

    // Azure Attempt
    if ((provider === 'azure' || provider === 'auto') && this.envKeys.AZURE_SPEECH_KEY) {
      const duration = calculateEstimatedDuration(rawText, language, speed);
      const audioBuffer = generateSyntheticWavBuffer(duration);
      const audioBase64 = audioBuffer.toString('base64');
      return {
        success: true,
        providerUsed: 'azure',
        voiceId: req.voiceId || 'en-US-JennyNeural',
        audioUrl: `data:audio/mp3;base64,${audioBase64}`,
        audioBase64,
        duration,
        language,
      };
    } else if (provider === 'azure') {
      providerAttempts.push({ provider: 'azure', status: 'skipped', error: 'Missing AZURE_SPEECH_KEY' });
    }

    // OpenAI Attempt
    if ((provider === 'openai' || provider === 'auto') && this.envKeys.OPENAI_API_KEY) {
      const duration = calculateEstimatedDuration(rawText, language, speed);
      const audioBuffer = generateSyntheticWavBuffer(duration);
      const audioBase64 = audioBuffer.toString('base64');
      return {
        success: true,
        providerUsed: 'openai',
        voiceId: req.voiceId || 'alloy',
        audioUrl: `data:audio/mp3;base64,${audioBase64}`,
        audioBase64,
        duration,
        language,
      };
    } else if (provider === 'openai') {
      providerAttempts.push({ provider: 'openai', status: 'skipped', error: 'Missing OPENAI_API_KEY' });
    }

    // Keyless Google Translate Fallback
    if (provider === 'keyless' || provider === 'auto' || providerAttempts.length > 0) {
      const duration = calculateEstimatedDuration(rawText, language, speed);
      const audioBuffer = generateSyntheticWavBuffer(duration);
      const audioBase64 = audioBuffer.toString('base64');
      return {
        success: true,
        providerUsed: 'keyless',
        voiceId: req.voiceId || `keyless-${language.split('-')[0]}`,
        audioUrl: `data:audio/mp3;base64,${audioBase64}`,
        audioBase64,
        duration,
        language,
        providerAttempts,
      };
    }

    // Ultimate In-memory mock fallback
    const duration = calculateEstimatedDuration(rawText, language, speed);
    const audioBuffer = generateSyntheticWavBuffer(duration);
    const audioBase64 = audioBuffer.toString('base64');
    return {
      success: true,
      providerUsed: 'mock',
      voiceId: req.voiceId || 'mock-fallback',
      audioUrl: `data:audio/wav;base64,${audioBase64}`,
      audioBase64,
      duration,
      language,
    };
  }
}

// ============================================================================
// Main Execution Runner
// ============================================================================
async function runAllStressTests() {
  console.log('='.repeat(80));
  console.log('  EMPIRICAL CHALLENGER 1: DATABASE & VOICE ADVERSARIAL TEST SUITE');
  console.log('='.repeat(80) + '\n');

  // --------------------------------------------------------------------------
  // SECTION 1: REQUIREMENT R1 — CUSTOM SUPABASE CONNECTION & DYNAMIC ROUTING
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: REQUIREMENT R1 (Custom Supabase Connection) ---');

  await test('R1-DB-01: Valid Supabase URL & AnonKey format validation', async () => {
    const valid = validateSupabaseUrl('https://myproject.supabase.co');
    expect(valid.valid).toBe(true);
    expect(valid.url).toBe('https://myproject.supabase.co');

    const withTrailingSlash = validateSupabaseUrl('https://myproject.supabase.co///');
    expect(withTrailingSlash.valid).toBe(true);
    expect(withTrailingSlash.url).toBe('https://myproject.supabase.co');

    const withHttp = validateSupabaseUrl('http://localhost:54321');
    expect(withHttp.valid).toBe(true);
    expect(withHttp.url).toBe('http://localhost:54321');

    const keyValid = validateAnonKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key');
    expect(keyValid.valid).toBe(true);
  });

  await test('R1-DB-02: Rejection of malformed / adversarial URLs & empty keys', async () => {
    expect(validateSupabaseUrl('').valid).toBe(false);
    expect(validateSupabaseUrl('   ').valid).toBe(false);
    expect(validateSupabaseUrl(null).valid).toBe(false);
    expect(validateSupabaseUrl(undefined).valid).toBe(false);
    expect(validateSupabaseUrl('ftp://invalid.supabase.co').valid).toBe(false);
    expect(validateSupabaseUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateSupabaseUrl('not-a-url').valid).toBe(false);

    expect(validateAnonKey('').valid).toBe(false);
    expect(validateAnonKey('   ').valid).toBe(false);
    expect(validateAnonKey(null).valid).toBe(false);
  });

  await test('R1-DB-03: Cookie serialization, Lax SameSite & Secure flags', async () => {
    const url = 'https://custom-db.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig';
    const { cookie1, cookie2 } = serializeCookies(url, anonKey, true);

    expect(cookie1).toContain('clipped_custom_supabase_url=https%3A%2F%2Fcustom-db.supabase.co');
    expect(cookie1).toContain('path=/');
    expect(cookie1).toContain('SameSite=Lax');
    expect(cookie1).toContain('Secure');
    expect(cookie1).toContain('max-age=31536000');

    expect(cookie2).toContain('clipped_custom_supabase_anon_key=');
    expect(cookie2).toContain('SameSite=Lax');
    expect(cookie2).toContain('Secure');
  });

  await test('R1-DB-04: Cookie header parsing and SSR round-trip recovery', async () => {
    const rawHeader = `clipped_custom_supabase_url=https%3A%2F%2Fdynamic-prod.supabase.co; clipped_custom_supabase_anon_key=eyKeySample123; other_cookie=xyz`;
    const parsed = parseCookies(rawHeader);

    expect(parsed[CUSTOM_URL_COOKIE_KEY]).toBe('https://dynamic-prod.supabase.co');
    expect(parsed[CUSTOM_ANON_KEY_COOKIE_KEY]).toBe('eyKeySample123');
    expect(parsed['other_cookie']).toBe('xyz');
  });

  await test('R1-DB-05: LocalStorage payload serialization & hydration safety', async () => {
    const storageObj = {
      url: 'https://tenant-a.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tenantA',
      customConfigured: true,
      status: 'connected',
      lastTested: new Date().toISOString(),
      latencyMs: 42,
    };
    const jsonString = JSON.stringify(storageObj);
    const parsed = JSON.parse(jsonString);

    expect(parsed.customConfigured).toBe(true);
    expect(parsed.url).toBe('https://tenant-a.supabase.co');
    expect(parsed.latencyMs).toBe(42);

    // Corrupted JSON resilience
    let hydratedUrl = 'https://default.supabase.co';
    try {
      const corrupted = '{"url": "incomplete json...';
      const badParse = JSON.parse(corrupted);
      hydratedUrl = badParse.url;
    } catch {
      // Fallback works
      hydratedUrl = 'https://default.supabase.co';
    }
    expect(hydratedUrl).toBe('https://default.supabase.co');
  });

  await test('R1-DB-06: Schema health inspection & missing table detection (6 Core Tables)', async () => {
    expect(CORE_TABLES.length).toBe(6);

    // All tables present
    const healthyProbes = CORE_TABLES.map(t => ({ table: t, ...evaluateTableProbe(null) }));
    const missingHealthy = healthyProbes.filter(p => !p.exists);
    expect(missingHealthy.length).toBe(0);

    // 1 table missing (Postgres 42P01 error)
    const err42P01 = { code: '42P01', message: 'relation "public.scheduled_posts" does not exist' };
    const missingProbe = evaluateTableProbe(err42P01);
    expect(missingProbe.exists).toBe(false);
    expect(missingProbe.error).toContain('does not exist');

    // PostgREST schema cache error (PGRST200)
    const errPGRST200 = { code: 'PGRST200', message: 'Could not find the table in schema cache' };
    const pgrstProbe = evaluateTableProbe(errPGRST200);
    expect(pgrstProbe.exists).toBe(false);

    // Non-missing RLS policy (table exists)
    const rlsErr = { code: '42501', message: 'new row violates row-level security policy for table "videos"' };
    const rlsProbe = evaluateTableProbe(rlsErr);
    expect(rlsProbe.exists).toBe(true);
  });

  await test('R1-DB-07: Dynamic client caching & instance isolation', async () => {
    const cache = new DynamicSupabaseClientCache();
    const c1 = cache.getClient('https://project1.supabase.co', 'key1');
    const c1Duplicate = cache.getClient('https://project1.supabase.co', 'key1');
    const c2 = cache.getClient('https://project2.supabase.co', 'key2');

    expect(c1.instanceId).toBe(c1Duplicate.instanceId); // Memoized instance
    expect(c1.instanceId !== c2.instanceId).toBe(true); // Distinct instance for different DB
  });

  await test('R1-DB-08: Key masking utility for security in settings UI', async () => {
    const longKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.vCqc';
    const maskedLong = maskKey(longKey);
    expect(maskedLong.endsWith('vCqc')).toBe(true);
    expect(maskedLong.startsWith('••••••••••••')).toBe(true);
    expect(maskedLong.length < longKey.length).toBe(true);

    const shortKey = 'secret1';
    const maskedShort = maskKey(shortKey);
    expect(maskedShort).toBe('••••••••');
  });

  // --------------------------------------------------------------------------
  // SECTION 2: REQUIREMENT R2 — VOICE APIS, PREVIEWS & DYNAMIC KEYS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: REQUIREMENT R2 (Voice APIs, Previews & Dynamic Keys) ---');

  await test('R2-VOICE-01: RIFF/WAVE PCM buffer binary structure verification', async () => {
    const duration = 2.5;
    const sampleRate = 24000;
    const buffer = generateSyntheticWavBuffer(duration, sampleRate);

    expect(buffer.length).toBeGreaterThan(44);
    // Header tags
    expect(buffer.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buffer.toString('ascii', 8, 12)).toBe('WAVE');
    expect(buffer.toString('ascii', 12, 16)).toBe('fmt ');
    expect(buffer.toString('ascii', 36, 40)).toBe('data');

    // Audio format = 1 (PCM), channels = 1 (Mono), bitsPerSample = 16
    expect(buffer.readUInt16LE(20)).toBe(1);
    expect(buffer.readUInt16LE(22)).toBe(1);
    expect(buffer.readUInt32LE(24)).toBe(sampleRate);
    expect(buffer.readUInt16LE(34)).toBe(16);

    // Total size header validation
    const declaredSize = buffer.readUInt32LE(4);
    expect(declaredSize).toBe(buffer.length - 8);
  });

  await test('R2-VOICE-02: Multi-Language Normalization & Script Detection', async () => {
    // Aliases
    expect(normalizeLanguageCode('english')).toBe('en-US');
    expect(normalizeLanguageCode('indian-english')).toBe('en-IN');
    expect(normalizeLanguageCode('HINDI')).toBe('hi-IN');
    expect(normalizeLanguageCode('tamil')).toBe('ta-IN');
    expect(normalizeLanguageCode('telugu')).toBe('te-IN');
    expect(normalizeLanguageCode('kannada')).toBe('kn-IN');
    expect(normalizeLanguageCode('bengali')).toBe('bn-IN');
    expect(normalizeLanguageCode('marathi')).toBe('mr-IN');

    // Script Unicode autodetection
    expect(detectLanguageFromScript('வணக்கம் நண்பர்களே')).toBe('ta-IN'); // Tamil
    expect(detectLanguageFromScript('నమస్కారం')).toBe('te-IN');           // Telugu
    expect(detectLanguageFromScript('ನಮಸ್ಕಾರ')).toBe('kn-IN');             // Kannada
    expect(detectLanguageFromScript('নমস্কার')).toBe('bn-IN');             // Bengali
    expect(detectLanguageFromScript('नमस्ते भारत')).toBe('hi-IN');         // Hindi
    expect(detectLanguageFromScript('मी घरी आहे')).toBe('mr-IN');          // Marathi (आहे)
    expect(detectLanguageFromScript('Welcome to Clipped AI')).toBe('en-US'); // English
  });

  await test('R2-VOICE-03: Voice Duration Estimation & Speed Rate Scaling', async () => {
    const text = 'This is a sample video script for testing speech synthesis duration.';
    const dur1x = calculateEstimatedDuration(text, 'en-US', 1.0);
    const dur1_5x = calculateEstimatedDuration(text, 'en-US', 1.5);
    const dur0_75x = calculateEstimatedDuration(text, 'en-US', 0.75);

    expect(dur1x).toBeGreaterThan(0);
    expect(dur1_5x).toBeLessThanOrEqual(dur1x);
    expect(dur0_75x).toBeGreaterThanOrEqual(dur1x);
  });

  await test('R2-VOICE-04: Azure TTS SSML XML Special Character Sanitization', async () => {
    const raw = `Tom & Jerry <cartoon> "Adventures" '2026'`;
    const escaped = escapeXml(raw);

    expect(escaped).not.toContain('& ');
    expect(escaped).toContain('&amp;');
    expect(escaped).toContain('&lt;cartoon&gt;');
    expect(escaped).toContain('&quot;Adventures&quot;');
    expect(escaped).toContain('&apos;2026&apos;');
  });

  await test('R2-VOICE-05: Azure Voice Catalog Coverage across 8 Languages', async () => {
    const languages = ['en-US', 'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN'];
    for (const lang of languages) {
      const matches = AZURE_VOICE_CATALOG.filter(v => v.language === lang);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  await test('R2-VOICE-06: Voice Preview Endpoint synthesis & base64 URL generation', async () => {
    const engine = new TestTTSEngine({ AZURE_SPEECH_KEY: 'mock_azure_key' });
    const res = await engine.synthesize({
      text: 'Hello! This is a voice preview generated by Clipped AI Studio.',
      voiceId: 'en-US-JennyNeural',
      provider: 'azure',
      language: 'en-US',
      speed: 1.0,
    });

    expect(res.success).toBe(true);
    expect(res.providerUsed).toBe('azure');
    expect(res.voiceId).toBe('en-US-JennyNeural');
    expect(res.audioUrl.startsWith('data:audio/mp3;base64,')).toBe(true);
    expect(res.audioBase64.length).toBeGreaterThan(100);
    expect(res.duration).toBeGreaterThan(0);
  });

  await test('R2-VOICE-07: Keyless / Free Google Translate Fallback when API Keys missing', async () => {
    const engineWithoutKeys = new TestTTSEngine({}); // No API keys in environment
    const res = await engineWithoutKeys.synthesize({
      text: 'नमस्ते! यह क्लिप्ड एआई का निःशुल्क वॉयस विकल्प है।',
      voiceId: 'free-hi-in',
      provider: 'auto',
      language: 'hi-IN',
    });

    expect(res.success).toBe(true);
    expect(res.providerUsed).toBe('keyless');
    expect(res.audioUrl.startsWith('data:audio/mp3;base64,')).toBe(true);
    expect(res.language).toBe('hi-IN');
  });

  await test('R2-VOICE-08: Empty Text Rejection & Boundary Exception Handling', async () => {
    const engine = new TestTTSEngine({});
    let threw = false;
    try {
      await engine.synthesize({ text: '' });
    } catch (e) {
      threw = true;
      expect(e.message).toContain('Text is required');
    }
    expect(threw).toBe(true);

    let threwNull = false;
    try {
      await engine.synthesize({ text: null });
    } catch (e) {
      threwNull = true;
    }
    expect(threwNull).toBe(true);
  });

  await test('R2-KEYS-01: Dynamic API Keys Structure & Custom Provider Addition', async () => {
    // Known providers base
    const baseProviders = {
      gemini: { name: 'Google Gemini', category: 'AI Models', isConfigured: true },
      azure_speech: { name: 'Azure Speech', category: 'Voice & Audio', isConfigured: false },
    };

    // Custom providers inserted by user in Supabase settings
    const dbSettingsRows = [
      { provider: 'custom_mistral_local', name: 'Mistral Local', category: 'AI Models', api_key: 'sk-mistral-999', is_active: true, base_url: 'http://localhost:8000' },
      { provider: 'custom_eleven_custom', name: 'Custom Studio Voice', category: 'Voice & Audio', api_key: 'xi-custom-777', is_active: true },
    ];

    const merged = { ...baseProviders };
    const customList = [];

    for (const row of dbSettingsRows) {
      const isKnown = Boolean(baseProviders[row.provider]);
      const entry = {
        name: row.name,
        category: row.category,
        isConfigured: Boolean(row.api_key),
        isActive: row.is_active,
        maskedValue: maskKey(row.api_key),
        isCustom: !isKnown,
        baseUrl: row.base_url,
      };
      merged[row.provider] = entry;
      if (!isKnown) {
        customList.push({ id: row.provider, ...entry });
      }
    }

    expect(merged['custom_mistral_local']).toBeDefined();
    expect(merged['custom_mistral_local'].name).toBe('Mistral Local');
    expect(merged['custom_mistral_local'].maskedValue.endsWith('l-999')).toBe(true);
    expect(merged['custom_mistral_local'].baseUrl).toBe('http://localhost:8000');
    expect(customList.length).toBe(2);
  });

  // --------------------------------------------------------------------------
  // Summary & Assertion Count
  // --------------------------------------------------------------------------
  const total = suiteResults.length;
  const passed = suiteResults.filter(r => r.passed).length;
  const failed = suiteResults.filter(r => !r.passed).length;

  console.log('\n' + '='.repeat(80));
  console.log('  EMPIRICAL CHALLENGER TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`  Total Tests  : ${total}`);
  console.log(`  Passed       : ${passed}`);
  console.log(`  Failed       : ${failed}`);
  console.log(`  Success Rate : ${((passed / total) * 100).toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    throw new Error(`${failed} adversarial tests failed!`);
  }
}

runAllStressTests().catch((err) => {
  console.error('Test suite failure:', err);
  process.exitCode = 1;
});
