import { describe, it, expect } from 'vitest';
import { exportToOtio, exportToFcpxml } from '@/lib/engine/otio-exporter';
import { generateRevideoSceneSource, getVideoEngineBenchmarks } from '@/lib/engine/revideo';
import { isWebCodecsSupported } from '@/lib/media/client-export';

describe('Video Engine Advancements (OTIO, Revideo, WebCodecs)', () => {
  const sampleBeats = [
    {
      id: 'beat-1',
      text: 'Exploring futuristic cities powered by AI',
      duration: 3.5,
      imageUrl: 'https://images.unsplash.com/photo-city-1',
      cameraMove: 'zoom_in',
      shotType: 'wide'
    },
    {
      id: 'beat-2',
      text: 'Autonomous drones flying through neon skyways',
      duration: 4.0,
      videoUrl: 'https://assets.mixkit.co/videos/preview/sample.mp4',
      cameraMove: 'pan_left',
      shotType: 'close_up'
    }
  ];

  describe('OpenTimelineIO (OTIO) Exporter', () => {
    it('generates valid OTIO JSON schema 1.0 with video tracks and rational time', () => {
      const otioString = exportToOtio({
        timelineName: 'Test_Cyberpunk_City',
        beats: sampleBeats,
        fps: 30,
        width: 1080,
        height: 1920
      });

      const otio = JSON.parse(otioString);
      expect(otio.OTIO_SCHEMA).toBe('Timeline.1');
      expect(otio.name).toBe('Test_Cyberpunk_City');
      expect(otio.tracks).toBeDefined();
      expect(otio.tracks.OTIO_SCHEMA).toBe('Stack.1');
      expect(otio.tracks.children.length).toBeGreaterThanOrEqual(1);

      // Verify V1 track
      const videoTrack = otio.tracks.children[0];
      expect(videoTrack.kind).toBe('Video');
      expect(videoTrack.children.length).toBe(2);

      // Verify clip properties
      const clip1 = videoTrack.children[0];
      expect(clip1.OTIO_SCHEMA).toBe('Clip.2');
      expect(clip1.source_range.duration.rate).toBe(30);
      expect(clip1.source_range.duration.value).toBe(105); // 3.5s * 30fps = 105
      expect(clip1.media_references.DEFAULT_MEDIA.target_url).toBe(sampleBeats[0].imageUrl);
      expect(clip1.metadata.owlie_vibes.camera_move).toBe('zoom_in');
    });

    it('attaches audio track when audioUrl is present', () => {
      const otioString = exportToOtio({
        timelineName: 'With_Audio',
        beats: sampleBeats,
        audioUrl: 'https://storage.clipped.ai/narration/test.mp3',
        fps: 30
      });

      const otio = JSON.parse(otioString);
      expect(otio.tracks.children.length).toBe(2);
      const audioTrack = otio.tracks.children[1];
      expect(audioTrack.kind).toBe('Audio');
      expect(audioTrack.name).toBe('A1_Voiceover');
      expect(audioTrack.children[0].media_references.DEFAULT_MEDIA.target_url).toBe(
        'https://storage.clipped.ai/narration/test.mp3'
      );
    });
  });

  describe('Final Cut Pro XML (FCPXML) Exporter', () => {
    it('generates valid FCPXML v1.10 document with spine, format, and assets', () => {
      const fcpxml = exportToFcpxml({
        timelineName: 'FCP_Project',
        beats: sampleBeats,
        audioUrl: 'https://storage.clipped.ai/narration/test.mp3',
        fps: 30,
        width: 1080,
        height: 1920
      });

      expect(fcpxml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(fcpxml).toContain('<!DOCTYPE fcpxml>');
      expect(fcpxml).toContain('<fcpxml version="1.10">');
      expect(fcpxml).toContain('<resources>');
      expect(fcpxml).toContain('<format id="r1"');
      expect(fcpxml).toContain('width="1080" height="1920"');
      expect(fcpxml).toContain('<spine>');
      expect(fcpxml).toContain('<video ref="r_asset_1"');
      expect(fcpxml).toContain('name="Beat_1"');
      expect(fcpxml).toContain('name="Voiceover"');
    });
  });

  describe('Revideo Engine Generator', () => {
    it('generates valid Revideo TypeScript scene source with generator yields', () => {
      const sceneSource = generateRevideoSceneSource({
        projectName: 'Revideo_Showcase',
        beats: sampleBeats,
        fps: 30,
        width: 1080,
        height: 1920,
        audioUrl: 'https://storage.clipped.ai/audio.mp3'
      });

      expect(sceneSource).toContain("import { makeScene2D, Img, Txt, Rect, all, chain, easeInOutCubic, createRef, Vector2 } from '@revideo/2d'");
      expect(sceneSource).toContain("import { makeProject, Audio } from '@revideo/core'");
      expect(sceneSource).toContain('makeScene2D(function* (view)');
      expect(sceneSource).toContain('yield* all(');
      expect(sceneSource).toContain('bgRef().opacity(1, 0.3)');
      expect(sceneSource).toContain('imgRef().scale(1.12, duration, easeInOutCubic)');
    });

    it('returns quantitative benchmarks comparing engines', () => {
      const benchmarks = getVideoEngineBenchmarks();
      expect(benchmarks.length).toBe(4);
      const webcodecs = benchmarks.find((b) => b.engine === 'WebCodecs (Client-Side)');
      const revideo = benchmarks.find((b) => b.engine === 'Revideo');
      const remotion = benchmarks.find((b) => b.engine === 'Remotion');

      expect(webcodecs).toBeDefined();
      expect(webcodecs?.serverCost).toContain('$0');
      expect(revideo?.license).toBe('MIT');
      expect(remotion?.commercialFee).toContain('$50k');
    });
  });

  describe('Client-Side WebCodecs Exporter', () => {
    it('provides environment support checker', () => {
      // In Node.js / jsdom test environment, window.VideoEncoder is undefined
      const supported = isWebCodecsSupported();
      expect(typeof supported).toBe('boolean');
    });
  });
});
