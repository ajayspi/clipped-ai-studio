export function parseJson<T>(raw: string): T {
  // 1. Strip markdown fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const cleaned = (fenceMatch ? fenceMatch[1] : raw).trim();

  // 2. Direct JSON.parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // 3. Slice between first { and last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const sliced = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(sliced) as T;
    } catch {}

    // 4. Sanitize newlines inside string values
    try {
      // Extremely basic sanitization attempt for unescaped newlines
      const sanitized = sliced.replace(/\n/g, '\\n').replace(/\r/g, '');
      return JSON.parse(sanitized) as T;
    } catch {}
  }

  // 5. Fallback regex extraction for scriptwriter and scene analyzer objects
  try {
    const narrationMatch = raw.match(/"narration"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"keywords")/);
    const keywordsMatch = raw.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
    if (narrationMatch) {
      const keywords = keywordsMatch 
        ? keywordsMatch[1].split(',').map(s => s.replace(/["'\[\]\n\r]/g, '').trim()).filter(Boolean)
        : [];
      return {
        narration: narrationMatch[1].replace(/\\n/g, '\n'),
        keywords
      } as unknown as T;
    }
  } catch {}

  throw new Error(`Model did not return valid JSON: ${raw.slice(0, 200)}`);
}

import { supabase } from '@/lib/db';

export async function complete(request: { system: string; user: string; maxTokens?: number; json?: boolean }, provider?: string, model?: string): Promise<string> {
  let apiKey = process.env.OPENAI_API_KEY;
  
  // Try to get it from the database if not in env
  if (!apiKey) {
    const { data: keyData } = await supabase
      .from('settings')
      .select('api_key')
      .eq('provider', 'api_openai')
      .eq('user_id', 'default_user') // Assuming single-tenant right now
      .single();
      
    if (keyData?.api_key) {
      apiKey = keyData.api_key;
    }
  }

  if (!apiKey) {
    console.warn("No OpenAI API Key found. Falling back to Keyless Pollinations.ai Text API.");
    try {
      // Use Pollinations Text API for 100% keyless LLM generation
      const encodedPrompt = encodeURIComponent(`${request.system}\n\n${request.user}\n\nIMPORTANT: You must return ONLY valid JSON matching the requested schema. No markdown formatting, no conversation.`);
      const pollRes = await fetch(`https://text.pollinations.ai/${encodedPrompt}?json=true`);
      if (pollRes.ok) {
        const textResponse = await pollRes.text();
        return textResponse;
      }
    } catch (err) {
      console.error("Keyless LLM failed:", err);
    }
    
    // Absolute worst-case local fallback
    return JSON.stringify({
      narration: "Welcome to this AI generated video. This is a fallback script because all APIs failed.",
      keywords: ["ai", "fallback", "video"],
      scenes: [
        { id: 'beat-0', text: "Welcome to this AI generated video.", keywords: ["ai"], duration: 3 }
      ]
    });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      max_tokens: request.maxTokens || 4000,
      response_format: request.json ? { type: "json_object" } : undefined,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '{}';
}
