import { Scene, ScriptAnalysis } from "./types";

const SYSTEM_PROMPT =
  'You break video narration into visual scenes for stock-footage sourcing. Return valid JSON only.';

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
  ): Promise<ScriptAnalysis> {
    const passes = splitIntoPasses(script);
    const scenes: Scene[] = [];

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set. Cannot perform scene matching.");
    }

    for (const [index, pass] of passes.entries()) {
      const prompt = `Break this narration into visual scenes for stock-footage sourcing.
${passes.length > 1 ? `This is part ${index + 1} of ${passes.length} of a longer script; cover only the text below.` : ''}

For each scene give:
1. text — the words spoken during it, taken verbatim from the narration
2. keywords — 3-5 English stock-footage search terms
3. description — what is shown on screen
4. duration — seconds, estimated from the spoken length
5. emotion — the tone

Every word of the narration must appear in exactly one scene, in order.

Narration:
${pass}

Return ONLY valid JSON, no markdown:
{"scenes":[{"text":"...","keywords":["..."],"description":"...","duration":5,"emotion":"educational"}]}`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
          ]
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API failed: ${res.statusText}`);
      }

      const data = await res.json();
      const content = data.choices[0].message.content;
      
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        console.error("Failed to parse JSON from LLM", content);
        continue;
      }

      for (const scene of parsed.scenes ?? []) {
        if (!scene?.text) continue;
        scenes.push({
          id: `scene-${scenes.length}`,
          text: String(scene.text),
          keywords: Array.isArray(scene.keywords) ? scene.keywords.map(String) : [],
          description: String(scene.description ?? scene.text),
          duration: Number(scene.duration) || 4,
          emotion: scene.emotion ? String(scene.emotion) : undefined,
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
