const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://agafustlankeieewtvck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA'
);

async function run() {
  const { data, error } = await supabase.from('render_jobs').select('*').limit(1);
  if (error) {
    console.error('Error fetching render_jobs:', error.message);
  } else {
    console.log('render_jobs exists. Data:', data);
  }
}
run();
