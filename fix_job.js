const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStuckJob() {
  const { data, error } = await supabase
    .from('render_jobs')
    .update({ orchestration_state: 'queued' })
    .eq('id', '0a7da495-5b7e-4f26-99f5-da390fe0c2cc')
    .select();
    
  if (error) {
    console.error('Error fixing job:', error);
  } else {
    console.log("Successfully fixed job:", data);
  }
}

fixStuckJob();
