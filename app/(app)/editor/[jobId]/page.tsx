import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TimelineEditor } from '@/components/timeline/TimelineEditor';
import { Scene } from '@/lib/engine/types';

export default async function EditorPage(props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  const { jobId } = params;
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from('render_jobs')
    .select('id, logs, orchestration_state')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return notFound();
  }

  if (job.orchestration_state !== 'queued' && job.orchestration_state !== 'planning') {
    return (
      <div className="p-8 text-center text-muted-foreground">
        This job is in state {job.orchestration_state} and cannot be edited.
      </div>
    );
  }

  const logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs;
  
  let beats: Scene[] = [];
  if (logs?.beats && Array.isArray(logs.beats)) {
    beats = logs.beats;
  } else if (logs?.analysis?.scenes && Array.isArray(logs.analysis.scenes)) {
    beats = logs.analysis.scenes;
  }

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] bg-background">
      <TimelineEditor initialBeats={beats} jobId={job.id} />
    </div>
  );
}
