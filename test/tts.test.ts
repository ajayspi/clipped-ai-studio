import { describe, it, expect, vi } from 'vitest';
import { ttsEngine, TTSRequest } from '../lib/engine/tts';
import { resolveVoiceProviderApiKey } from '../lib/engine/tts';

describe('TTSEngine', () => {
  it('should include sarvam voices in getAvailableVoices', () => {
    const sarvamVoices = ttsEngine.getAvailableVoices(undefined, 'sarvam');
    expect(sarvamVoices.length).toBeGreaterThan(0);
    expect(sarvamVoices[0].provider).toBe('sarvam');
    expect(sarvamVoices.some(v => v.language === 'hi-IN')).toBe(true);
  });

  it('should return sarvam voices when querying for hi-IN language', () => {
    const hiVoices = ttsEngine.getAvailableVoices('hi-IN');
    expect(hiVoices.some(v => v.provider === 'sarvam')).toBe(true);
  });

  it('should fallback to mock provider when explicitly asked in dry run', async () => {
    const request: TTSRequest = {
      text: 'Hello world',
      mock: true
    };
    const response = await ttsEngine.synthesize(request);
    expect(response.success).toBe(true);
    expect(response.providerUsed).toBe('mock');
  });
});
