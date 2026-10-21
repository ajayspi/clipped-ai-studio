import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TimelineEditor } from '@/components/timeline/TimelineEditor';
import { Scene } from '@/lib/engine/types';

function TensionCurve({ data }: { data: number[] }) {
  if (!data || data.length === 0) return null;
  const width = 800;
  const height = 100;
  const maxData = 100;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - (val / maxData) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-4 bg-muted/20 border-b flex-shrink-0">
      <h3 className="text-sm font-medium mb-2">Emotional Tension Curve</h3>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          points={points}
        />
        {data.map((val, i) => {
          const x = (i / (data.length - 1 || 1)) * width;
          const y = height - (val / maxData) * height;
          return (
            <circle key={i} cx={x} cy={y} r="4" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
          )
        })}
      </svg>
    </div>
  )
}

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

  if (job.orchestration_state !== 'queued' && job.orchestration_state !== 'planning' && job.orchestration_state !== 'completed') {
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

  const tensionCurve = logs?.tensionCurve && Array.isArray(logs.tensionCurve) ? logs.tensionCurve : null;

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-4rem)] bg-background">
      {tensionCurve && <TensionCurve data={tensionCurve} />}
      <div className="flex-1 min-h-0">
        <TimelineEditor initialBeats={beats} jobId={job.id} />
      </div>
    </div>
  );
}
