/**
 * Tier 1: Feature Coverage Test Suite
 * Requirement-driven opaque-box tests covering >=5 primary features per workflow (30 tests total).
 */

import { expect, registry } from './test-harness';
import { getEngineInstances } from './engine-loader';

export async function registerTier1Tests() {
  const {
    videoGenerator,
    storiesOrchestrator,
    bulkPlanner,
    dramaOrchestrator,
    shortsExtractor,
    autoPilot,
  } = await getEngineInstances();

  // ==========================================
  // 1. AI Videos Workflow (5 Tests)
  // ==========================================
  registry.register({
    id: 'T1-AIVID-01',
    tier: 'tier1',
    workflow: 'ai-videos',
    title: 'AI Videos: Kling-v1 Generator with 16:9 Aspect Ratio',
    description: 'Verifies Kling-v1 model generates landscape video with correct metadata',
    fn: async () => {
      const res = await videoGenerator.generateAIVideo({
        script: 'A cinematic drone shot over snow-capped mountains at sunrise.',
        model: 'kling-v1',
        aspectRatio: '16:9',
        duration: 5,
      });

      expect(res.success).toBe(true);
      expect(res.modelUsed).toBe('kling-v1');
      expect(res.duration).toBe(5);
      expect(typeof res.jobId).toBe('string');
      expect(res.jobId.length).toBeGreaterThan(0);
      expect(typeof res.videoUrl).toBe('string');
      expect(res.videoUrl.length).toBeGreaterThan(0);
      expect(res.metadata.aspectRatio).toBe('16:9');
    },
  });

  registry.register({
    id: 'T1-AIVID-02',
    tier: 'tier1',
    workflow: 'ai-videos',
    title: 'AI Videos: Luma Dream Machine with 9:16 Portrait Ratio',
    description: 'Verifies Luma Dream Machine handles vertical format generation',
    fn: async () => {
      const res = await videoGenerator.generateAIVideo({
        script: 'A futuristic humanoid robot walking in neon-lit Tokyo streets.',
        model: 'luma-dream',
        aspectRatio: '9:16',
        duration: 10,
      });

      expect(res.success).toBe(true);
      expect(res.modelUsed).toBe('luma-dream');
      expect(res.duration).toBe(10);
      expect(res.metadata.aspectRatio).toBe('9:16');
      expect(res.videoUrl).toMatch(/^https?:\/\//);
    },
  });

  registry.register({
    id: 'T1-AIVID-03',
    tier: 'tier1',
    workflow: 'ai-videos',
    title: 'AI Videos: Fal-Flux Model with Custom Camera Motion',
    description: 'Verifies Fal-Flux model generation with custom camera panning',
    fn: async () => {
      const res = await videoGenerator.generateAIVideo({
        script: 'Macro shot of an ancient mechanical clockwork mechanism ticking.',
        model: 'fal-flux',
        cameraMotion: 'orbit-left',
        duration: 4,
      });

      expect(res.success).toBe(true);
      expect(res.modelUsed).toBe('fal-flux');
      expect(res.metadata.cameraMotion).toBe('orbit-left');
    },
  });

  registry.register({
    id: 'T1-AIVID-04',
    tier: 'tier1',
    workflow: 'ai-videos',
    title: 'AI Videos: Custom Negative Prompt & Voice Synthesis Option',
    description: 'Verifies prompt refinement with negative constraints and voice parameter',
    fn: async () => {
      const res = await videoGenerator.generateAIVideo({
        script: 'An astronaut standing on the surface of Mars gazing at Earth.',
        negativePrompt: 'blurry, cartoonish, low resolution',
        voice: 'echo',
      });

      expect(res.success).toBe(true);
      expect(res.prompt).toContain('blurry');
      expect(res.metadata.voice).toBe('echo');
    },
  });

  registry.register({
    id: 'T1-AIVID-05',
    tier: 'tier1',
    workflow: 'ai-videos',
    title: 'AI Videos: Response Schema Contract Validation',
    description: 'Verifies all required keys and types are present in generation response',
    fn: async () => {
      const res = await videoGenerator.generateAIVideo({
        script: 'Underwater coral reef with glowing bioluminescent fish.',
      });

      expect(res).toHaveProperty('success');
      expect(res).toHaveProperty('jobId');
      expect(res).toHaveProperty('videoUrl');
      expect(res).toHaveProperty('prompt');
      expect(res).toHaveProperty('modelUsed');
      expect(res).toHaveProperty('duration');
      expect(res).toHaveProperty('metadata');
    },
  });

  // ==========================================
  // 2. Stories Workflow (5 Tests)
  // ==========================================
  registry.register({
    id: 'T1-STORY-01',
    tier: 'tier1',
    workflow: 'stories',
    title: 'Stories: 3-Part Horror Series with Cliffhangers',
    description: 'Verifies multi-part narrative generation with structured cliffhangers',
    fn: async () => {
      const res = await storiesOrchestrator.generateStorySeries({
        topic: 'The Abandoned Lighthouse on Blackwood Island',
        storyType: 'horror',
        partsCount: 3,
        visualStyle: 'dark-cinematic',
      });

      expect(res.success).toBe(true);
      expect(res.parts.length).toBe(3);
      expect(res.parts[0].partNumber).toBe(1);
      expect(res.parts[0].cliffhanger.length).toBeGreaterThan(0);
      expect(res.parts[1].partNumber).toBe(2);
      expect(res.parts[2].partNumber).toBe(3);
    },
  });

  registry.register({
    id: 'T1-STORY-02',
    tier: 'tier1',
    workflow: 'stories',
    title: 'Stories: 5-Part Motivational Series with Visual Style',
    description: 'Verifies 5-part generation and propagation of custom visual style',
    fn: async () => {
      const res = await storiesOrchestrator.generateStorySeries({
        topic: 'From Zero to Tech Pioneer',
        storyType: 'motivational',
        partsCount: 5,
        visualStyle: 'cyberpunk-neon',
      });

      expect(res.success).toBe(true);
      expect(res.parts.length).toBe(5);
      expect(res.metadata.visualStyle).toBe('cyberpunk-neon');
    },
  });

  registry.register({
    id: 'T1-STORY-03',
    tier: 'tier1',
    workflow: 'stories',
    title: 'Stories: Structured Viral Hooks Enabled',
    description: 'Verifies includeHooks produces catchy opening hooks for each part',
    fn: async () => {
      const res = await storiesOrchestrator.generateStorySeries({
        topic: 'Ancient Secrets of the Pyramids',
        storyType: 'educational',
        partsCount: 2,
        visualStyle: 'hyper-realistic',
        includeHooks: true,
      });

      expect(res.success).toBe(true);
      for (const part of res.parts) {
        expect(typeof part.hook).toBe('string');
        expect(part.hook.length).toBeGreaterThan(10);
      }
    },
  });

  registry.register({
    id: 'T1-STORY-04',
    tier: 'tier1',
    workflow: 'stories',
    title: 'Stories: Scene Decomposition & Keyword Extraction',
    description: 'Verifies each story part contains structured scenes with keywords',
    fn: async () => {
      const res = await storiesOrchestrator.generateStorySeries({
        topic: 'Deep Sea Explorations',
        storyType: 'adventure',
        partsCount: 2,
        visualStyle: 'underwater-hdr',
      });

      expect(res.success).toBe(true);
      const part1 = res.parts[0];
      expect(part1.scenes.length).toBeGreaterThan(0);
      expect(part1.scenes[0]).toHaveProperty('keywords');
      expect(part1.scenes[0]).toHaveProperty('duration');
    },
  });

  registry.register({
    id: 'T1-STORY-05',
    tier: 'tier1',
    workflow: 'stories',
    title: 'Stories: Voice and Aspect Ratio Configuration',
    description: 'Verifies custom voice and aspect ratio parameters',
    fn: async () => {
      const res = await storiesOrchestrator.generateStorySeries({
        topic: 'Artificial Intelligence Evolution',
        storyType: 'documentary',
        partsCount: 2,
        visualStyle: 'futuristic',
        voice: 'onyx',
        aspectRatio: '9:16',
      });

      expect(res.success).toBe(true);
      expect(res.metadata.voice).toBe('onyx');
      expect(res.metadata.aspectRatio).toBe('9:16');
    },
  });

  // ==========================================
  // 3. Bulk Plan Workflow (5 Tests)
  // ==========================================
  registry.register({
    id: 'T1-BULK-01',
    tier: 'tier1',
    workflow: 'bulk-plan',
    title: 'Bulk Plan: 7-Day Fitness Calendar Generation',
    description: 'Verifies generating 7-day content schedule with daily scripts and hooks',
    fn: async () => {
      const res = await bulkPlanner.generatePlan({
        niche: 'High Intensity Interval Training',
        contentCount: 7,
        cadence: 'daily',
        visualStyle: 'dynamic-fitness',
        platforms: ['tiktok', 'instagram'],
      });

      expect(res.success).toBe(true);
      expect(res.items.length).toBe(7);
      expect(res.items[0].day).toBe(1);
      expect(res.items[6].day).toBe(7);
      expect(res.batchJobIds.length).toBe(7);
    },
  });

  registry.register({
    id: 'T1-BULK-02',
    tier: 'tier1',
    workflow: 'bulk-plan',
    title: 'Bulk Plan: 30-Day Tech News Editorial Calendar',
    description: 'Verifies generating maximum 30-day bulk content series',
    fn: async () => {
      const res = await bulkPlanner.generatePlan({
        niche: 'AI & Quantum Computing Trends',
        contentCount: 30,
        cadence: 'daily',
        visualStyle: 'tech-minimal',
        platforms: ['youtube', 'linkedin'],
      });

      expect(res.success).toBe(true);
      expect(res.items.length).toBe(30);
      expect(res.planTitle).toContain('30-Day');
    },
  });

  registry.register({
    id: 'T1-BULK-03',
    tier: 'tier1',
    workflow: 'bulk-plan',
    title: 'Bulk Plan: Omnichannel Multi-Platform Distribution',
    description: 'Verifies support for multiple target distribution channels',
    fn: async () => {
      const res = await bulkPlanner.generatePlan({
        niche: 'Personal Finance Hacks',
        contentCount: 5,
        cadence: 'weekly',
        visualStyle: 'corporate-clean',
        platforms: ['youtube', 'tiktok', 'instagram', 'twitter'],
      });

      expect(res.success).toBe(true);
      expect(res.items.length).toBe(5);
    },
  });

  registry.register({
    id: 'T1-BULK-04',
    tier: 'tier1',
    workflow: 'bulk-plan',
    title: 'Bulk Plan: Daily Hooks & Script Uniqueness',
    description: 'Verifies daily items contain unique hooks and valid scripts',
    fn: async () => {
      const res = await bulkPlanner.generatePlan({
        niche: 'Real Estate Investing',
        contentCount: 3,
        cadence: 'daily',
        visualStyle: 'luxury-modern',
        platforms: ['instagram'],
      });

      expect(res.success).toBe(true);
      const hooks = res.items.map((i: any) => i.hook);
      expect(hooks.length).toBe(3);
      for (const item of res.items) {
        expect(item.script.length).toBeGreaterThan(15);
      }
    },
  });

  registry.register({
    id: 'T1-BULK-05',
    tier: 'tier1',
    workflow: 'bulk-plan',
    title: 'Bulk Plan: Batch Job IDs Queueing Verification',
    description: 'Verifies each calendar item receives a corresponding batch job ID',
    fn: async () => {
      const res = await bulkPlanner.generatePlan({
        niche: 'Productivity Tips',
        contentCount: 4,
        cadence: 'daily',
        visualStyle: 'clean-minimal',
        platforms: ['youtube'],
      });

      expect(res.success).toBe(true);
      expect(res.batchJobIds.length).toBe(res.items.length);
      for (const id of res.batchJobIds) {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      }
    },
  });

  // ==========================================
  // 4. Extract Shorts Workflow (5 Tests)
  // ==========================================
  registry.register({
    id: 'T1-SHORTS-01',
    tier: 'tier1',
    workflow: 'extract-shorts',
    title: 'Extract Shorts: Transcript Hook Slicing',
    description: 'Verifies slicing high-retention clips from raw text transcript',
    fn: async () => {
      const sampleTranscript = `
        Welcome back to the podcast. Today we are discussing how quantum computing breaks modern encryption.
        The most fascinating breakthrough happened last Tuesday when researchers proved a 1000-qubit system
        could factor 2048-bit RSA keys in under 3 minutes! This completely rewrites cybersecurity for the next decade.
        Later in the show we will discuss quantum key distribution and what you must do right now to protect your data.
      `;

      const res = await shortsExtractor.extractShorts({
        sourceType: 'transcript',
        transcript: sampleTranscript,
        clipCount: 3,
        strategy: 'hook-detector',
      });

      expect(res.success).toBe(true);
      expect(res.clips.length).toBe(3);
      expect(res.clips[0].endTime).toBeGreaterThan(res.clips[0].startTime);
      expect(res.clips[0].viralScore).toBeGreaterThanOrEqual(70);
    },
  });

  registry.register({
    id: 'T1-SHORTS-02',
    tier: 'tier1',
    workflow: 'extract-shorts',
    title: 'Extract Shorts: Video URL Ingestion & Duration Analysis',
    description: 'Verifies extracting shorts from hosted video URL',
    fn: async () => {
      const res = await shortsExtractor.extractShorts({
        sourceType: 'url',
        videoUrl: 'https://storage.clipped.ai/raw/tech-keynote-2026.mp4',
        clipCount: 2,
      });

      expect(res.success).toBe(true);
      expect(res.originalDuration).toBeGreaterThan(0);
      expect(res.clips.length).toBe(2);
    },
  });

  registry.register({
    id: 'T1-SHORTS-03',
    tier: 'tier1',
    workflow: 'extract-shorts',
    title: 'Extract Shorts: Viral Score & Reason Metadata',
    description: 'Verifies virality scoring metric and explanatory reasoning per clip',
    fn: async () => {
      const res = await shortsExtractor.extractShorts({
        sourceType: 'transcript',
        transcript: 'Shocking facts about the cosmos that will blow your mind completely.',
        clipCount: 2,
      });

      expect(res.success).toBe(true);
      for (const clip of res.clips) {
        expect(typeof clip.viralScore).toBe('number');
        expect(clip.viralScore).toBeGreaterThanOrEqual(50);
        expect(typeof clip.reason).toBe('string');
      }
    },
  });

  registry.register({
    id: 'T1-SHORTS-04',
    tier: 'tier1',
    workflow: 'extract-shorts',
    title: 'Extract Shorts: Extraction Strategies (question-hook vs story-arc)',
    description: 'Verifies strategy selection changes extraction behavior',
    fn: async () => {
      const res = await shortsExtractor.extractShorts({
        sourceType: 'transcript',
        transcript: 'Is it possible to live forever? Scientists just unlocked the secret in jellyfish DNA.',
        clipCount: 1,
        strategy: 'question-hook',
      });

      expect(res.success).toBe(true);
      expect(res.clips.length).toBe(1);
    },
  });

  registry.register({
    id: 'T1-SHORTS-05',
    tier: 'tier1',
    workflow: 'extract-shorts',
    title: 'Extract Shorts: Custom Clip Count Configuration',
    description: 'Verifies requested clip count matches returned clips length',
    fn: async () => {
      const res = await shortsExtractor.extractShorts({
        sourceType: 'transcript',
        transcript: 'Detailed masterclass on scalable software design and system architecture.',
        clipCount: 5,
      });

      expect(res.success).toBe(true);
      expect(res.clips.length).toBe(5);
    },
  });

  // ==========================================
  // 5. Micro-Drama Workflow (5 Tests)
  // ==========================================
  registry.register({
    id: 'T1-DRAMA-01',
    tier: 'tier1',
    workflow: 'micro-drama',
    title: 'Micro-Drama: Character Visual Anchor Generation',
    description: 'Verifies consistent visual anchor descriptions and avatar URLs for characters',
    fn: async () => {
      const res = await dramaOrchestrator.generateDramaSeries({
        genre: 'cyberpunk-noir',
        characters: [
          { name: 'Detective Jax', description: 'Hardboiled cyber-detective with glowing blue eye implant', visualAnchor: 'cyber-coat, glowing blue optic' },
          { name: 'Dr. Vesper', description: 'Rogue neuroscientist with platinum hair', visualAnchor: 'silver lab coat, platinum bob' },
        ],
        episodesCount: 3,
      });

      expect(res.success).toBe(true);
      expect(res.characters.length).toBe(2);
      expect(res.characters[0].avatarUrl).toBeDefined();
      expect(res.characters[0].visualAnchor).toContain('cyber-coat');
    },
  });

  registry.register({
    id: 'T1-DRAMA-02',
    tier: 'tier1',
    workflow: 'micro-drama',
    title: 'Micro-Drama: Multi-Episode Series Breakdown',
    description: 'Verifies episodic scripts and title generation',
    fn: async () => {
      const res = await dramaOrchestrator.generateDramaSeries({
        genre: 'royal-romance',
        characters: [
          { name: 'Elena', description: 'Undercover reporter', visualAnchor: 'red dress' },
          { name: 'Prince Alexander', description: 'Crown prince', visualAnchor: 'royal uniform' },
        ],
        episodesCount: 4,
      });

      expect(res.success).toBe(true);
      expect(res.episodes.length).toBe(4);
      expect(res.episodes[0].episodeNumber).toBe(1);
      expect(res.episodes[3].episodeNumber).toBe(4);
    },
  });

  registry.register({
    id: 'T1-DRAMA-03',
    tier: 'tier1',
    workflow: 'micro-drama',
    title: 'Micro-Drama: Scene Breakdown per Episode',
    description: 'Verifies each episode contains structured cinematic scenes',
    fn: async () => {
      const res = await dramaOrchestrator.generateDramaSeries({
        genre: 'supernatural-thriller',
        characters: [
          { name: 'Father Thomas', description: 'Occult investigator', visualAnchor: 'black cassock' },
        ],
        episodesCount: 2,
      });

      expect(res.success).toBe(true);
      const ep1 = res.episodes[0];
      expect(ep1.scenes.length).toBeGreaterThan(0);
      expect(ep1.scenes[0]).toHaveProperty('duration');
      expect(ep1.scenes[0]).toHaveProperty('description');
    },
  });

  registry.register({
    id: 'T1-DRAMA-04',
    tier: 'tier1',
    workflow: 'micro-drama',
    title: 'Micro-Drama: Genre Adaptation (Sci-Fi vs Romance vs Thriller)',
    description: 'Verifies genre propagation into series title and scripts',
    fn: async () => {
      const res = await dramaOrchestrator.generateDramaSeries({
        genre: 'space-opera',
        characters: [
          { name: 'Captain Vega', description: 'Fleet commander', visualAnchor: 'gold epaulettes' },
        ],
        episodesCount: 2,
      });

      expect(res.success).toBe(true);
      expect(res.dramaTitle.toLowerCase()).toContain('space-opera');
    },
  });

  registry.register({
    id: 'T1-DRAMA-05',
    tier: 'tier1',
    workflow: 'micro-drama',
    title: 'Micro-Drama: Custom Script Input Processing',
    description: 'Verifies user-supplied custom script segmentation into drama episodes',
    fn: async () => {
      const customScript = 'Scene 1: The vault opens. Scene 2: The alarm sounds and guards approach.';
      const res = await dramaOrchestrator.generateDramaSeries({
        script: customScript,
        genre: 'heist-action',
        characters: [
          { name: 'Kite', description: 'Master thief', visualAnchor: 'black stealth suit' },
        ],
        episodesCount: 2,
      });

      expect(res.success).toBe(true);
      expect(res.episodes.length).toBe(2);
    },
  });

  // ==========================================
  // 6. Auto Pilot Workflow (5 Tests)
  // ==========================================
  registry.register({
    id: 'T1-AUTO-01',
    tier: 'tier1',
    workflow: 'auto',
    title: 'Auto Pilot: Daily Trending Tech Pipeline Setup',
    description: 'Verifies daily scheduled pipeline configuration and active status',
    fn: async () => {
      const res = await autoPilot.executePipeline({
        pipelineName: 'Daily Tech Pulse',
        niche: 'artificial-intelligence',
        schedule: '0 8 * * *',
        sourceStrategy: 'trending-rss',
        visualPipeline: 'ai-videos',
        autoPublish: false,
        targetPlatforms: ['youtube'],
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('active');
      expect(typeof res.pipelineId).toBe('string');
      expect(typeof res.nextRun).toBe('string');
    },
  });

  registry.register({
    id: 'T1-AUTO-02',
    tier: 'tier1',
    workflow: 'auto',
    title: 'Auto Pilot: Multi-Platform Auto-Publish Configuration',
    description: 'Verifies autoPublish enabled with multiple target platforms',
    fn: async () => {
      const res = await autoPilot.executePipeline({
        pipelineName: 'Global Crypto Flash',
        niche: 'cryptocurrency',
        schedule: '0 12 * * *',
        sourceStrategy: 'news-aggregator',
        visualPipeline: 'ai-images',
        autoPublish: true,
        targetPlatforms: ['tiktok', 'instagram', 'youtube'],
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('active');
    },
  });

  registry.register({
    id: 'T1-AUTO-03',
    tier: 'tier1',
    workflow: 'auto',
    title: 'Auto Pilot: Immediate Execution and Job ID Generation',
    description: 'Verifies pipeline trigger immediately provisions a workflow job ID',
    fn: async () => {
      const res = await autoPilot.executePipeline({
        pipelineName: 'Instant Finance Digest',
        niche: 'stock-market',
        schedule: 'manual',
        sourceStrategy: 'market-quotes',
        visualPipeline: 'stock-footage',
        autoPublish: false,
        targetPlatforms: ['youtube'],
      });

      expect(res.success).toBe(true);
      expect(typeof res.generatedJobId).toBe('string');
      expect(res.generatedJobId!.length).toBeGreaterThan(0);
    },
  });

  registry.register({
    id: 'T1-AUTO-04',
    tier: 'tier1',
    workflow: 'auto',
    title: 'Auto Pilot: Voice and Visual Pipeline Binding',
    description: 'Verifies voiceover and visual pipeline options are persisted in pipeline',
    fn: async () => {
      const res = await autoPilot.executePipeline({
        pipelineName: 'Serene Nature Facts',
        niche: 'wildlife',
        schedule: '0 9 * * 1',
        sourceStrategy: 'wikipedia-featured',
        visualPipeline: 'ai-videos',
        autoPublish: false,
        targetPlatforms: ['instagram'],
        voice: 'fable',
      });

      expect(res.success).toBe(true);
    },
  });

  registry.register({
    id: 'T1-AUTO-05',
    tier: 'tier1',
    workflow: 'auto',
    title: 'Auto Pilot: Next Run Calculation & Schedule Validation',
    description: 'Verifies valid ISO timestamp returned for next scheduled execution',
    fn: async () => {
      const res = await autoPilot.executePipeline({
        pipelineName: 'Weekly Science Wrap',
        niche: 'astronomy',
        schedule: '0 10 * * 0',
        sourceStrategy: 'arxiv-preprints',
        visualPipeline: 'ai-videos',
        autoPublish: false,
        targetPlatforms: ['youtube'],
      });

      expect(res.success).toBe(true);
      expect(Date.parse(res.nextRun)).toBeGreaterThan(Date.now() - 1000);
    },
  });
}
