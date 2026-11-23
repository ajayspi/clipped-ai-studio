import { describe, it, expect } from 'vitest';
import {
  CANONICAL_BENCHMARKS,
  compileBenchmarkVideo
} from '@/lib/engine/video-benchmark-suite';

describe('Real-World Video Benchmark & Live Tweaking Suite', () => {
  describe('Canonical Benchmark Registry', () => {
    it('registers all 3 canonical benchmarks with target specifications', () => {
      expect(CANONICAL_BENCHMARKS['vox-explainer']).toBeDefined();
      expect(CANONICAL_BENCHMARKS['vox-explainer'].targetFormat).toBe('9:16');
      expect(CANONICAL_BENCHMARKS['vox-explainer'].audioSpec.targetLufs).toBe(-14);

      expect(CANONICAL_BENCHMARKS['fireship-tech']).toBeDefined();
      expect(CANONICAL_BENCHMARKS['fireship-tech'].styleSlug).toBe('ascii-crt');

      expect(CANONICAL_BENCHMARKS['viral-narrative']).toBeDefined();
      expect(CANONICAL_BENCHMARKS['viral-narrative'].audioSpec.requireSilenceOrBreath).toBe(true);
    });
  });

  describe('Vox / Lemo Explainer Compilation', () => {
    it('compiles valid timeline, Theatre.js tracks, and procedural Foley', () => {
      const compiled = compileBenchmarkVideo('vox-explainer');

      expect(compiled.benchmarkId).toBe('vox-explainer');
      expect(compiled.treatment.shots).toHaveLength(5);
      expect(compiled.timelineManifest.fps).toBe(30);
      expect(compiled.timelineManifest.aspectRatio).toBe('9:16');

      // Hook duration <= 3.0s
      expect(compiled.treatment.shots[0].durationSeconds).toBeLessThanOrEqual(3.0);

      // Theatre.js keyframes generated
      expect(compiled.timelineManifest.theatreKeyframesCount).toBeGreaterThan(0);

      // Procedural Foley events synced
      expect(compiled.timelineManifest.foleyEvents.length).toBeGreaterThanOrEqual(4);
      expect(compiled.timelineManifest.foleyEvents[0].sound).toBe('whoosh');

      // OTIO JSON export
      expect(compiled.otioTimelineJson).toContain('"OTIO_SCHEMA": "Timeline.1"');
      expect(compiled.otioTimelineJson).toContain('"OTIO_SCHEMA": "Clip.2"');

      // Fidelity Scorecard
      expect(compiled.scorecard.passed).toBe(true);
      expect(compiled.scorecard.overallScore).toBeGreaterThanOrEqual(85);
      expect(compiled.scorecard.metrics.hookLatency.passed).toBe(true);
      expect(compiled.scorecard.metrics.distinctCameraMoves.passed).toBe(true);
      expect(compiled.scorecard.metrics.audioLayerCompleteness.passed).toBe(true);
      expect(compiled.scorecard.metrics.silencePresence.passed).toBe(true);
    });
  });

  describe('Fireship Tech Breakdown Compilation', () => {
    it('compiles rapid dev breakdown with CRT scanlines and AST cuts', () => {
      const compiled = compileBenchmarkVideo('fireship-tech', {
        customTopic: 'Next.js 16 Server Actions'
      });

      expect(compiled.topic).toBe('Next.js 16 Server Actions');
      expect(compiled.treatment.styleSlug).toBe('ascii-crt');
      expect(compiled.treatment.shots[0].durationSeconds).toBeLessThanOrEqual(2.5);
      expect(compiled.treatment.shots.some(s => s.audioLayers.foley === 'glitch')).toBe(true);

      expect(compiled.scorecard.passed).toBe(true);
      expect(compiled.scorecard.overallScore).toBeGreaterThanOrEqual(85);
    });
  });

  describe('Live Tweaking & Responsiveness', () => {
    it('applies pacing scaling to shorten or lengthen duration', () => {
      const normal = compileBenchmarkVideo('vox-explainer', { pacingScale: 1.0 });
      const faster = compileBenchmarkVideo('vox-explainer', { pacingScale: 0.7 });

      expect(faster.timelineManifest.durationSeconds).toBeLessThan(
        normal.timelineManifest.durationSeconds
      );
    });

    it('computes origami split-screen layout bounds correctly', () => {
      const quad = compileBenchmarkVideo('vox-explainer', { layoutSplit: 'quadGrid' });
      expect(quad.timelineManifest.splitLayout.panesCount).toBe(4);
      expect(quad.timelineManifest.splitLayout.bounds[0].w).toBeGreaterThan(0);
      expect(quad.timelineManifest.splitLayout.bounds[0].h).toBeGreaterThan(0);
    });

    it('modulates Foley gain via live tweaking parameter', () => {
      const tweaked = compileBenchmarkVideo('vox-explainer', { foleyGain: 1.5 });
      expect(tweaked.timelineManifest.foleyEvents[0].gain).toBe(1.5);
    });
  });
});
