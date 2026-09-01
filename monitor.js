const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agafustlankeieewtvck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function monitor() {
  console.log('Monitoring render jobs...');
  while (true) {
    const { data: jobs } = await supabase.from('render_jobs').select('status, video_id, videos(title)');
    let pending = 0, processing = 0, completed = 0, failed = 0;
    
    if (jobs) {
      for (const j of jobs) {
        if (j.status === 'pending') pending++;
        if (j.status === 'processing') processing++;
        if (j.status === 'completed') completed++;
        if (j.status === 'failed') failed++;
      }
      console.log(`[${new Date().toISOString()}] Pending: ${pending} | Processing: ${processing} | Completed: ${completed} | Failed: ${failed}`);
      
      if (pending === 0 && processing === 0) {
        console.log('All jobs finished processing!');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 10000));
  }
}

monitor();
