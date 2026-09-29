import { supabase as defaultClient } from '@/lib/db';

export type RenderIntent =
  | 'render'      // worker WILL render this: requires non-empty beats
  | 'plan-only'   // unclaimable; beats are still being produced
  | 'terminal';   // unclaimable; this job will never render

const STATE_FOR: Record<RenderIntent, string> = {
  render: 'queued',
  'plan-only': 'planning',
  terminal: 'completed',
};

export type SupabaseClientLike = any;

export async function enqueueRenderJob(spec: {
  id: string;
  intent: RenderIntent;
  status: string;
  progress?: number;
  logs: Record<string, unknown>;
  client?: SupabaseClientLike;
}): Promise<{ ok: true } | { ok: false; error: string; downgraded: boolean }> {
  let finalIntent = spec.intent;
  let downgraded = false;

  if (spec.intent === 'render') {
    let beatsLength = 0;
    if (spec.logs && Array.isArray(spec.logs.beats)) {
      beatsLength = spec.logs.beats.length;
    } else if (spec.logs && spec.logs.analysis && typeof spec.logs.analysis === 'object') {
      const analysis = spec.logs.analysis as any;
      if (Array.isArray(analysis.scenes)) {
        beatsLength = analysis.scenes.length;
      }
    }

    if (beatsLength === 0) {
      finalIntent = 'plan-only';
      downgraded = true;
    }
  }

  const orchestration_state = STATE_FOR[finalIntent];
  const dbClient = spec.client || defaultClient;

  try {
    const { error } = await dbClient
      .from('render_jobs')
      .upsert({
        id: spec.id,
        status: spec.status,
        progress: spec.progress ?? 0,
        orchestration_state,
        logs: JSON.stringify(spec.logs),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      // Retry with intended state on write failure
      const { error: retryError } = await dbClient
        .from('render_jobs')
        .upsert({
          id: spec.id,
          status: spec.status,
          progress: spec.progress ?? 0,
          orchestration_state,
          logs: JSON.stringify(spec.logs),
          updated_at: new Date().toISOString(),
        });
      if (retryError) throw retryError;
    }
  } catch (err: any) {
    return { ok: false, error: err.message || String(err), downgraded };
  }

  if (downgraded) {
    return { ok: false, error: 'Downgraded to plan-only due to zero beats', downgraded: true };
  }

  return { ok: true };
}
