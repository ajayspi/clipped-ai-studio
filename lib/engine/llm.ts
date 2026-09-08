import { getOmniRouteConfig } from '@/lib/keys';

export interface LLMCompletionRequest {
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
}

/**
 * Safe JSON parser for LLM responses conforming to Rule 2:
 * NEVER use raw JSON.parse() on LLM outputs.
 * Handles markdown fences (```json), unescaped newlines, bracket slicing, and optional fallback.
 */
export function parseJson<T>(content: string, fallback?: T): T {
  if (!content || typeof content !== 'string') {
    if (fallback !== undefined) return fallback;
    throw new Error('parseJson received empty or non-string input');
  }

  // 1. Strip markdown code fences
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const cleaned = (fenceMatch ? fenceMatch[1] : content).trim();

  // 2. Direct JSON.parse attempt
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // 3. Slice between first { and last } for objects
  const startObj = cleaned.indexOf('{');
  const endObj = cleaned.lastIndexOf('}');
  if (startObj !== -1 && endObj > startObj) {
    const sliced = cleaned.slice(startObj, endObj + 1);
    try {
      return JSON.parse(sliced) as T;
    } catch {}

    // 4. Sanitize unescaped newlines inside string literals
    try {
      const sanitized = sliced.replace(/\n/g, '\\n').replace(/\r/g, '');
      return JSON.parse(sanitized) as T;
    } catch {}
  }

  // Slicing between first [ and last ] for arrays
  const startArr = cleaned.indexOf('[');
  const endArr = cleaned.lastIndexOf(']');
  if (startArr !== -1 && endArr > startArr) {
    const slicedArr = cleaned.slice(startArr, endArr + 1);
    try {
      return JSON.parse(slicedArr) as T;
    } catch {}
  }

  // 5. Fallback regex extraction for scriptwriter and scene analyzer objects
  try {
    const narrationMatch = content.match(/"narration"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"keywords")/);
    const keywordsMatch = content.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
    if (narrationMatch) {
      const keywords = keywordsMatch
        ? keywordsMatch[1].split(',').map(s => s.replace(/["'\[\]\n\r]/g, '').trim()).filter(Boolean)
        : [];
      return {
        narration: narrationMatch[1].replace(/\\n/g, '\n'),
        keywords,
      } as unknown as T;
    }
  } catch {}

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Model did not return valid JSON: ${content.slice(0, 200)}`);
}

/**
 * Unified LLM completion facade routing through OmniRoute/OpenRouter.
 * Dynamically resolves OmniRoute credentials, passes Authorization header,
 * and handles timeouts/offline errors gracefully.
 */
export async function complete(
  request: LLMCompletionRequest,
  provider?: string,
  model?: string
): Promise<string> {
  const config = await getOmniRouteConfig();
  const baseUrl = (config.baseUrl || 'http://127.0.0.1:20128')
    .replace(/\/+$/, '')
    .replace(/\/v1$/i, '');
  const apiKey = config.apiKey || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const selectedModel =
    model ||
    'auto'; // OmniRoute's smart auto-routing — picks the best available provider

  const payload = {
    model: selectedModel,
    max_tokens: request.maxTokens || 4000,
    response_format: request.json ? { type: 'json_object' } : undefined,
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.user },
    ],
  };

  // Race the fetch against a hard timeout so a stalled upstream provider
  // (OmniRoute connected but waiting) doesn't block the pipeline forever.
  const TIMEOUT_MS = 12_000; // 12 s — fast enough for fallback, generous for good providers

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OmniRoute error: HTTP ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (content !== undefined && content !== null) {
      return content;
    }
    return request.json ? '{}' : '';
  } catch (err: any) {
    if ((err as any)?.name === 'AbortError') {
      console.warn(`[OmniRoute LLM] Request aborted after ${TIMEOUT_MS}ms timeout — using fallback.`);
      throw new Error(`OmniRoute completion timed out after ${TIMEOUT_MS}ms`);
    }
    console.warn(`[OmniRoute LLM] Offline or request failed (${err?.message || err}).`);
    throw new Error(`OmniRoute completion failed: ${err?.message || err}`);
  }
}
