import { describe, it, expect } from 'vitest';
import {
  buildCharacterTurnaroundPrompts,
  pairShotKeyframes,
  checkShotContinuity,
  checkVisualQuality,
  buildContinuousNarrationConductor,
  buildSplitSubtitleSpecs,
  buildSeedVR2Command,
} from '@/lib/engine/continuity-director';
import { DramaCharacter, Scene } from '@/lib/engine/types';

describe('ContinuityDirector: 4-View Character Matrix, Vision QA & Dual-Frame Keyframes', () => {
  const sampleCharacter: DramaCharacter = {
    name: 'Elena Vance',
    description: 'Cyberpunk quantum cryptographer with an obsidian trench coat and silver-streaked hair',
    visualAnchor: 'sharp jawline, cybernetic right iris with amber glow, matte black tailored coat with luminescent collar',
    voice: 'nova',
  };

  const sampleScenes: Scene[] = [
    {
      id: 'scene-1',
      text: 'Elena hacks the orbital mainframe.',
      description: 'Elena leans over a glowing holographic console in a dark high-tech server room.',
      duration: 4.0,
      keywords: ['cyberpunk', 'hacking', 'mainframe'],
      cameraMove: 'pan-right',
    },
    {
      id: 'scene-2',
      text: 'A security breach alert flashes red.',
      description: 'Sirens blare as crimson warning light reflects on Elena’s face.',
      duration: 3.5,
      keywords: ['alarm', 'danger', 'red light'],
      cameraMove: 'push-in',
    },
    {
      id: 'scene-3',
      text: 'She triggers the neural override and escapes.',
      description: 'Elena dashes toward the pressurized airlock as blast doors descend.',
      duration: 4.5,
      keywords: ['escape', 'cyberpunk', 'action'],
      cameraMove: 'pull-out',
    },
  ];

  describe('1. 4-View Character Turnaround Matrix', () => {
    it('generates 4 distinct angles (front, threeQuarter, side, back) and a model sheet prompt', () => {
      const turnaround = buildCharacterTurnaroundPrompts(sampleCharacter, 'cyberpunk thriller');

      expect(turnaround.front).toContain('Front view portrait of Elena Vance');
      expect(turnaround.front).toContain('sharp jawline');
      expect(turnaround.threeQuarter).toContain('Three-quarter (3/4) angle portrait');
      expect(turnaround.side).toContain('Profile side-view portrait');
      expect(turnaround.back).toContain('Rear back-view portrait');
      expect(turnaround.characterSheetPrompt).toContain('4-view character turnaround model sheet of Elena Vance');
      expect(turnaround.turnaroundUrls?.front).toContain('https://image.pollinations.ai/prompt/');
      expect(turnaround.turnaroundUrls?.three_quarter).toBeDefined();
      expect(turnaround.turnaroundUrls?.side).toBeDefined();
      expect(turnaround.turnaroundUrls?.back).toBeDefined();
    });
  });

  describe('2. Dual-Frame Keyframe Conditioning (Shot N Tail -> Shot N+1 Head)', () => {
    it('pairs consecutive shots with head/tail frame conditioning and transition prompts', () => {
      const pairs = pairShotKeyframes(sampleScenes);

      expect(pairs).toHaveLength(3);
      expect(pairs[0].shotIndex).toBe(0);
      expect(pairs[0].transitionType).toBe('motion_match');
      expect(pairs[0].interpolationPrompt).toContain('Seamless motion_match transition from Scene 1');

      // Scene 2 has zoom_in -> mapped to zoom_punch
      expect(pairs[1].shotIndex).toBe(1);
      expect(pairs[1].transitionType).toBe('zoom_punch');

      // Final scene resolves
      expect(pairs[2].shotIndex).toBe(2);
      expect(pairs[2].interpolationPrompt).toContain('Resolve final scene 3 cleanly');
    });

    it('returns empty array when scenes array is empty', () => {
      expect(pairShotKeyframes([])).toEqual([]);
    });
  });

  describe('3. Automated Vision Continuity & Defect Inspection', () => {
    it('evaluates continuity between adjacent frames with metrics', async () => {
      const result = await checkShotContinuity({
        lastFrameUrl: 'https://images.example.com/shot1_tail.jpg',
        nextFirstFrameUrl: 'https://images.example.com/shot2_head.jpg',
        characterAnchor: sampleCharacter.visualAnchor,
      });

      expect(result.pass).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.metrics.clothingConsistency).toBeGreaterThan(0);
      expect(result.metrics.lightingMatch).toBeGreaterThan(0);
      expect(result.metrics.anatomicalPlausibility).toBeGreaterThan(0);
      expect(result.metrics.paletteCohesion).toBeGreaterThan(0);
    });

    it('handles missing frame URLs with robust heuristic fallback', async () => {
      const result = await checkShotContinuity({});
      expect(result.pass).toBe(true);
      expect(result.score).toBe(85);
      expect(result.issues[0]).toContain('omitted');
    });

    it('inspects single-frame visual quality for anatomy and artifacts', async () => {
      const result = await checkVisualQuality({
        frameUrl: 'https://images.example.com/shot1_gen.jpg',
        prompt: 'A close-up portrait of Elena Vance with clean cybernetic implants',
      });

      expect(result.pass).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.metrics.facialIntegrity).toBeGreaterThan(0);
      expect(result.metrics.anatomicalIntegrity).toBeGreaterThan(0);
      expect(result.metrics.artifactFreedom).toBeGreaterThan(0);
    });

    it('fails visual quality check when frameUrl is missing', async () => {
      const result = await checkVisualQuality({ frameUrl: '' });
      expect(result.pass).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues[0]).toContain('No frameUrl provided');
    });
  });

  describe('4. Master Continuous Narration Conductor', () => {
    it('slices visual scenes across continuous audio word tokens without dead air', () => {
      const script = 'Elena hacked into the orbital system and uncovered the secret conspiracy before escaping into deep space.';
      const sampleWords = [
        { word: 'Elena', start: 0.0, end: 0.5 },
        { word: 'hacked', start: 0.5, end: 1.0 },
        { word: 'into', start: 1.0, end: 1.3 },
        { word: 'the', start: 1.3, end: 1.5 },
        { word: 'orbital', start: 1.5, end: 2.1 },
        { word: 'system', start: 2.1, end: 2.7 },
        { word: 'and', start: 2.7, end: 3.0 },
        { word: 'uncovered', start: 3.0, end: 3.7 },
        { word: 'the', start: 3.7, end: 4.0 },
        { word: 'secret', start: 4.0, end: 4.5 },
        { word: 'conspiracy', start: 4.5, end: 5.3 },
        { word: 'before', start: 5.3, end: 5.8 },
        { word: 'escaping', start: 5.8, end: 6.5 },
        { word: 'into', start: 6.5, end: 6.9 },
        { word: 'deep', start: 6.9, end: 7.4 },
        { word: 'space', start: 7.4, end: 8.0 },
      ];

      const conductor = buildContinuousNarrationConductor(script, sampleScenes, sampleWords);

      expect(conductor.audioUrl).toBeDefined();
      expect(conductor.duration).toBe(8.0);
      expect(conductor.words).toHaveLength(16);
      expect(conductor.sceneSlices).toHaveLength(3);
      expect(conductor.sceneSlices[0].start).toBe(0.0);
      expect(conductor.sceneSlices[1].start).toBeGreaterThan(0);
      expect(conductor.sceneSlices[2].end).toBe(8.0);
    });

    it('generates synthetic timing when words array is omitted', () => {
      const script = 'Quick test script with six words.';
      const conductor = buildContinuousNarrationConductor(script, sampleScenes);

      expect(conductor.sceneSlices).toHaveLength(3);
      expect(conductor.words.length).toBeGreaterThan(0);
      expect(conductor.duration).toBe(12.0); // 4.0 + 3.5 + 4.5
    });
  });

  describe('5. Split Subtitle Safe-Zone Specs', () => {
    it('creates upper headline hooks and bottom dialogue captions in safe zones', () => {
      const specs = buildSplitSubtitleSpecs(sampleScenes);

      expect(specs).toHaveLength(3);
      expect(specs[0].topTitle).toBe('CYBERPUNK');
      expect(specs[0].bottomCaption).toBe('Elena hacks the orbital mainframe.');
      expect(specs[0].topY).toBe(180);
      expect(specs[0].bottomY).toBe(1420);
      expect(specs[0].topColor).toBe('#FACC15');
      expect(specs[0].bottomColor).toBe('#FFFFFF');
    });
  });

  describe('6. SeedVR2 Multi-GPU Diffusion Upscaler CLI Formulation', () => {
    it('compiles exact CLI parameters for 10-bit x265 and LAB color transfer upscaling', () => {
      const commandSpec = buildSeedVR2Command(
        {
          scale: 4,
          model: 'seedvr2-7b',
          format: '10bit-x265',
          colorTransfer: 'lab',
          temporalChunkSize: 32,
          fps: 30,
        },
        'raw_clip.mp4',
        'upscaled_4k.mp4'
      );

      expect(commandSpec.command).toContain('python inference_cli.py');
      expect(commandSpec.args).toContain('--model');
      expect(commandSpec.args).toContain('seedvr2-7b');
      expect(commandSpec.args).toContain('--scale');
      expect(commandSpec.args).toContain('4');
      expect(commandSpec.args).toContain('--10bit');
      expect(commandSpec.args).toContain('--color_transfer');
      expect(commandSpec.args).toContain('lab');
      expect(commandSpec.args).toContain('--temporal_chunk');
      expect(commandSpec.args).toContain('32');
      expect(commandSpec.envHints.TORCH_CUDA_ARCH_LIST).toBeDefined();
    });
  });
});
