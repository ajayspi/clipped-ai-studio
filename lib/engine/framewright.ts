import { complete } from '@/lib/ai/llm';

const SYSTEM_PROMPT = `You are an expert cinematographer (Framewright).
Your task is to take a generic image or video prompt and enhance it with professional cinematography terms.
For example, given "A man walking", you might return "A man walking, medium wide shot, low angle, anamorphic lens, highly cinematic, rim lighting, 8k resolution, photorealistic".
Return ONLY the enhanced prompt. Do not include quotes or any markdown.`;

export async function enhanceFraming(basePrompt: string): Promise<string> {
  if (!basePrompt) return basePrompt;
  const content = await complete({ system: SYSTEM_PROMPT, user: `Enhance this prompt:\n${basePrompt}` }, undefined, 'auto');
  return content.trim();
}
