import { supabaseAdmin } from '../lib/db';
import { RenderParams } from '@clipped/schema';

async function checkUrlReachable(url: string): Promise<boolean> {
  if (!url || !url.startsWith('http')) return true; // skip data uris or empty
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch (err) {
    try {
      // Fallback to GET if HEAD fails
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}

async function runQualityGate() {
  console.log(`[QualityGateWorker] Waking up at ${new Date().toISOString()}`);
  try {
    const { data: jobs, error } = await supabaseAdmin
      .from('render_jobs')
      .select('*')
      .eq('orchestration_state', 'qc_pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('[QualityGateWorker] Error fetching jobs:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      return;
    }

    console.log(`[QualityGateWorker] Found ${jobs.length} qc_pending jobs.`);

    for (const job of jobs) {
      try {
        let logs: any = {};
        if (typeof job.logs === 'string') {
          try {
            logs = JSON.parse(job.logs);
          } catch (e) {}
        } else if (job.logs && typeof job.logs === 'object') {
          logs = job.logs;
        }

        let beats: any[] = [];
        if (Array.isArray(logs.beats)) {
          beats = logs.beats;
        } else if (logs.analysis && Array.isArray(logs.analysis.scenes)) {
          beats = logs.analysis.scenes;
        }

        let failed = false;
        let errorMessage = '';

        if (beats.length === 0) {
          failed = true;
          errorMessage = 'QC Failed: Beats array is empty or missing.';
        } else {
          for (let i = 0; i < beats.length; i++) {
            const beat = beats[i];
            
            // Check duration if present
            if (beat.duration !== undefined && (typeof beat.duration !== 'number' || beat.duration <= 0)) {
              failed = true;
              errorMessage = `QC Failed: Beat ${i} has invalid duration.`;
              break;
            }

            // Check text length
            if (beat.text && beat.text.length > 2000) {
              failed = true;
              errorMessage = `QC Failed: Beat ${i} text exceeds 2000 characters.`;
              break;
            }

            // Check reachable imageUrl / videoUrl
            if (beat.imageUrl) {
              const ok = await checkUrlReachable(beat.imageUrl);
              if (!ok) {
                failed = true;
                errorMessage = `QC Failed: Beat ${i} imageUrl is unreachable (${beat.imageUrl}).`;
                break;
              }
            }
            if (beat.videoUrl) {
              const ok = await checkUrlReachable(beat.videoUrl);
              if (!ok) {
                failed = true;
                errorMessage = `QC Failed: Beat ${i} videoUrl is unreachable (${beat.videoUrl}).`;
                break;
              }
            }
            if (beat.clipUrl) {
              const ok = await checkUrlReachable(beat.clipUrl);
              if (!ok) {
                failed = true;
                errorMessage = `QC Failed: Beat ${i} clipUrl is unreachable (${beat.clipUrl}).`;
                break;
              }
            }
          }
        }

        if (failed) {
          console.log(`[QualityGateWorker] Job ${job.id} failed QC: ${errorMessage}`);
          logs.error = errorMessage;
          await supabaseAdmin
            .from('render_jobs')
            .update({
              orchestration_state: 'failed',
              status: 'failed',
              error_message: errorMessage,
              last_error: errorMessage,
              logs: typeof job.logs === 'string' ? JSON.stringify(logs) : logs
            })
            .eq('id', job.id);
        } else {
          console.log(`[QualityGateWorker] Job ${job.id} passed QC.`);
          await supabaseAdmin
            .from('render_jobs')
            .update({
              orchestration_state: 'queued'
            })
            .eq('id', job.id);
        }
      } catch (err) {
        console.error(`[QualityGateWorker] Error processing job ${job.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[QualityGateWorker] Unhandled exception:', err);
  }
}

const POLL_INTERVAL_MS = 10 * 1000;

async function start() {
  console.log('[QualityGateWorker] Started. Polling every 10 seconds.');
  await runQualityGate();
  setInterval(async () => {
    await runQualityGate();
  }, POLL_INTERVAL_MS);
}

start();
