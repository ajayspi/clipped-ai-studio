import { getOmniRouteConfig } from '@/lib/keys';
import {
  StorySeriesRequest,
  StorySeriesResponse,
  StoryPart,
  Scene,
} from './types';
import { SYSTEM_PROMPTS, buildStoryPartsPrompt } from './prompts';

/**
 * Multi-part story series generator.
 * Creates serialized fiction and non-fiction video narratives with opening hooks,
 * structured scene breakdowns, visual style propagation, and cliffhangers.
 */
export class StoriesOrchestrator {
  /**
   * Generates a multi-part story series.
   */
  async generateStorySeries(request: StorySeriesRequest): Promise<StorySeriesResponse> {
    if (!request.topic || typeof request.topic !== 'string' || !request.topic.trim()) {
      throw new Error("topic is required for story series generation");
    }

    const topic = request.topic.trim();
    const storyType = request.storyType || 'mystery';
    // Clamp partsCount between 1 and 10
    const rawPartsCount = Number(request.partsCount);
    const partsCount = isNaN(rawPartsCount)
      ? 3
      : Math.max(1, Math.min(rawPartsCount, 10));

    const visualStyle = request.visualStyle || 'cinematic, photorealistic, 8k, atmospheric lighting';
    const voice = request.voice || 'nova';
    const aspectRatio = request.aspectRatio || '9:16';
    const includeHooks = request.includeHooks !== false;

    console.log(`[StoriesOrchestrator] Generating ${partsCount}-part story series for topic: "${topic}" (${storyType})`);

    const omniConfig = await getOmniRouteConfig();
    const apiKey = omniConfig.apiKey || 'omniroute-key';

    if (apiKey) {
      try {
        const response = await this.generateWithOpenAI(
          topic,
          storyType,
          partsCount,
          visualStyle,
          includeHooks,
          voice,
          aspectRatio,
          apiKey
        );
        if (response && response.success && response.parts && response.parts.length > 0) {
          return response;
        }
      } catch (err: any) {
        console.warn(`[StoriesOrchestrator] OpenAI generation failed (${err?.message || err}). Using cost-safe dry-run generator.`);
      }
    } else {
      console.log(`[StoriesOrchestrator] OPENAI_API_KEY not configured. Using cost-safe dry-run generator.`);
    }

    // Cost-safe deterministic generation fallback
    return this.generateDryRun(topic, storyType, partsCount, visualStyle, includeHooks, voice, aspectRatio);
  }

  /**
   * OpenAI GPT-4o-mini structured JSON generation.
   */
  private async generateWithOpenAI(
    topic: string,
    storyType: string,
    partsCount: number,
    visualStyle: string,
    includeHooks: boolean,
    voice: string,
    aspectRatio: string,
    apiKey: string
  ): Promise<StorySeriesResponse> {
    const prompt = buildStoryPartsPrompt(topic, storyType, partsCount, visualStyle);

    const res = await fetch('http://localhost:20128/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.STORY_SERIES },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const parsed = JSON.parse(content);
    const seriesTitle = parsed.seriesTitle || `${topic} (${storyType.toUpperCase()} Series)`;

    const rawParts: any[] = Array.isArray(parsed.parts) ? parsed.parts : [];
    const parts: StoryPart[] = [];

    for (let i = 0; i < partsCount; i++) {
      const partNum = i + 1;
      const rawPart = rawParts[i] || {};

      const defaultHook = `Did you know the untold truth behind ${topic}? What happens in part ${partNum} will leave you speechless.`;
      const defaultCliffhanger = partNum < partsCount
        ? `Just when the truth seemed within reach, an unexpected discovery changed everything. Follow for Part ${partNum + 1}!`
        : `The final revelation of ${topic} is finally uncovered, leaving a legacy that defies explanation.`;

      const hook = (rawPart.hook && String(rawPart.hook).trim()) || defaultHook;
      const script = (rawPart.script && String(rawPart.script).trim()) ||
        `In part ${partNum} of ${topic}, we delve deeper into the ${storyType} narrative, uncovering hidden evidence and sudden turns of events that nobody saw coming.`;
      const cliffhanger = (rawPart.cliffhanger && String(rawPart.cliffhanger).trim()) || defaultCliffhanger;
      const title = rawPart.title || `Part ${partNum}: The ${storyType === 'horror' ? 'Haunting' : storyType === 'sci-fi' ? 'Anomaly' : 'Revelation'}`;

      const rawScenes = Array.isArray(rawPart.scenes) ? rawPart.scenes : [];
      const scenes: Scene[] = [];

      if (rawScenes.length > 0) {
        for (let sIdx = 0; sIdx < rawScenes.length; sIdx++) {
          const s = rawScenes[sIdx];
          scenes.push({
            id: `story-part-${partNum}-scene-${sIdx + 1}`,
            text: String(s.text || script.substring(0, 80)),
            description: String(s.description || `${topic} scene in ${visualStyle}`),
            visualPrompt: String(s.visualPrompt || `${visualStyle}, ${topic}, cinematic lighting, 8k resolution`),
            cameraMotion: s.cameraMotion || 'zoom_in',
            duration: Number(s.duration) || 5,
            emotion: s.emotion || 'suspenseful',
            keywords: Array.isArray(s.keywords) && s.keywords.length > 0
              ? s.keywords.map(String)
              : [topic, storyType, 'cinematic', visualStyle.split(',')[0].trim()],
          });
        }
      } else {
        // Generate default structured scenes
        scenes.push(
          {
            id: `story-part-${partNum}-scene-1`,
            text: hook,
            description: `Opening hook visual for ${topic} part ${partNum}`,
            visualPrompt: `${visualStyle}, high tension opening shot of ${topic}, dramatic atmospheric lighting`,
            cameraMotion: 'zoom_in',
            duration: 4,
            emotion: 'suspense',
            keywords: [topic, storyType, 'opening', 'cinematic'],
          },
          {
            id: `story-part-${partNum}-scene-2`,
            text: script.substring(0, Math.min(100, script.length)),
            description: `Core escalating narrative scene for ${topic}`,
            visualPrompt: `${visualStyle}, high detail dynamic scene of ${topic}, photorealistic reflections`,
            cameraMotion: 'pan_right',
            duration: 5,
            emotion: 'tense',
            keywords: [topic, 'narrative', 'climax', visualStyle.split(',')[0].trim()],
          },
          {
            id: `story-part-${partNum}-scene-3`,
            text: cliffhanger,
            description: `Cliffhanger ending scene for ${topic} part ${partNum}`,
            visualPrompt: `${visualStyle}, dramatic cliffhanger silhouette, high contrast cinematic grade`,
            cameraMotion: 'zoom_out',
            duration: 5,
            emotion: 'climactic',
            keywords: [topic, 'cliffhanger', 'dramatic', storyType],
          }
        );
      }

      parts.push({
        partNumber: partNum,
        title,
        hook: includeHooks ? hook : '',
        script,
        cliffhanger,
        scenes,
        estimatedDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
      });
    }

    return {
      success: true,
      seriesTitle,
      parts,
      metadata: {
        topic,
        storyType,
        partsCount,
        visualStyle,
        voice,
        aspectRatio,
        includeHooks,
        provider: 'openai-gpt4o-mini',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Deterministic cost-safe dry-run generator.
   */
  private generateDryRun(
    topic: string,
    storyType: string,
    partsCount: number,
    visualStyle: string,
    includeHooks: boolean,
    voice: string,
    aspectRatio: string
  ): StorySeriesResponse {
    const parts: StoryPart[] = [];
    const seriesTitle = `${topic} (${storyType.charAt(0).toUpperCase() + storyType.slice(1)} Series)`;

    const sampleThemes: Record<string, { hookPrefix: string; tensionAdjective: string; sceneKeywords: string[] }> = {
      horror: {
        hookPrefix: 'Whatever you do, never look directly into',
        tensionAdjective: 'terrifying and shadow-drenched',
        sceneKeywords: ['darkness', 'fog', 'abandoned', 'haunted', 'eerie'],
      },
      mystery: {
        hookPrefix: 'Investigators thought they had solved everything, until',
        tensionAdjective: 'perplexing and enigmatic',
        sceneKeywords: ['clues', 'night', 'detective', 'rain', 'shadows'],
      },
      'sci-fi': {
        hookPrefix: 'Deep in the quantum anomalies of the cosmos,',
        tensionAdjective: 'futuristic and unexplainable',
        sceneKeywords: ['space', 'nebula', 'cybernetic', 'hologram', 'stars'],
      },
      motivational: {
        hookPrefix: 'They told everyone it was impossible to conquer',
        tensionAdjective: 'inspiring and monumental',
        sceneKeywords: ['journey', 'grit', 'triumph', 'mountain', 'sunrise'],
      },
      educational: {
        hookPrefix: 'This shocking historical discovery rewrites everything we knew about',
        tensionAdjective: 'fascinating and groundbreaking',
        sceneKeywords: ['artifact', 'ancient', 'history', 'archive', 'discovery'],
      },
      adventure: {
        hookPrefix: 'Deep beneath uncharted territory lies the lost secret of',
        tensionAdjective: 'thrilling and perilous',
        sceneKeywords: ['expedition', 'jungle', 'temple', 'treasure', 'wilderness'],
      },
    };

    const theme = sampleThemes[storyType.toLowerCase()] || {
      hookPrefix: `The hidden truth behind`,
      tensionAdjective: 'dramatic and captivating',
      sceneKeywords: ['cinematic', 'story', 'journey', 'mystery'],
    };

    for (let i = 1; i <= partsCount; i++) {
      const isLastPart = i === partsCount;
      const hook = `${theme.hookPrefix} ${topic}! What happened in part ${i} defies all explanation.`;
      const script = `In part ${i} of our journey into ${topic}, new evidence emerges under ${theme.tensionAdjective} circumstances. The stakes escalate rapidly as each second ticks down, drawing us into an unavoidable confrontation with reality.`;
      const cliffhanger = isLastPart
        ? `The ultimate mystery of ${topic} is finally revealed, changing everything we thought was real.`
        : `Just as the truth was about to be uncovered, a sudden twist shattered everything. What happens next will shock you. Follow for Part ${i + 1}!`;

      const scenes: Scene[] = [
        {
          id: `part-${i}-scene-1`,
          text: hook,
          keywords: [topic, theme.sceneKeywords[0] || 'opening', visualStyle.split(',')[0].trim()],
          description: `Atmospheric opening shot for ${topic} part ${i}`,
          visualPrompt: `${visualStyle}, cinematic establishing shot of ${topic}, 8k photorealistic lighting`,
          cameraMotion: 'zoom_in',
          duration: 4,
          emotion: 'suspense',
        },
        {
          id: `part-${i}-scene-2`,
          text: `In part ${i} of ${topic}, new evidence emerges under ${theme.tensionAdjective} circumstances.`,
          keywords: [topic, theme.sceneKeywords[1] || 'action', storyType],
          description: `Mid-story escalation for ${topic}`,
          visualPrompt: `${visualStyle}, dramatic focal narrative beat of ${topic}, dynamic depth of field`,
          cameraMotion: 'pan_right',
          duration: 5,
          emotion: 'intense',
        },
        {
          id: `part-${i}-scene-3`,
          text: cliffhanger,
          keywords: [topic, 'cliffhanger', theme.sceneKeywords[2] || 'climax'],
          description: `High-tension cliffhanger close-up for ${topic} part ${i}`,
          visualPrompt: `${visualStyle}, dramatic cliffhanger climax of ${topic}, ultra-detailed cinematic finish`,
          cameraMotion: isLastPart ? 'zoom_out' : 'orbit',
          duration: 5,
          emotion: isLastPart ? 'triumphant' : 'cliffhanger',
        },
      ];

      parts.push({
        partNumber: i,
        title: `Part ${i}: ${isLastPart ? 'The Final Climax' : `The Escalation of ${topic.substring(0, 20)}`}`,
        script,
        hook: includeHooks ? hook : '',
        cliffhanger,
        scenes,
        estimatedDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
      });
    }

    return {
      success: true,
      seriesTitle,
      parts,
      metadata: {
        topic,
        storyType,
        partsCount,
        visualStyle,
        voice,
        aspectRatio,
        includeHooks,
        isDryRun: true,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export const storiesOrchestrator = new StoriesOrchestrator();


