const fs = require('fs');
const path = require('path');
const ts = require('typescript');

console.log('--- Starting TTS Engine Verification Suite ---');

const ttsPath = path.resolve(__dirname, '../../lib/engine/tts.ts');
if (!fs.existsSync(ttsPath)) {
  console.error(`ERROR: ${ttsPath} not found!`);
  process.exit(1);
}

const sourceCode = fs.readFileSync(ttsPath, 'utf8');
const transpiled = ts.transpileModule(sourceCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});

// Evaluate the transpiled module in a sandbox module scope
const evalModule = { exports: {} };
const runFn = new Function('module', 'exports', 'require', '__dirname', transpiled.outputText);
runFn(evalModule, evalModule.exports, require, path.dirname(ttsPath));

const {
  ttsEngine,
  TTSEngine,
  normalizeLanguageCode,
  detectLanguageFromScript,
  generateSyntheticWavBuffer,
  calculateEstimatedDuration,
  ELEVENLABS_VOICES,
  GOOGLE_DEFAULT_VOICES,
  COQUI_LANG_MAP,
  ELEVENLABS_LANG_MAP,
  LANGUAGE_ALIASES,
} = evalModule.exports;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n[Suite 1: Language Normalization & Script Detection]');
  assert(normalizeLanguageCode('en') === 'en-US', 'Alias "en" -> "en-US"');
  assert(normalizeLanguageCode('en-us') === 'en-US', 'Alias "en-us" -> "en-US"');
  assert(normalizeLanguageCode('english') === 'en-US', 'Alias "english" -> "en-US"');
  assert(normalizeLanguageCode('en_in') === 'en-IN', 'Alias "en_in" -> "en-IN"');
  assert(normalizeLanguageCode('indian-english') === 'en-IN', 'Alias "indian-english" -> "en-IN');
  assert(normalizeLanguageCode('hi') === 'hi-IN', 'Alias "hi" -> "hi-IN"');
  assert(normalizeLanguageCode('hindi') === 'hi-IN', 'Alias "hindi" -> "hi-IN"');
  assert(normalizeLanguageCode('HINDI') === 'hi-IN', 'Uppercase "HINDI" -> "hi-IN"');
  assert(normalizeLanguageCode('ta') === 'ta-IN', 'Alias "ta" -> "ta-IN"');
  assert(normalizeLanguageCode('tamil') === 'ta-IN', 'Alias "tamil" -> "ta-IN"');
  assert(normalizeLanguageCode('te') === 'te-IN', 'Alias "te" -> "te-IN"');
  assert(normalizeLanguageCode('telugu') === 'te-IN', 'Alias "telugu" -> "te-IN"');
  assert(normalizeLanguageCode('kn') === 'kn-IN', 'Alias "kn" -> "kn-IN"');
  assert(normalizeLanguageCode('kannada') === 'kn-IN', 'Alias "kannada" -> "kn-IN"');
  assert(normalizeLanguageCode('bn') === 'bn-IN', 'Alias "bn" -> "bn-IN"');
  assert(normalizeLanguageCode('bengali') === 'bn-IN', 'Alias "bengali" -> "bn-IN"');
  assert(normalizeLanguageCode('bangla') === 'bn-IN', 'Alias "bangla" -> "bn-IN"');
  assert(normalizeLanguageCode('mr') === 'mr-IN', 'Alias "mr" -> "mr-IN"');
  assert(normalizeLanguageCode('marathi') === 'mr-IN', 'Alias "marathi" -> "mr-IN"');
  assert(normalizeLanguageCode(undefined) === 'en-US', 'Default undefined -> "en-US"');
  assert(normalizeLanguageCode('unknown-lang') === 'en-US', 'Unknown string -> "en-US"');

  // Script detection
  assert(detectLanguageFromScript('வணக்கம் எப்படி இருக்கிறீர்கள்') === 'ta-IN', 'Tamil script detection');
  assert(detectLanguageFromScript('నమస్కారం ఎలా ఉన్నారు') === 'te-IN', 'Telugu script detection');
  assert(detectLanguageFromScript('ನಮಸ್ಕಾರ ಹೇಗಿದ್ದೀರ') === 'kn-IN', 'Kannada script detection');
  assert(detectLanguageFromScript('নমস্কার কেমন আছেন') === 'bn-IN', 'Bengali script detection');
  assert(detectLanguageFromScript('नमस्ते आप कैसे हैं') === 'hi-IN', 'Hindi Devanagari detection');
  assert(detectLanguageFromScript('नमस्कार, काय चाललं आहे') === 'mr-IN', 'Marathi Devanagari detection');

  console.log('\n[Suite 2: Synthetic WAV Buffer & Duration Calculation]');
  const wavBuf = generateSyntheticWavBuffer(2.5, 24000);
  assert(Buffer.isBuffer(wavBuf), 'Returns a valid Node.js Buffer');
  assert(wavBuf.toString('ascii', 0, 4) === 'RIFF', 'WAV starts with RIFF header');
  assert(wavBuf.toString('ascii', 8, 12) === 'WAVE', 'WAV contains WAVE format tag');
  assert(wavBuf.toString('ascii', 12, 16) === 'fmt ', 'WAV contains fmt sub-chunk');
  assert(wavBuf.readUInt16LE(20) === 1, 'Audio format is PCM (1)');
  assert(wavBuf.readUInt16LE(22) === 1, 'Number of channels is 1 (Mono)');
  assert(wavBuf.readUInt32LE(24) === 24000, 'Sample rate is 24000 Hz');
  assert(wavBuf.readUInt16LE(34) === 16, 'Bits per sample is 16');
  assert(wavBuf.toString('ascii', 36, 40) === 'data', 'WAV contains data sub-chunk');
  const expectedDataBytes = Math.floor(24000 * 2.5) * 2;
  const expectedTotalBytes = 44 + expectedDataBytes;
  assert(wavBuf.length === expectedTotalBytes, `WAV buffer length matches expected (${wavBuf.length} === ${expectedTotalBytes})`);

  // Duration calculation
  const englishText = 'This is a test script with eight words total.';
  const durEn = calculateEstimatedDuration(englishText, 'en-US', 1.0);
  assert(durEn > 2.5 && durEn < 4.0, `English duration estimated correctly: ${durEn}s`);
  const durHindi = 'यह हिंदी में एक परीक्षण वाक्य है जिसके आठ शब्द हैं।';
  const durHi = calculateEstimatedDuration(durHindi, 'hi-IN', 1.0);
  assert(durHi > 3.0 && durHi < 5.0, `Hindi duration estimated correctly: ${durHi}s`);

  console.log('\n[Suite 3: TTSEngine Mock / Dry-Run Synthesis]');
  const mockRes = await ttsEngine.synthesize({
    text: 'Welcome to Clipped AI video generator platform.',
    language: 'en-US',
    mock: true,
  });

  assert(mockRes.success === true, 'Mock synthesis returns success: true');
  assert(mockRes.providerUsed === 'mock', 'providerUsed is "mock"');
  assert(mockRes.format === 'wav', 'Format is "wav"');
  assert(mockRes.mimeType === 'audio/wav', 'mimeType is "audio/wav"');
  assert(mockRes.audioUrl.startsWith('data:audio/wav;base64,'), 'audioUrl is valid data URI');
  assert(Buffer.isBuffer(mockRes.audioBuffer), 'audioBuffer is Buffer instance');
  assert(mockRes.audioBuffer.length > 44, 'audioBuffer has audio payload');
  assert(mockRes.metadata.isDryRun === true, 'metadata.isDryRun is true');
  assert(mockRes.duration >= 1.0, `duration is realistic (${mockRes.duration}s)`);

  console.log('\n[Suite 4: Provider Fallback Cascade when Keys are Missing]');
  // Clear env vars to simulate offline / non-credentialed run
  const originalElevenKey = process.env.ELEVENLABS_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_TTS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.GOOGLE_TTS_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  const fallbackRes = await ttsEngine.synthesize({
    text: 'Testing automatic cascade fallback from ElevenLabs to Google to Coqui to Mock.',
    language: 'hi-IN',
    provider: 'auto',
  });

  assert(fallbackRes.success === true, 'Cascade returns success: true');
  assert(fallbackRes.providerUsed === 'mock', 'Fell back to mock when live providers skipped/failed');
  assert(fallbackRes.metadata.providerAttempts.length >= 2, 'Logged provider attempts in metadata');
  const elevenAttempt = fallbackRes.metadata.providerAttempts.find(a => a.provider === 'elevenlabs');
  assert(elevenAttempt && elevenAttempt.status === 'skipped', 'ElevenLabs skipped due to missing key');
  const googleAttempt = fallbackRes.metadata.providerAttempts.find(a => a.provider === 'google');
  assert(googleAttempt && googleAttempt.status === 'skipped', 'Google skipped due to missing key');

  // Restore env keys
  if (originalElevenKey) process.env.ELEVENLABS_API_KEY = originalElevenKey;
  if (originalGoogleKey) process.env.GOOGLE_TTS_API_KEY = originalGoogleKey;

  console.log('\n[Suite 5: Multi-Lingual Indian Language Synthesis & Voice Resolution]');
  const languages = ['en-US', 'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN'];
  for (const lang of languages) {
    const res = await ttsEngine.synthesize({
      text: `Testing voice synthesis for locale ${lang}`,
      language: lang,
      mock: true,
    });
    assert(res.language === lang, `Language ${lang} preserved in response`);
    assert(res.voiceId && res.voiceId.length > 0, `Voice resolved for ${lang}: ${res.voiceId}`);
  }

  console.log('\n[Suite 6: Available Voices Catalog]');
  const allVoices = ttsEngine.getAvailableVoices();
  assert(allVoices.length > 15, `Available voices catalog populated (${allVoices.length} voices)`);
  const hindiVoices = ttsEngine.getAvailableVoices('hi-IN');
  assert(hindiVoices.length >= 2, `Hindi voices catalog has female and male options (${hindiVoices.length} voices)`);

  console.log(`\n=============================================`);
  console.log(`Verification Complete: ${passed} passed, ${failed} failed`);
  console.log(`=============================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
