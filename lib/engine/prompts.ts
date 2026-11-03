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
Synthesize trending topics, news summaries, or niche prompts into polished, production-ready video concepts and production scripts.
Get straight to the point, don't start with unnecessary things like 'welcome to this video'.
NEVER USE A TITLE. YOU MUST NOT INCLUDE ANY TYPE OF MARKDOWN.
ONLY RETURN THE RAW CONTENT. DO NOT INCLUDE 'VOICEOVER', 'NARRATOR' OR SIMILAR INDICATORS.`,

  STICKMAN_DIRECTOR: `You are an autonomous 2D animation director and screenplay choreographer inspired by viral stickman storytelling (similar to kaomei/stickman-video-director).
Your job is to transform a topic, story, or joke into a tightly choreographed 2D screenplay script with staging, comedic timing, camera moves, and sound effects.

Rules for staging tags:
1. Every scene/beat must begin with explicit screenplay tags in brackets:
   - [ACTION: enter_stage | walk_left | walk_right | sprint | freeze | idle | turn_around]
   - [POSE: neutral | pointing | eureka | explaining | facepalm | hands_up | arms_crossed | sitting | victory | ready]
   - [REACTION: none | jaw_drop | eye_pop | sweat_drop | lightbulb | question_marks | anger_vein]
   - [CAMERA: static | slow_zoom_in | snap_push | dutch_tilt | whip_pan | shake]
   - [SFX: record_scratch | cartoon_boing | drum_roll | rimshot | cash_register | thunder | pop | whoosh | ding]
   - [PAUSE: 0.3s - 0.8s] (inject immediately before punchlines for comedic timing)
   - [STAGE: 0.1 - 0.9] (horizontal stage blocking: 0.2=left, 0.5=center, 0.8=right)
2. Keep spoken narration conversational, punchy, and timed for 20-45 second vertical shorts.
3. Use dramatic pauses [PAUSE: 0.6s] and [CAMERA: snap_push] on sudden realizations or comedic twists.`,
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
  sceneText?: string;
  visualStyle?: string;
  cameraMotion?: string;
  negativePrompt?: string;
  characterAnchor?: string;
  topic?: string;
  sentenceLength?: number;
}): string {
  const {
    sceneText = '',
    visualStyle = 'cinematic 8k photorealistic',
    cameraMotion = 'smooth cinematic camera movement',
    characterAnchor,
    topic,
    sentenceLength,
  } = options;

  const parts: string[] = [];

  // Script generation constraints
  if (topic) {
    parts.push(`Topic: ${topic}`);
    parts.push("Get straight to the point, don't start with unnecessary things like 'welcome to this video'.");
    parts.push("NEVER USE A TITLE. YOU MUST NOT INCLUDE ANY TYPE OF MARKDOWN.");
    parts.push("ONLY RETURN THE RAW CONTENT. DO NOT INCLUDE 'VOICEOVER', 'NARRATOR' OR SIMILAR INDICATORS.");
    if (sentenceLength) {
      parts.push(`YOU MUST NOT EXCEED THE ${sentenceLength} SENTENCES LIMIT.`);
    }
  }

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

  if (!topic) {
    parts.push('masterpiece, ultra-detailed, 24fps film grain, photorealistic lighting');
  }

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
3. hookVariants: 2-3 different first 3-second spoken hooks to choose from
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
      "hookVariants": ["hook variant 1", "hook variant 2"],
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

/**
 * Builds a prompt for autonomous stickman screenplay choreography and comedic staging.
 */
export function buildStickmanDirectorPrompt(
  topic: string,
  mood: string = 'dusk',
  targetSeconds: number = 30
): string {
  return `Write a comedic, high-retention 2D stickman animation screenplay on the topic: "${topic}".
Target Total Duration: ~${targetSeconds} seconds.
Atmospheric Mood: ${mood}.

Format every scene block with explicit bracket tags followed by spoken dialogue.
Example Format:
[STAGE: 0.3] [ACTION: enter_stage] [POSE: explaining] [CAMERA: slow_zoom_in] [SFX: none]
Dialogue line goes here...

[STAGE: 0.5] [ACTION: freeze] [POSE: facepalm] [REACTION: jaw_drop] [CAMERA: snap_push] [SFX: record_scratch] [PAUSE: 0.6s]
Comedic punchline or sudden realization goes here!

Ensure you include:
1. An instant scroll-stopping hook in the first 3 seconds.
2. At least one comedic timing pause [PAUSE: 0.5s - 0.7s] preceding the punchline.
3. Expressive physical comedy (facepalms, eureka moments, dramatic camera pushes, sound effect triggers).
4. Do NOT output markdown code blocks. Output the plain choreographed screenplay text directly.`;
}
