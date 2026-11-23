import { describe, it, expect } from 'vitest';
import {
  GEMINI_STORY_TREATMENT_SCHEMA,
  buildGeminiTreatmentPayload,
  buildGeminiMultimodalAuditPayload
} from '@/lib/engine/gemini-video-director';
import { type StoryTreatment } from '@/lib/engine/visual-storytelling';

describe('Google Developer Knowledge: Gemini Video Director & Multimodal Auditor', () => {
  describe('Official JSON Schema Definition', () => {
    it('defines a valid Google GenAI responseSchema for StoryTreatment', () => {
      expect(GEMINI_STORY_TREATMENT_SCHEMA.type).toBe('OBJECT');
      expect(GEMINI_STORY_TREATMENT_SCHEMA.properties.title).toBeDefined();
      expect(GEMINI_STORY_TREATMENT_SCHEMA.properties.styleSlug).toBeDefined();
      expect(GEMINI_STORY_TREATMENT_SCHEMA.properties.shots.type).toBe('ARRAY');
      expect(GEMINI_STORY_TREATMENT_SCHEMA.required).toContain('shots');
      expect(GEMINI_STORY_TREATMENT_SCHEMA.required).toContain('arc');
    });
  });

  describe('Gemini Treatment Generation Payload', () => {
    it('constructs valid generationConfig with responseMimeType and responseSchema', () => {
      const payload = buildGeminiTreatmentPayload('Quantum Entanglement', 'blueprint', 45);

      expect(payload.system_instruction.parts[0].text).toContain('Lemo-Opuscar');
      expect(payload.contents[0].parts[0].text).toContain('Quantum Entanglement');
      expect(payload.generationConfig.responseMimeType).toBe('application/json');
      expect(payload.generationConfig.responseSchema).toBe(GEMINI_STORY_TREATMENT_SCHEMA);
    });
  });

  describe('Multimodal Video Quality Auditor Payload', () => {
    it('embeds image inlineData and configures structured auditor response schema', () => {
      const mockTreatment: StoryTreatment = {
        title: 'Mechanical Escapement',
        styleSlug: 'blueprint',
        targetDurationSeconds: 40,
        logline: 'An escapement unlocks.',
        arc: {
          setup: 'Gear spins',
          turn: 'Friction binds',
          endingEcho: 'Precision restored',
          nativeMove: 'Oblique tilt'
        },
        benchmark: { learnFrom: [], avoid: [] },
        shots: []
      };

      const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const payload = buildGeminiMultimodalAuditPayload(mockBase64, mockTreatment);

      expect(payload.contents[0].parts).toHaveLength(3);
      const imagePart = payload.contents[0].parts[2] as { inlineData?: { mimeType: string; data: string } };
      expect(imagePart.inlineData?.mimeType).toBe('image/jpeg');
      expect(imagePart.inlineData?.data).toBe(mockBase64);
      expect(payload.generationConfig.responseMimeType).toBe('application/json');
      expect(payload.generationConfig.responseSchema.properties.paletteIntegrity).toBeDefined();
      expect(payload.generationConfig.responseSchema.properties.legibilityPassed).toBeDefined();
    });
  });
});
