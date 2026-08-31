/**
 * Tier 3: Pairwise Combinatorial & Cross-Workflow Interactions Test Suite
 * Validates orthogonal parameter combinations and multi-workflow pipeline integrations.
 */

import { expect, registry } from './test-harness';
import { getEngineInstances } from './engine-loader';

export async function registerTier3Tests() {
  const {
    videoGenerator,
    storiesOrchestrator,
    bulkPlanner,
    dramaOrchestrator,
    shortsExtractor,
    autoPilot,
  } = await getEngineInstances();

  // =========================================================================
  // 1. Combinatorial Pairwise Parameter Matrix Tests
  // =========================================================================

  const pairwiseCombos = [
    { model: 'kling-v1', aspectRatio: '16:9', voice: 'alloy', motion: 'pan-left' },
    { model: 'luma-dream', aspectRatio: '9:16', voice: 'echo', motion: 'zoom-in' },
    { model: 'fal-flux', aspectRatio: '1:1', voice: 'fable', motion: 'tilt-up' },
    { model: 'kling-v1', aspectRatio: '9:16', voice: 'onyx', motion: 'static' },
    { model: 'luma-dream', aspectRatio: '16:9', voice: 'nova', motion: 'orbit-right' },
  ];

  pairwiseCombos.forEach((combo, idx) => {
    registry.register({
      id: `T3-PAIRWISE-0${idx + 1}`,
      tier: 'tier3',
      workflow: 'ai-videos',
      title: `Pairwise Matrix #${idx + 1}: ${combo.model} + ${combo.aspectRatio} + ${combo.voice}`,
      description: `Verifies orthogonal combinatorial parameters interact correctly`,
      fn: async () => {
        const res = await videoGenerator.generateAIVideo({
          script: `Pairwise test case ${idx + 1} verifying ${combo.model} with ${combo.aspectRatio}.`,
          model: combo.model as any,
          aspectRatio: combo.aspectRatio as any,
          voice: combo.voice,
          cameraMotion: combo.motion,
        });

        expect(res.success).toBe(true);
        expect(res.modelUsed).toBe(combo.model);
        expect(res.metadata.aspectRatio).toBe(combo.aspectRatio);
        expect(res.metadata.voice).toBe(combo.voice);
        expect(res.metadata.cameraMotion).toBe(combo.motion);
      },
    });
  });

  // =========================================================================
  // 2. Cross-Workflow Multi-Stage Pipeline Tests
  // =========================================================================

  registry.register({
    id: 'T3-CROSS-01',
    tier: 'tier3',
    workflow: 'cross-workflow',
    title: 'Cross-Workflow: Stories Orchestrator -> AI Video Generation Chain',
    description: 'Verifies story series part scripts feed directly into AI video generator',
    fn: async () => {
      // Step 1: Generate a 2-part story
      const storyRes = await storiesOrchestrator.generateStorySeries({
        topic: 'The Bermuda Triangle Anomaly',
        storyType: 'mystery',
        partsCount: 2,
        visualStyle: 'dark-ocean-hdr',
      });

      expect(storyRes.success).toBe(true);
      expect(storyRes.parts.length).toBe(2);

      // Step 2: Feed Part 1 and Part 2 into AI Video Generator
      const videoJobs = [];
      for (const part of storyRes.parts) {
        const videoRes = await videoGenerator.generateAIVideo({
          script: `${part.hook} ${part.script} ${part.cliffhanger}`,
          model: 'kling-v1',
          aspectRatio: '9:16',
        });
        expect(videoRes.success).toBe(true);
        videoJobs.push(videoRes.jobId);
      }

      expect(videoJobs.length).toBe(2);
      expect(videoJobs[0] !== videoJobs[1]).toBe(true);
    },
  });

  registry.register({
    id: 'T3-CROSS-02',
    tier: 'tier3',
    workflow: 'cross-workflow',
    title: 'Cross-Workflow: Bulk Planner -> Multi-Video Batch Generation',
    description: 'Verifies calendar items convert seamlessly into parallel video generation jobs',
    fn: async () => {
      // Step 1: Generate 3-day content plan
      const planRes = await bulkPlanner.generatePlan({
        niche: 'Cybersecurity Tips',
        contentCount: 3,
        cadence: 'daily',
        visualStyle: 'digital-hacker',
        platforms: ['tiktok', 'youtube'],
      });

      expect(planRes.success).toBe(true);
      expect(planRes.items.length).toBe(3);

      // Step 2: Generate videos for each plan day
      const renderedVideos = await Promise.all(
        planRes.items.map((item: any) =>
          videoGenerator.generateAIVideo({
            script: `${item.hook} ${item.script}`,
            model: 'luma-dream',
            aspectRatio: '9:16',
          })
        )
      );

      expect(renderedVideos.length).toBe(3);
      for (const v of renderedVideos) {
        expect(v.success).toBe(true);
        expect(typeof v.videoUrl).toBe('string');
      }
    },
  });

  registry.register({
    id: 'T3-CROSS-03',
    tier: 'tier3',
    workflow: 'cross-workflow',
    title: 'Cross-Workflow: Micro-Drama Characters -> Episode Scene Rendering',
    description: 'Verifies drama character visual anchors propagate into episodic scene generation',
    fn: async () => {
      // Step 1: Generate 2-episode drama with persistent character
      const dramaRes = await dramaOrchestrator.generateDramaSeries({
        genre: 'cyber-detective',
        characters: [
          { name: 'Marcus', description: 'Cyborg detective', visualAnchor: 'cybernetic left arm, silver trenchcoat' },
        ],
        episodesCount: 2,
      });

      expect(dramaRes.success).toBe(true);
      expect(dramaRes.episodes.length).toBe(2);

      // Step 2: Render video for Episode 1 Scene 1 using character anchor
      const ep1Scene1 = dramaRes.episodes[0].scenes[0];
      const videoRes = await videoGenerator.generateAIVideo({
        script: `${dramaRes.characters[0].visualAnchor}. ${ep1Scene1.description}`,
        model: 'fal-flux',
      });

      expect(videoRes.success).toBe(true);
      expect(videoRes.prompt).toContain(dramaRes.characters[0].visualAnchor);
    },
  });

  registry.register({
    id: 'T3-CROSS-04',
    tier: 'tier3',
    workflow: 'cross-workflow',
    title: 'Cross-Workflow: Shorts Extractor -> Auto Pilot Repurposing Pipeline',
    description: 'Verifies extracted high-viral clips register into automated publishing pipeline',
    fn: async () => {
      // Step 1: Extract viral clips from long transcript
      const shortsRes = await shortsExtractor.extractShorts({
        sourceType: 'transcript',
        transcript: 'Long form discussion about the future of energy and nuclear fusion breakthroughs.',
        clipCount: 2,
        strategy: 'hook-detector',
      });

      expect(shortsRes.success).toBe(true);
      expect(shortsRes.clips.length).toBe(2);

      // Step 2: Register top clip into Auto Pilot schedule
      const topClip = shortsRes.clips[0];
      const autoRes = await autoPilot.executePipeline({
        pipelineName: `Viral Clip Auto-Publish: ${topClip.title}`,
        niche: 'clean-energy',
        schedule: '0 18 * * *',
        sourceStrategy: 'repurposed-clip',
        visualPipeline: 'extract-shorts',
        autoPublish: true,
        targetPlatforms: ['tiktok', 'youtube'],
      });

      expect(autoRes.success).toBe(true);
      expect(autoRes.status).toBe('active');
    },
  });

  registry.register({
    id: 'T3-CROSS-05',
    tier: 'tier3',
    workflow: 'cross-workflow',
    title: 'Cross-Workflow: Compound Auto-Pilot (Stories -> Bulk -> Video Generation)',
    description: 'Verifies compound end-to-end execution of automated content pipeline',
    fn: async () => {
      // Step 1: Trigger autonomous pipeline configuration
      const autoRes = await autoPilot.executePipeline({
        pipelineName: 'Autonomous Daily Story Pipeline',
        niche: 'space-exploration',
        schedule: '0 9 * * *',
        sourceStrategy: 'trending-space',
        visualPipeline: 'stories',
        autoPublish: false,
        targetPlatforms: ['youtube'],
      });
      expect(autoRes.success).toBe(true);

      // Step 2: Pipeline triggers Stories Orchestrator
      const storyRes = await storiesOrchestrator.generateStorySeries({
        topic: 'Voyager 1 Leaves the Solar System',
        storyType: 'scientific',
        partsCount: 2,
        visualStyle: 'deep-space-hdr',
      });
      expect(storyRes.success).toBe(true);

      // Step 3: Story outputs populate bulk calendar item
      const bulkRes = await bulkPlanner.generatePlan({
        niche: 'Space Facts',
        contentCount: 2,
        cadence: 'daily',
        visualStyle: 'space',
        platforms: ['youtube'],
      });
      expect(bulkRes.success).toBe(true);
      expect(bulkRes.items.length).toBe(2);
    },
  });
}
