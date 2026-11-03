import { describe, it, expect } from 'vitest';
import { dramaOrchestrator } from '@/lib/engine/drama-orchestrator';
import { resolveVoiceForCharacter, DRAMA_VOICE_PRESETS } from '@/lib/engine/voice-mapper';

describe('Micro-Drama Pipeline & Voice Mapping Engine', () => {
  it('resolves OpenAI voice slugs to authentic Edge TTS neural voices', () => {
    expect(resolveVoiceForCharacter('onyx')).toBe('en-US-GuyNeural');
    expect(resolveVoiceForCharacter('nova')).toBe('en-US-JennyNeural');
    expect(resolveVoiceForCharacter('echo')).toBe('en-US-ChristopherNeural');
    expect(resolveVoiceForCharacter('shimmer')).toBe('en-US-AriaNeural');
    expect(resolveVoiceForCharacter('fable')).toBe('en-GB-RyanNeural');
    expect(resolveVoiceForCharacter('alloy')).toBe('en-US-EricNeural');
  });

  it('passes through raw Edge TTS neural voice identifiers', () => {
    expect(resolveVoiceForCharacter('en-US-GuyNeural')).toBe('en-US-GuyNeural');
    expect(resolveVoiceForCharacter('en-GB-SoniaNeural')).toBe('en-GB-SoniaNeural');
  });

  it('provides rich voice presets with archetype descriptions', () => {
    expect(DRAMA_VOICE_PRESETS.length).toBeGreaterThanOrEqual(5);
    const onyx = DRAMA_VOICE_PRESETS.find((v) => v.id === 'onyx');
    expect(onyx).toBeDefined();
    expect(onyx?.archetype).toContain('Detective');
  });

  it('enforces character array requirement in dramaOrchestrator', async () => {
    await expect(
      dramaOrchestrator.generateDramaSeries({
        genre: 'cyberpunk-noir',
        characters: [],
        episodesCount: 3,
      })
    ).rejects.toThrow('Characters array is required');
  });

  it('generates multi-episode drama series with character visual anchor prefixing', async () => {
    const res = await dramaOrchestrator.generateDramaSeries({
      genre: 'cyberpunk-noir',
      characters: [
        {
          name: 'Detective Jax',
          description: 'Hardboiled cyber investigator',
          visualAnchor: 'charcoal cyber-coat, glowing blue optic eye',
          voice: 'onyx',
        },
        {
          name: 'Dr. Vesper',
          description: 'Rogue neuroscientist',
          visualAnchor: 'silver lab coat, platinum bob hair',
          voice: 'nova',
        },
      ],
      episodesCount: 3,
      aspectRatio: '9:16',
    });

    expect(res.success).toBe(true);
    expect(res.dramaTitle).toBeDefined();
    expect(res.episodes).toHaveLength(3);

    // Verify first episode
    const ep1 = res.episodes[0];
    expect(ep1.episodeNumber).toBe(1);
    expect(ep1.scenes.length).toBeGreaterThanOrEqual(1);

    // Verify character anchor prefix in scene visual prompts
    const s1 = ep1.scenes[0];
    expect(s1.visualPrompt).toContain('[Character: charcoal cyber-coat, glowing blue optic eye]');
    expect(s1.speaker).toBe('Detective Jax');
    expect(s1.voice).toBe('en-US-GuyNeural');
    expect(s1.shotType).toBeDefined();
    expect(s1.cameraMove).toBeDefined();
  });
});
