import { describe, it, expect } from 'vitest';
import {
  shortsExtractor,
  formatHms,
  detectStreamPlatform,
  buildPartialStreamDownloadSpec,
  buildStreamerSplitConfig,
  detectAudioSpikes,
  synthesizeAudioEnvelope,
  calculatePeakRmsThumbnail,
  generatePostingKit,
} from '@/lib/engine/shorts-extractor';

describe('ShortsExtractor AI Upgrades: Audio Spikes, Streamer Split & Livestream VODs', () => {
  describe('Format & Platform Detection', () => {
    it('formats seconds into HH:MM:SS timestamps', () => {
      expect(formatHms(0)).toBe('00:00:00');
      expect(formatHms(65)).toBe('00:01:05');
      expect(formatHms(3665)).toBe('01:01:05');
      expect(formatHms(41400)).toBe('11:30:00');
    });

    it('correctly classifies YouTube, Twitch, Kick, and direct URLs', () => {
      expect(detectStreamPlatform('https://www.youtube.com/watch?v=gBMyuuTds7g')).toBe('youtube');
      expect(detectStreamPlatform('https://youtu.be/gBMyuuTds7g')).toBe('youtube');
      expect(detectStreamPlatform('https://www.twitch.tv/videos/123456789')).toBe('twitch');
      expect(detectStreamPlatform('https://kick.com/xqc')).toBe('kick');
      expect(detectStreamPlatform('https://cdn.example.com/raw_stream.mp4')).toBe('direct');
    });
  });

  describe('Direct Livestream VOD Partial Range Extraction', () => {
    it('generates yt-dlp section and FFmpeg seek commands for sub-minute partial downloads', () => {
      const url = 'https://www.youtube.com/watch?v=gBMyuuTds7g';
      const spec = buildPartialStreamDownloadSpec(url, 3600, 3645); // 1h to 1h 45s

      expect(spec.platform).toBe('youtube');
      expect(spec.isLivestreamVod).toBe(true);
      expect(spec.downloadSectionsArg).toBe('*01:00:00-01:00:45');
      expect(spec.ytdlpCommand).toContain('--download-sections "*01:00:00-01:00:45"');
      expect(spec.ffmpegSeekCommand).toContain('-ss 01:00:00 -to 01:00:45');
      expect(spec.estimatedAudioOnlyDownloadMb).toBeLessThan(5); // ~2.5 MB vs full 50GB VOD
      expect(spec.duration).toBe(45);
    });
  });

  describe('Streamer Split-Screen Compositor', () => {
    it('creates 9:16 vertical split layout with facecam top and gameplay bottom', () => {
      const split = buildStreamerSplitConfig({
        layout: 'facecam_top_gameplay_bottom',
        corner: 'bottom-left',
      });

      expect(split.layout).toBe('facecam_top_gameplay_bottom');
      expect(split.facecamCorner).toBe('bottom-left');
      expect(split.safeZoneSubtitleY).toBe(1350);
      expect(split.ffmpegFiltergraph).toContain('crop=1080:960[facecam]');
      expect(split.ffmpegFiltergraph).toContain('crop=1080:960[gameplay]');
      expect(split.ffmpegFiltergraph).toContain('[facecam][gameplay]vstack=inputs=2[v]');
    });

    it('supports custom facecam crop bounding box', () => {
      const custom = buildStreamerSplitConfig({
        corner: 'custom',
        customCrop: { x: 100, y: 700, width: 400, height: 350 },
      });

      expect(custom.facecamCrop?.x).toBe(100);
      expect(custom.facecamCrop?.width).toBe(400);
      expect(custom.ffmpegFiltergraph).toContain('crop=w=400:h=350:x=100:y=700');
    });
  });

  describe('Audio Spike Detector & Peak-RMS Frame Thumbnailing', () => {
    it('synthesizes audio envelope and detects energy spikes from shouting and emotion keywords', () => {
      const transcript = `
[00:00:05] Hey what is going on everybody.
[00:00:20] BRO WHAT ARE YOU TALKING ABOUT?! RELAX BRO!
[00:00:45] We are just driving around Vice City.
      `.trim();

      const envelope = synthesizeAudioEnvelope(transcript, 60, 2.0);
      expect(envelope.length).toBe(30);

      const spikes = detectAudioSpikes(envelope, -20.0);
      expect(spikes.length).toBeGreaterThan(0);
      expect(spikes.some((s) => s.isSpike)).toBe(true);
    });

    it('extracts peak RMS thumbnail at argmax(audio_energy) within clip duration', () => {
      const envelope = [
        { timestamp: 10.0, rmsDb: -24.0, energy: 0.35, isSpike: false },
        { timestamp: 12.0, rmsDb: -18.0, energy: 0.50, isSpike: false },
        { timestamp: 14.0, rmsDb: -4.2, energy: 0.95, isSpike: true, type: 'scream' as const }, // PEAK!
        { timestamp: 16.0, rmsDb: -16.0, energy: 0.55, isSpike: false },
      ];

      const thumb = calculatePeakRmsThumbnail(10.0, 20.0, envelope);
      expect(thumb.thumbnailTimestamp).toBe(14.0);
      expect(thumb.peakRmsDb).toBe(-4.2);
      expect(thumb.peakEnergy).toBe(0.95);
      expect(thumb.ffmpegThumbnailCommand).toContain('-ss 14 -i input.mp4 -vframes 1');
    });
  });

  describe('Social Posting Kit Generator', () => {
    it('generates high-CTR title, engagement caption, and hashtag set', () => {
      const kit = generatePostingKit('Kai Cenat First Time in Vice City', 'Cops chased him for no reason!');
      expect(kit.title).toContain('Kai Cenat');
      expect(kit.title).toContain('💀🔥');
      expect(kit.hashtags).toContain('#Shorts');
      expect(kit.hashtags).toContain('#GTA6');
      expect(kit.caption).toContain('Comment below! 👇');
    });
  });

  describe('End-to-End ShortsExtractor Integration', () => {
    it('extracts high-retention clips from a gaming streamer VOD URL with all upgraded metadata', async () => {
      const res = await shortsExtractor.extractShorts({
        sourceType: 'url',
        videoUrl: 'https://www.youtube.com/watch?v=gBMyuuTds7g',
        clipCount: 2,
        strategy: 'highest_virality',
        streamerLayout: 'facecam_top_gameplay_bottom',
        facecamCorner: 'bottom-left',
      });

      expect(res.success).toBe(true);
      expect(res.clips.length).toBe(2);

      const firstClip = res.clips[0];
      expect(firstClip.audioPeakTime).toBeDefined();
      expect(firstClip.thumbnailTimestamp).toBeDefined();
      expect(firstClip.splitConfig).toBeDefined();
      expect(firstClip.splitConfig?.layout).toBe('facecam_top_gameplay_bottom');
      expect(firstClip.partialDownloadSpec).toBeDefined();
      expect(firstClip.partialDownloadSpec?.platform).toBe('youtube');
      expect(firstClip.partialDownloadSpec?.ytdlpCommand).toContain('--download-sections');
      expect(firstClip.postingKit).toBeDefined();
      expect(firstClip.postingKit?.hashtags.length).toBeGreaterThan(0);
    });
  });
});
