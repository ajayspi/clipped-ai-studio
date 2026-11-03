import { supabaseAdmin as supabase } from '../lib/db';

async function seedShowcaseJobs() {
  console.log('Seeding showcase render jobs into Supabase...');

  const showcaseJobs = [
    {
      id: 'c1a70000-0000-4000-8000-000000000001',
      status: 'completed',
      progress: 100,
      orchestration_state: 'completed',
      output_url: '/renders/claymation-showcase.mp4',
      completed_at: new Date().toISOString(),
      logs: JSON.stringify({
        workflow: 'claymation',
        title: 'The Tactile Miracle of Clay Animation',
        subject: 'Claymation Stop-Motion Showcase',
        outputUrl: '/renders/claymation-showcase.mp4',
        finalVideoUrl: '/renders/claymation-showcase.mp4',
        duration: 8.0,
        aspectRatio: '9:16',
        cadence: '12fps_stop_motion',
        style: 'claymation',
        beats: [
          { id: 'b1', text: 'Tactile clay mass awakens on armature.', duration: 3, clipUrl: '/renders/claymation-showcase.mp4' },
          { id: 'b2', text: 'Plasticine squish & stretch deformation kicks in.', duration: 3, clipUrl: '/renders/claymation-showcase.mp4' },
          { id: 'b3', text: 'Organic stop-motion character achieves fluid life.', duration: 2, clipUrl: '/renders/claymation-showcase.mp4' }
        ]
      })
    },
    {
      id: '01719a00-0000-4000-8000-000000000002',
      status: 'completed',
      progress: 100,
      orchestration_state: 'completed',
      output_url: '/renders/origami-papercraft-showcase.mp4',
      completed_at: new Date().toISOString(),
      logs: JSON.stringify({
        workflow: 'origami',
        title: 'Computational 3D Origami & Papercraft',
        subject: '3D Origami Folding Dynamics',
        outputUrl: '/renders/origami-papercraft-showcase.mp4',
        finalVideoUrl: '/renders/origami-papercraft-showcase.mp4',
        duration: 8.0,
        aspectRatio: '9:16',
        cadence: '12fps_stop_motion',
        style: 'origami',
        beats: [
          { id: 'b1', text: 'Step 1: Valley fold along geometric center axis.', duration: 3, clipUrl: '/renders/origami-papercraft-showcase.mp4' },
          { id: 'b2', text: 'Step 2: Mountain crease inverted at 45 degrees.', duration: 3, clipUrl: '/renders/origami-papercraft-showcase.mp4' },
          { id: 'b3', text: 'Step 3: Tactile papercraft structure locks in place.', duration: 2, clipUrl: '/renders/origami-papercraft-showcase.mp4' }
        ]
      })
    },
    {
      id: '571c0000-0000-4000-8000-000000000003',
      status: 'completed',
      progress: 100,
      orchestration_state: 'completed',
      output_url: '/renders/celestial-stickman.mp4',
      completed_at: new Date().toISOString(),
      logs: JSON.stringify({
        workflow: 'stickman',
        title: 'Celestial Stickman: Paradox of Choice',
        subject: '2D Explainer Video',
        outputUrl: '/renders/celestial-stickman.mp4',
        finalVideoUrl: '/renders/celestial-stickman.mp4',
        duration: 22.5,
        aspectRatio: '9:16',
        style: 'stickman',
        beats: [
          { id: 'b1', text: 'Why having too many choices makes us paralyzed.', duration: 5, clipUrl: '/renders/celestial-stickman.mp4' },
          { id: 'b2', text: 'The paradox of choice explains modern anxiety.', duration: 5, clipUrl: '/renders/celestial-stickman.mp4' }
        ]
      })
    },
    {
      id: '50c1a100-0000-4000-8000-000000000004',
      status: 'completed',
      progress: 100,
      orchestration_state: 'completed',
      output_url: '/renders/universe-inside-us-fast-paced.mp4',
      completed_at: new Date().toISOString(),
      logs: JSON.stringify({
        workflow: 'shorts',
        title: 'The Universe Inside Us (Fast-Paced)',
        subject: 'Viral Science Short',
        outputUrl: '/renders/universe-inside-us-fast-paced.mp4',
        finalVideoUrl: '/renders/universe-inside-us-fast-paced.mp4',
        duration: 271.0,
        aspectRatio: '16:9',
        style: 'social',
        beats: [
          { id: 'b1', text: 'Every atom in your body came from an exploding star.', duration: 4, clipUrl: '/renders/universe-inside-us-fast-paced.mp4' }
        ]
      })
    }
  ];

  for (const job of showcaseJobs) {
    const { error } = await supabase.from('render_jobs').upsert(job, { onConflict: 'id' });
    if (error) {
      console.warn(`Failed to upsert ${job.id}:`, error);
    } else {
      console.log(`[OK] Upserted ${job.id} -> ${job.output_url}`);
    }
  }

  console.log('Seeding finished successfully!');
}

seedShowcaseJobs().catch(console.error);
