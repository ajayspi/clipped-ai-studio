import { supabase, supabaseAdmin } from '@/lib/db';

export interface OmniRouteConfig {
  baseUrl: string; // e.g. "http://localhost:20128" or "https://openrouter.ai/api"
  apiKey: string;  // e.g. "sk-..."
  isConfigured: boolean;
  source: 'database' | 'environment' | 'default';
  endpointUrl?: string; // alias for baseUrl
}

let cachedConfig: OmniRouteConfig | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 20_000; // 20 seconds TTL

export function clearOmniRouteConfigCache(): void {
  cachedConfig = null;
  cacheExpiresAt = 0;
}

export async function getOmniRouteConfig(bypassCache = false): Promise<OmniRouteConfig> {
  const now = Date.now();
  if (!bypassCache && cachedConfig && now < cacheExpiresAt) {
    return cachedConfig;
  }

  const dbClient = supabaseAdmin || supabase;

  let dbEndpointUrl: string | undefined;
  let dbApiKey: string | undefined;
  let foundInDb = false;

  try {
    const { data: rows, error } = await dbClient
      .from('settings')
      .select('provider, api_key, is_active, base_url')
      .in('provider', ['omniroute', 'omniroute_endpoint_url', 'omniroute_url', 'omniroute_api_key']);

    if (!error && Array.isArray(rows) && rows.length > 0) {
      for (const row of rows) {
        if (row.is_active === false) continue;
        const p = String(row.provider || '').toLowerCase().trim();
        if (p === 'omniroute') {
          if (row.api_key && String(row.api_key).trim().length > 0) {
            dbApiKey = String(row.api_key).trim();
            foundInDb = true;
          }
          if ((row as any).base_url && String((row as any).base_url).trim().length > 0) {
            dbEndpointUrl = String((row as any).base_url).trim();
            foundInDb = true;
          }
        } else if (p === 'omniroute_endpoint_url' || p === 'omniroute_url') {
          if (row.api_key && String(row.api_key).trim().length > 0) {
            dbEndpointUrl = String(row.api_key).trim();
            foundInDb = true;
          }
        } else if (p === 'omniroute_api_key') {
          if (row.api_key && String(row.api_key).trim().length > 0) {
            dbApiKey = String(row.api_key).trim();
            foundInDb = true;
          }
        }
      }
    }
  } catch (err) {
    // Column base_url might not exist in schema, fallback to selecting basic columns
    try {
      const { data: rows, error } = await dbClient
        .from('settings')
        .select('provider, api_key, is_active')
        .in('provider', ['omniroute', 'omniroute_endpoint_url', 'omniroute_url', 'omniroute_api_key']);

      if (!error && Array.isArray(rows) && rows.length > 0) {
        for (const row of rows) {
          if (row.is_active === false) continue;
          const p = String(row.provider || '').toLowerCase().trim();
          if (p === 'omniroute' || p === 'omniroute_api_key') {
            if (row.api_key && String(row.api_key).trim().length > 0) {
              dbApiKey = String(row.api_key).trim();
              foundInDb = true;
            }
          } else if (p === 'omniroute_endpoint_url' || p === 'omniroute_url') {
            if (row.api_key && String(row.api_key).trim().length > 0) {
              dbEndpointUrl = String(row.api_key).trim();
              foundInDb = true;
            }
          }
        }
      }
    } catch (errFallback) {
      // Database query failed (e.g. offline or no tables yet)
    }
  }

  const envUrl = (
    process.env.OMNIROUTE_URL ||
    process.env.OMNIROUTE_ENDPOINT_URL ||
    process.env.OMNIROUTE_BASE_URL
  )?.trim();

  const envApiKey = (
    process.env.OMNIROUTE_API_KEY ||
    process.env.OMNIROUTE_KEY
  )?.trim();

  const DEFAULT_URL = 'http://localhost:20128';

  let baseUrl: string;
  let apiKey: string;
  let isConfigured: boolean;
  let source: 'database' | 'environment' | 'default';

  if (foundInDb && (dbEndpointUrl || dbApiKey)) {
    baseUrl = dbEndpointUrl || envUrl || DEFAULT_URL;
    apiKey = dbApiKey || envApiKey || '';
    isConfigured = true;
    source = 'database';
  } else if (envUrl || envApiKey) {
    baseUrl = envUrl || DEFAULT_URL;
    apiKey = envApiKey || '';
    isConfigured = true;
    source = 'environment';
  } else {
    baseUrl = DEFAULT_URL;
    apiKey = '';
    isConfigured = false;
    source = 'default';
  }

  baseUrl = baseUrl.replace(/\/+$/, '');

  const resolved: OmniRouteConfig = {
    baseUrl,
    endpointUrl: baseUrl,
    apiKey,
    isConfigured,
    source,
  };

  cachedConfig = resolved;
  cacheExpiresAt = now + CACHE_TTL_MS;

  return resolved;
}

export async function getApiKey(provider: string, envVarName?: string): Promise<string | undefined> {
  const cleanP = (provider || '').toLowerCase().trim();

  if (cleanP === 'omniroute' || cleanP === 'omniroute_api_key') {
    const config = await getOmniRouteConfig();
    return config.apiKey || undefined;
  }
  if (cleanP === 'omniroute_endpoint_url' || cleanP === 'omniroute_url') {
    const config = await getOmniRouteConfig();
    return config.baseUrl || undefined;
  }

  // First check env var if provided
  if (envVarName && process.env[envVarName]) {
    return process.env[envVarName];
  }

  const dbClient = supabaseAdmin || supabase;

  try {
    const { data: keyData } = await dbClient
      .from('settings')
      .select('api_key')
      .eq('provider', provider)
      .is('user_id', null)
      .single();

    if (keyData?.api_key) {
      return keyData.api_key;
    }
  } catch (err) {}

  try {
    const { data: keyData } = await dbClient
      .from('settings')
      .select('api_key')
      .eq('provider', provider)
      .single();

    if (keyData?.api_key) {
      return keyData.api_key;
    }
  } catch (err) {}

  return undefined;
}
