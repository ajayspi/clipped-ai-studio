import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  const { data, error } = await supabase.from('render_jobs').select('*');
  console.log('Total jobs:', data?.length);
  
  // dedupe jobs based on some criteria?
  // Let's just list the jobs first.
  console.log(data?.map(d => ({id: d.id, workflow: d.workflow, created_at: d.created_at, status: d.status, orchestration_state: d.orchestration_state})));
}

run();
