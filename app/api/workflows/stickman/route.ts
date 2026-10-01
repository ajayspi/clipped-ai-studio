import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/db';
import { stickmanOrchestrator } from '@/lib/engine/stickman-orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, voice, aspectRatio, beatCount } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const jobId = crypto.randomUUID();

    // The spec explicitly requires orchestration_state: 'planning' on insert
    // to avoid the empty-concat failure mode.
    const insertPayload = {
      id: jobId,
      status: 'generating_plan',
      progress: 0,
      orchestration_state: 'planning',
      logs: JSON.stringify({ message: "Job queued" })
    };

    const { error: insertErr } = await supabase.from('render_jobs').insert(insertPayload);
    if (insertErr) {
      console.warn(`[WorkflowStickman] initial insert failed:`, insertErr);
    }

    // Fire and forget the orchestrator
    setTimeout(() => {
      stickmanOrchestrator.execute(jobId, { topic, voice, aspectRatio, beatCount }).catch(err => {
        console.error(`Stickman orchestrator error for ${jobId}:`, err);
      });
    }, 0);

    return NextResponse.json({
      success: true,
      jobId,
      message: "Stickman animation started"
    }, { status: 202 });

  } catch (error) {
    console.error("Stickman workflow trigger error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}
