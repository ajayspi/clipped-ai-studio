import { describe, it, expect } from 'vitest';
import {
  compileCinematicPrompt,
  DIRECTOR_PRESETS,
  CinemaShotConfig,
  CinemaReferenceAsset,
} from '@/lib/engine/cinema-director';

describe('Cinema Director Engine (Open-Higgsfield-AI Inspiration)', () => {
  it('compiles optical physics, focal length and aperture into prompt', () => {
    const config: CinemaShotConfig = {
      subject: 'A neon-lit cybernetic samurai standing on a skyscraper ledge',
      sensorFormat: 'anamorphic-2x',
      focalLength: '35mm-street',
      aperture: 'f/1.2',
      cameraMotion: 'dolly-zoom-vertigo',
      lighting: 'cyberpunk-neon',
      filmStock: 'kodak-vision3-500t',
      aspectRatio: '2.39:1',
      motionIntensity: 'dynamic'
    };

    const result = compileCinematicPrompt(config);

    expect(result.prompt).toContain('cybernetic samurai');
    expect(result.prompt).toContain('2x squeeze anamorphic glass');
    expect(result.prompt).toContain('35mm cinema prime');
    expect(result.prompt).toContain('ultra-shallow depth of field');
    expect(result.prompt).toContain('dolly zoom vertigo effect');
    expect(result.prompt).toContain('cyberpunk neon practical lighting');
    expect(result.prompt).toContain('Kodak Vision3 500T');
    expect(result.parameters.aspectRatio).toBe('2.39:1');
    expect(result.parameters.motionScore).toBe(7);
  });

  it('correctly parses and injects multi-image semantic references up to 14', () => {
    const refs: CinemaReferenceAsset[] = [
      { id: 'char_face_01', url: 'https://cdn.example.com/face.jpg', role: '@face' },
      { id: 'wardrobe_suit_01', url: 'https://cdn.example.com/suit.jpg', role: '@outfit' },
      { id: 'tokyo_env_01', url: 'https://cdn.example.com/tokyo.jpg', role: '@environment' },
    ];

    const config: CinemaShotConfig = {
      subject: 'The detective steps into the shadowy rain',
      references: refs
    };

    const result = compileCinematicPrompt(config);

    expect(result.referenceTags).toContain('@face:char_face_01');
    expect(result.referenceTags).toContain('@outfit:wardrobe_suit_01');
    expect(result.referenceTags).toContain('@environment:tokyo_env_01');
    expect(result.prompt).toContain('consistent character facial structure matching reference char_face_01');
    expect(result.prompt).toContain('exact matching wardrobe and clothing style from reference wardrobe_suit_01');
  });

  it('clamps references to a maximum of 14', () => {
    const sixteenRefs: CinemaReferenceAsset[] = Array.from({ length: 16 }).map((_, i) => ({
      id: `ref_${i + 1}`,
      url: `https://cdn.example.com/ref_${i + 1}.jpg`,
      role: '@style'
    }));

    const result = compileCinematicPrompt({
      subject: 'Test subject',
      references: sixteenRefs
    });

    expect(result.referenceTags.length).toBe(14);
  });

  it('compiles all built-in director presets without error', () => {
    for (const preset of DIRECTOR_PRESETS) {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.director).toBeDefined();

      const compiled = compileCinematicPrompt({
        subject: `Test scene directed in the style of ${preset.director}`,
        ...preset.config
      });

      expect(compiled.prompt.length).toBeGreaterThan(50);
      expect(compiled.negativePrompt).toContain('amateur video');
      expect(compiled.cameraDirective).toBeDefined();
    }
  });
});
