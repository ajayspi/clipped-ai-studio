
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://localhost:54321', process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key');
(async () => {
  const { data, error } = await supabase
    .from('render_jobs')
    .select('id, workflow_type, orchestration_state, status, created_at, error, logs')
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) {
    console.error('Supabase Error:', error);
  } else {
    data.forEach(job => {
      console.log('---');
      console.log('Job ID:', job.id);
      console.log('Workflow:', job.workflow_type);
      console.log('Orch State:', job.orchestration_state);
      console.log('Status:', job.status);
      console.log('Error:', job.error);
      console.log('Logs (last 2):', job.logs ? job.logs.slice(-2) : 'None');
    });
  }
})();

