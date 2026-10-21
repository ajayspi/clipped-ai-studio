import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const ROOT_DIR = fs.existsSync(path.resolve(process.cwd(), 'package.json'))
  ? process.cwd()
  : path.resolve(__dirname, '..');
const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.local'))
  ? path.resolve(process.cwd(), '.env.local')
  : path.resolve(ROOT_DIR, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_service_key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function recoverStuckJobs() {
  console.log('🧹 Sweeping for stuck render jobs...');
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    // Fetch jobs stuck in 'processing'
    const { data: stuckJobs, error: fetchError } = await supabase
      .from('render_jobs')
      .select('id, attempt_count, status')
      .eq('status', 'processing')
      .lt('updated_at', fifteenMinutesAgo);
      
    if (fetchError) {
      console.error('Error fetching stuck jobs:', fetchError.message);
      return;
    }
    
    if (!stuckJobs || stuckJobs.length === 0) {
      console.log('✨ No stuck jobs found.');
      return;
    }
    
    console.log(`Found ${stuckJobs.length} stuck jobs.`);
    
    for (const job of stuckJobs) {
      const attempts = job.attempt_count || 0;
      if (attempts > 3) {
        console.log(`❌ Job ${job.id} exceeded attempts (${attempts}). Marking as failed.`);
        await supabase
          .from('render_jobs')
          .update({
            orchestration_state: 'failed',
            status: 'failed',
            updated_at: new Date().toISOString(),
            logs: { error: 'Job crashed mid-render and exceeded max retry attempts' }
          })
          .eq('id', job.id);
      } else {
        console.log(`♻️ Job ${job.id} stuck in processing. Reverting to queued (attempt ${attempts + 1}).`);
        await supabase
          .from('render_jobs')
          .update({
            orchestration_state: 'retryable',
            status: 'pending',
            updated_at: new Date().toISOString(),
            worker_id: null,
            lease_token: null,
            lease_expires_at: null
          })
          .eq('id', job.id);
      }
    }
  } catch (err) {
    console.error('Recovery worker error:', err);
  }
}

async function startRecoveryWorker() {
  console.log('🛡️ Recovery worker started. Polling every 5 minutes...');
  // Run immediately on start
  await recoverStuckJobs();
  
  // Run every 5 minutes
  setInterval(recoverStuckJobs, 5 * 60 * 1000);
}

if (require.main === module) {
  startRecoveryWorker();
}
