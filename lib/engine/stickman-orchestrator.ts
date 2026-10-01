import { supabase } from '@/lib/db';
import { enqueueRenderJob } from '@/lib/jobs/enqueue';
import { complete, parseJson } from '@/lib/ai/llm';
import { ttsEngine } from './tts';
import { geminiCharacterGenerator } from '@/lib/ai/gemini-character-generator';
import { selectSceneMedia } from '@/lib/media/media-selector';

export interface StickmanOptions {
  topic: string;
  voice?: string;
  aspectRatio?: string;
  beatCount?: number;
  mock?: boolean;
}

export class StickmanOrchestrator {
  async execute(jobId: string, options: StickmanOptions): Promise<void> {
    try {
      const beatCount = options.beatCount || 6;
      const topic = options.topic;
      const voice = options.voice || 'alloy';
      const aspectRatio = (options.aspectRatio || '9:16') as '16:9' | '9:16' | '1:1';

      // 2. Generate Plan
      let script = '';
      let beatsPlan: Array<{ text: string, emotion: string }> = [];

      if (!options.mock) {
        try {
          const sysPrompt = `You are a scriptwriter for viral stickman explainer videos.
Generate a script about the topic: "${topic}".
CRITICAL REQUIREMENT: Create scripts about "paradoxes" (e.g., paradoxical scenarios, mind-bending contradictions, or optical illusion concepts) related to the topic.
Break the script into exactly ${beatCount} beats. Each beat should be approximately 5 seconds long when spoken.
Return JSON in this format: { "script": "full text", "beats": [ { "text": "beat narration", "emotion": "tone of beat" } ] }`;

          const raw = await complete({ system: sysPrompt, user: `Topic: ${topic}`, json: true });
          const parsed = parseJson<{ script?: string, beats?: Array<{ text: string, emotion: string }> }>(raw);

          if (parsed.script && parsed.beats && parsed.beats.length > 0) {
            script = parsed.script;
            beatsPlan = parsed.beats;
          }
        } catch (err) {
          console.warn('LLM failed, falling back to deterministic beats');
        }
      }

      if (beatsPlan.length === 0) {
        script = `The paradox of ${topic} is mind-bending. Here is why.`;
        beatsPlan = [
          { text: `Did you ever notice the strange paradox of ${topic}?`, emotion: 'confused' },
          { text: `It seems to contradict itself at every turn.`, emotion: 'explaining' },
          { text: `Yet, this contradiction is exactly what makes it work.`, emotion: 'eureka' }
        ];
      }

      const finalBeats: any[] = [];
      const logs: any = { script, workflow: 'stickman', topic };

      // 3. Generate Character Sheet
      const sheet = await geminiCharacterGenerator.generateCharacterSheet({ archetype: 'stickman', style: 'cinematic', mock: true });
      const sheetImageUrl = sheet.sheetImageUrl;

      // 4. For each beat: resolve poseA/poseB, fetch background, synthesize narration
      for (let i = 0; i < beatsPlan.length; i++) {
        const beatPlan = beatsPlan[i];
        
        // Voiceover
        let audioUrl = '';
        let duration = 5;
        if (!options.mock) {
          try {
            const ttsResult = await ttsEngine.synthesize({ text: beatPlan.text, voice, language: 'en-US' });
            if (ttsResult && ttsResult.audioUrl) {
              audioUrl = ttsResult.audioUrl;
              duration = ttsResult.duration || 5;
            }
          } catch (e) {
             console.warn('TTS failed for beat', i);
          }
        }
        if (!audioUrl) {
          audioUrl = `https://storage.clipped.ai/audio/beat-${i}-${voice}.wav`; // mock
        }

        // Background media (dynamic choice of image or video via selectSceneMedia)
        let imageUrl = '';
        if (!options.mock) {
          try {
            const asset = await selectSceneMedia({
              text: beatPlan.text,
              keywords: [topic, 'paradox', beatPlan.emotion],
              duration
            }, { allowGenerated: true, aspectRatio });
            imageUrl = asset.url;
          } catch (e) {
            console.warn('Media select failed for beat', i);
          }
        }
        if (!imageUrl) {
          imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent('paradoxical optical illusion ' + topic)}?width=720&height=1280&nologo=true`;
        }

        // Stickman poses
        const poseA = geminiCharacterGenerator.mapSentimentToPose(i === 0 ? 'neutral' : beatsPlan[i - 1].emotion);
        const poseB = geminiCharacterGenerator.mapSentimentToPose(beatPlan.emotion);

        finalBeats.push({
          id: `beat-${i + 1}`,
          text: beatPlan.text,
          duration,
          narration: audioUrl,
          imageUrl,
          clipUrl: imageUrl, // for worker
          prompt: beatPlan.text,
          stickman: {
            archetype: 'stickman',
            poseA,
            poseB,
            svg: sheetImageUrl,
            bbox: { x: 0, y: 0, w: 333, h: 333 }
          }
        });
      }

      logs.beats = finalBeats;

      // 4. Update render_jobs to 'queued'
      await enqueueRenderJob({
        id: jobId,
        intent: 'render', // translates to 'queued'
        status: 'processing',
        progress: 20,
        logs
      });

    } catch (err: any) {
      console.error(`Stickman workflow failed for job ${jobId}:`, err);
      try {
        await supabase.from('render_jobs').update({
          status: 'failed',
          orchestration_state: 'failed',
          error_message: err.message || String(err)
        }).eq('id', jobId);
      } catch (e) {}
    }
  }
}

export const stickmanOrchestrator = new StickmanOrchestrator();
