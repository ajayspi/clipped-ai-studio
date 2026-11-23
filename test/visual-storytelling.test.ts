import { describe, it, expect } from 'vitest';
import {
  calculateSubtitleDuration,
  calculateReadingHoldTime,
  TITLE_CARD_MIN_DURATION,
  getVisualStoryStyle,
  validateTreatmentGrammar,
  buildLemoOpuscarTreatmentPrompt,
  buildLemoShotVisualPrompt,
  LEMO_STYLE_PRESETS,
  type StoryTreatment
} from '@/lib/engine/visual-storytelling';

describe('Visual Storytelling & Script Prompting (Lemo-Opuscar)', () => {
  describe('Pacing & Reading Mathematics', () => {
    it('enforces minimum 1.8s hold on short subtitles', () => {
      // 0.5s spoken + 0.6s = 1.1s -> clamped to 1.8s minimum
      expect(calculateSubtitleDuration(0.5)).toBe(1.8);
      expect(calculateSubtitleDuration(1.0)).toBe(1.8);
    });

    it('calculates duration as spokenSeconds + 0.6s for longer speech', () => {
      // 2.0s spoken + 0.6s = 2.6s
      expect(calculateSubtitleDuration(2.0)).toBe(2.6);
      expect(calculateSubtitleDuration(3.5)).toBe(4.1);
    });

    it('calculates English reading hold time accurately based on letter count', () => {
      // 15 letters -> 15/15 + 1.5 = 2.5s
      const text15 = 'abcdefghijklmno';
      expect(calculateReadingHoldTime(text15, 'en')).toBe(2.5);

      // Empty text returns 1.5s base
      expect(calculateReadingHoldTime('', 'en')).toBe(1.5);
    });

    it('calculates CJK reading hold time accurately based on character count', () => {
      // 9 CJK chars -> 9/4.5 + 1.5 = 3.5s
      const text9 = '技术改变了整个世界';
      expect(calculateReadingHoldTime(text9, 'cjk')).toBe(3.5);
    });

    it('exports standard 4.0s minimum title card duration', () => {
      expect(TITLE_CARD_MIN_DURATION).toBe(4.0);
    });
  });

  describe('Style Presets Catalog', () => {
    it('contains core styles with palettes and native moves', () => {
      expect(LEMO_STYLE_PRESETS['blueprint']).toBeDefined();
      expect(LEMO_STYLE_PRESETS['blueprint'].palette.base).toBe('#18336B');
      expect(LEMO_STYLE_PRESETS['blueprint'].nativeMove).toContain('Oblique projection');

      expect(LEMO_STYLE_PRESETS['swiss-motion']).toBeDefined();
      expect(LEMO_STYLE_PRESETS['swiss-motion'].palette.accent).toBe('#E30613');

      expect(LEMO_STYLE_PRESETS['teardown']).toBeDefined();
      expect(LEMO_STYLE_PRESETS['ascii-crt']).toBeDefined();
      expect(LEMO_STYLE_PRESETS['cel-anime-80s']).toBeDefined();
    });

    it('falls back gracefully to valid generated styles for unlisted slugs', () => {
      const customStyle = getVisualStoryStyle('quantum-circuit-board');
      expect(customStyle.slug).toBe('quantum-circuit-board');
      expect(customStyle.category).toBe('technical');
      expect(customStyle.cameraGrammar.length).toBeGreaterThanOrEqual(4);
      expect(customStyle.palette.accent).toBeDefined();
    });
  });

  describe('Grammar & Quality Gate Validator', () => {
    const validTreatment: StoryTreatment = {
      title: 'The Mechanical Escapement',
      styleSlug: 'blueprint',
      targetDurationSeconds: 15,
      logline: 'A clockmaker attempts to build an escapement that never loses a second.',
      arc: {
        setup: 'A lone gear turns uncertainly on blueprint paper.',
        turn: 'Friction locks the balance wheel until an oblique depth shift unlocks the mechanism.',
        endingEcho: 'The escapement ticks in rhythm, echoing the very first tick with flawless precision.',
        nativeMove: 'Oblique projection tilt where flat lines turn into 3D gears.'
      },
      benchmark: {
        learnFrom: ['Iron man technical drawings', 'Codex Atlanticus'],
        avoid: ['Trademarked logos', 'generic 3D glossy renders']
      },
      shots: [
        {
          shotNumber: 1,
          framing: 'wide',
          cameraMove: 'Push-in (fast)',
          durationSeconds: 3.0,
          actionDescription: 'Hook: Urgent blueprint drawing begins with rapid lines.',
          dialogueOrSubtitle: 'A single second is lost.',
          audioLayers: {
            ambience: 'Drafting room hum',
            foley: 'Pen scratch',
            musicState: 'Staccato strings',
            isSilenceOrBreath: false,
            transition: 'hard-cut'
          },
          narrativePurpose: 'Instant hook establishing the central problem'
        },
        {
          shotNumber: 2,
          framing: 'medium',
          cameraMove: 'Lateral Pan',
          durationSeconds: 3.0,
          actionDescription: 'Following force along the geartrain.',
          dialogueOrSubtitle: 'Every tooth matters.',
          audioLayers: {
            ambience: 'Drafting room hum',
            foley: 'Gear click',
            musicState: 'Accelerando',
            isSilenceOrBreath: false,
            transition: 'j-cut'
          },
          narrativePurpose: 'Show mechanism interaction'
        },
        {
          shotNumber: 3,
          framing: 'close-up',
          cameraMove: 'Orbit 45°',
          durationSeconds: 3.0,
          actionDescription: 'Friction binds the balance wheel.',
          audioLayers: {
            ambience: 'Absolute silence',
            foley: 'Single clock tick',
            musicState: 'Held breath silence',
            isSilenceOrBreath: true,
            transition: 'hard-cut'
          },
          narrativePurpose: 'The turning point complication'
        },
        {
          shotNumber: 4,
          framing: 'extreme-close-up',
          cameraMove: 'Oblique Depth Tilt',
          durationSeconds: 3.0,
          actionDescription: 'The 2D drawing gains 3D depth and unlocks.',
          dialogueOrSubtitle: 'Depth unlocked.',
          audioLayers: {
            ambience: 'Resonant harmonic bloom',
            foley: 'Metallic click',
            musicState: 'Harmonic resolution',
            isSilenceOrBreath: false,
            transition: 'native-wipe'
          },
          narrativePurpose: 'Native move at emotional peak'
        },
        {
          shotNumber: 5,
          framing: 'wide',
          cameraMove: 'Pull-out (slow)',
          durationSeconds: 3.0,
          actionDescription: 'The whole sheet seen running in harmony.',
          dialogueOrSubtitle: 'Time is held.',
          audioLayers: {
            ambience: 'Room tone',
            foley: 'Rubber stamp thud',
            musicState: 'Cadence close',
            isSilenceOrBreath: false,
            transition: 'l-cut'
          },
          narrativePurpose: 'The ending echo revealing full drawing scale'
        }
      ]
    };

    it('passes valid treatment with 0 issues', () => {
      const result = validateTreatmentGrammar(validTreatment);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.stats.distinctCameraMoves).toBe(5);
      expect(result.stats.hasHookInFirst3s).toBe(true);
      expect(result.stats.hasEndingEcho).toBe(true);
      expect(result.stats.hasNativeMove).toBe(true);
      expect(result.stats.hasSilenceOrBreath).toBe(true);
      expect(result.stats.hasAudioJorLCut).toBe(true);
    });

    it('detects violations when 0-3s hook or camera moves are missing', () => {
      const invalidTreatment: StoryTreatment = {
        ...validTreatment,
        shots: [
          {
            ...validTreatment.shots[0],
            durationSeconds: 6.0, // Too long for opening hook!
            actionDescription: 'Slow leisurely fade in with logo.',
            narrativePurpose: 'Intro logo'
          },
          {
            ...validTreatment.shots[1],
            cameraMove: 'Push-in (fast)' // Duplicate move
          },
          {
            ...validTreatment.shots[2],
            cameraMove: 'Push-in (fast)', // Duplicate move
            audioLayers: {
              ...validTreatment.shots[2].audioLayers,
              isSilenceOrBreath: false,
              musicState: 'Loud strings'
            }
          }
        ]
      };

      const result = validateTreatmentGrammar(invalidTreatment);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('0-3s Hook'))).toBe(true);
      expect(result.issues.some(i => i.includes('Camera Grammar Deficit'))).toBe(true);
      expect(result.issues.some(i => i.includes('Sound Staging Invariant'))).toBe(true);
    });

    it('detects unreadable fast subtitles', () => {
      const fastSubtitleTreatment: StoryTreatment = {
        ...validTreatment,
        shots: [
          {
            ...validTreatment.shots[0],
            durationSeconds: 1.0,
            dialogueOrSubtitle: 'This very long sentence contains way too many letters to be read in one single second.'
          },
          ...validTreatment.shots.slice(1)
        ]
      };

      const result = validateTreatmentGrammar(fastSubtitleTreatment);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('too fast to read'))).toBe(true);
    });
  });

  describe('Prompt Compilers', () => {
    it('builds comprehensive Lemo-Opuscar treatment prompt', () => {
      const prompt = buildLemoOpuscarTreatmentPrompt('Quantum Computers', 'blueprint', 45);
      expect(prompt).toContain('Blueprint Technical Drawing');
      expect(prompt).toContain('Quantum Computers');
      expect(prompt).toContain('-14 LUFS');
      expect(prompt).toContain('logline');
      expect(prompt).toContain('endingEcho');
    });

    it('builds rich visual prompt for text-to-video engines', () => {
      const visualPrompt = buildLemoShotVisualPrompt(
        {
          shotNumber: 1,
          framing: 'wide',
          cameraMove: 'Push-in (fast)',
          durationSeconds: 3.0,
          actionDescription: 'Cyanotype paper unrolls across drafting table',
          audioLayers: {
            ambience: '',
            foley: '',
            musicState: ''
          },
          narrativePurpose: 'Hook'
        },
        'blueprint'
      );

      expect(visualPrompt).toContain('Blueprint Technical Drawing');
      expect(visualPrompt).toContain('wide framing');
      expect(visualPrompt).toContain('camera motion: Push-in (fast)');
      expect(visualPrompt).toContain('Cyanotype paper unrolls');
      expect(visualPrompt).toContain('Prussian blue');
    });
  });
});
