import { getOmniRouteConfig } from '@/lib/keys';
import { complete, parseJson } from '@/lib/engine/llm';
import { Scene, ScriptAnalysis } from "./types";
import { CAMERA_MOVES, SHOT_TYPES, shotFromScene } from './shot-planner';

const SYSTEM_PROMPT =
  'You break video narration into visual scenes for stock-footage sourcing, and direct each ' +
  'shot with a framing and a camera move. Return valid JSON only.';

const WORDS_PER_PASS = 350;

function splitIntoPasses(script: string): string[] {
  const paragraphs = script.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return [script];

  const passes: string[] = [];
  let current: string[] = [];
  let words = 0;

  for (const paragraph of paragraphs) {
    const count = paragraph.split(/\s+/).length;

    if (words + count > WORDS_PER_PASS && current.length) {
      passes.push(current.join('\n\n'));
      current = [];
      words = 0;
    }
    current.push(paragraph);
    words += count;
  }

  if (current.length) passes.push(current.join('\n\n'));
  return passes;
}

export class SceneMatcher {
  async analyzeScript(
    script: string,
    targetDuration?: number,
    context?: string
  ): Promise<ScriptAnalysis> {
    const passes = splitIntoPasses(script);
    const scenes: Scene[] = [];

    // A missing gateway is not fatal: lib/engine/llm.ts cascades through the
    // directly configured provider keys (and a keyless endpoint) first.
    const omniConfig = await getOmniRouteConfig();
    if (!omniConfig.apiKey) {
      console.warn(
        '[SceneMatcher] OmniRoute gateway is not configured — using the direct provider fallback cascade.'
      );
    }

    for (const [index, pass] of passes.entries()) {
      let prompt = `Break this narration into visual scenes for stock-footage sourcing.
${passes.length > 1 ? `This is part ${index + 1} of ${passes.length} of a longer script; cover only the text below.` : ''}`;

      if (targetDuration) {
        prompt += `\nIMPORTANT CONSTRAINT: Each scene MUST be approximately ${targetDuration} seconds long (roughly ${Math.round(targetDuration * 2.5)} words per scene). Break the script into small chunks strictly adhering to this duration constraint.`;
      }

      if (context) {
        prompt += `\n\nCONTEXT/STYLE HINT: ${context}`;
      }

      prompt += `\n\nFor each scene give:
1. text — the words spoken during it, taken verbatim from the narration
2. keywords — 3-5 English stock-footage search terms
3. description — what is shown on screen
4. duration — seconds, estimated from the spoken length (if constrained, strictly output ${targetDuration || 'the length'})
5. emotion — the tone
6. shotType — the framing, from exactly one of: ${SHOT_TYPES.join(', ')}
7. cameraMove — how the camera moves, from exactly one of: ${CAMERA_MOVES.join(', ')}

Every word of the narration must appear in exactly one scene, in order.

Shot direction and pacing rules:
- Both fields are closed lists. Use those exact spellings; nothing else is renderable.
- VARIETY IS THE POINT. Do not repeat one cameraMove across consecutive scenes —
  identical motion on every shot is what makes a cut look like a slideshow.
- Beat 1 is the hook and must be the most visually dynamic shot. Open on motion.
- Alternate visual density and land a visual change on every sentence that carries a new idea.
- End on a loop-friendly final beat.
- "static" is legitimate for a beat that should land still, but use it rarely.
- Pair sensibly: a "push-in" on an opening "wide" builds; a "pull-out" reveals.

Narration:
${pass}

Return ONLY valid JSON, no markdown:
{"scenes":[{"text":"...","keywords":["..."],"description":"...","duration":${targetDuration || 5},"emotion":"educational","shotType":"wide","cameraMove":"push-in"}]}`;

      const content = await complete({ system: SYSTEM_PROMPT, user: prompt, json: true }, undefined, 'auto');
      let parsed: { scenes?: Array<Record<string, unknown>> };
      try {
        parsed = parseJson<{ scenes?: Array<Record<string, unknown>> }>(content);
      } catch {
        console.error("Failed to parse JSON from LLM", content);
        continue;
      }

      for (const scene of parsed.scenes ?? []) {
        if (!scene?.text) continue;
        
        const sceneText = String(scene.text);
        const words = sceneText.trim().split(/\s+/).length;
        // Assume speaking rate of ~2.5 words per second
        const spokenDuration = words / 2.5; 
        
        let dur = Number(scene.duration) || 4;
        
        // Duration clamps
        if (dur > spokenDuration) dur = spokenDuration;
        if (dur > 3.5) dur = 3.5;
        if (dur < 1.8) dur = 1.8;
        
        // First beat must be <= 2.5s
        if (scenes.length === 0 && dur > 2.5) {
          dur = 2.5;
        }

        // The model proposes; the planner decides. \`shotFromScene\` enforces the
        // closed vocabulary and supplies the deterministic rhythm when the
        // fields are missing or the model invented a move, so a scene can never
        // reach the renderer with an unrenderable camera instruction.
        const shot = shotFromScene(
          {
            text: sceneText,
            description: String(scene.description ?? sceneText),
            keywords: Array.isArray(scene.keywords) ? scene.keywords.map(String) : [],
            shotType: scene.shotType,
            cameraMove: scene.cameraMove,
          },
          scenes.length
        );
        scenes.push({
          id: \`scene-\${scenes.length}\`,
          text: sceneText,
          keywords: Array.isArray(scene.keywords) ? scene.keywords.map(String) : [],
          description: String(scene.description ?? sceneText),
          duration: dur,
          emotion: scene.emotion ? String(scene.emotion) : undefined,
          shotType: shot.shotType,
          cameraMove: shot.cameraMove,
          imagePrompt: shot.imagePrompt,
          searchQuery: shot.searchQuery,
        });
      }
    }

    if (scenes.length === 0) throw new Error('The model returned no scenes');

    return {
      script,
      scenes,
      totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
    };
  }
}

export const sceneMatcher = new SceneMatcher();


