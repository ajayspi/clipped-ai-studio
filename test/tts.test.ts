import { describe, it, expect, vi } from 'vitest';
import {
  ttsEngine,
  TTSRequest,
  VOICESTUDIO_MODELS,
  resolveVoiceStudioModel,
  generateSyntheticWavBuffer,
} from '../lib/engine/tts';

describe('TTSEngine', () => {
  it('should include sarvam voices in getAvailableVoices', () => {
    const sarvamVoices = ttsEngine.getAvailableVoices(undefined, 'sarvam');
    expect(sarvamVoices.length).toBeGreaterThan(0);
    expect(sarvamVoices[0].provider).toBe('sarvam');
    expect(sarvamVoices.some((v) => v.language === 'hi-IN')).toBe(true);
  });

  it('should return sarvam voices when querying for hi-IN language', () => {
    const hiVoices = ttsEngine.getAvailableVoices('hi-IN');
    expect(hiVoices.some((v) => v.provider === 'sarvam')).toBe(true);
  });

  it('should fallback to mock provider when explicitly asked in dry run', async () => {
    const request: TTSRequest = {
      text: 'Hello world',
      mock: true,
    };
    const response = await ttsEngine.synthesize(request);
    expect(response.success).toBe(true);
    expect(response.providerUsed).toBe('mock');
  });

  describe('VoiceStudio 48kHz Broadcast Engine & Commercial Safety Gate', () => {
    it('should include VoiceStudio models in getAvailableVoices with 48kHz broadcast models', () => {
      expect(VOICESTUDIO_MODELS['moss-tts-nano'].sampleRate).toBe(48000);
      expect(VOICESTUDIO_MODELS['voxcpm2'].sampleRate).toBe(48000);
      const vsVoices = ttsEngine.getAvailableVoices(undefined, 'voicestudio');
      expect(vsVoices.length).toBeGreaterThan(0);
      expect(vsVoices.every((v) => v.provider === 'voicestudio')).toBe(true);

      // Verify 48kHz broadcast models are present
      const mossVoice = vsVoices.find((v) => v.id.includes('moss-tts-nano'));
      expect(mossVoice).toBeDefined();
      expect(mossVoice?.sampleRate).toBe(48000);
      expect(mossVoice?.commercialSafe).toBe(true);

      const voxcpmVoice = vsVoices.find((v) => v.id.includes('voxcpm2'));
      expect(voxcpmVoice).toBeDefined();
      expect(voxcpmVoice?.sampleRate).toBe(48000);
      expect(voxcpmVoice?.commercialSafe).toBe(true);
    });

    it('should filter out non-commercial engines when commercialSafeOnly is true', () => {
      const allVoices = ttsEngine.getAvailableVoices(undefined, 'voicestudio', false);
      const safeOnlyVoices = ttsEngine.getAvailableVoices(undefined, 'voicestudio', true);

      // OmniVoice has non-commercial license
      expect(allVoices.some((v) => v.id.includes('omnivoice'))).toBe(true);
      expect(safeOnlyVoices.some((v) => v.id.includes('omnivoice'))).toBe(false);

      // All safe-only voices must be commercialSafe
      expect(safeOnlyVoices.every((v) => v.commercialSafe === true)).toBe(true);
      expect(safeOnlyVoices.length).toBeLessThan(allVoices.length);
    });

    it('should resolve commercial-safe 48kHz fallback if non-commercial model requested under commercialSafe constraint', () => {
      // Unrestricted: omnivoice resolves directly
      const unrestricted = resolveVoiceStudioModel('omnivoice', false);
      expect(unrestricted.id).toBe('omnivoice');
      expect(unrestricted.commercialSafe).toBe(false);

      // Commercial safe enforced: omnivoice must fall back to moss-tts-nano (48kHz Apache-2.0)
      const safeModel = resolveVoiceStudioModel('omnivoice', true);
      expect(safeModel.id).toBe('moss-tts-nano');
      expect(safeModel.commercialSafe).toBe(true);
      expect(safeModel.sampleRate).toBe(48000);
    });

    it('should generate 48kHz broadcast audio matching Remotion/FFmpeg standards in mock dry run', async () => {
      const request: TTSRequest = {
        text: 'This is broadcast-standard 48 kHz narration for Remotion and FFmpeg render pipelines.',
        mock: true,
        sampleRate: 48000,
        commercialSafe: true,
      };

      const response = await ttsEngine.synthesize(request);
      expect(response.success).toBe(true);
      expect(response.sampleRate).toBe(48000);
      expect(response.commercialSafe).toBe(true);
      expect(response.metadata.sampleRate).toBe(48000);

      // Header checks: sample rate at byte offset 24-27 must be 48000 (0xBB80)
      const sampleRateFromHeader = response.audioBuffer.readUInt32LE(24);
      expect(sampleRateFromHeader).toBe(48000);

      // Byte rate at offset 28-31 for 16-bit mono 48000Hz = 48000 * 1 * 2 = 96000
      const byteRateFromHeader = response.audioBuffer.readUInt32LE(28);
      expect(byteRateFromHeader).toBe(96000);
    });

    it('should route voicestudio provider through fallback cascade when daemon is offline', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = typeof input === 'string' ? input : input.toString();
        if (urlStr.includes(':3900') || urlStr.includes('audio/speech')) {
          throw new Error('connect ECONNREFUSED 127.0.0.1:3900');
        }
        return originalFetch(input, init);
      });

      try {
        const request: TTSRequest = {
          text: 'VoiceStudio offline test fallback',
          provider: 'voicestudio',
          voice: 'moss-tts-nano',
          commercialSafe: true,
        };

        const response = await ttsEngine.synthesize(request);
        expect(response.success).toBe(true);
        expect(response.metadata.providerAttempts.length).toBeGreaterThan(0);

        const vsAttempt = response.metadata.providerAttempts.find(
          (a) => a.provider === 'voicestudio'
        );
        expect(vsAttempt).toBeDefined();
        expect(vsAttempt?.status).toBe('failed');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should synthesize successfully when VoiceStudio daemon responds with audio buffer', async () => {
      const mockWav = generateSyntheticWavBuffer(1.0, 48000);
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = typeof input === 'string' ? input : input.toString();
        if (urlStr.includes(':3900') || urlStr.includes('audio/speech')) {
          return new Response(new Uint8Array(mockWav), {
            status: 200,
            headers: { 'Content-Type': 'audio/wav' },
          });
        }
        return originalFetch(input, init);
      });

      try {
        const request: TTSRequest = {
          text: 'VoiceStudio online synthesis test',
          provider: 'voicestudio',
          voice: 'moss-tts-nano',
          commercialSafe: true,
        };

        const response = await ttsEngine.synthesize(request);
        expect(response.success).toBe(true);
        expect(response.providerUsed).toBe('voicestudio');
        expect(response.sampleRate).toBe(48000);
        expect(response.commercialSafe).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
