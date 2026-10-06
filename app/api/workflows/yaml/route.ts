import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/db';
import { compileYamlWorkflow } from '@/lib/engine/yaml-compiler';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const yamlString = body.yaml;
    
    if (!yamlString || typeof yamlString !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing yaml string' }, { status: 400 });
    }

    const compiled = compileYamlWorkflow(yamlString);
    const jobId = crypto.randomUUID();
    const videoId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await supabase.from('videos').insert({
      id: videoId,
      title: compiled.script ? compiled.script.slice(0, 100) : 'YAML Workflow',
      script: compiled.script || '',
      workflow: 'yaml',
      status: 'processing',
      created_at: createdAt,
      updated_at: createdAt,
    });

    await supabase.from('render_jobs').insert({
      id: jobId,
      video_id: videoId,
      status: 'processing',
      progress: 20,
      orchestration_state: 'queued', // claim_render_job requires 'queued' to start processing
      beats: compiled.beats,
      script: compiled.script || '',
      logs: JSON.stringify(compiled),
      created_at: createdAt,
    });

    return NextResponse.json({ success: true, jobId, videoId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error processing YAML';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
