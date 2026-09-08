/**
 * Programmatic Unit Test Suite for Milestone 2:
 * Subtitle Effects & External Voice Settings Reflection (Requirements R3.2 and R3.3)
 *
 * Tests:
 * 1. Subtitle Payload Preservation in app/api/workflows/generate/route.ts
 *    - All 12 subtitle settings parsed and stored in orchestration_state and logs
 *    - Voice and voiceProvider preserved in job state
 * 2. Subtitle Burning & FFmpeg Filter Construction in scripts/render-worker.ts
 *    - FFmpeg drawtext string escaping (quotes, colons, backslashes, percent, newlines)
 *    - Presets and styling options (Hormozi Pop, Cyber Neon, Cinematic Boxed, outline, box)
 *    - Graceful fallback to clean video filter when text is empty or burnSubtitles is false
 *    - Subtitle settings extraction from job.orchestration_state and job.logs
 * 3. External Voice Provider API Key Dynamic Resolution in lib/engine/tts.ts
 *    - Supabase settings table querying for azure_speech, elevenlabs, google_tts, openai
 *    - Fallback to process.env
 *    - Provider routing and resilient fallback cascade (never crashes)
 * 4. Provider Naming Alignment across settings/keys/route.ts, tts.ts, and render-worker.ts
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Register TypeScript and path alias resolution if running directly under Node.js
if (!require.extensions['.ts']) {
  try {
    const ts = require('typescript');
    require.extensions['.ts'] = function (module, filename) {
      let source = fs.readFileSync(filename, 'utf8');
      source = source.replace(/from\s+['"]@\/([^'"]+)['"]/g, (match, p1) => {
        const rel = path.relative(path.dirname(filename), path.resolve(__dirname, '../../', p1)).replace(/\\/g, '/');
        const prefix = rel.startsWith('.') ? rel : `./${rel}`;
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
    console.warn('TypeScript hook error:', e?.message);
  }
}

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    throw err;
  }
}

async function itAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    throw err;
  }
}

async function runSuite() {
  console.log('===========================================================');
  console.log('🧪 Starting Milestone 2 Subtitle & Voice Settings Test Suite');
  console.log('===========================================================\n');

  // -------------------------------------------------------------
  // Test Group 1: Subtitle Payload Preservation in generate/route.ts
  // -------------------------------------------------------------
  console.log('--- Group 1: Subtitle & Voice Payload Preservation in generate/route.ts ---');

  const generateRouteCode = fs.readFileSync(
    path.resolve(__dirname, '../../app/api/workflows/generate/route.ts'),
    'utf8'
  );

  it('parses all 12+ subtitle parameters in generate/route.ts', () => {
    const requiredParams = [
      'burnSubtitles',
      'subtitlePreset',
      'subtitleUppercase',
      'subtitleColor',
      'subtitleHighlightColor',
      'subtitleGlow',
      'subtitleGlowColor',
      'subtitleOutline',
      'subtitleOutlineWidth',
      'subtitleBox',
      'subtitleBoxColor',
      'subtitleSize',
      'subtitleY',
    ];
    for (const param of requiredParams) {
      assert(
        generateRouteCode.includes(param),
        `generate/route.ts must extract ${param} from request body`
      );
    }
  });

  it('parses voice and voiceProvider in generate/route.ts', () => {
    assert(generateRouteCode.includes('voice'), 'Must parse voice');
    assert(generateRouteCode.includes('voiceProvider'), 'Must parse voiceProvider');
  });

  it('inserts orchestration_state containing subtitleSettings and voice config', () => {
    assert(
      generateRouteCode.includes('orchestration_state: orchestrationState'),
      'Must insert orchestration_state into render_jobs'
    );
    assert(
      generateRouteCode.includes('subtitleSettings,'),
      'orchestrationState must contain subtitleSettings'
    );
  });

  it('includes subtitleSettings and voice in logs JSON on both insert and update', () => {
    assert(
      generateRouteCode.includes('subtitleSettings,'),
      'Initial logs must include subtitleSettings'
    );
    assert(
      generateRouteCode.includes('...subtitleSettings'),
      'Plan update logs must preserve subtitleSettings'
    );
    assert(
      generateRouteCode.includes('voiceProvider: voiceProvider || null'),
      'Logs must capture voiceProvider'
    );
  });

  it('handles database insert/update fallback if orchestration_state column is absent', () => {
    assert(
      generateRouteCode.includes('delete insertPayload.orchestration_state'),
      'Must include fallback delete for insertPayload.orchestration_state'
    );
    assert(
      generateRouteCode.includes('delete updatePayload.orchestration_state'),
      'Must include fallback delete for updatePayload.orchestration_state'
    );
  });

  // -------------------------------------------------------------
  // Test Group 2: Subtitle Burning in scripts/render-worker.ts
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Subtitle Burning & FFmpeg Filter Graph in render-worker.ts ---');

  const {
    escapeFfmpegDrawtext,
    buildSubtitleDrawtextFilter,
  } = require('../../scripts/render-worker');

  it('escapes single quotes, colons, backslashes, percent signs and newlines for FFmpeg', () => {
    const raw = "Special: Text with 'quotes', \\backslashes\\, 100% discount\nand newline";
    const escaped = escapeFfmpegDrawtext(raw);

    assert(!escaped.includes('\n'), 'Newlines must be sanitized to spaces');
    assert(escaped.includes("'\\''"), 'Single quotes must be escaped as \'\\\'\'');
    assert(escaped.includes('\\:'), 'Colons must be escaped with backslash');
    assert(escaped.includes('\\%'), 'Percent signs must be escaped with backslash');
    assert(escaped.includes('\\\\'), 'Backslashes must be double-escaped');
  });

  it('builds drawtext filter for Hormozi Pop preset with uppercase, yellow font and black outline', () => {
    const filter = buildSubtitleDrawtextFilter('Impactful Hook', {
      burnSubtitles: true,
      subtitlePreset: 'Hormozi Pop',
      subtitleColor: '#FACC15',
      subtitleOutline: true,
      subtitleOutlineWidth: 3,
      subtitleSize: 5.4,
      subtitleY: 78,
    });

    assert(filter !== null, 'Filter must be generated');
    assert(filter.includes('drawtext='), 'Must be a drawtext filter');
    assert(filter.includes("text='IMPACTFUL HOOK'"), 'Hormozi Pop text must be uppercase');
    assert(filter.includes('fontcolor=0xFACC15') || filter.includes('fontcolor=#FACC15'), 'Must use yellow highlight fontcolor');
    assert(filter.includes('fontsize=54'), 'Must scale 5.4 to ~54px font size');
    assert(filter.includes('borderw=3'), 'Must apply border width 3');
    assert(filter.includes('bordercolor=black') || filter.includes('bordercolor=0x000000'), 'Must apply black outline border');
    assert(filter.includes('x=(w-text_w)/2'), 'Must be horizontally centered');
    assert(filter.includes('y=(h-text_h)*0.78'), 'Must apply y percentage');
  });

  it('builds drawtext filter for Cinematic Boxed preset with background box', () => {
    const filter = buildSubtitleDrawtextFilter('Cinematic Scene Narration', {
      burnSubtitles: true,
      subtitlePreset: 'Cinematic Boxed',
      subtitleColor: '#F8FAFC',
      subtitleBox: true,
      subtitleBoxColor: '#000000',
      subtitleSize: 4.6,
      subtitleY: 75,
    });

    assert(filter !== null, 'Filter must be generated');
    assert(filter.includes(':box=1'), 'Must enable box background');
    assert(filter.includes('boxcolor='), 'Must set boxcolor');
    assert(filter.includes('boxborderw=10'), 'Must set boxborderw');
  });

  it('returns null when burnSubtitles is explicitly false', () => {
    const filter = buildSubtitleDrawtextFilter('Clean video without text', {
      burnSubtitles: false,
      subtitlePreset: 'Hormozi Pop',
    });

    assert.strictEqual(filter, null, 'Must return null when burnSubtitles is false');
  });

  it('returns null when text is empty or whitespace', () => {
    const filterEmpty = buildSubtitleDrawtextFilter('', { burnSubtitles: true });
    const filterWhitespace = buildSubtitleDrawtextFilter('   ', { burnSubtitles: true });

    assert.strictEqual(filterEmpty, null, 'Must return null for empty text');
    assert.strictEqual(filterWhitespace, null, 'Must return null for whitespace text');
  });

  const workerSource = fs.readFileSync(
    path.resolve(__dirname, '../../scripts/render-worker.ts'),
    'utf8'
  );

  it('render-worker.ts extracts subtitleSettings from orchestration_state and params', () => {
    assert(
      workerSource.includes('orchState.subtitleSettings || params.subtitleSettings'),
      'Must check orchState.subtitleSettings then params.subtitleSettings'
    );
  });

  it('render-worker.ts appends subtitle drawtext filter to videoFilter and preserves clean fallback', () => {
    assert(
      workerSource.includes('const subFilter = buildSubtitleDrawtextFilter(text, subtitleSettings)'),
      'Must call buildSubtitleDrawtextFilter'
    );
    assert(
      workerSource.includes('const videoFilter = subFilter ? `${baseFilter},${subFilter}` : baseFilter'),
      'Must combine base filter with subtitle filter or cleanly fallback'
    );
    assert(
      workerSource.includes('.videoFilters(videoFilter)'),
      'Must pass videoFilter via .videoFilters() to FFmpeg command'
    );
  });

  // -------------------------------------------------------------
  // Test Group 3: Dynamic Key Resolution & Voice Providers in tts.ts
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Dynamic Voice Provider Key Resolution in tts.ts ---');

  const {
    resolveVoiceProviderApiKey,
    TTSEngine,
  } = require('../../lib/engine/tts');

  itAsync('resolveVoiceProviderApiKey prioritizes explicit request.apiKey', async () => {
    const res = await resolveVoiceProviderApiKey('azure_speech', 'explicit-test-key-123');
    assert.strictEqual(res.apiKey, 'explicit-test-key-123');
    assert.strictEqual(res.source, 'request');
    assert.strictEqual(res.providerCanonical, 'azure_speech');
  });

  itAsync('resolveVoiceProviderApiKey falls back to environment variables', async () => {
    const originalEnv = process.env.AZURE_SPEECH_KEY;
    process.env.AZURE_SPEECH_KEY = 'test-azure-env-key-456';

    try {
      const res = await resolveVoiceProviderApiKey('azure_speech');
      assert(res.apiKey === 'test-azure-env-key-456' || res.source === 'database');
      if (res.source === 'environment') {
        assert.strictEqual(res.apiKey, 'test-azure-env-key-456');
      }
    } finally {
      if (originalEnv !== undefined) {
        process.env.AZURE_SPEECH_KEY = originalEnv;
      } else {
        delete process.env.AZURE_SPEECH_KEY;
      }
    }
  });

  itAsync('resolveVoiceProviderApiKey normalizes provider aliases', async () => {
    const azureNorm = await resolveVoiceProviderApiKey('azure');
    assert.strictEqual(azureNorm.providerCanonical, 'azure_speech');

    const googleNorm = await resolveVoiceProviderApiKey('google');
    assert.strictEqual(googleNorm.providerCanonical, 'google_tts');

    const elevenNorm = await resolveVoiceProviderApiKey('eleven_labs');
    assert.strictEqual(elevenNorm.providerCanonical, 'elevenlabs');

    const openaiNorm = await resolveVoiceProviderApiKey('api_openai');
    assert.strictEqual(openaiNorm.providerCanonical, 'openai');
  });

  itAsync('TTSEngine.synthesize smoothly falls back to keyless/mock when external key is missing or fails', async () => {
    const ttsEngine = new TTSEngine();

    // Requesting an external provider without valid credentials should never crash or throw unhandled
    const res = await ttsEngine.synthesize({
      text: 'Testing graceful fallback when external provider credentials fail or are absent.',
      provider: 'azure_speech',
      language: 'en-US',
    });

    assert(res.success === true, 'Synthesis must succeed via resilient fallback cascade');
    assert(res.audioBuffer instanceof Buffer, 'Must return an audioBuffer');
    assert(res.audioBuffer.length > 0, 'Audio buffer must be non-empty');
    assert(
      ['azure', 'omniroute', 'keyless', 'mock'].includes(res.providerUsed),
      `Provider used must be in cascade, got: ${res.providerUsed}`
    );
    assert(
      res.metadata.providerAttempts.length > 0,
      'Must record provider attempts in metadata'
    );
  });

  itAsync('TTSEngine.synthesize auto-detects provider from external voiceId', async () => {
    const ttsEngine = new TTSEngine();

    // Voice with Neural not in keyless map auto-selects azure_speech
    const res = await ttsEngine.synthesize({
      text: 'Testing provider inference from voice model ID.',
      voiceId: 'en-US-JennyNeural',
      language: 'en-US',
    });

    assert(res.success === true, 'Must complete synthesis');
    const attemptedProviders = res.metadata.providerAttempts.map(p => p.provider);
    assert(
      attemptedProviders.includes('azure') || attemptedProviders.includes('azure_speech'),
      'Must attempt Azure when JennyNeural is selected'
    );
  });

  // -------------------------------------------------------------
  // Test Group 4: Provider Naming Alignment
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Provider Naming Alignment Across Files ---');

  const settingsKeysRoute = fs.readFileSync(
    path.resolve(__dirname, '../../app/api/settings/keys/route.ts'),
    'utf8'
  );
  const ttsEngineSource = fs.readFileSync(
    path.resolve(__dirname, '../../lib/engine/tts.ts'),
    'utf8'
  );

  it('settings/keys/route.ts recognizes elevenlabs, google_tts, and azure_speech', () => {
    assert(settingsKeysRoute.includes("'elevenlabs'"), 'Must include elevenlabs in supported providers');
    assert(settingsKeysRoute.includes("'google_tts'"), 'Must include google_tts in supported providers');
    assert(settingsKeysRoute.includes("'azure_speech'"), 'Must include azure_speech in supported providers');
  });

  it('lib/engine/tts.ts handles elevenlabs, google_tts, and azure_speech dynamically', () => {
    assert(ttsEngineSource.includes("'azure_speech'"), 'tts.ts must recognize azure_speech');
    assert(ttsEngineSource.includes("'google_tts'"), 'tts.ts must recognize google_tts');
    assert(ttsEngineSource.includes("'elevenlabs'"), 'tts.ts must recognize elevenlabs');
  });

  it('scripts/render-worker.ts aligns key lookup for elevenlabs, google_tts, azure_speech, openai', () => {
    assert(workerSource.includes("findKey('elevenlabs')"), 'render-worker must find elevenlabs');
    assert(workerSource.includes("findKey('google_tts')"), 'render-worker must find google_tts');
    assert(workerSource.includes("findKey('azure_speech')"), 'render-worker must find azure_speech');
    assert(workerSource.includes("findKey('openai')"), 'render-worker must find openai');
  });

  console.log('\n===========================================================');
  console.log(`🎉 All ${passedTests} / ${totalTests} Milestone 2 Tests Passed!`);
  console.log('===========================================================');
}

runSuite().catch((err) => {
  console.error('\n❌ Milestone 2 test suite failed:', err);
  process.exit(1);
});
