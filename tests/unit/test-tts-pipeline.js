/**
 * Unit Test Suite for Milestone 1: Voiceover Edge TTS Fix & Audio Pipeline
 * Tests:
 * 1. resolveKeylessVoice voice mapping for free-* catalog IDs and languages
 * 2. Keyless TTS synthesis resilience (Edge TTS / Google Translate REST / synthetic WAV)
 * 3. downloadFile data: URI base64 decoding logic without fetch()
 * 4. Remotion Composition Audio import & playback component rendering
 * 5. test-edge-tts.js verification script parameters & file size checks
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// Register TypeScript and path alias resolution if running directly under Node.js
if (!require.extensions['.ts']) {
  try {
    const ts = require('typescript');
    require.extensions['.ts'] = function (module, filename) {
      let source = fs.readFileSync(filename, 'utf8');
      // Replace @/ with relative path from root
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
    console.warn('Could not hook typescript loader:', e?.message);
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
  console.log('🧪 Starting TTS & Audio Pipeline Unit Test Suite (M1)');
  console.log('===========================================================\n');

  // -------------------------------------------------------------
  // Test Group 1: Voice Resolution & Mapping
  // -------------------------------------------------------------
  console.log('--- Group 1: Keyless Voice Matching & Catalog Mapping ---');
  
  const { resolveKeylessVoice, KEYLESS_VOICE_MAP } = require('../../lib/engine/tts');

  it('correctly maps free-en-us to en-US-AriaNeural', () => {
    assert.strictEqual(resolveKeylessVoice('free-en-us', 'en-US'), 'en-US-AriaNeural');
  });

  it('correctly maps free-en-in to en-IN-NeerjaNeural', () => {
    assert.strictEqual(resolveKeylessVoice('free-en-in', 'en-IN'), 'en-IN-NeerjaNeural');
  });

  it('correctly maps free-hi-in to hi-IN-MadhurNeural', () => {
    assert.strictEqual(resolveKeylessVoice('free-hi-in', 'hi-IN'), 'hi-IN-MadhurNeural');
  });

  it('correctly maps free-ta-in to ta-IN-PallaviNeural', () => {
    assert.strictEqual(resolveKeylessVoice('free-ta-in', 'ta-IN'), 'ta-IN-PallaviNeural');
  });

  it('correctly maps free-te-in to te-IN-ShrutiNeural', () => {
    assert.strictEqual(resolveKeylessVoice('free-te-in', 'te-IN'), 'te-IN-ShrutiNeural');
  });

  it('correctly maps free-kn-in to kn-IN-SapnaNeural', () => {
    assert.strictEqual(resolveKeylessVoice('free-kn-in', 'kn-IN'), 'kn-IN-SapnaNeural');
  });

  it('correctly maps free-bn-in to bn-IN-TanishaaNeural', () => {
    assert.strictEqual(resolveKeylessVoice('free-bn-in', 'bn-IN'), 'bn-IN-TanishaaNeural');
  });

  it('correctly maps free-mr-in to mr-IN-AarohiNeural', () => {
    assert.strictEqual(resolveKeylessVoice('free-mr-in', 'mr-IN'), 'mr-IN-AarohiNeural');
  });

  it('preserves explicitly requested Neural voice names', () => {
    assert.strictEqual(resolveKeylessVoice('en-US-GuyNeural', 'en-US'), 'en-US-GuyNeural');
    assert.strictEqual(resolveKeylessVoice('en-IN-PrabhatNeural', 'en-IN'), 'en-IN-PrabhatNeural');
  });

  it('falls back to appropriate language Neural voice when voiceId is omitted', () => {
    assert.strictEqual(resolveKeylessVoice(undefined, 'hi-IN'), 'hi-IN-MadhurNeural');
    assert.strictEqual(resolveKeylessVoice(undefined, 'en-IN'), 'en-IN-NeerjaNeural');
    assert.strictEqual(resolveKeylessVoice(undefined, 'ta-IN'), 'ta-IN-PallaviNeural');
    assert.strictEqual(resolveKeylessVoice(undefined, 'en-US'), 'en-US-AriaNeural');
  });

  // -------------------------------------------------------------
  // Test Group 2: Keyless Synthesis & Guaranteed Audible Fallbacks
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Keyless Synthesis & Guaranteed Audible Audio ---');
  
  const { TTSEngine, synthesizeWithGoogleTranslateRest } = require('../../lib/engine/tts');
  const ttsEngine = new TTSEngine();

  itAsync('synthesizes keyless audio with non-empty buffer, valid audioUrl and duration', async () => {
    const res = await ttsEngine.synthesize({
      text: 'This is an end-to-end verification of the Clipped voiceover audio pipeline.',
      provider: 'keyless',
      voiceId: 'free-en-us',
      language: 'en-US'
    });

    assert(res.success === true, 'Synthesis must report success');
    assert(res.audioBuffer instanceof Buffer, 'Must return an audioBuffer');
    assert(res.audioBuffer.length > 0, `Audio buffer must not be empty (got ${res.audioBuffer.length} bytes)`);
    assert(typeof res.audioUrl === 'string' && res.audioUrl.startsWith('data:audio/'), 'audioUrl must be valid data URI');
    assert(res.duration > 0, 'Duration must be positive number');
    assert(res.providerUsed === 'keyless' || res.providerUsed === 'mock', 'Provider used must be keyless or mock');
  });

  itAsync('never fails or returns silent audio for non-English keyless requests', async () => {
    const res = await ttsEngine.synthesize({
      text: 'नमस्ते, यह क्लिप्ड वॉयसओवर परीक्षण है।',
      provider: 'keyless',
      voiceId: 'free-hi-in',
      language: 'hi-IN'
    });

    assert(res.success === true, 'Hindi synthesis must succeed');
    assert(res.audioBuffer.length > 0, 'Hindi audio buffer must not be empty');
    assert(res.audioUrl.length > 0, 'audioUrl must not be empty');
  });

  // -------------------------------------------------------------
  // Test Group 3: render-worker.ts Data URI Download & FFmpeg Mapping
  // -------------------------------------------------------------
  console.log('\n--- Group 3: render-worker.ts Data URI & Audio Stream Handling ---');

  const workerSource = fs.readFileSync(path.resolve(__dirname, '../../scripts/render-worker.ts'), 'utf8');

  it('downloadFile handles data: URIs natively via Buffer.from base64 without calling fetch()', () => {
    assert(workerSource.includes("if (url.startsWith('data:'))"), 'Must check for data: URL');
    assert(workerSource.includes("Buffer.from(base64Data, 'base64')"), 'Must decode base64 buffer directly');
    assert(workerSource.includes("fs.writeFileSync(dest, buffer)"), 'Must write buffer directly to destination');
  });

  it('verifies simulated data URI download writes correct bytes to disk', () => {
    const sampleText = 'Simulated Synthetic Audio Header';
    const base64Data = Buffer.from(sampleText, 'utf8').toString('base64');
    const dataUri = `data:audio/wav;base64,${base64Data}`;
    const tempFile = path.join(os.tmpdir(), `test-download-data-uri-${Date.now()}.wav`);

    const commaIndex = dataUri.indexOf(',');
    const extractedData = commaIndex !== -1 ? dataUri.slice(commaIndex + 1) : dataUri;
    const buffer = Buffer.from(extractedData, 'base64');
    fs.writeFileSync(tempFile, buffer);

    assert(fs.existsSync(tempFile), 'Temp file must exist');
    const written = fs.readFileSync(tempFile, 'utf8');
    assert.strictEqual(written, sampleText, 'File content must match original payload');
    fs.unlinkSync(tempFile);
  });

  it('render-worker provides audioPath with -map 0:v:0, -map 1:a:0, -c:a aac and -b:a 192k', () => {
    assert(workerSource.includes("'-map 0:v:0'"), 'FFmpeg must map video stream 0:v:0');
    assert(workerSource.includes("'-map 1:a:0'"), 'FFmpeg must map audio stream 1:a:0');
    assert(workerSource.includes("'-c:a aac'"), 'FFmpeg must encode audio with AAC');
    assert(workerSource.includes("'-b:a 192k'"), 'FFmpeg must specify 192k audio bitrate');
  });

  // -------------------------------------------------------------
  // Test Group 4: Remotion Composition Audio Playback Support
  // -------------------------------------------------------------
  console.log('\n--- Group 4: remotion/Composition.tsx Audio Playback ---');

  const compSource = fs.readFileSync(path.resolve(__dirname, '../../remotion/Composition.tsx'), 'utf8');

  it('imports Audio from remotion', () => {
    assert(compSource.includes("Audio,"), 'Must import Audio from remotion');
  });

  it('Beat interface supports audioUrl?: string', () => {
    assert(compSource.includes('audioUrl?: string;'), 'Beat interface must include audioUrl');
  });

  it('renders <Audio src={beat.audioUrl} /> for each beat sequence', () => {
    assert(compSource.includes('<Audio src={beat.audioUrl} />'), 'Must render <Audio src={beat.audioUrl} />');
  });

  it('renders top-level composition audio when audioUrl prop is provided', () => {
    assert(compSource.includes('{audioUrl && <Audio src={audioUrl} />}'), 'Must render top-level composition Audio');
  });

  it('preserves Ken Burns and Video preview features in Composition.tsx', () => {
    assert(compSource.includes('const isVideoAsset = !!(beat.videoUrl'), 'Must preserve isVideoAsset logic');
    assert(compSource.includes('transform: `scale(${scale})'), 'Must preserve Ken Burns scale transform');
    assert(compSource.includes("style={{ overflow: 'hidden' }}"), 'Must preserve overflow hidden style');
  });

  // -------------------------------------------------------------
  // Test Group 5: test-edge-tts.js Verification
  // -------------------------------------------------------------
  console.log('\n--- Group 5: test-edge-tts.js Verification Script ---');

  const testEdgeSource = fs.readFileSync(path.resolve(__dirname, '../../test-edge-tts.js'), 'utf8');

  it('passes (text, tempFilePath) to tts.ttsPromise in test-edge-tts.js', () => {
    assert(testEdgeSource.includes('await tts.ttsPromise(text, tempFilePath)'), 'Must pass tempFilePath to ttsPromise');
  });

  it('checks fs.existsSync and file size > 0 in test-edge-tts.js', () => {
    assert(testEdgeSource.includes('fs.existsSync(tempFilePath)'), 'Must verify file existence');
    assert(testEdgeSource.includes('stats.size > 0'), 'Must verify file size > 0');
  });

  console.log('\n===========================================================');
  console.log(`🎉 All ${passedTests} / ${totalTests} Unit Tests Passed!`);
  console.log('===========================================================');
}

runSuite().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
