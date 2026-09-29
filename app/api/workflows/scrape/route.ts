/**
 * WORKFLOW ROUTE — scrape
 *   KIND:          utility
 *   UI CALLER:     create/url
 *   WRITES QUEUE:  no
 *   CLAIMABLE:     no
 *   DISTINCT FROM: generate (scrape only extracts text from a URL, does not render)
 */
import { NextResponse } from 'next/server';
import { complete } from '@/lib/ai/llm';
import { safeFetch, SafeFetchError } from '@/lib/net/safe-fetch';

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await safeFetch(url);

    if (!response.contentType.toLowerCase().includes('text/html')) {
      return NextResponse.json({ error: 'URL does not point to an HTML page' }, { status: 415 });
    }

    const html = await response.text();

    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) || html.match(/<meta name="description" content="([^"]+)"/i);
    
    let ldHeadline = '';
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        if (ld.headline) ldHeadline = ld.headline;
      } catch (e) {}
    }

    let bodyContent = '';
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/im);
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/im);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/im);

    if (articleMatch) bodyContent = articleMatch[1];
    else if (mainMatch) bodyContent = mainMatch[1];
    else if (bodyMatch) bodyContent = bodyMatch[1];
    else bodyContent = html;

    const cleanText = bodyContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');

    let extractedText = '';
    if (ldHeadline) extractedText += ldHeadline + '\n\n';
    else if (titleMatch) extractedText += titleMatch[1] + '\n\n';
    
    if (descMatch) extractedText += descMatch[1] + '\n\n';
    
    extractedText += decodeHtmlEntities(cleanText).slice(0, 15000);

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
${extractedText}
`;

    const script = await complete({
      system: 'You are a precise short-form video scriptwriter.',
      user: prompt,
      maxTokens: 1200,
    }, undefined, 'auto');

    if (!script) {
      throw new Error('Failed to generate script from URL');
    }

    return NextResponse.json({ script: script.trim() });
  } catch (error) {
    console.error('Scrape error:', error);
    if (error instanceof SafeFetchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to scrape URL' }, { status: 500 });
  }
}
