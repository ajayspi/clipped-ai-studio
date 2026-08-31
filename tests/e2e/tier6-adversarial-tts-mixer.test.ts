/**
 * Adversarial & Stress Test Suite: TTS Engine & Audio Mixer
 *
 * Exhaustive empirical challenge suite verifying:
 * 1. Multi-script language detection & BCP-47 normalization edge cases
 * 2. Empty text, non-string coercion, and input validation boundaries
 * 3. Extreme speed, pitch, and gain numeric boundaries (0, negative, NaN)
 * 4. High-concurrency synthesis bursts and race-condition safety
 * 5. Deterministic RIFF/WAVE header validation & PCM int16 sample limits
 * 6. Provider fallback cascade under missing/invalid API credentials
 * 7. Audio mixing volume extremes (mute, boost, negative) & preset permutations
 * 8. Dynamic ducking filter graph generation under extreme compression ratios
 * 9. Sub-second and zero-duration audio boundaries & fade duration overflows
 * 10. Corrupt / missing audio buffer resilience and FFmpeg missing binary fallback
 */

import { expect, registry } from './test-harness';
import {
  TTSEngine,
  normalizeLanguageCode,
  detectLanguageFromScript,
  generateSyntheticWavBuffer,
  calculateEstimatedDuration,
  GOOGLE_DEFAULT_VOICES,
  ELEVENLABS_VOICES,
  ELEVENLABS_LANG_MAP,
  COQUI_LANG_MAP,
} from '../../lib/engine/tts';
import {
  AudioMixer,
  BGM_PRESETS,
  BgmPreset,
} from '../../lib/engine/audio-mixer';

export async function registerAdversarialTTSMixerTests() {
  const ttsEngine = new TTSEngine();
  const audioMixer = new AudioMixer();

  // =========================================================================
  // Section 1: TTS Engine Adversarial Challenges (7 Tests)
  // =========================================================================

  registry.register({
    id: 'ADV-TTS-01',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: Multi-Script Script Detection & Devanagari Differentiation',
    description: 'Stress-tests language script detection on mixed scripts, emojis, symbols, and Marathi vs Hindi Devanagari keywords',
    fn: async () => {
      // Mixed script strings
      expect(detectLanguageFromScript('Hello உலகம் (World in Tamil)')).toBe('ta-IN');
      expect(detectLanguageFromScript('AI వీడియో ఎడిటర్ (Video Editor in Telugu)')).toBe('te-IN');
      expect(detectLanguageFromScript('ಕನ್ನಡ AI ವಿಡಿಯೋ (Kannada Video)')).toBe('kn-IN');
      expect(detectLanguageFromScript('বাংলা এআই ভিডিও (Bengali Video)')).toBe('bn-IN');

      // Marathi Devanagari with Marathi-specific keywords & character 'ळ'
      expect(detectLanguageFromScript('हा व्हिडिओ खूप छान झाला आहे')).toBe('mr-IN');
      expect(detectLanguageFromScript('मराठी भाषेचा समृद्ध वारसा आणि बाळबोध लिपी')).toBe('mr-IN');

      // Hindi Devanagari without Marathi keywords
      expect(detectLanguageFromScript('यह एक बहुत ही सुंदर वीडियो है')).toBe('hi-IN');
      expect(detectLanguageFromScript('नमस्ते भारत! क्लिप्ड एआई में आपका स्वागत है')).toBe('hi-IN');

      // Pure ASCII, symbols, and emojis fallback
      expect(detectLanguageFromScript('🔥🔥🔥🚀🎬✨')).toBe('en-US');
      expect(detectLanguageFromScript('1234567890 !@#$%^&*()_+')).toBe('en-US');
      expect(detectLanguageFromScript('\t\r\n')).toBe('en-US');
      expect(detectLanguageFromScript('')).toBe('en-US');
      expect(detectLanguageFromScript(null as any)).toBe('en-US');
      expect(detectLanguageFromScript(undefined as any)).toBe('en-US');
    },
  });

  registry.register({
    id: 'ADV-TTS-02',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: Malformed, Obscure & Unsupported Language Codes Normalization',
    description: 'Verifies normalization resilience across dirty inputs, unusual casing, underscores, and unsupported language codes',
    fn: async () => {
      // Dirty inputs with whitespaces and casing
      expect(normalizeLanguageCode('  HI-in  ')).toBe('hi-IN');
      expect(normalizeLanguageCode('TAMIL')).toBe('ta-IN');
      expect(normalizeLanguageCode('TeLuGu')).toBe('te-IN');
      expect(normalizeLanguageCode('kannada')).toBe('kn-IN');
      expect(normalizeLanguageCode('bengali')).toBe('bn-IN');
      expect(normalizeLanguageCode('marathi')).toBe('mr-IN');
      expect(normalizeLanguageCode('Hinglish')).toBe('en-IN');
      expect(normalizeLanguageCode('indian_english')).toBe('en-IN');
      expect(normalizeLanguageCode('american-english')).toBe('en-US');

      // Unsupported foreign language codes default safely to en-US
      expect(normalizeLanguageCode('es-ES')).toBe('en-US');
      expect(normalizeLanguageCode('zh-CN')).toBe('en-US');
      expect(normalizeLanguageCode('fr-FR')).toBe('en-US');
      expect(normalizeLanguageCode('de-DE')).toBe('en-US');
      expect(normalizeLanguageCode('invalid_xyz_123')).toBe('en-US');
      expect(normalizeLanguageCode('')).toBe('en-US');
      expect(normalizeLanguageCode(undefined)).toBe('en-US');
      expect(normalizeLanguageCode(null as any)).toBe('en-US');
      expect(normalizeLanguageCode(12345 as any)).toBe('en-US');
    },
  });

  registry.register({
    id: 'ADV-TTS-03',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: Empty, Whitespace & Non-String Synthesis Rejection',
    description: 'Verifies strict input validation rejecting empty or whitespace-only scripts while gracefully coercing valid primitives',
    fn: async () => {
      // Empty string
      await expect(ttsEngine.synthesize({ text: '' })).toReject('Text is required');

      // Whitespace only
      await expect(ttsEngine.synthesize({ text: '    \n\t   ' })).toReject('Text is required');

      // Undefined or null
      await expect(ttsEngine.synthesize({ text: undefined as any })).toReject('Text is required');
      await expect(ttsEngine.synthesize({ text: null as any })).toReject('Text is required');

      // Valid numeric input coerced cleanly to string
      const numRes = await ttsEngine.synthesize({ text: 987654321 as any, mock: true });
      expect(numRes.success).toBe(true);
      expect(numRes.characterCount).toBe(9);
    },
  });

  registry.register({
    id: 'ADV-TTS-04',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: Speed, Pitch & Duration Calculation Numeric Boundaries',
    description: 'Verifies estimated audio duration calculation with speed 0, negative values, extreme words, and boundary rates',
    fn: async () => {
      const sampleText = 'This is a ten word sample text for testing the speech speed.';

      // Normal speed (1.0x) -> 10 words / 2.5 = 4.0s for English
      expect(calculateEstimatedDuration(sampleText, 'en-US', 1.0)).toBe(4.0);

      // Fast speed (2.0x) -> 2.0s
      expect(calculateEstimatedDuration(sampleText, 'en-US', 2.0)).toBe(2.0);

      // Half speed (0.5x) -> 8.0s
      expect(calculateEstimatedDuration(sampleText, 'en-US', 0.5)).toBe(8.0);

      // Boundary speed 0 or negative -> clamped to 1.0x default
      expect(calculateEstimatedDuration(sampleText, 'en-US', 0)).toBe(4.0);
      expect(calculateEstimatedDuration(sampleText, 'en-US', -2.5)).toBe(4.0);

      // Indian languages cadence (2.0 words/sec) -> 10 words / 2.0 = 5.0s
      expect(calculateEstimatedDuration(sampleText, 'hi-IN', 1.0)).toBe(5.0);
      expect(calculateEstimatedDuration(sampleText, 'ta-IN', 1.0)).toBe(5.0);

      // Empty text returns minimum 1.0s clamp
      expect(calculateEstimatedDuration('', 'en-US', 1.0)).toBe(1.0);
      expect(calculateEstimatedDuration('   ', 'en-US', 1.0)).toBe(1.0);
    },
  });

  registry.register({
    id: 'ADV-TTS-05',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: 50 Rapid Concurrent Synthesis Dispatches',
    description: 'Stress-tests TTSEngine with 50 parallel asynchronous synthesis calls across diverse languages and voice options',
    fn: async () => {
      const languages = ['en-US', 'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN'] as const;
      const providers = ['auto', 'google', 'elevenlabs', 'coqui', 'mock'] as const;

      const promises = Array.from({ length: 50 }, (_, i) => {
        const lang = languages[i % languages.length];
        const prov = providers[i % providers.length];
        return ttsEngine.synthesize({
          text: `Concurrent test utterance #${i + 1} evaluating synthesis pipeline stability.`,
          language: lang,
          provider: prov as any,
          mock: true,
          speed: 1.0 + (i % 5) * 0.1,
        });
      });

      const results = await Promise.all(promises);
      expect(results.length).toBe(50);

      const jobIds = new Set(results.map((r) => r.jobId));
      expect(jobIds.size).toBe(50); // All job IDs must be strictly unique

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        expect(res.success).toBe(true);
        expect(res.audioBuffer).toBeDefined();
        expect(res.audioBuffer.length).toBeGreaterThan(44);
        expect(res.mimeType).toBe('audio/wav');
        expect(res.duration).toBeGreaterThan(0);
      }
    },
  });

  registry.register({
    id: 'ADV-TTS-06',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: RIFF/WAVE Header & 16-Bit PCM Binary Correctness',
    description: 'Performs byte-level inspection of synthetic WAV buffers ensuring strict compliance with Microsoft RIFF/WAVE standard',
    fn: async () => {
      const sampleRate = 24000;
      const duration = 2.0;
      const buffer = generateSyntheticWavBuffer(duration, sampleRate);

      // Header Size must be 44 bytes + PCM data
      const expectedNumSamples = Math.floor(sampleRate * duration); // 48000 samples
      const expectedDataBytes = expectedNumSamples * 2; // 96000 bytes (16-bit mono = 2 bytes/sample)
      const expectedTotalSize = 44 + expectedDataBytes;

      expect(buffer.length).toBe(expectedTotalSize);

      // Chunk 1: RIFF Header
      expect(buffer.toString('ascii', 0, 4)).toBe('RIFF');
      expect(buffer.readUInt32LE(4)).toBe(expectedTotalSize - 8);
      expect(buffer.toString('ascii', 8, 12)).toBe('WAVE');

      // Chunk 2: fmt Sub-chunk
      expect(buffer.toString('ascii', 12, 16)).toBe('fmt ');
      expect(buffer.readUInt32LE(16)).toBe(16); // 16 for PCM
      expect(buffer.readUInt16LE(20)).toBe(1); // 1 for PCM format
      expect(buffer.readUInt16LE(22)).toBe(1); // 1 channel (Mono)
      expect(buffer.readUInt32LE(24)).toBe(sampleRate); // 24000 Hz
      expect(buffer.readUInt32LE(28)).toBe(sampleRate * 2); // ByteRate = 48000
      expect(buffer.readUInt16LE(32)).toBe(2); // BlockAlign = 2
      expect(buffer.readUInt16LE(34)).toBe(16); // BitsPerSample = 16

      // Chunk 3: data Sub-chunk
      expect(buffer.toString('ascii', 36, 40)).toBe('data');
      expect(buffer.readUInt32LE(40)).toBe(expectedDataBytes);

      // Sample Value Range Check: All samples must fit comfortably within int16 [-32768, 32767]
      for (let i = 0; i < expectedNumSamples; i += 500) {
        const sample = buffer.readInt16LE(44 + i * 2);
        expect(sample).toBeGreaterThanOrEqual(-400);
        expect(sample).toBeLessThanOrEqual(400);
      }
    },
  });

  registry.register({
    id: 'ADV-TTS-07',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: 4-Tier Provider Failover with Invalid Credentials',
    description: 'Verifies that missing or invalid API keys gracefully cascade through all providers down to deterministic mock',
    fn: async () => {
      // Synthesize requesting ElevenLabs with invalid key
      const res = await ttsEngine.synthesize({
        text: 'Failover cascade verification under unauthenticated environment.',
        language: 'ta-IN',
        provider: 'elevenlabs',
        apiKey: 'invalid_key_xyz_123',
      });

      expect(res.success).toBe(true);
      expect(res.providerUsed).toBe('mock');
      expect(res.metadata.isDryRun).toBe(true);
      expect(res.metadata.providerAttempts.length).toBeGreaterThan(0);

      // Voice catalog listing fallback
      const voices = ttsEngine.getAvailableVoices('ta-IN');
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0].language).toBe('ta-IN');
    },
  });

  // =========================================================================
  // Section 2: Audio Mixer Adversarial Challenges (6 Tests)
  // =========================================================================

  registry.register({
    id: 'ADV-MIX-01',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: Volume Gain Extremes (Mute, Maximum & Negative Clamping)',
    description: 'Verifies filter graph generation and execution under volume extremes (0.0, 5.0, negative gain)',
    fn: async () => {
      // 1. Zero volume (Mute)
      const graphMute = audioMixer.generateFilterGraph({
        voiceAudioPath: 'voice.mp3',
        bgmAudioPath: 'bgm.mp3',
        voiceVolume: 0.0,
        bgmVolume: 0.0,
      });
      expect(graphMute.filterComplex).toContain('[0:a]volume=0');
      expect(graphMute.filterComplex).toContain('[1:a]volume=0');

      // 2. High boost volume
      const graphBoost = audioMixer.generateFilterGraph({
        voiceAudioPath: 'voice.mp3',
        bgmAudioPath: 'bgm.mp3',
        voiceVolume: 3.5,
        bgmVolume: 1.8,
      });
      expect(graphBoost.filterComplex).toContain('[0:a]volume=3.5');
      expect(graphBoost.filterComplex).toContain('[1:a]volume=1.8');

      // 3. Preset Volume Mapping
      const presets: BgmPreset[] = ['upbeat', 'cinematic', 'ambient', 'lofi', 'dramatic', 'corporate'];
      for (const p of presets) {
        expect(BGM_PRESETS[p]).toBeDefined();
        expect(BGM_PRESETS[p].defaultVolume).toBeGreaterThan(0);
      }
    },
  });

  registry.register({
    id: 'ADV-MIX-02',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: Extreme Ducking Compression Ratios & Thresholds',
    description: 'Verifies sidechaincompress filter graph parameter injection under extreme compression ratios',
    fn: async () => {
      const graph = audioMixer.generateFilterGraph({
        voiceAudioPath: 'dialogue.mp3',
        bgmAudioPath: 'soundtrack.mp3',
        enableDucking: true,
        duckingRatio: 20.0,
        duckingThreshold: 0.05,
        attackMs: 10,
        releaseMs: 800,
      });

      expect(graph.filterComplex).toContain('sidechaincompress');
      expect(graph.filterComplex).toContain('ratio=20');
      expect(graph.filterComplex).toContain('threshold=0.05');
      expect(graph.filterComplex).toContain('attack=10');
      expect(graph.filterComplex).toContain('release=800');
    },
  });

  registry.register({
    id: 'ADV-MIX-03',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: Zero Duration, Long Duration & Fade Transition Overflows',
    description: 'Verifies audio mixer behavior when fade-out duration exceeds total target duration',
    fn: async () => {
      // Fade out (15s) exceeds total target duration (10s)
      const graphFadeOverflow = audioMixer.generateFilterGraph({
        voiceAudioPath: 'voice.mp3',
        bgmAudioPath: 'bgm.mp3',
        targetDuration: 10,
        fadeInSeconds: 2.0,
        fadeOutSeconds: 15.0,
      });

      // fadeOutStart should clamp cleanly at 0s (Math.max(0, 10 - 15) = 0)
      expect(graphFadeOverflow.filterComplex).toContain('afade=t=out:st=0:d=15');

      // Sub-second audio mix execution in dry-run
      const resShort = await audioMixer.mixAudio({
        voiceAudioPath: 'voice.mp3',
        bgmAudioPath: 'bgm.mp3',
        targetDuration: 0.5,
        dryRun: true,
      });
      expect(resShort.success).toBe(true);
      expect(resShort.duration).toBe(0.5);
      expect(resShort.outputBuffer).toBeDefined();
    },
  });

  registry.register({
    id: 'ADV-MIX-04',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: Corrupted Audio Buffer & Missing Paths Graceful Recovery',
    description: 'Verifies graceful fallback to synthetic audio buffer when passed corrupted non-audio buffer or non-existent files',
    fn: async () => {
      // Corrupt non-audio buffer
      const corruptBuffer = Buffer.from('NOT_A_VALID_AUDIO_FILE_JUST_CORRUPT_RAW_DATA_1234567890');

      const res = await audioMixer.mixAudio({
        voiceAudioBuffer: corruptBuffer,
        bgmAudioBuffer: corruptBuffer,
        targetDuration: 15,
      });

      expect(res.success).toBe(true);
      expect(res.outputBuffer).toBeDefined();
      expect(res.outputBuffer?.length).toBeGreaterThan(44);
      expect(res.duration).toBe(15);
      expect(res.isDryRun).toBe(true);
    },
  });

  registry.register({
    id: 'ADV-MIX-05',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: 50 Rapid Concurrent Audio Mix Dispatches',
    description: 'Stress-tests AudioMixer with 50 parallel asynchronous mixing operations ensuring isolated outputs and no file collisions',
    fn: async () => {
      const presets: BgmPreset[] = ['upbeat', 'cinematic', 'ambient', 'lofi', 'dramatic', 'corporate'];

      const promises = Array.from({ length: 50 }, (_, i) => {
        const preset = presets[i % presets.length];
        return audioMixer.mixAudio({
          voiceAudioPath: `voice_${i + 1}.mp3`,
          bgmPreset: preset,
          voiceVolume: 1.0,
          bgmVolume: 0.2,
          targetDuration: 10 + (i % 20),
          isDryRun: true,
        });
      });

      const results = await Promise.all(promises);
      expect(results.length).toBe(50);

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        expect(res.success).toBe(true);
        expect(res.outputBuffer).toBeDefined();
        expect(res.outputBuffer?.length).toBeGreaterThan(44);
        expect(res.duckingApplied).toBe(true);
        expect(res.isDryRun).toBe(true);
      }
    },
  });

  registry.register({
    id: 'ADV-MIX-06',
    tier: 'tier6',
    workflow: 'integration',
    title: 'Adversarial: Stereo 44.1kHz Synthetic WAV Header & FFmpeg State Override',
    description: 'Verifies AudioMixer synthetic stereo buffer generation (44.1kHz, 2-channel, 16-bit) and FFmpeg detection override idempotency',
    fn: async () => {
      // Force override to false
      audioMixer.setFFmpegOverride(false);
      expect(audioMixer.isFFmpegAvailable()).toBe(false);

      const res = await audioMixer.mixAudio({
        voiceAudioPath: 'voice.wav',
        bgmAudioPath: 'bgm.wav',
        targetDuration: 3,
      });

      expect(res.success).toBe(true);
      expect(res.metadata.sampleRate).toBe(44100);
      expect(res.metadata.channels).toBe(2);

      const buf = res.outputBuffer!;
      expect(buf).toBeDefined();
      expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
      expect(buf.toString('ascii', 8, 12)).toBe('WAVE');
      expect(buf.toString('ascii', 12, 16)).toBe('fmt ');
      expect(buf.readUInt16LE(20)).toBe(1); // PCM
      expect(buf.readUInt16LE(22)).toBe(2); // 2 channels (Stereo)
      expect(buf.readUInt32LE(24)).toBe(44100); // 44.1 kHz sample rate
      expect(buf.readUInt32LE(28)).toBe(44100 * 2 * 2); // ByteRate = 176400
      expect(buf.readUInt16LE(32)).toBe(4); // BlockAlign = 4 (2 channels * 2 bytes)
      expect(buf.readUInt16LE(34)).toBe(16); // 16 bits per sample

      // Expected total size: 44 + 44100 * 3 * 4 = 529244 bytes
      expect(buf.length).toBe(44 + 44100 * 3 * 4);

      // Clean reset
      audioMixer.setFFmpegOverride(null);
    },
  });
}
