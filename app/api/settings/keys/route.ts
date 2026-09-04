import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/db';
import { getOmniRouteConfig, clearOmniRouteConfigCache } from '@/lib/keys';

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

const LEGACY_PROVIDERS = new Set([
  'openai', 'gemini', 'anthropic', 'openrouter', 'fal', 'grok', 'groq',
  'deepseek', 'mistral', 'cerebras', 'github_models', 'ollama',
  'pexels', 'pixabay', 'kling', 'luma', 'huggingface',
  'azure', 'azure_speech', 'azure_region', 'elevenlabs', 'google_tts',
  'deepgram', 'suno', 'heygen', 'did'
]);

async function upsertSettingRow(provider: string, apiKey: string, baseUrl?: string, name?: string) {
  const dbClient = supabaseAdmin || supabase;
  try {
    const { data: existing } = await dbClient
      .from('settings')
      .select('id')
      .eq('provider', provider)
      .limit(1)
      .maybeSingle();

    const fullData: Record<string, any> = {
      provider,
      api_key: apiKey,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    if (baseUrl) fullData.base_url = baseUrl;
    if (name) fullData.name = name;

    if (existing?.id) {
      const { data, error } = await dbClient
        .from('settings')
        .update(fullData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        // Fallback without extra columns if not present in schema
        const { data: fallbackData } = await dbClient
          .from('settings')
          .update({
            api_key: apiKey,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        return fallbackData;
      }
      return data;
    } else {
      const { data, error } = await dbClient
        .from('settings')
        .insert(fullData)
        .select()
        .single();

      if (error) {
        // Fallback without extra columns
        const { data: fallbackData } = await dbClient
          .from('settings')
          .insert({
            provider,
            api_key: apiKey,
            is_active: true,
          })
          .select()
          .single();
        return fallbackData;
      }
      return data;
    }
  } catch (err) {
    console.warn(`[API Keys POST] Upsert exception for ${provider}:`, err);
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

  try {
    const dbClient = supabaseAdmin || supabase;
    const { data: row } = await dbClient
      .from('settings')
      .select('updated_at, is_active')
      .eq('provider', 'omniroute')
      .limit(1)
      .maybeSingle();

    if (row) {
      if (row.updated_at) updatedAt = row.updated_at;
      if (row.is_active !== undefined && row.is_active !== null) isActive = row.is_active;
    }
  } catch {}

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
    },
    customProviders: [],
    availableCategories: ['AI Gateway'],
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
      if (!isOmni || LEGACY_PROVIDERS.has(cleanP)) {
        return NextResponse.json(
          { error: 'Individual AI providers are deprecated. Only OmniRoute configuration is supported.' },
          { status: 400 }
        );
      }
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
    await upsertSettingRow('omniroute_endpoint_url', endpointUrl, endpointUrl, 'OmniRoute Endpoint URL');
    if (rawApiKey !== undefined) {
      await upsertSettingRow('omniroute_api_key', apiKey, undefined, 'OmniRoute API Key');
    }
    const savedSetting = await upsertSettingRow('omniroute', apiKey, endpointUrl, 'OmniRoute Gateway');

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
  } catch (error: any) {
    console.error('Failed to update OmniRoute settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
