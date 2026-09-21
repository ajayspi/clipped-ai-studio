import { getOmniRouteConfig } from '@/lib/keys';
import { supabaseAdmin, supabase } from '@/lib/db';
import { PROVIDER_REGISTRY } from '@/lib/api-router';

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

// ─── Resilient LLM cascade ───────────────────────────────────────────────────
// Tier 1: OmniRoute single gateway (preferred — unified routing when configured).
// Tier 2: Direct provider keys already stored in `settings` (OpenAI, Anthropic,
//         Gemini, Groq, OpenRouter, Grok, Mistral, DeepSeek, Cerebras…).
// Tier 3: Keyless OpenAI-compatible endpoint, so the pipeline degrades
//         gracefully instead of hard-failing when no gateway is running.
// A dead or unconfigured gateway must never be able to block video generation.

const GATEWAY_TIMEOUT_MS = 12_000;
const PROVIDER_TIMEOUT_MS = 9_000;
const FALLBACK_BUDGET_MS = 30_000; // total wall-clock budget for the fallback tiers
const CHAIN_TTL_MS = 20_000;
const MAX_MODELS_PER_PROVIDER = 3; // a provider's first model may be tier-gated
const KEYLESS_TEXT_PROVIDER_ID = 'pollinations_text';

/** Provider ids stored in the DB that are aliases for a registry provider. */
const PROVIDER_ALIASES: Record<string, string> = {
  claude: 'anthropic',
  google: 'gemini',
  xai: 'grok',
  azure_openai: 'github_models',
};

interface ResolvedProvider {
  id: string;
  name: string;
  chatUrl: string;
  apiKey: string;
  model: string;
  models: string[];
  score: number;
}

let cachedChain: ResolvedProvider[] | null = null;
let chainExpiresAt = 0;

export function clearDirectLLMChainCache(): void {
  cachedChain = null;
  chainExpiresAt = 0;
}

function normalizeProviderId(raw: unknown): string {
  const id = String(raw ?? '').toLowerCase().trim().replace(/^api_/, '');
  return PROVIDER_ALIASES[id] || id;
}

function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

/**
 * Resolve every LLM provider that (a) is OpenAI-compatible, (b) is NOT the
 * local gateway (that is Tier 1) and (c) has a usable key stored in the
 * `settings` table. Ordered by stored priority, then registry priority.
 */
async function resolveDirectLLMProviders(): Promise<ResolvedProvider[]> {
  if (cachedChain && Date.now() < chainExpiresAt) return cachedChain;

  const dbClient = supabaseAdmin || supabase;
  const { data: rows } = await dbClient
    .from('settings')
    .select('provider, api_key, is_active, priority');

  const saved = new Map<string, { key: string; priority: number }>();
  for (const row of rows || []) {
    if (row.is_active === false) continue;
    const id = normalizeProviderId(row.provider);
    const key = String(row.api_key || '').trim();
    if (!id || !key) continue;
    const priority = Number(row.priority) || 0;
    const existing = saved.get(id);
    if (!existing || priority >= existing.priority) saved.set(id, { key, priority });
  }

  const chain: ResolvedProvider[] = [];
  for (const provider of PROVIDER_REGISTRY) {
    if (provider.category !== 'llm') continue;
    if (provider.isFree) continue; // handled by the keyless tier
    if (/localhost|127\.0\.0\.1/i.test(provider.baseUrl)) continue; // gateway-only routes
    const entry = saved.get(provider.id);
    if (!entry) continue;
    chain.push({
      id: provider.id,
      name: provider.name,
      chatUrl: chatCompletionsUrl(provider.baseUrl),
      apiKey: entry.key,
      model: provider.models?.[0] || 'gpt-4o-mini',
      models: provider.models?.length ? provider.models : ['gpt-4o-mini'],
      score: entry.priority * 1000 + provider.defaultPriority,
    });
  }

  chain.sort((a, b) => b.score - a.score);

  cachedChain = chain;
  chainExpiresAt = Date.now() + CHAIN_TTL_MS;
  return chain;
}

/** Keyless last resort — no account, no key required. */
function resolveKeylessProvider(): ResolvedProvider | null {
  const provider = PROVIDER_REGISTRY.find((p) => p.id === KEYLESS_TEXT_PROVIDER_ID);
  if (!provider) return null;
  return {
    id: provider.id,
    name: provider.name,
    chatUrl: chatCompletionsUrl(provider.baseUrl),
    apiKey: '',
    model: provider.models?.[0] || 'openai',
    models: provider.models?.length ? provider.models : ['openai'],
    score: 0,
  };
}

/**
 * Single OpenAI-compatible chat/completions attempt against one endpoint.
 * Retries once without `response_format`, since several providers reject it.
 */
async function attemptCompletion(
  target: ResolvedProvider,
  request: LLMCompletionRequest,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (target.apiKey) headers['Authorization'] = `Bearer ${target.apiKey}`;

  const body: Record<string, unknown> = {
    model: target.model,
    max_tokens: request.maxTokens || 4000,
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.user },
    ],
  };

  try {
    const send = (payload: Record<string, unknown>) =>
      fetch(target.chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

    let response = await send(request.json ? { ...body, response_format: { type: 'json_object' } } : body);

    if (response.status === 400 && request.json) {
      response = await send(body); // provider does not support response_format
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} ${response.statusText}${errorText ? ` - ${errorText.slice(0, 200)}` : ''}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (content !== undefined && content !== null) return content;

    return request.json ? '{}' : '';
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Unified LLM completion facade.
 *
 * Tries the OmniRoute gateway first when configured, then falls back across
 * every directly configured provider key, then to a keyless endpoint. It only
 * fails when the whole cascade is exhausted, and reports every attempt made.
 */
export async function complete(
  request: LLMCompletionRequest,
  provider?: string,
  model?: string
): Promise<string> {
  const errors: string[] = [];
  const config = await getOmniRouteConfig();
  const baseUrl = (config.baseUrl || 'http://127.0.0.1:20128')
    .replace(/\/+$/, '')
    .replace(/\/v1$/i, '');
  const apiKey = config.apiKey || '';
  const selectedModel = model || 'auto'; // OmniRoute smart auto-routing

  // Tier 1 — OmniRoute gateway (only when actually configured).
  if (config.isConfigured) {
    try {
      return await attemptCompletion(
        {
          id: 'omniroute',
          name: 'OmniRoute Gateway',
          chatUrl: `${baseUrl}/v1/chat/completions`,
          apiKey,
          model: selectedModel,
          models: [selectedModel],
          score: 0,
        },
        request,
        GATEWAY_TIMEOUT_MS
      );
    } catch (err: any) {
      const reason =
        err?.name === 'AbortError' ? `timed out after ${GATEWAY_TIMEOUT_MS}ms` : err?.message || String(err);
      console.warn(`[LLM] OmniRoute gateway unavailable (${reason}) — falling back.`);
      errors.push(`OmniRoute gateway: ${reason}`);
    }
  } else {
    errors.push('OmniRoute gateway: not configured');
  }

  const deadline = Date.now() + FALLBACK_BUDGET_MS;

  // Tier 2 — directly configured provider keys.
  try {
    for (const target of await resolveDirectLLMProviders()) {
      for (const model of target.models.slice(0, MAX_MODELS_PER_PROVIDER)) {
        const remaining = deadline - Date.now();
        if (remaining < 1500) {
          errors.push('direct providers: fallback budget exhausted');
          return failed(errors);
        }
        try {
          const content = await attemptCompletion(
            { ...target, model },
            request,
            Math.min(PROVIDER_TIMEOUT_MS, remaining)
          );
          console.warn(`[LLM] Served by fallback provider: ${target.name} (${model}).`);
          return content;
        } catch (err: any) {
          errors.push(`${target.name}/${model}: ${err?.message || err}`);
        }
      }
    }
  } catch (err: any) {
    errors.push(`direct providers: lookup failed (${err?.message || err})`);
  }

  // Tier 3 — keyless OpenAI-compatible endpoint.
  const keyless = resolveKeylessProvider();
  if (keyless) {
    for (const model of keyless.models.slice(0, 2)) {
      const remaining = deadline - Date.now();
      if (remaining < 1500) break;
      try {
        const content = await attemptCompletion(
          { ...keyless, model },
          request,
          Math.min(PROVIDER_TIMEOUT_MS, remaining)
        );
        console.warn(`[LLM] Served by keyless fallback: ${keyless.name} (${model}).`);
        return content;
      } catch (err: any) {
        errors.push(`${keyless.name}/${model}: ${err?.message || err}`);
      }
    }
  }

  return failed(errors);
}

/** Log the exhausted cascade and throw a single aggregated error. */
function failed(errors: string[]): never {
  const summary = errors.join(' | ');
  console.error(`[LLM] Every provider in the cascade failed: ${summary}`);
  throw new Error(`All LLM providers failed: ${summary}`);
}
