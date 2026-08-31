import {
  DramaCharacter,
  DramaEpisode,
  DramaSeriesRequest,
  DramaSeriesResponse,
  Scene,
} from './types';
import { buildDramaSeriesPrompt } from './prompts';

export class DramaOrchestrator {
  /**
   * Generates a multi-episode drama series with persistent character visual anchors.
   * Leverages LLM for episodic narrative continuity and provides an authentic,
   * cost-safe deterministic fallback for dry-run and offline testing.
   */
  async generateDramaSeries(request: DramaSeriesRequest): Promise<DramaSeriesResponse> {
    // 1. Validate required character array
    if (!request.characters || !Array.isArray(request.characters) || request.characters.length === 0) {
      throw new Error('Characters array is required for micro-drama generation');
    }

    const genre = request.genre && request.genre.trim() ? request.genre.trim() : 'drama';
    const episodesCount = Math.max(1, Math.min(Number(request.episodesCount) || 3, 12));
    const aspectRatio = request.aspectRatio || '9:16';
    const visualStyle = request.visualStyle || 'cinematic, dramatic lighting, high contrast 8k';

    // 2. Normalize and ensure consistent visual anchors for all characters
    const normalizedCharacters = request.characters.map((char, index) => {
      const name = char.name && char.name.trim() ? char.name.trim() : `Character ${index + 1}`;
      const description = char.description && char.description.trim() ? char.description.trim() : `${genre} character`;
      const visualAnchor = char.visualAnchor && char.visualAnchor.trim().length > 0
        ? char.visualAnchor.trim()
        : `distinctive look: ${name}, ${description}, consistent facial structure, attire: ${genre} style`;
      const avatarUrl = char.avatarUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(visualAnchor)}?width=512&height=512&nologo=true`;

      return {
        name,
        description,
        visualAnchor,
        voice: char.voice || 'alloy',
        avatarUrl,
      };
    });

    console.log(`[DramaOrchestrator] Generating ${episodesCount}-episode series in genre: ${genre} with ${normalizedCharacters.length} characters`);

    // 3. Attempt live LLM generation if OPENAI_API_KEY is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const liveResult = await this.generateWithLLM(
          genre,
          normalizedCharacters,
          episodesCount,
          request.script,
          aspectRatio,
          visualStyle,
          apiKey
        );
        if (liveResult) {
          return liveResult;
        }
      } catch (err: any) {
        console.warn(`[DramaOrchestrator] Live LLM generation failed (${err?.message || err}). Falling back to dry-run engine.`);
      }
    }

    // 4. Cost-safe authentic deterministic fallback
    return this.generateDryRunSeries(
      genre,
      normalizedCharacters,
      episodesCount,
      request.script,
      aspectRatio,
      visualStyle
    );
  }

  /**
   * Live LLM Generation using OpenAI GPT-4o-mini
   */
  private async generateWithLLM(
    genre: string,
    characters: DramaCharacter[],
    episodesCount: number,
    seedScript?: string,
    aspectRatio?: string,
    visualStyle?: string,
    apiKey?: string
  ): Promise<DramaSeriesResponse | null> {
    const prompt = buildDramaSeriesPrompt(genre, characters, episodesCount, seedScript);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a professional television showrunner. Create engaging multi-episode micro-drama series with strict character visual anchor consistency. Always return valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const dramaTitle = parsed.dramaTitle || `${genre.toUpperCase()} Series: Secrets Revealed`;
    const rawEpisodes = Array.isArray(parsed.episodes) ? parsed.episodes : [];

    const episodes: DramaEpisode[] = [];
    for (let i = 0; i < episodesCount; i++) {
      const epNum = i + 1;
      const rawEp = rawEpisodes[i] || {};
      const epTitle = rawEp.title || `Episode ${epNum}: The Turning Point`;
      const epScript = rawEp.script || `Dialogue between ${characters.map((c) => c.name).join(' and ')}.`;
      const cliffhanger = rawEp.cliffhanger || (epNum < episodesCount ? `What happens next will change everything!` : 'The final truth uncovered.');

      const scenes: Scene[] = (rawEp.scenes && Array.isArray(rawEp.scenes) && rawEp.scenes.length > 0)
        ? rawEp.scenes.map((s: any, sIdx: number) => ({
            id: `ep-${epNum}-scene-${sIdx + 1}`,
            text: String(s.text || `${characters[0].name} speaks`),
            description: String(s.description || `${characters[0].visualAnchor}. Dramatic scene in ${genre}`),
            visualPrompt: String(s.visualPrompt || `[Character: ${characters[0].visualAnchor}], ${visualStyle}, ${genre}`),
            duration: Number(s.duration) || 5,
            emotion: s.emotion ? String(s.emotion) : 'intense',
            keywords: Array.isArray(s.keywords) ? s.keywords.map(String) : [genre, characters[0].name],
          }))
        : this.generateDefaultScenesForEpisode(epNum, genre, characters, visualStyle);

      episodes.push({
        episodeNumber: epNum,
        title: epTitle,
        script: epScript,
        cliffhanger,
        scenes,
        duration: scenes.reduce((sum, s) => sum + s.duration, 0),
      });
    }

    return {
      success: true,
      dramaTitle,
      characters: characters.map((c) => ({
        name: c.name,
        avatarUrl: c.avatarUrl || '',
        visualAnchor: c.visualAnchor,
      })),
      episodes,
      metadata: {
        genre,
        episodesCount,
        aspectRatio,
        visualStyle,
        isDryRun: false,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Deterministic authentic dry-run fallback generator.
   */
  private generateDryRunSeries(
    genre: string,
    characters: DramaCharacter[],
    episodesCount: number,
    seedScript?: string,
    aspectRatio?: string,
    visualStyle?: string
  ): DramaSeriesResponse {
    // Generate genre-adaptive series title
    const genreTitleSlug = genre.includes('-')
      ? genre.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : genre.charAt(0).toUpperCase() + genre.slice(1);

    const dramaTitle = `${genre.toUpperCase()} Series: Secrets of ${characters[0]?.name || 'Destiny'}`;

    // Episodic arc templates
    const episodeArcTemplates = [
      {
        titleSuffix: 'The Inciting Incident',
        hook: `A sudden discovery breaks the silence.`,
        action: `uncovers a buried secret that threatens everything they hold dear.`,
        cliffhanger: `A shadowy figure appears in the doorway, whispering their real name.`,
      },
      {
        titleSuffix: 'The Hidden Truth',
        hook: `No one can be trusted in this place.`,
        action: `demands answers, but every revelation only deepens the web of deceit.`,
        cliffhanger: `A vital piece of evidence vanishes right before their eyes.`,
      },
      {
        titleSuffix: 'The Confrontation',
        hook: `The stakes reach their absolute breaking point.`,
        action: `faces an impossible ultimatum with seconds on the clock.`,
        cliffhanger: `A gunshot echoes into the dark, cutting the feed instantly!`,
      },
      {
        titleSuffix: 'Desperate Measures',
        hook: `When all bridges are burned, there is only one move left.`,
        action: `initiates a high-stakes counter-strategy to expose the conspiracy.`,
        cliffhanger: `An unexpected ally turns the weapon back on them.`,
      },
      {
        titleSuffix: 'The Reckoning',
        hook: `The final confrontation that settles every debt.`,
        action: `confronts the mastermind face-to-face in the dramatic finale.`,
        cliffhanger: `The truth is revealed, leaving a new mystery looming on the horizon.`,
      },
    ];

    // If custom script is provided, divide into episode segments
    const scriptSegments: string[] = [];
    if (seedScript && seedScript.trim()) {
      const cleanScript = seedScript.trim();
      const parts = cleanScript.split(/(?:Scene\s*\d+:?|Episode\s*\d+:?|\n\s*\n)/i).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= episodesCount) {
        for (let i = 0; i < episodesCount; i++) {
          scriptSegments.push(parts[i]);
        }
      } else {
        const chunkSize = Math.max(1, Math.ceil(cleanScript.length / episodesCount));
        for (let i = 0; i < episodesCount; i++) {
          scriptSegments.push(cleanScript.substring(i * chunkSize, (i + 1) * chunkSize).trim());
        }
      }
    }

    const episodes: DramaEpisode[] = [];
    const leadChar = characters[0];
    const secondaryChar = characters[1] || characters[0];

    for (let ep = 1; ep <= episodesCount; ep++) {
      const arc = episodeArcTemplates[(ep - 1) % episodeArcTemplates.length];
      const customScript = scriptSegments[ep - 1];

      const title = `Episode ${ep}: ${arc.titleSuffix}`;
      const script = customScript
        ? customScript
        : `${leadChar.name}: "${arc.hook}" As tension escalates, ${leadChar.name} ${arc.action} ${secondaryChar.name} steps into the light: "You should never have dug into this."`;
      const cliffhanger = ep < episodesCount ? arc.cliffhanger : 'The final chapter concludes, leaving an unforgettable legacy.';

      const scenes = this.generateDefaultScenesForEpisode(ep, genre, characters, visualStyle, customScript);

      episodes.push({
        episodeNumber: ep,
        title,
        script,
        cliffhanger,
        scenes,
        duration: scenes.reduce((sum, s) => sum + s.duration, 0),
      });
    }

    return {
      success: true,
      dramaTitle,
      characters: characters.map((c) => ({
        name: c.name,
        avatarUrl: c.avatarUrl || '',
        visualAnchor: c.visualAnchor,
      })),
      episodes,
      metadata: {
        genre,
        genreTitleSlug,
        episodesCount,
        aspectRatio: aspectRatio || '9:16',
        visualStyle: visualStyle || 'cinematic',
        isDryRun: true,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Generates cinematic scenes adhering to character visual anchors.
   */
  private generateDefaultScenesForEpisode(
    episodeNumber: number,
    genre: string,
    characters: DramaCharacter[],
    visualStyle: string = 'cinematic 8k',
    segmentScript?: string
  ): Scene[] {
    const char1 = characters[0];
    const char2 = characters[1] || characters[0];

    return [
      {
        id: `ep-${episodeNumber}-s1`,
        text: segmentScript ? segmentScript.substring(0, 50) : `${char1.name} steps into the dimly lit room.`,
        keywords: [genre, char1.name, 'establishing-shot'],
        description: `Establishing shot of ${char1.name} (${char1.visualAnchor}) in a moody ${genre} atmosphere.`,
        visualPrompt: `[Character: ${char1.visualAnchor}], ${visualStyle}, cinematic lighting, photorealistic 8k, camera zoom in`,
        duration: 5,
        emotion: 'suspenseful',
        cameraMotion: 'zoom_in',
      },
      {
        id: `ep-${episodeNumber}-s2`,
        text: segmentScript ? segmentScript.substring(50, 120) : `${char2.name} turns around with an intense expression.`,
        keywords: [genre, char2.name, 'dramatic-confrontation'],
        description: `Dramatic medium shot of ${char2.name} (${char2.visualAnchor}) reacting with high emotional stakes.`,
        visualPrompt: `[Character: ${char2.visualAnchor}], ${visualStyle}, intense eye contact, dramatic rim lighting, camera orbit`,
        duration: 5,
        emotion: 'tense',
        cameraMotion: 'orbit',
      },
      {
        id: `ep-${episodeNumber}-s3`,
        text: segmentScript ? segmentScript.substring(120, 200) : `The confrontation reaches its climax before the cliffhanger.`,
        keywords: [genre, 'cliffhanger', 'twist'],
        description: `Close-up shot of ${char1.name} (${char1.visualAnchor}) realizing the shocking twist in ${genre} setting.`,
        visualPrompt: `[Character: ${char1.visualAnchor}], ${visualStyle}, shock and tension, 24fps film grain, cinematic pullback zoom`,
        duration: 6,
        emotion: 'dramatic',
        cameraMotion: 'zoom_out',
      },
    ];
  }
}

export const dramaOrchestrator = new DramaOrchestrator();
