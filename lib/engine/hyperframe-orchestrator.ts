import { complete, parseJson } from "@/lib/ai/llm";

export async function generateHyperframeHtml(prompt: string): Promise<string> {
  const sys = `You are an expert HTML/CSS/GSAP developer. Your goal is to write a single self-contained HTML file that plays a motion graphics animation.
You MUST include GSAP via CDN (e.g. <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>).
You MUST write all CSS inline or in a <style> block.
The animation should run automatically when the page loads, using a master GSAP timeline.
Return a JSON object with a single field 'html' containing the raw HTML string.
Do not use markdown blocks for the JSON. Just return the JSON object.
`;
  
  const userPrompt = `Create a motion graphics video HTML for the following prompt: "${prompt}"`;
  
  const response = await complete({
    system: sys,
    user: userPrompt,
    json: true
  });
  const data = parseJson<{html?: string}>(response);
  if (!data || !data.html) {
    throw new Error("Failed to generate HTML from LLM");
  }
  return data.html;
}
