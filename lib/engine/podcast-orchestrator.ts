import { complete, parseJson } from '@/lib/ai/llm';
import { YoutubeTranscript } from 'youtube-transcript';
import { selectSceneMedia } from '@/lib/media/media-selector';
import { supabaseAdmin as supabase } from '@/lib/db';
import { Scene } from '@/lib/engine/types';

export class PodcastOrchestrator {
  async generatePodcastVideo(jobId: string, videoUrl: string) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
      const fullText = transcript.map(t => t.text).join(' ');

      const systemPrompt = `You are an expert podcast editor. Extract an engaging, highly viral highlight from the provided transcript that is approximately 60 seconds long (about 120-150 words). Break this highlight into ~5-second beats (about 10-15 words each). Return ONLY a JSON object with this schema: { "beats": [{ "text": "...", "keywords": ["..."] }] }`;
      
      const rawRes = await complete({ system: systemPrompt, user: `Transcript:\n${fullText}`, json: true });
      const parsed = parseJson<{ beats: { text: string; keywords: string[] }[] }>(rawRes);

      const beats = [];
      for (let i = 0; i < (parsed?.beats?.length || 0); i++) {
        const b = parsed.beats[i];
        const beatScene: Scene = {
          id: `beat-${i}`,
          text: b.text,
          keywords: b.keywords || ['podcast', 'interview', 'highlight'],
          description: b.text,
          duration: 5.0,
        };
        try {
          const mediaAsset = await selectSceneMedia(beatScene, { allowGenerated: true, aspectRatio: '9:16' });
          beats.push({
            id: beatScene.id,
            text: beatScene.text,
            duration: beatScene.duration,
            clipUrl: mediaAsset.url,
            audioUrl: '' 
          });
        } catch (e) {
          console.warn('Failed to select media for beat:', e);
          beats.push({
            id: beatScene.id,
            text: beatScene.text,
            duration: beatScene.duration,
            clipUrl: '',
            audioUrl: '' 
          });
        }
      }

      await supabase.from('render_jobs').update({
        orchestration_state: 'queued',
        status: 'pending',
        progress: 10,
        logs: JSON.stringify({ beats, videoUrl })
      }).eq('id', jobId);

    } catch (error) {
      console.error('[PodcastOrchestrator] Error:', error);
      await supabase.from('render_jobs').update({
        orchestration_state: 'failed',
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error)
      }).eq('id', jobId);
    }
  }
}

export const podcastOrchestrator = new PodcastOrchestrator();
