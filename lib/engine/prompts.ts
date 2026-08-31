/**
 * Reusable prompt engineering templates and builders for all AI video workflows.
 */

// ==========================================
// System Prompts
// ==========================================

export const SYSTEM_PROMPTS = {
  SCENE_BREAKDOWN: `You are an expert cinematic director and AI video prompt engineer.
Your task is to break down a narration script into concise, visually rich scene prompts suitable for generative AI video models (such as Kling AI, Luma Dream Machine, and Flux).
For each scene, specify:
1. text: Verbatim transcript segment spoken in this scene.
2. description: Rich visual prompt describing environment, lighting, camera angle, motion, and subject.
3. visualPrompt: Optimized prompt specifically formatted for text-to-video generation engines.
4. cameraMotion: Recommended camera movement (e.g., zoom_in, pan_right, orbit, drone, static).
5. duration: Estimated duration in seconds (typically 3 to 6 seconds).
6. emotion: Tone/mood of the scene.
7. keywords: 3-5 search keywords.

Return ONLY valid JSON matching the requested schema.`,

  SCRIPT_GENERATOR: `You are a viral content strategist and screenwriter.
Generate high-retention video scripts optimized for pacing, storytelling, and viewer engagement.
Always structure scripts with:
1. Hook (0-3s): Attention-grabbing opening.
2. Retain (3-20s): Core story or information with escalating interest.
3. Climax / Value (20-50s): Key reveal, insight, or emotional peak.
4. Call to Action / Loop (50-60s): Seamless loop or clear punchline.`,

  DRAMA_CONSISTENCY: `You are a television showrunner and cinematic consistency director.
When creating scenes for multi-episode micro-dramas, you MUST strictly anchor character appearances and visual motifs using defined visual anchors.
Ensure character faces, clothing, lighting style, and atmosphere remain 100% consistent across shots.
Include character visual anchors at the start of every generative scene description.`,

  STORY_SERIES: `You are a master fiction storyteller specializing in episodic viral series (e.g. suspense, urban legends, sci-fi thrillers, history mysteries).
Create multi-part serialized stories where each part ends on an irresistible cliffhanger that compels viewers to watch the next part.
Keep each part focused, suspenseful, and tightly timed (30-60 seconds per part).`,

  BULK_CONTENT_PLANNER: `You are a social media growth architect and content planner.
Create comprehensive content calendars for creators with distinct viral hooks, structured scripts, visual aesthetics, and platform-specific hashtags.`,

  VIRAL_SHORTS_EXTRACTOR: `You are an elite video editor and viral content analyst.
Analyze long-form video transcripts to identify the highest-retention, high-emotion, stand-alone viral segments (hooks, debates, shocking facts, humorous beats).
Assign each clip a viral potential score (1-100) and pinpoint precise start/end timestamps and hook lines.`,

  AUTOPILOT_SYNTHESIS: `You are an autonomous AI media producer.
Synthesize trending topics, news summaries, or niche prompts into polished, production-ready video concepts and production scripts.`,
};

// ==========================================
// Prompt Builder Functions
// ==========================================

/**
 * Builds a prompt to break a script down into AI video scenes.
 */
export function buildSceneBreakdownPrompt(
  script: string,
  visualStyle: string = 'cinematic, photorealistic, 4k',
  model: string = 'kling-v1'
): string {
  return `Analyze the following script and break it down into consecutive visual scenes for ${model} video generation.
Visual Style: ${visualStyle}

Script:
"""
${script}
"""

Return valid JSON with the following structure:
{
  "scenes": [
    {
      "text": "spoken narration text",
      "description": "photorealistic description of scene, lighting, atmosphere",
      "visualPrompt": "${visualStyle}, cinematic lighting, 8k resolution, [scene details], smooth motion",
      "cameraMotion": "zoom_in",
      "duration": 5,
      "emotion": "suspenseful",
      "keywords": ["night", "rain", "cyberpunk"]
    }
  ]
}`;
}

/**
 * Builds a cinematic AI video prompt for text-to-video generators.
 */
export function buildAIVideoPrompt(options: {
  sceneText: string;
  visualStyle?: string;
  cameraMotion?: string;
  negativePrompt?: string;
  characterAnchor?: string;
}): string {
  const {
    sceneText = '',
    visualStyle = 'cinematic 8k photorealistic',
    cameraMotion = 'smooth cinematic camera movement',
    characterAnchor,
  } = options;

  const parts: string[] = [];

  if (characterAnchor) {
    parts.push(`[Character: ${characterAnchor}]`);
  }

  const safeSceneText = typeof sceneText === 'string' ? sceneText.trim() : String(sceneText || '');
  if (safeSceneText) {
    parts.push(safeSceneText);
  }

  if (visualStyle && typeof visualStyle === 'string') {
    parts.push(visualStyle.trim());
  }

  if (cameraMotion && cameraMotion !== 'static') {
    const motionMap: Record<string, string> = {
      zoom_in: 'slow dramatic zoom in',
      zoom_out: 'smooth pullback zoom out revealing environment',
      pan_left: 'smooth cinematic pan left',
      pan_right: 'smooth cinematic pan right',
      orbit: '360 degree orbit camera rotation around subject',
      drone: 'high-angle cinematic drone flyover shot',
      tilt_up: 'dramatic tilt up from ground',
      tilt_down: 'slow tilt down from sky',
    };
    parts.push(motionMap[cameraMotion] || cameraMotion);
  }

  parts.push('masterpiece, ultra-detailed, 24fps film grain, photorealistic lighting');

  return parts.join(', ');
}

/**
 * Builds prompt for multi-part story generation.
 */
export function buildStoryPartsPrompt(
  topic: string,
  storyType: string,
  partsCount: number,
  visualStyle: string
): string {
  return `Generate a ${partsCount}-part serialized viral story on the topic: "${topic}".
Genre / Story Type: ${storyType}
Visual Aesthetic: ${visualStyle}

Requirements:
- Exactly ${partsCount} parts.
- Each part must have a compelling title, strong 3-second hook, high-tension narrative script (60-90 words), and end with an intense cliffhanger.
- Provide 3-5 visual scene prompts per part.

Return valid JSON with the following structure:
{
  "seriesTitle": "Title of the entire series",
  "parts": [
    {
      "partNumber": 1,
      "title": "Part 1: The Discovery",
      "hook": "Opening hook line...",
      "script": "Full spoken narration for this part...",
      "cliffhanger": "Ending sentence leaving audience on edge...",
      "scenes": [
        {
          "text": "spoken words",
          "description": "visual description",
          "visualPrompt": "detailed AI video prompt",
          "duration": 5
        }
      ]
    }
  ]
}`;
}

/**
 * Builds prompt for bulk content planning.
 */
export function buildBulkPlanPrompt(
  niche: string,
  contentCount: number,
  cadence: string,
  platforms: string[],
  visualStyle: string
): string {
  return `Create a ${contentCount}-item social media content plan for the niche: "${niche}".
Cadence: ${cadence}
Target Platforms: ${platforms.join(', ')}
Visual Style: ${visualStyle}

For each day/item provide:
1. day: Number (1 to ${contentCount})
2. title: Catchy video title
3. hook: First 3 seconds spoken hook
4. script: 30-45 second spoken script
5. visualPrompt: Prompt for thumbnail / AI video generation
6. targetPlatform: Best platform for this piece
7. tags: 3-5 relevant hashtags

Return valid JSON:
{
  "planTitle": "Title for this bulk plan",
  "items": [
    {
      "day": 1,
      "title": "...",
      "hook": "...",
      "script": "...",
      "visualPrompt": "...",
      "targetPlatform": "${platforms[0] || 'TikTok'}",
      "tags": ["#niche", "#viral"],
      "status": "ready"
    }
  ]
}`;
}

/**
 * Builds prompt for micro-drama generation with consistent character visual anchors.
 */
export function buildDramaSeriesPrompt(
  genre: string,
  characters: Array<{ name: string; description: string; visualAnchor: string }>,
  episodesCount: number,
  seedScript?: string
): string {
  const charDescriptions = characters
    .map(
      (c) =>
        `- ${c.name}: ${c.description}. Visual Anchor: "${c.visualAnchor}"`
    )
    .join('\n');

  return `Create a ${episodesCount}-episode micro-drama in the "${genre}" genre.
${seedScript ? `Story Premise:\n"""\n${seedScript}\n"""\n` : ''}
Characters and their persistent Visual Anchors:
${charDescriptions}

Requirements:
- Maintain character visual anchors consistently across every scene description.
- Each episode must be 45-60 seconds long with fast dialogue, emotional intensity, and a plot twist/cliffhanger.
- Output scenes with character visual cues embedded in the visualPrompt.

Return valid JSON:
{
  "dramaTitle": "Series Title",
  "episodes": [
    {
      "episodeNumber": 1,
      "title": "Episode 1 Title",
      "script": "Full narration and dialogue...",
      "cliffhanger": "Episode ending twist...",
      "scenes": [
        {
          "text": "dialogue line",
          "description": "scene description with visual anchors",
          "visualPrompt": "AI generation prompt including character visual anchor",
          "duration": 5
        }
      ]
    }
  ]
}`;
}

/**
 * Builds prompt for shorts extraction from a transcript.
 */
export function buildShortsExtractionPrompt(
  transcript: string,
  clipCount: number = 3,
  strategy: string = 'highest_virality'
): string {
  return `Analyze the following video transcript and identify the top ${clipCount} standalone viral short clips.
Strategy: ${strategy}

Transcript:
"""
${transcript.substring(0, 8000)}
"""

For each clip:
1. clipId: Unique identifier (e.g. clip-1)
2. title: Click-worthy title (under 50 chars)
3. hook: The hook sentence that stops scrolling
4. startTime: Estimated start second in source
5. endTime: Estimated end second in source (30-60 seconds total)
6. viralScore: Estimated viral potential (1-100)
7. reason: Why this clip will perform well
8. transcriptSegment: The verbatim excerpt from the transcript

Return valid JSON:
{
  "originalDuration": 300,
  "clips": [
    {
      "clipId": "clip-1",
      "title": "...",
      "hook": "...",
      "startTime": 0,
      "endTime": 45,
      "viralScore": 92,
      "reason": "Strong debate hook with surprising conclusion",
      "transcriptSegment": "..."
    }
  ]
}`;
}
