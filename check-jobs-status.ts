import { supabaseAdmin } from './lib/db';

async function checkJobs() {
  const { data: jobs, error } = await supabaseAdmin
    .from('render_jobs')
    .select('*')
    .eq('id', 'c59e2619-997f-4544-9167-e3f740592298');
    
  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }
  
  console.log('--- RECENT JOBS STATUS ---');
  jobs.forEach(j => {
    let title = j.title || j.id;
    console.log('[' + (j.workflow || 'unknown') + '] ' + title + ' - ' + j.orchestration_state + ' / ' + j.status + ' / ' + j.progress + '%');
    if (j.error_message) {
      console.log('  Error:', j.error_message);
    }
  });
}

checkJobs();
