/**
 * Tier 4: Real-World Workload Scenarios Test Suite
 * 5 comprehensive end-to-end multi-step production workloads simulating real user operations.
 */

import { expect, registry } from './test-harness';
import { getEngineInstances } from './engine-loader';

export async function registerTier4Tests() {
  const {
    videoGenerator,
    storiesOrchestrator,
    bulkPlanner,
    dramaOrchestrator,
    shortsExtractor,
    autoPilot,
  } = await getEngineInstances();

  // =========================================================================
  // Scenario 1: 30-Day Omnichannel SaaS Product Launch Campaign
  // =========================================================================
  registry.register({
    id: 'T4-WORKLOAD-01',
    tier: 'tier4',
    workflow: 'bulk-plan',
    title: 'Workload 1: 30-Day Omnichannel SaaS Product Launch Campaign',
    description: 'Generates full 30-day marketing batch with distinct daily hooks across YouTube, TikTok, and Instagram',
    fn: async () => {
      // 1. Plan 30 days of SaaS launch content
      const plan = await bulkPlanner.generatePlan({
        niche: 'B2B AI Productivity Software',
        contentCount: 30,
        cadence: 'daily',
        visualStyle: 'modern-saas-clean',
        platforms: ['youtube', 'tiktok', 'instagram'],
        aspectRatio: '9:16',
      });

      expect(plan.success).toBe(true);
      expect(plan.items.length).toBe(30);
      expect(plan.batchJobIds.length).toBe(30);

      // Verify Week 1, Week 2, Week 3, Week 4 day sequencing
      expect(plan.items[0].day).toBe(1);
      expect(plan.items[14].day).toBe(15);
      expect(plan.items[29].day).toBe(30);

      // 2. Render Day 1 launch teaser
      const day1 = plan.items[0];
      const renderDay1 = await videoGenerator.generateAIVideo({
        script: `${day1.hook} ${day1.script}`,
        model: 'kling-v1',
        aspectRatio: '9:16',
        duration: 10,
      });

      expect(renderDay1.success).toBe(true);
      expect(renderDay1.jobId).toBeDefined();
      expect(renderDay1.videoUrl).toMatch(/^https?:\/\//);
    },
  });

  // =========================================================================
  // Scenario 2: 5-Episode Cyberpunk Detective Micro-Drama Series
  // =========================================================================
  registry.register({
    id: 'T4-WORKLOAD-02',
    tier: 'tier4',
    workflow: 'micro-drama',
    title: 'Workload 2: 5-Episode Cyberpunk Detective Micro-Drama Series',
    description: 'Maintains character visual anchor continuity across a 5-episode narrative arc',
    fn: async () => {
      const drama = await dramaOrchestrator.generateDramaSeries({
        genre: 'cyberpunk-neo-noir',
        characters: [
          {
            name: 'Detective Thorne',
            description: 'Weathered detective with glowing cybernetic eye and charcoal trench coat',
            visualAnchor: 'charcoal trench coat, cybernetic right eye glowing amber, rainy neon reflections',
          },
          {
            name: 'Nyx',
            description: 'Underground neural hacker with neon blue braid hair',
            visualAnchor: 'neon blue braided hair, mirrored visor, matte black stealth jacket',
          },
        ],
        episodesCount: 5,
        aspectRatio: '9:16',
      });

      expect(drama.success).toBe(true);
      expect(drama.characters.length).toBe(2);
      expect(drama.episodes.length).toBe(5);

      // Validate character consistency
      for (const char of drama.characters) {
        expect(char.avatarUrl).toBeDefined();
        expect(char.visualAnchor.length).toBeGreaterThan(10);
      }

      // Validate episodic continuity (Ep 1 to 5)
      for (let i = 0; i < 5; i++) {
        expect(drama.episodes[i].episodeNumber).toBe(i + 1);
        expect(drama.episodes[i].scenes.length).toBeGreaterThan(0);
      }

      // Render climax scene for Episode 5
      const finaleScene = drama.episodes[4].scenes[0];
      const videoRes = await videoGenerator.generateAIVideo({
        script: `${drama.characters[0].visualAnchor}. ${finaleScene.description}`,
        model: 'fal-flux',
        aspectRatio: '9:16',
      });

      expect(videoRes.success).toBe(true);
      expect(videoRes.prompt).toContain('amber');
    },
  });

  // =========================================================================
  // Scenario 3: Viral 1-Hour Keynote Podcast Slicing & Auto-Distribution
  // =========================================================================
  registry.register({
    id: 'T4-WORKLOAD-03',
    tier: 'tier4',
    workflow: 'extract-shorts',
    title: 'Workload 3: Viral 1-Hour Keynote Podcast Slicing & Auto-Distribution',
    description: 'Extracts top 5 viral clips from a 60-minute conference transcript and configures auto-publishing',
    fn: async () => {
      const conferenceTranscript = `
        [00:02:15] Welcome everyone to the annual Autonomous Systems Keynote 2026.
        [00:15:30] The single biggest secret to our 10x speedup was eliminating distributed lock contention entirely!
        [00:28:40] Why do 90% of AI startups fail within 18 months? Because they build wrapper features instead of foundational value.
        [00:41:10] If you take away only one lesson today: your data flywheel is your only lasting defensible moat.
        [00:54:00] In conclusion, the transition from prompt engineering to autonomous agent swarms is already underway.
      `;

      // 1. Slicing into 5 viral shorts
      const extracted = await shortsExtractor.extractShorts({
        sourceType: 'transcript',
        transcript: conferenceTranscript,
        clipCount: 5,
        strategy: 'hook-detector',
        captionStyle: 'bold-yellow-stroke',
      });

      expect(extracted.success).toBe(true);
      expect(extracted.clips.length).toBe(5);

      // Verify clips have valid time intervals and high virality scores
      for (const clip of extracted.clips) {
        expect(clip.viralScore).toBeGreaterThanOrEqual(70);
        expect(clip.hook.length).toBeGreaterThan(5);
        expect(clip.endTime).toBeGreaterThan(clip.startTime);
      }

      // 2. Schedule top-scoring clip for immediate viral push
      const topClip = extracted.clips.reduce((max: any, c: any) => (c.viralScore > max.viralScore ? c : max), extracted.clips[0]);
      const autoSchedule = await autoPilot.executePipeline({
        pipelineName: `Viral Sliced Short: ${topClip.title}`,
        niche: 'ai-startups',
        schedule: '0 15 * * *',
        sourceStrategy: 'repurposed-short',
        visualPipeline: 'extract-shorts',
        autoPublish: true,
        targetPlatforms: ['tiktok', 'youtube', 'instagram'],
      });

      expect(autoSchedule.success).toBe(true);
      expect(autoSchedule.status).toBe('active');
    },
  });

  // =========================================================================
  // Scenario 4: Multi-Part Ancient Civilizations Historical Documentary Series
  // =========================================================================
  registry.register({
    id: 'T4-WORKLOAD-04',
    tier: 'tier4',
    workflow: 'stories',
    title: 'Workload 4: Multi-Part Ancient Civilizations Historical Documentary Series',
    description: 'Generates a 4-part episodic historical documentary with cliffhangers and thematic scene breakdowns',
    fn: async () => {
      const documentary = await storiesOrchestrator.generateStorySeries({
        topic: 'The Mysterious Bronze Age Collapse of 1177 BC',
        storyType: 'historical-documentary',
        partsCount: 4,
        visualStyle: 'oil-painting-masterpiece',
        voice: 'onyx',
        aspectRatio: '16:9',
        includeHooks: true,
      });

      expect(documentary.success).toBe(true);
      expect(documentary.parts.length).toBe(4);
      expect(documentary.seriesTitle).toContain('Bronze Age Collapse');

      // Verify each part contains coherent scenes and cliffhangers
      for (let i = 0; i < 4; i++) {
        const part = documentary.parts[i];
        expect(part.partNumber).toBe(i + 1);
        expect(part.hook.length).toBeGreaterThan(10);
        expect(part.cliffhanger.length).toBeGreaterThan(10);
        expect(part.scenes.length).toBeGreaterThan(0);
      }

      // Render documentary introduction video
      const introPart = documentary.parts[0];
      const videoRes = await videoGenerator.generateAIVideo({
        script: `${introPart.hook} ${introPart.script}`,
        model: 'kling-v1',
        aspectRatio: '16:9',
        voice: 'onyx',
      });

      expect(videoRes.success).toBe(true);
      expect(videoRes.duration).toBeGreaterThan(0);
    },
  });

  // =========================================================================
  // Scenario 5: Fully Autonomous 24/7 AI Tech News Channel
  // =========================================================================
  registry.register({
    id: 'T4-WORKLOAD-05',
    tier: 'tier4',
    workflow: 'auto',
    title: 'Workload 5: Fully Autonomous 24/7 AI Tech News Channel',
    description: 'Sets up and executes fully automated recurring video generation from RSS feeds',
    fn: async () => {
      // 1. Configure autonomous autopilot pipeline
      const pipelineConfig = {
        pipelineName: 'Autonomous Daily Tech Wire',
        niche: 'artificial-intelligence',
        schedule: '0 7 * * *',
        sourceStrategy: 'rss-aggregator',
        visualPipeline: 'ai-videos',
        autoPublish: true,
        targetPlatforms: ['youtube', 'tiktok', 'twitter'],
        voice: 'nova',
      };

      const pipeline = await autoPilot.executePipeline(pipelineConfig);
      expect(pipeline.success).toBe(true);
      expect(pipeline.status).toBe('active');
      expect(pipeline.pipelineId).toBeDefined();

      // 2. Simulate automated trigger cycle: generate video for the day
      const dailyVideo = await videoGenerator.generateAIVideo({
        script: 'Breaking tech news: New milestone achieved in solid-state quantum batteries today.',
        model: 'kling-v1',
        aspectRatio: '9:16',
        voice: 'nova',
      });

      expect(dailyVideo.success).toBe(true);
      expect(dailyVideo.jobId).toBeDefined();
      expect(dailyVideo.videoUrl).toBeDefined();
    },
  });
}
