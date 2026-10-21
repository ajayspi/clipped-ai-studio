import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  try {
    const supabase = getSupabaseAdmin();
    
    // Fetch the original job
    const { data: originalJob, error: fetchError } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !originalJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Determine the shot ID and version
    let logsObj: any = {};
    if (originalJob.logs) {
      try {
        logsObj = typeof originalJob.logs === 'string' ? JSON.parse(originalJob.logs) : originalJob.logs;
      } catch (e) {
        // Not a JSON
      }
    }

    const currentVersion = logsObj.version || 1;
    const shotId = logsObj.shotId || originalJob.id;
    
    const newVersion = currentVersion + 1;
    
    const newLogsObj = {
      ...logsObj,
      version: newVersion,
      shotId: shotId
    };

    const jobId = crypto.randomUUID();

    const { data: newJob, error: insertError } = await supabase
      .from('render_jobs')
      .insert({
        id: jobId,
        video_id: originalJob.video_id,
        status: 'processing',
        orchestration_state: 'queued',
        progress: 0,
        logs: JSON.stringify(newLogsObj)
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to clone job' }, { status: 500 });
    }

    return NextResponse.json({ success: true, job: newJob });
  } catch (error) {
    console.error('Failed to regenerate job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
