import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== 'clear_stuck_jobs') {
      return NextResponse.json(
        { error: 'Confirmation payload required: { confirm: "clear_stuck_jobs" }' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('render_jobs')
      .update({ status: 'failed', orchestration_state: 'failed' })
      .in('status', ['pending', 'queued', 'processing'])
      .lt('created_at', new Date(Date.now() - 3600000).toISOString()); // only stuck jobs older than 1 hour

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
