const { EdgeTTS } = require('node-edge-tts');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  const tempFilePath = path.join(os.tmpdir(), `edge-tts-test-${Date.now()}.mp3`);
  console.log('[Test Edge TTS] Output destination:', tempFilePath);

  const tts = new EdgeTTS({
    voice: 'en-US-AriaNeural',
    lang: 'en-US',
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
  });

  const text = "Hello, this is a test from Microsoft Edge.";

  try {
    console.log(`[Test Edge TTS] Calling tts.ttsPromise("${text}", "${tempFilePath}")...`);
    await tts.ttsPromise(text, tempFilePath);

    if (fs.existsSync(tempFilePath)) {
      const stats = fs.statSync(tempFilePath);
      console.log(`[Test Edge TTS] File created successfully: ${tempFilePath} (${stats.size} bytes)`);
      if (stats.size > 0) {
        console.log('[Test Edge TTS] ✅ Verification SUCCESS: Audio file created and size > 0 bytes.');
      } else {
        console.error('[Test Edge TTS] ❌ Verification FAIL: Output file is empty (0 bytes).');
      }
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    } else {
      console.error('[Test Edge TTS] ❌ Verification FAIL: Output file does not exist.');
    }
  } catch (err) {
    console.error('[Test Edge TTS] Error executing Edge TTS:', err?.message || err);
    if (fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
  }
}

main();
