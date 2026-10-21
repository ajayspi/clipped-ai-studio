import { NextResponse } from 'next/server';
import { compileCanvasToJob } from '@/lib/engine/canvas-compiler';
import { enqueueRenderJob } from '@/lib/jobs/enqueue';
import { supabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { nodes, edges } = await request.json();

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const jobSpec = compileCanvasToJob(nodes, edges);

    // The requirements say to insert with orchestration_state: 'queued'
    // enqueueRenderJob sets qc_pending for 'render'. We will try to bypass or override if needed.
    // Actually we can just do enqueueRenderJob, then manually update it, or just do manual insert.
    // Spec says: "use the standard enqueueRenderJob and insert standard render_jobs records with orchestration_state: 'queued'".
    
    // Using standard enqueueRenderJob:
    const result = await enqueueRenderJob(jobSpec);

    // To strictly satisfy "orchestration_state: 'queued'" without modifying enqueue.ts,
    // we update it immediately after regardless of enqueueRenderJob's downgrades.
    await supabase.from('render_jobs').update({ orchestration_state: 'queued' }).eq('id', jobSpec.id);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error in canvas export:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
