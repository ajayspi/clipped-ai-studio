/**
 * Smart API Router — lib/api-router.ts
 *
 * Provides automatic health-aware failover across all configured AI providers.
 * Each provider is pinged with a lightweight health check before being selected.
 * Priority falls through: highest priority active+healthy provider wins.
 */

import { supabaseAdmin } from '@/lib/db';

// ─── Provider Registry ────────────────────────────────────────────────────────

export interface ProviderConfig {
  id: string;                     // e.g. "openai"
  name: string;                   // Display name
  category: 'llm' | 'image' | 'voice' | 'media' | 'video' | 'music';
  healthEndpoint: string;         // URL to GET/POST for a fast availability check
  healthMethod?: 'GET' | 'POST';
  healthBody?: object;
  healthAuthHeader?: (key: string) => string; // How to pass the API key
  baseUrl: string;
  isFree?: boolean;               // Keyless/free tier
  defaultPriority: number;        // Higher = preferred (0-100)
  models?: string[];              // Supported model identifiers
}

export const PROVIDER_REGISTRY: ProviderConfig[] = [
  // ── LLM Providers ──────────────────────────────────────────────────────────
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'llm',
    healthEndpoint: 'https://api.openai.com/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.openai.com/v1',
    defaultPriority: 90,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'llm',
    healthEndpoint: 'https://api.anthropic.com/v1/models',
    healthAuthHeader: (k) => ``,  // Uses x-api-key header
    baseUrl: 'https://api.anthropic.com/v1',
    defaultPriority: 88,
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'llm',
    healthEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    healthAuthHeader: (k) => ``,  // Uses ?key= param
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultPriority: 85,
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'llm',
    healthEndpoint: 'https://openrouter.ai/api/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultPriority: 80,
    models: ['meta-llama/llama-3.3-70b-instruct', 'mistralai/mistral-large', 'google/gemini-flash-1.5'],
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Fast)',
    category: 'llm',
    healthEndpoint: 'https://api.groq.com/openai/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultPriority: 78,
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    category: 'llm',
    healthEndpoint: 'https://api.x.ai/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.x.ai/v1',
    defaultPriority: 75,
    models: ['grok-2', 'grok-beta'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    category: 'llm',
    healthEndpoint: 'https://api.mistral.ai/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.mistral.ai/v1',
    defaultPriority: 72,
    models: ['mistral-large-latest', 'mistral-small-latest'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    category: 'llm',
    healthEndpoint: 'https://api.deepseek.com/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.deepseek.com/v1',
    defaultPriority: 70,
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    category: 'llm',
    healthEndpoint: 'https://api.cerebras.ai/v1/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultPriority: 68,
    models: ['llama3.3-70b', 'llama3.1-8b'],
  },
  {
    id: 'github_models',
    name: 'GitHub Models',
    category: 'llm',
    healthEndpoint: 'https://models.inference.ai.azure.com/models',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://models.inference.ai.azure.com',
    defaultPriority: 65,
    models: ['gpt-4o', 'Meta-Llama-3.1-70B-Instruct'],
  },
  // Free/Keyless LLM
  {
    id: 'pollinations_text',
    name: 'Pollinations AI (Free)',
    category: 'llm',
    healthEndpoint: 'https://text.pollinations.ai/openai/models',
    baseUrl: 'https://text.pollinations.ai/openai',
    isFree: true,
    defaultPriority: 20,
    models: ['openai', 'mistral', 'claude'],
  },

  // ── Image Providers ────────────────────────────────────────────────────────
  {
    id: 'pexels',
    name: 'Pexels',
    category: 'image',
    healthEndpoint: 'https://api.pexels.com/v1/curated?per_page=1',
    healthAuthHeader: (k) => k, // Authorization: <key>
    baseUrl: 'https://api.pexels.com/v1',
    defaultPriority: 85,
  },
  {
    id: 'pixabay',
    name: 'Pixabay',
    category: 'image',
    healthEndpoint: 'https://pixabay.com/api/?per_page=3&q=nature',
    baseUrl: 'https://pixabay.com/api',
    defaultPriority: 80,
  },
  // Free/Keyless Image
  {
    id: 'pollinations_image',
    name: 'Pollinations Image (Free)',
    category: 'image',
    healthEndpoint: 'https://image.pollinations.ai/prompt/test?width=8&height=8&nologo=true',
    baseUrl: 'https://image.pollinations.ai/prompt',
    isFree: true,
    defaultPriority: 30,
  },
  {
    id: 'unsplash_free',
    name: 'Unsplash (Free)',
    category: 'image',
    healthEndpoint: 'https://source.unsplash.com/random/1x1',
    baseUrl: 'https://source.unsplash.com',
    isFree: true,
    defaultPriority: 25,
  },

  // ── Voice Providers ────────────────────────────────────────────────────────
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'voice',
    healthEndpoint: 'https://api.elevenlabs.io/v1/voices',
    healthAuthHeader: (k) => k, // xi-api-key header
    baseUrl: 'https://api.elevenlabs.io/v1',
    defaultPriority: 90,
  },
  {
    id: 'deepgram',
    name: 'Deepgram',
    category: 'voice',
    healthEndpoint: 'https://api.deepgram.com/v1/projects',
    healthAuthHeader: (k) => `Token ${k}`,
    baseUrl: 'https://api.deepgram.com/v1',
    defaultPriority: 80,
  },
  // Free/Keyless Voice
  {
    id: 'azure_tts_free',
    name: 'Azure TTS (Free Tier)',
    category: 'voice',
    healthEndpoint: 'https://eastus.tts.speech.microsoft.com/cognitiveservices/voices/list',
    baseUrl: 'https://eastus.tts.speech.microsoft.com/cognitiveservices',
    isFree: true,
    defaultPriority: 50,
  },
  {
    id: 'pollinations_tts',
    name: 'Pollinations TTS (Free)',
    category: 'voice',
    healthEndpoint: 'https://text.pollinations.ai/openai/models',
    baseUrl: 'https://text.pollinations.ai/openai',
    isFree: true,
    defaultPriority: 35,
  },

  // ── Music ──────────────────────────────────────────────────────────────────
  {
    id: 'suno',
    name: 'Suno AI Music',
    category: 'music',
    healthEndpoint: 'https://studio-api.prod.suno.com/api/feed/',
    healthAuthHeader: (k) => `Bearer ${k}`,
    baseUrl: 'https://studio-api.prod.suno.com/api',
    defaultPriority: 90,
  },
];

// ─── Health Check Cache ───────────────────────────────────────────────────────

interface HealthStatus {
  providerId: string;
  isHealthy: boolean;
  latencyMs: number;
  checkedAt: number;
  error?: string;
}

const healthCache = new Map<string, HealthStatus>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Health Check Logic ───────────────────────────────────────────────────────

export async function checkProviderHealth(
  providerId: string,
  apiKey?: string,
): Promise<HealthStatus> {
  const cached = healthCache.get(providerId);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached;
  }

  const config = PROVIDER_REGISTRY.find((p) => p.id === providerId);
  if (!config) {
    return { providerId, isHealthy: false, latencyMs: 0, checkedAt: Date.now(), error: 'Unknown provider' };
  }

  const startMs = Date.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ClippedAI/1.0',
    };

    // Build auth headers
    if (apiKey && config.healthAuthHeader) {
      const authVal = config.healthAuthHeader(apiKey);
      if (authVal) {
        if (providerId === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else if (providerId === 'pexels') {
          headers['Authorization'] = apiKey;
        } else if (providerId === 'deepgram') {
          headers['Authorization'] = `Token ${apiKey}`;
        } else if (providerId === 'elevenlabs') {
          headers['xi-api-key'] = apiKey;
        } else {
          headers['Authorization'] = authVal;
        }
      }
    }

    // Build URL — some providers use ?key= param instead of headers
    let url = config.healthEndpoint;
    if (providerId === 'gemini' && apiKey) {
      url += `?key=${apiKey}`;
    } else if (providerId === 'pixabay' && apiKey) {
      url += `&key=${apiKey}`;
    }

    const res = await fetch(url, {
      method: config.healthMethod || 'GET',
      headers,
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    const latencyMs = Date.now() - startMs;
    const isHealthy = res.status < 500;

    const status: HealthStatus = {
      providerId,
      isHealthy,
      latencyMs,
      checkedAt: Date.now(),
      error: isHealthy ? undefined : `HTTP ${res.status}`,
    };
    healthCache.set(providerId, status);
    return status;
  } catch (err: any) {
    const status: HealthStatus = {
      providerId,
      isHealthy: false,
      latencyMs: Date.now() - startMs,
      checkedAt: Date.now(),
      error: err.message || 'Timeout',
    };
    healthCache.set(providerId, status);
    return status;
  }
}

// ─── Smart Router ─────────────────────────────────────────────────────────────

export interface RouterResult {
  providerId: string;
  providerName: string;
  apiKey: string;
  baseUrl: string;
  latencyMs: number;
  isFallback: boolean;
}

/**
 * Get the best available provider for a given category.
 * Checks health in order of priority, returns the first healthy one.
 */
export async function getBestProvider(
  category: 'llm' | 'image' | 'voice' | 'media' | 'video' | 'music',
  preferred?: string,
): Promise<RouterResult | null> {
  // Load all active providers + keys from Supabase
  const { data: settings } = await supabaseAdmin
    .from('settings')
    .select('provider, api_key, is_active, priority')
    .eq('is_active', true);

  const activeKeys = new Map<string, { key: string; priority: number }>();
  for (const row of settings || []) {
    const id = row.provider?.replace(/^api_/, '');
    if (id && row.api_key) {
      activeKeys.set(id, { key: row.api_key, priority: row.priority ?? 0 });
    }
  }

  // Get providers in this category sorted by user priority then default priority
  let candidates = PROVIDER_REGISTRY
    .filter((p) => p.category === category)
    .filter((p) => p.isFree || activeKeys.has(p.id))
    .sort((a, b) => {
      const aPri = (activeKeys.get(a.id)?.priority ?? 0) + a.defaultPriority;
      const bPri = (activeKeys.get(b.id)?.priority ?? 0) + b.defaultPriority;
      return bPri - aPri;
    });

  // Move preferred to front
  if (preferred) {
    candidates = [
      ...candidates.filter((c) => c.id === preferred),
      ...candidates.filter((c) => c.id !== preferred),
    ];
  }

  // Try each in order, return first healthy
  for (const provider of candidates) {
    const key = activeKeys.get(provider.id)?.key || '';
    const health = await checkProviderHealth(provider.id, key);
    if (health.isHealthy) {
      return {
        providerId: provider.id,
        providerName: provider.name,
        apiKey: key,
        baseUrl: provider.baseUrl,
        latencyMs: health.latencyMs,
        isFallback: provider.id !== (preferred || candidates[0]?.id),
      };
    }
  }

  return null; // All offline
}

/**
 * Get health status for all providers in a category (for UI display)
 */
export async function getAllProviderHealth(
  apiKeys: Map<string, string>,
): Promise<Array<ProviderConfig & HealthStatus & { apiKey?: string }>> {
  const results = await Promise.allSettled(
    PROVIDER_REGISTRY.map(async (p) => {
      const key = apiKeys.get(p.id) || '';
      const health = await checkProviderHealth(p.id, key);
      return { ...p, ...health, apiKey: key ? '••••' : undefined };
    }),
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<any>).value);
}
