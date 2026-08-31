import { NextResponse } from 'next/server';
import { complete } from '@/lib/ai/llm'; // Assuming complete exists

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 1. Fetch the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // 2. Extremely naive HTML to Text (strip tags, scripts, styles)
    const bodyContent = html.match(/<body[^>]*>([\w|\W]*)<\/body>/im)?.[1] || html;
    const cleanText = bodyContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove remaining HTML tags
      .replace(/\s+/g, ' ') // Collapse whitespace
      .slice(0, 15000); // Limit to ~15k chars for prompt safety

    // 3. Summarize with LLM directly into a video script format
    const prompt = `
You are an expert short-form video scriptwriter. 
I am going to provide you with raw text extracted from a webpage. 
Your job is to read it, identify the core engaging story or facts, and write a viral 30-45 second short-form video narration.

REQUIREMENTS:
- Output ONLY the spoken narration.
- No scene directions, no brackets, no intro text.
- Make it punchy, engaging, and suitable for TikTok / YouTube Shorts.
- Add a strong hook at the beginning.

RAW WEBPAGE TEXT:
${cleanText}
`;

    const script = await complete(prompt, 'openai', 'gpt-4o');

    if (!script) {
      throw new Error('Failed to generate script from URL');
    }

    return NextResponse.json({ script: script.trim() });
  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
