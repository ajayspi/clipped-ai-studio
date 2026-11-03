import { supabase } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function checkVideoIds() {
  const files = fs.readdirSync(path.join(process.cwd(), 'public', 'renders'))
    .filter(f => f.endsWith('.mp4'));
  
  for (const f of files) {
    const id = f.replace('.mp4', '');
    const { data: jobByVideo } = await supabase.from('render_jobs').select('id, video_id, status').eq('video_id', id).maybeSingle();
    if (jobByVideo) {
      console.log(`MATCH! File ${f} matches job.video_id:`, jobByVideo);
    }
  }
}

checkVideoIds();
