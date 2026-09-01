const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://agafustlankeieewtvck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA'
);

async function run() {
  const { data, error } = await supabase.from('videos').select('*').limit(1);
  if (error) {
    console.error('Error fetching videos:', error.message);
  } else {
    console.log('videos exists. Data:', data);
  }
}
run();
