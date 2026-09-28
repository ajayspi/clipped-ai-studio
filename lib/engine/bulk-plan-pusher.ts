import { supabaseAdmin as supabase } from '@/lib/db';
import { BulkPlanItem } from './types';

export interface PushPlanResult {
  success: boolean;
  jobIds: string[];
  error?: string;
}

export async function pushBulkPlanToQueue(items: BulkPlanItem[], planTitle: string): Promise<PushPlanResult> {
  if (!items || items.length === 0) {
    return { success: false, jobIds: [], error: 'Cannot push an empty plan.' };
  }

  const jobIds: string[] = [];
  const createdAt = new Date().toISOString();

  for (const item of items) {
    const jobId = crypto.randomUUID();
    const videoId = crypto.randomUUID();
    
    // Create the video record
    try {
      await supabase.from('videos').insert({
        id: videoId,
        title: item.title,
        script: item.script,
        workflow: 'bulk-plan',
        status: 'processing',
        created_at: createdAt,
        updated_at: createdAt,
      });

      // Create the render job
      // Critical: Must have orchestration_state: 'queued' and valid beats
      const logs = {
        subject: item.title,
        prompt: item.visualPrompt || item.script,
        workflowType: 'bulk-plan',
        script: item.script,
        hook: item.hook,
        planTitle,
        beats: [{ text: item.hook + " " + item.script, duration: 5 }]
      };

      await supabase.from('render_jobs').insert({
        id: jobId,
        video_id: videoId,
        status: 'processing',
        progress: 15,
        orchestration_state: 'queued',
        logs: JSON.stringify(logs),
        created_at: createdAt,
      });

      // Create the scheduled post linked to the render job
      await supabase.from('scheduled_posts').insert({
        render_job_id: jobId,
        caption: item.title,
        platforms: item.targetPlatform ? [item.targetPlatform] : [],
        scheduled_for: new Date(`${item.scheduledDate}T12:00:00Z`).toISOString(),
        status: 'pending'
      });

      jobIds.push(jobId);
    } catch (err) {
      console.error('[BulkPlanPusher] Failed to push item:', item, err);
      // We continue pushing the rest even if one fails
    }
  }

  if (jobIds.length === 0) {
    return { success: false, jobIds: [], error: 'Failed to create any render jobs.' };
  }

  return { success: true, jobIds };
}
