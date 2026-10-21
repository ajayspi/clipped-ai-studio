import { NextResponse } from 'next/server';
import { stemOrchestrator } from '@/lib/engine/stem-orchestrator';
import { supabaseAdmin as supabase } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the job to find the video/audio URL
    const { data: job, error } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    let mediaUrl = '';
    
    // Extract media URL from job output
    if (typeof job.logs === 'string') {
      try {
        const logs = JSON.parse(job.logs);
        mediaUrl = logs.finalVideoUrl || '';
      } catch (e) {}
    } else if (job.logs && typeof job.logs === 'object') {
      mediaUrl = (job.logs as any).finalVideoUrl || '';
    }
    
    if (!mediaUrl) {
      mediaUrl = (job as any).output_url || `/renders/${id}.mp4`;
    }

    const stems = await stemOrchestrator.separateAudio(id, mediaUrl);
    
    return NextResponse.json({
      success: true,
      jobId: id,
      stems
    });
    
  } catch (err) {
    console.error('[Stems Route] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
