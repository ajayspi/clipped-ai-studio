import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/db';
import { getOmniRouteConfig, clearOmniRouteConfigCache } from '@/lib/keys';
import { createLogger } from '@/lib/logger';

const logger = createLogger('settings/keys');

export const dynamic = 'force-dynamic';

function maskKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  if (trimmed.startsWith('sk-')) {
    return `sk-••••••••${trimmed.slice(-4)}`;
  }
  return `••••••••••••${trimmed.slice(-4)}`;
}

function isValidHttpUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Providers the product will accept a key for, and surface in Settings.
 *
 * The LLM ids matter as much as the media ones: `lib/engine/llm.ts` reads Tier-2
 * direct keys straight out of this table, and the app's `settings` rows already
 * hold openai/anthropic/gemini/openrouter/... A key that is not listed here is
 * invisible in the UI and cannot be rotated through the product, even though the
 * cascade is actively using it.
 */
const SUPPORTED_EXTERNAL_PROVIDERS = new Set([
  // LLM / text
  'openai', 'anthropic', 'gemini', 'openrouter', 'grok', 'groq', 'deepseek',
  'mistral', 'cerebras', 'github_models', 'huggingface', 'together', 'cohere',
  'ollama', 'lmstudio',
  // Stock media
  'pexels', 'pixabay', 'coverr', 'fal',
  // Image / video generation
  'aihorde', 'kling', 'luma', 'ideogram', 'bytez',
  // Voice
  'heygen', 'did', 'deepgram', 'elevenlabs', 'google_tts', 'azure_speech',
  // Music
  'suno',
  // Brand Kit
  'brand_kit',
]);

/**
 * Insert or update one provider's key.
 *
 * `settings` has exactly these columns: id, user_id, provider, api_key, is_active,
 * priority, created_at, updated_at. There is no `base_url` and no `name`, so this
 * deliberately takes neither — writing them makes PostgREST reject the whole
 * statement. The OmniRoute endpoint URL is stored in the `api_key` column of the
 * `omniroute_endpoint_url` row instead (see lib/keys.ts getOmniRouteConfig).
 */
async function upsertSettingRow(provider: string, apiKey: string) {
  const dbClient = supabaseAdmin || supabase;
  try {
    const { data: existing } = await dbClient
      .from('settings')
      .select('id')
      .eq('provider', provider)
      .limit(1)
      .maybeSingle();

    const data: Record<string, unknown> = {
      api_key: apiKey,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data: saved, error } = await dbClient
        .from('settings')
        .update(data)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) {
        logger.error('Failed to update provider key', { provider, error: error.message });
        return null;
      }
      return saved;
    }

    const { data: saved, error } = await dbClient
      .from('settings')
      .insert({ provider, ...data })
      .select()
      .single();
    if (error) {
      logger.error('Failed to insert provider key', { provider, error: error.message });
      return null;
    }
    return saved;
  } catch (err) {
    logger.error('Upsert threw', { provider, error: err });
    return null;
  }
}

export async function GET() {
  const config = await getOmniRouteConfig(true);

  const endpointUrl = config.baseUrl;
  const apiKey = config.apiKey;
  const maskedApiKey = maskKey(apiKey);
  const isConfigured = config.isConfigured;
  const source = config.source;

  let updatedAt: string | null = null;
  let isActive = true;
  const externalKeys: Record<string, Record<string, unknown>> = {};

  // `settings` in this project has no `base_url` column. Selecting it makes
  // PostgREST reject the ENTIRE query with a 400, and the empty catch below used
  // to swallow that — so every provider key silently failed to reach the UI and
  // Settings looked empty. Select only columns that exist, and log instead of
  // swallowing. `priority` is included because the LLM cascade orders on it.
  try {
    const dbClient = supabaseAdmin || supabase;
    const { data: rows, error } = await dbClient
      .from('settings')
      .select('provider, api_key, updated_at, is_active, priority')
      .in('provider', Array.from(SUPPORTED_EXTERNAL_PROVIDERS).concat('omniroute'));

    if (error) {
      logger.error('Failed to read provider keys from settings', { error: error.message });
    }

    for (const row of rows || []) {
      if (row.provider !== 'omniroute') {
        externalKeys[row.provider] = {
          maskedApiKey: maskKey(row.api_key || ''),
          isConfigured: Boolean(row.api_key),
          isActive: row.is_active !== false,
          updatedAt: row.updated_at || null,
          priority: (row as { priority?: number | null }).priority ?? null,
        };
        continue;
      }
      if (row.updated_at) updatedAt = row.updated_at;
      if (row.is_active !== undefined && row.is_active !== null) isActive = row.is_active;
    }
  } catch (err) {
    logger.error('settings/keys GET threw while reading provider keys', { error: err });
  }

  return NextResponse.json({
    success: true,
    endpointUrl,
    maskedApiKey,
    isConfigured,
    source,
    omniroute: {
      endpointUrl,
      maskedApiKey,
      isConfigured,
      source,
      isActive,
      updatedAt,
    },
    keys: {
      omniroute: {
        endpointUrl,
        maskedApiKey,
        isConfigured,
        isActive,
        name: 'OmniRoute Gateway',
        category: 'AI Gateway',
        maskedValue: maskedApiKey || '••••••••',
        baseUrl: endpointUrl,
        updatedAt,
        source,
      },
      omniroute_endpoint_url: {
        endpointUrl,
        maskedApiKey: endpointUrl,
        isConfigured: Boolean(endpointUrl),
        isActive: true,
        name: 'OmniRoute Endpoint URL',
        category: 'AI Gateway',
        maskedValue: endpointUrl,
        baseUrl: endpointUrl,
        updatedAt,
        source,
      },
      omniroute_api_key: {
        endpointUrl,
        maskedApiKey,
        isConfigured: Boolean(apiKey),
        isActive: true,
        name: 'OmniRoute API Key',
        category: 'AI Gateway',
        maskedValue: maskedApiKey,
        updatedAt,
        source,
      },
      ...externalKeys,
    },
    customProviders: [],
    availableCategories: ['AI Gateway', 'Stock Media', 'AI Models', 'Voice & Audio', 'Local Workers'],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { provider } = body;

    // Check if provider is a deprecated legacy provider or unsupported
    if (provider && typeof provider === 'string') {
      const cleanP = provider.toLowerCase().trim().replace(/^api_/, '');
      const isOmni = cleanP === 'omniroute' || cleanP === 'omniroute_endpoint_url' || cleanP === 'omniroute_api_key';
      if (!isOmni && !SUPPORTED_EXTERNAL_PROVIDERS.has(cleanP)) {
        return NextResponse.json(
          { error: `Unsupported provider. Use OmniRoute or one of: ${Array.from(SUPPORTED_EXTERNAL_PROVIDERS).join(', ')}` },
          { status: 400 }
        );
      }

    }

    const cleanProvider = typeof provider === 'string'
      ? provider.toLowerCase().trim().replace(/^api_/, '')
      : '';

    if (cleanProvider && SUPPORTED_EXTERNAL_PROVIDERS.has(cleanProvider)) {
      const rawExternalKey = body.apiKey !== undefined ? body.apiKey : body.key;
      if (typeof rawExternalKey !== 'string' || !rawExternalKey.trim()) {
        return NextResponse.json({ error: 'apiKey is required for this provider' }, { status: 400 });
      }

      const savedSetting = await upsertSettingRow(cleanProvider, rawExternalKey.trim());

      return NextResponse.json({
        success: true,
        provider: cleanProvider,
        setting: savedSetting,
        maskedApiKey: maskKey(rawExternalKey.trim()),
        isConfigured: true,
      });
    }

    const rawEndpointUrl = (
      body.endpointUrl ||
      body.baseUrl ||
      body.url ||
      (provider === 'omniroute_endpoint_url' ? body.apiKey : undefined)
    );

    const rawApiKey = (
      body.apiKey !== undefined
        ? body.apiKey
        : (body.key !== undefined ? body.key : undefined)
    );

    if (!rawEndpointUrl || typeof rawEndpointUrl !== 'string' || !isValidHttpUrl(rawEndpointUrl)) {
      return NextResponse.json(
        { error: 'endpointUrl is required and must be a valid URL starting with http:// or https://' },
        { status: 400 }
      );
    }

    const endpointUrl = rawEndpointUrl.trim().replace(/\/+$/, '');
    const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : '';

    // Safely persist credentials
    await upsertSettingRow('omniroute_endpoint_url', endpointUrl);
    if (rawApiKey !== undefined) {
      await upsertSettingRow('omniroute_api_key', apiKey);
    }
    const savedSetting = await upsertSettingRow('omniroute', apiKey);

    // Invalidate in-memory cache
    clearOmniRouteConfigCache();

    return NextResponse.json({
      success: true,
      setting: savedSetting,
      omniroute: {
        endpointUrl,
        maskedApiKey: maskKey(apiKey),
        isConfigured: true,
      },
    });
  } catch (error) {
    logger.error('Failed to update provider settings', { error });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
