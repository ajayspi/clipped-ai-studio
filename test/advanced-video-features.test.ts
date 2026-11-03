import { describe, it, expect } from 'vitest';
import {
  detectFoleyCues,
  generateFoleyFilterComplex,
  exportFoleyToOtioTrack,
  buildFoleySoundstage,
  FoleySceneInput
} from '@/lib/engine/foley-soundstage';
import {
  compileKineticAssSubtitles,
  synthesizeTimedBlocks,
  KINETIC_PRESETS
} from '@/lib/engine/kinetic-subtitles';
import {
  DagPipelineRunner,
  buildVideoJobDag
} from '@/lib/engine/dag-orchestrator';

describe('Advanced Video Features (Foley Soundstage, Kinetic Typography, DAG Engine)', () => {
  describe('Foley Soundstage Engine', () => {
    const sampleScenes: FoleySceneInput[] = [
      {
        id: 'scene-1',
        text: 'The detective is typing urgently on his computer terminal as rain begins to fall outside',
        keywords: ['typing', 'computer', 'rain'],
        duration: 4.0,
        cameraMove: 'push-in'
      },
      {
        id: 'scene-2',
        text: 'Suddenly, a masked samurai draws a metallic blade with a swift motion',
        keywords: ['sword', 'blade', 'samurai'],
        duration: 3.5,
        cameraMove: 'whip-pan'
      }
    ];

    it('detects action cues and transition cuts from scene text', () => {
      const cues = detectFoleyCues(sampleScenes);
      expect(cues.length).toBeGreaterThanOrEqual(2);

      // Verify action SFX
      const typingCue = cues.find((c) => c.soundId === 'sfx_keyboard_typing');
      expect(typingCue).toBeDefined();
      expect(typingCue?.category).toBe('action');

      const swordCue = cues.find((c) => c.soundId === 'sfx_sword_blade_sheath');
      expect(swordCue).toBeDefined();

      // Verify transition SFX triggered by whip-pan
      const transCue = cues.find((c) => c.triggeredBy.startsWith('cut-transition'));
      expect(transCue).toBeDefined();
      expect(transCue?.category).toBe('transition');
    });

    it('generates valid FFmpeg filter complex string with adelay and amix', () => {
      const cues = detectFoleyCues(sampleScenes);
      const filter = generateFoleyFilterComplex(cues, 7.5);

      expect(filter).toContain('adelay=');
      expect(filter).toContain('volume=');
      expect(filter).toContain('amix=');
      expect(filter).toContain('[foley_master]');
    });

    it('exports Foley sound cues to OpenTimelineIO (OTIO) audio track', () => {
      const stage = buildFoleySoundstage(sampleScenes, 30);
      expect(stage.otioTrack).toBeDefined();
      expect(stage.otioTrack.OTIO_SCHEMA).toBe('Track.1');
      expect(stage.otioTrack.name).toBe('A2_Foley_SFX');
      expect(stage.otioTrack.kind).toBe('Audio');
      expect(Array.isArray(stage.otioTrack.children)).toBe(true);
    });
  });

  describe('Viral Kinetic Typography Engine', () => {
    it('has 5 built-in viral creator presets', () => {
      expect(Object.keys(KINETIC_PRESETS)).toEqual([
        'hormozi-gold',
        'vox-explainer',
        'cyberpunk-neon',
        'karaoke-smooth',
        'cinematic-classic'
      ]);
      expect(KINETIC_PRESETS['hormozi-gold'].activeScale).toBeGreaterThan(1.0);
    });

    it('synthesizes timed blocks and word-level timestamps', () => {
      const blocks = synthesizeTimedBlocks('This is a revolutionary AI video creation system', 5.0, 4);
      expect(blocks.length).toBe(2);
      expect(blocks[0].words.length).toBe(4);
      expect(blocks[0].words[0].word).toBe('This');
      expect(blocks[0].words[0].start).toBe(0);
    });

    it('compiles Advanced SubStation Alpha (.ass) with active word scale & glow', () => {
      const blocks = synthesizeTimedBlocks('Master the algorithm today', 3.0, 4);
      const ass = compileKineticAssSubtitles(blocks, 'hormozi-gold', 1080, 1920);

      expect(ass).toContain('[Script Info]');
      expect(ass).toContain('[V4+ Styles]');
      expect(ass).toContain('PlayResX: 1080');
      expect(ass).toContain('PlayResY: 1920');
      expect(ass).toContain('[Events]');
      expect(ass).toContain('Dialogue: 0,');
      // Verify active word highlight tag
      expect(ass).toContain('\\fscx');
      expect(ass).toContain('\\fscy');
    });
  });

  describe('DAG-Driven Parallel Pipeline Orchestrator', () => {
    it('validates acyclic graphs and detects circular dependencies', () => {
      const runner = new DagPipelineRunner();
      runner.addTask({
        id: 'A',
        name: 'Task A',
        stage: 'script_breakdown',
        dependencies: ['B'],
        execute: async () => 1
      });
      runner.addTask({
        id: 'B',
        name: 'Task B',
        stage: 'scene_visual',
        dependencies: ['A'], // Circular dependency A -> B -> A
        execute: async () => 2
      });

      expect(runner.validateAcyclic()).toBe(false);
    });

    it('executes parallel scene DAG and calculates speedup multiplier', async () => {
      const runner = buildVideoJobDag({
        sceneCount: 3,
        includeCharacterSheet: true,
        includeFoley: true,
        mockDelayMs: 20
      });

      expect(runner.validateAcyclic()).toBe(true);

      const report = await runner.run();
      expect(report.totalTasks).toBe(8); // script + charSheet + voice + 3 scenes + foley + assembly
      expect(report.completedTasks).toBe(8);
      expect(report.failedTasks).toBe(0);
      expect(report.speedupMultiplier).toBeGreaterThanOrEqual(1.0);
    });
  });
});
