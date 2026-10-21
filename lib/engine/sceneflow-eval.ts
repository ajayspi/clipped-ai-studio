import { getSupabaseAdmin } from '../db';
import { complete, parseJson } from '../ai/llm';

export async function evaluateSceneFlow(jobId: string, videoUrl: string, prompt: string) {
  try {
    const raw = await complete({
      system: 'You are a video evaluator. Output JSON matching: { "fidelityScore": number, "continuityErrors": string[], "reasoning": string }',
      user: `Evaluate the Script-to-Screen Fidelity of this video based on the prompt: "${prompt}". Video URL: ${videoUrl}`,
      json: true
    });

    const resultObj = parseJson<{ fidelityScore: number, continuityErrors: string[], reasoning: string }>(raw);

    const supabase = getSupabaseAdmin();
    
    // Fetch current logs to append the evaluation
    const { data: job } = await supabase
      .from('render_jobs')
      .select('logs')
      .eq('id', jobId)
      .single();

    let logsObj: any = {};
    if (job && job.logs) {
      try {
        logsObj = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs;
      } catch (e) {
      }
    }

    logsObj.sceneFlowEvaluation = resultObj;

    await supabase
      .from('render_jobs')
      .update({
        logs: JSON.stringify(logsObj)
      })
      .eq('id', jobId);

    return resultObj;
  } catch (error) {
    console.error('Failed to evaluate SceneFlow:', error);
    throw error;
  }
}
