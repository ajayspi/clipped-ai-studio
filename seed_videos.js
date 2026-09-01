const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agafustlankeieewtvck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA';

const supabase = createClient(supabaseUrl, supabaseKey);

const examples = [
  {
    title: "The Fall of Rome: A 60-Second History",
    script: "The year is 476 AD. The greatest empire the world has ever seen is crumbling. Barbarian tribes are at the gates, the economy is collapsing, and emperors are being assassinated. This wasn't a sudden fall, but a slow, agonizing death of a superpower.",
    workflow: "standard"
  },
  {
    title: "Neon Nights: Episode 1",
    script: "Rain fell like static on the neon-lit streets of Sector 4. Kael adjusted his cybernetic arm. The target was close. He could feel the hum of the illicit data drive burning a hole in his pocket.",
    workflow: "micro-drama"
  },
  {
    title: "How Memory Works (Neuroscience Explained)",
    script: "Have you ever wondered how you remember your first pet? It all starts in the hippocampus. When you experience something, neurons fire in specific patterns. Over time, these patterns solidify through a process called long-term potentiation.",
    workflow: "standard"
  },
  {
    title: "Daily Motivation: Unstoppable",
    script: "They told you it was impossible. They said the odds were against you. But they don't know the fire inside you. Every setback is just a setup for a massive comeback. Wake up, grind, and prove them wrong.",
    workflow: "ai-videos"
  }
];

async function seedVideos() {
  console.log('Fetching admin user...');
  const { data: users, error: userError } = await supabase.from('users').select('id').eq('email', 'admin@prostudio.com').limit(1);
  
  if (userError || !users.length) {
    console.error('Could not find admin user:', userError);
    return;
  }
  
  const userId = users[0].id;
  console.log(`Found admin user: ${userId}`);

  for (const ex of examples) {
    console.log(`\nInserting video: ${ex.title}...`);
    
    // Insert Video
    const { data: video, error: vidError } = await supabase.from('videos').insert({
      user_id: userId,
      title: ex.title,
      script: ex.script,
      workflow: ex.workflow,
      status: 'processing'
    }).select().single();

    if (vidError) {
      console.error(`Error inserting video ${ex.title}:`, vidError);
      continue;
    }

    console.log(`Video created with ID: ${video.id}`);

    // Insert Render Job
    const { data: job, error: jobError } = await supabase.from('render_jobs').insert({
      video_id: video.id,
      status: 'pending',
      progress: 0
    }).select().single();

    if (jobError) {
      console.error(`Error inserting render job for ${ex.title}:`, jobError);
    } else {
      console.log(`Render job queued with ID: ${job.id}`);
    }
  }
  
  console.log('\nSeeding complete! The PM2 workers should now pick these up.');
}

seedVideos();
