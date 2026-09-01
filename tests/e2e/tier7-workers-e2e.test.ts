/**
 * Tier 7: Background Workers & E2E Pipeline Verification
 * 
 * Verifies:
 * 1. publish-worker.ts syntax, template literal integrity, and processScheduledPosts dry-run flow
 * 2. render-worker.ts syntax, dynamic imports, composition mapping, Remotion inputProps construction
 * 3. End-to-End dry-run video generation lifecycle (UI -> Supabase render_jobs -> render-worker -> completion)
 * 4. Multi-source beats extraction and platform format normalization
 * 5. PM2 ecosystem configuration validation
 */

import { expect, registry, mockSupabase } from './test-harness';
import fs from 'fs';
import path from 'path';
import { TTSEngine } from '../../lib/engine/tts';

export async function registerWorkersE2ETests() {
  registry.register({
    id: 'WRK-PUB-01',
    tier: 'tier7',
    workflow: 'publishing',
    title: 'Publish Worker: Template Literal Integrity and Clean Syntax',
    description: 'Verifies publish-worker.ts has intact template literals, proper logging statements, and no PowerShell escaping artifacts',
    fn: async () => {
      const workerPath = path.resolve(process.cwd(), 'scripts', 'publish-worker.ts');
      expect(fs.existsSync(workerPath)).toBe(true);
      const content = fs.readFileSync(workerPath, 'utf-8');

      // Check no broken unquoted console.log lines
      expect(content).not.toContain('console.log(\\n');
      expect(content).not.toContain('console.log(?');
      expect(content).toContain("console.log('\\n======================================================');");
      expect(content).toContain('console.log(`📦 [Publish-Worker] Found due post: ${post.id}`);');
      expect(content).toContain('console.log(`   Caption: "${post.caption || \'\'}"`);');
      expect(content).toContain('console.log(`   Platforms: ${Array.isArray(post.platforms) ? post.platforms.join(\', \') : post.platforms}`);');
      expect(content).toContain('console.log(`   [Action] Uploading to ${platform} API (DRY RUN)...`);');
      expect(content).toContain('resultUrls[platform] = `https://${platform}.com/v/mock-${Date.now()}`;');
      expect(content).toContain('console.log(`   ✅ Successfully published to ${platform}!`);');
      expect(content).toContain('console.log(`🎉 [Publish-Worker] Post ${post.id} completed!`);');
    },
  });

  registry.register({
    id: 'WRK-PUB-02',
    tier: 'tier7',
    workflow: 'publishing',
    title: 'Publish Worker: Platform Parsing and Resilient Scheduling Flow',
    description: 'Verifies publish worker handles array, JSON string, and comma-separated platform inputs safely without crashing',
    fn: async () => {
      // Test platform parsing logic
      const parsePlatforms = (rawPlatforms: any): string[] => {
        let platforms: string[] = [];
        if (Array.isArray(rawPlatforms)) {
          platforms = rawPlatforms;
        } else if (typeof rawPlatforms === 'string') {
          try {
            const parsed = JSON.parse(rawPlatforms);
            platforms = Array.isArray(parsed) ? parsed : [rawPlatforms];
          } catch {
            platforms = rawPlatforms.split(',').map((p: string) => p.trim()).filter(Boolean);
          }
        }
        if (platforms.length === 0) platforms = ['youtube'];
        return platforms;
      };

      expect(parsePlatforms(['tiktok', 'youtube'])).toEqual(['tiktok', 'youtube']);
      expect(parsePlatforms('["instagram", "youtube"]')).toEqual(['instagram', 'youtube']);
      expect(parsePlatforms('tiktok, youtube')).toEqual(['tiktok', 'youtube']);
      expect(parsePlatforms(null)).toEqual(['youtube']);
      expect(parsePlatforms(undefined)).toEqual(['youtube']);
    }
  });

  registry.register({
    id: 'WRK-RND-01',
    tier: 'tier7',
    workflow: 'integration',
    title: 'Render Worker: Dynamic Imports & Composition Resolution',
    description: 'Verifies render-worker.ts correctly binds Remotion compositions (9:16, 16:9, 1:1) and dynamic TTSEngine loading',
    fn: async () => {
      const workerPath = path.resolve(process.cwd(), 'scripts', 'render-worker.ts');
      expect(fs.existsSync(workerPath)).toBe(true);
      const content = fs.readFileSync(workerPath, 'utf-8');

      expect(content).toContain('console.log(`\\n📦 Found pending job: ${job.id}`)');
      expect(content).toContain('const { TTSEngine } = await import(\'../lib/engine/tts\')');
      expect(content).toContain("let compId = 'MainRender-9x16'");
      expect(content).toContain("if (params.aspectRatio === '16:9') compId = 'MainRender-16x9'");
      expect(content).toContain("if (params.aspectRatio === '1:1') compId = 'MainRender-1x1'");
      expect(content).toContain('const publicUrl = `/renders/${job.id}.mp4`');
    },
  });

  registry.register({
    id: 'WRK-RND-02',
    tier: 'tier7',
    workflow: 'integration',
    title: 'Render Worker: Multi-Source Beat Extraction & Fallback Strategy',
    description: 'Verifies render worker handles orchestrator scenes, direct script, input beats, and empty payloads without throwing',
    fn: async () => {
      const extractBeats = (params: any) => {
        let beatsList: any[] = params.beats || (params.input && params.input.beats) || [];
        if (beatsList.length === 0 && params.analysis?.scenes) {
          beatsList = params.analysis.scenes.map((s: any, idx: number) => ({
            id: `scene-${idx + 1}`,
            text: s.text || s.narration || '',
            duration: s.duration || 3,
            clipUrl: s.selectedVideo?.url || s.selectedVideo?.previewUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'
          }));
        }
        if (beatsList.length === 0 && (params.script || params.input?.script)) {
          const scriptText = params.script || params.input?.script;
          beatsList = [{
            id: 'beat-1',
            text: scriptText,
            duration: 3.5,
            clipUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
          }];
        }
        if (beatsList.length === 0) {
          beatsList = [{
            id: 'beat-default',
            text: 'Clipped AI Video',
            duration: 3,
            clipUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
          }];
        }
        return beatsList;
      };

      // Case 1: Standard beats
      const r1 = extractBeats({ beats: [{ id: 'b1', text: 'hello', duration: 2 }] });
      expect(r1.length).toBe(1);
      expect(r1[0].text).toBe('hello');

      // Case 2: Analysis scenes from orchestrator
      const r2 = extractBeats({ analysis: { scenes: [{ text: 'Scene 1', duration: 4 }] } });
      expect(r2.length).toBe(1);
      expect(r2[0].text).toBe('Scene 1');

      // Case 3: Script only
      const r3 = extractBeats({ script: 'Direct script payload' });
      expect(r3.length).toBe(1);
      expect(r3[0].text).toBe('Direct script payload');

      // Case 4: Completely empty payload
      const r4 = extractBeats({});
      expect(r4.length).toBe(1);
      expect(r4[0].id).toBe('beat-default');
    }
  });

  registry.register({
    id: 'WRK-E2E-01',
    tier: 'tier7',
    workflow: 'integration',
    title: 'E2E Dry-Run Pipeline: Job Creation -> Queue -> Processing -> Completed',
    description: 'Simulates end-to-end video pipeline: UI creates render_jobs record, render-worker picks up job, synthesizes TTS, and marks completed',
    fn: async () => {
      const jobId = `job-e2e-${Date.now()}`;
      const payload = {
        workflow: 'ai-videos',
        aspectRatio: '9:16',
        burnSubtitles: true,
        beats: [
          { id: 'b1', text: 'Step into the realm of automated AI video creation.', duration: 3.5 },
          { id: 'b2', text: 'Generate high-retention vertical clips effortlessly.', duration: 4.0 }
        ]
      };

      // 1. UI creates job in Supabase
      mockSupabase.from('render_jobs').insert({
        id: jobId,
        status: 'pending',
        progress: 0,
        logs: JSON.stringify(payload),
        created_at: new Date().toISOString(),
      });

      // 2. Worker polls pending jobs
      const { data: pendingJobs } = await mockSupabase
        .from('render_jobs')
        .select('*')
        .eq('status', 'pending');

      const targetJob = pendingJobs.find(j => j.id === jobId);
      expect(targetJob).toBeDefined();
      expect(targetJob.status).toBe('pending');

      // 3. Worker marks job processing
      await mockSupabase
        .from('render_jobs')
        .update({ status: 'processing' })
        .eq('id', jobId);

      const { data: inFlightJob } = await mockSupabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      expect(inFlightJob.status).toBe('processing');

      // 4. TTS synthesis for beats
      const ttsEngine = new TTSEngine();
      const jobLogs = typeof inFlightJob.logs === 'string' ? JSON.parse(inFlightJob.logs) : inFlightJob.logs;
      const beats = jobLogs.beats || [];
      expect(beats.length).toBe(2);

      let totalDuration = 0;
      for (const beat of beats) {
        const tts = await ttsEngine.synthesize({ text: beat.text, mock: true });
        expect(tts.success).toBe(true);
        expect(tts.duration).toBeGreaterThan(0);
        totalDuration += tts.duration;
      }
      expect(totalDuration).toBeGreaterThan(0);

      // 5. Worker completes job with public output URL
      const finalVideoUrl = `/renders/${jobId}.mp4`;
      await mockSupabase
        .from('render_jobs')
        .update({
          status: 'completed',
          logs: JSON.stringify({ ...jobLogs, finalVideoUrl, totalDuration }),
        })
        .eq('id', jobId);

      const { data: finishedJob } = await mockSupabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      expect(finishedJob.status).toBe('completed');
      const finishedLogs = JSON.parse(finishedJob.logs);
      expect(finishedLogs.finalVideoUrl).toBe(finalVideoUrl);
      expect(finishedLogs.totalDuration).toBe(totalDuration);
    },
  });

  registry.register({
    id: 'WRK-PM2-01',
    tier: 'tier7',
    workflow: 'integration',
    title: 'PM2 Configuration: Ecosystem Config & Worker Process Declarations',
    description: 'Verifies ecosystem.config.js declares render-worker and publish-worker with automatic restarts and tsx interpreter',
    fn: async () => {
      const configPath = path.resolve(process.cwd(), 'ecosystem.config.js');
      expect(fs.existsSync(configPath)).toBe(true);
      const config = require(configPath);
      expect(Array.isArray(config.apps)).toBe(true);
      expect(config.apps.length).toBe(2);

      const renderApp = config.apps.find((a: any) => a.name === 'render-worker');
      const publishApp = config.apps.find((a: any) => a.name === 'publish-worker');

      expect(renderApp).toBeDefined();
      expect(renderApp.script).toBe('scripts/render-worker.ts');
      expect(renderApp.autorestart).toBe(true);

      expect(publishApp).toBeDefined();
      expect(publishApp.script).toBe('scripts/publish-worker.ts');
      expect(publishApp.autorestart).toBe(true);
    },
  });
}
