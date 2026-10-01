import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  try {
    const { beats } = await req.json();

    if (!Array.isArray(beats)) {
      return NextResponse.json({ error: 'Invalid beats array' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: job, error: fetchError } = await supabase
      .from('render_jobs')
      .select('logs, orchestration_state')
      .eq('id', id)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.orchestration_state !== 'queued' && job.orchestration_state !== 'planning') {
      return NextResponse.json({ error: 'Job cannot be edited in its current state' }, { status: 400 });
    }

    const logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : (job.logs || {});
    
    if (logs.beats) {
      logs.beats = beats;
    } else if (logs.analysis && logs.analysis.scenes) {
      logs.analysis.scenes = beats;
    } else {
      logs.beats = beats;
    }

    // In Supabase, if the column type is JSONB, passing an object directly is preferred
    // over passing a stringified object if the client type requires it, 
    // but the `enqueue.ts` uses JSON.stringify.
    // Let's pass the object, the client will stringify it if necessary, 
    // or we use JSON.stringify if it's a string column.
    // `enqueue.ts` does: logs: JSON.stringify(spec.logs)
    const { error: updateError } = await supabase
      .from('render_jobs')
      .update({ logs: JSON.stringify(logs) })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
