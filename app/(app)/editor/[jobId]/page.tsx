import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DynamicTimelineEditor as TimelineEditor } from '@/components/timeline/DynamicTimelineEditor';
import { Scene } from '@/lib/engine/types';
import { Download, Film } from 'lucide-react';
import { extractJobPresentation } from '@/lib/engine/job-presentation';
import { getViewTransitionStyle } from '@/lib/utils/view-transitions';

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
          );
        })}
      </svg>
    </div>
  );
}

export default async function EditorPage(props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  const { jobId } = params;
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from('render_jobs')
    .select('id, logs, orchestration_state, status, progress, output_url')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return notFound();
  }

  const allowedStates = [
    'queued',
    'planning',
    'completed',
    'qc_pending',
    'processing',
    'generating_plan',
    'pending',
    'claimed',
    'rendering',
    'retryable',
    'ready',
    'draft',
  ];

  if (!allowedStates.includes(job.orchestration_state) && !allowedStates.includes(job.status)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        This job is in state {job.orchestration_state || job.status} and cannot be edited.
      </div>
    );
  }

  const presentation = extractJobPresentation(job);
  const logs = presentation.logs;

  let beats: Scene[] = [];
  if (logs?.beats && Array.isArray(logs.beats)) {
    beats = logs.beats as unknown as Scene[];
  } else if (logs?.analysis?.scenes && Array.isArray(logs.analysis.scenes)) {
    beats = logs.analysis.scenes as unknown as Scene[];
  }

  const tensionCurve = logs?.tensionCurve && Array.isArray(logs.tensionCurve) ? logs.tensionCurve : null;

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-4rem)] bg-background">
      {(presentation.status === 'completed' && presentation.output_url) && (
        <div className="border-b bg-card/50 p-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">{presentation.title}</h2>
                {presentation.workflow_type && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                    {presentation.workflow_type.replace(/-/g, ' ')}
                  </span>
                )}
              </div>
              <a
                href={presentation.output_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Download MP4
              </a>
            </div>
            <video 
              src={presentation.output_url} 
              controls 
              className="w-full rounded-lg bg-black max-h-[60vh]"
              style={getViewTransitionStyle('video-player-' + jobId)}
              playsInline
            />
          </div>
        </div>
      )}
      {tensionCurve && <TensionCurve data={tensionCurve} />}
      <div className="flex-1 min-h-0">
        <TimelineEditor initialBeats={beats} jobId={job.id} />
      </div>
    </div>
  );
}
