import { complete, parseJson } from "@/lib/ai/llm"

export interface ScriptBreakScene {
  id: string;
  tensionScore: number;
  shots: string[];
}

export const scriptBreakOrchestrator = {
  async breakdownScript(script: string): Promise<ScriptBreakScene[]> {
    const prompt = `
You are an expert film director and editor. Break down the following script into strict scenes and shots.
Generate an Emotional Tension Curve for the film.

For each scene, provide:
- id: string (e.g. SC01, SC02)
- tensionScore: number from 1-100 representing emotional intensity
- shots: array of strings describing the visual shots (e.g. SH001, SH002 with visual description)

Output strictly as a JSON array of objects. Do not wrap it in any other JSON fields.

Script:
${script}
    `;
    
    const response = await complete({
      system: "You are an expert film director and editor.",
      user: prompt,
      json: true,
      maxTokens: 4000
    }, "anthropic", "claude-3-5-sonnet-latest");
    
    const parsed = parseJson(response);
    
    if (!Array.isArray(parsed)) {
      throw new Error("Failed to parse script breakdown");
    }
    
    return parsed as ScriptBreakScene[];
  }
}
