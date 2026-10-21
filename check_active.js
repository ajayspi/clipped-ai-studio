const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActiveJobs() {
  const { data, error } = await supabase
    .from('render_jobs')
    .select('id, status, orchestration_state, created_at')
    .neq('status', 'completed')
    .neq('status', 'failed')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching jobs:', error);
  } else {
    if (data.length === 0) {
      console.log("No active jobs currently rendering.");
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

checkActiveJobs();
