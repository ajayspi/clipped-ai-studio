import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  const { data: jobs, error } = await supabase
    .from('render_jobs')
    .select('id, logs, created_at, orchestration_state')
    .in('orchestration_state', ['queued', 'retryable'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }
  
  console.log(`Found ${jobs?.length} stranded jobs.`);

  const seen = new Set();
  const toDelete = [];

  for (const job of jobs || []) {
    let workflow = 'unknown';
    try {
      const logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs;
      workflow = logs?.workflow || 'unknown';
    } catch (e) {}
    
    const key = `${workflow}`;
    if (seen.has(key)) {
      toDelete.push(job.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    const { error: delError } = await supabase
      .from('render_jobs')
      .delete()
      .in('id', toDelete);
    if (delError) {
      console.error('Error deleting jobs:', delError);
      return;
    }
    console.log(`Deleted ${toDelete.length} duplicate stranded jobs.`);
  } else {
    console.log('No duplicates found.');
  }
}
run();
