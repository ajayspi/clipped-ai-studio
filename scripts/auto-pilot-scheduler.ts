import { supabaseAdmin } from '../lib/db';
import { autoPilot } from '../lib/engine/auto-pilot';

async function runScheduler() {
  console.log(`[AutoPilotScheduler] Waking up at ${new Date().toISOString()}`);

  try {
    // 1. Fetch due pipelines
    const { data: pipelines, error } = await supabaseAdmin
      .from('auto_pipelines')
      .select('*')
      .eq('is_active', true)
      .lte('next_run', new Date().toISOString());

    if (error) {
      console.error('[AutoPilotScheduler] Error fetching pipelines:', error);
      return;
    }

    if (!pipelines || pipelines.length === 0) {
      console.log('[AutoPilotScheduler] No due pipelines found.');
      return;
    }

    console.log(`[AutoPilotScheduler] Found ${pipelines.length} due pipelines.`);

    for (const pipeline of pipelines) {
      try {
        console.log(`[AutoPilotScheduler] Processing pipeline ${pipeline.id} ("${pipeline.pipeline_name}")`);

        // 2. Synthesize content
        const { hook, script } = await autoPilot.synthesizeTrendingContent(
          pipeline.niche,
          pipeline.source_strategy
        );

        // 3. Create render job
        const jobId = `job-auto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        
        const { error: jobError } = await supabaseAdmin
          .from('render_jobs')
          .insert({
            id: jobId,
            status: 'pending',
            progress: 0,
            config: {
              workflow: pipeline.visual_pipeline,
              script: `${hook} ${script}`,
              aspectRatio: pipeline.aspect_ratio,
              voice: pipeline.voice,
              style: pipeline.visual_style,
              autoPublish: pipeline.auto_publish,
              targetPlatforms: pipeline.target_platforms
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (jobError) {
          throw new Error(`Failed to create render job: ${jobError.message}`);
        }

        console.log(`[AutoPilotScheduler] Created render job ${jobId} for pipeline ${pipeline.id}`);

        // 4. Update next_run, last_run, last_status
        const nextRun = autoPilot.computeNextRun(pipeline.schedule);
        await supabaseAdmin
          .from('auto_pipelines')
          .update({
            next_run: nextRun,
            last_run: new Date().toISOString(),
            last_status: 'success'
          })
          .eq('id', pipeline.id);

        console.log(`[AutoPilotScheduler] Updated pipeline ${pipeline.id}. Next run: ${nextRun}`);

      } catch (err) {
        console.error(`[AutoPilotScheduler] Error processing pipeline ${pipeline.id}:`, err);
        // Mark pipeline as failed
        await supabaseAdmin
          .from('auto_pipelines')
          .update({
            last_run: new Date().toISOString(),
            last_status: 'failed'
          })
          .eq('id', pipeline.id);
      }
    }
  } catch (err) {
    console.error('[AutoPilotScheduler] Unhandled exception:', err);
  }
}

// Polling loop
const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds

async function start() {
  console.log('[AutoPilotScheduler] Started. Polling every 60 seconds.');
  
  // Run immediately on start
  await runScheduler();

  setInterval(async () => {
    await runScheduler();
  }, POLL_INTERVAL_MS);
}

start();
