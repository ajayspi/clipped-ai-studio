import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CUSTOM_CONFIG_STORAGE_KEY = 'clipped_custom_supabase_config';
export const CUSTOM_URL_COOKIE_KEY = 'clipped_custom_supabase_url';
export const CUSTOM_ANON_KEY_COOKIE_KEY = 'clipped_custom_supabase_anon_key';

export interface CustomSupabaseStorageConfig {
  url?: string;
  anonKey?: string;
  customConfigured?: boolean;
  status?: 'connected' | 'default' | 'unreachable' | 'testing';
  lastTested?: string;
  latencyMs?: number | null;
}

const clientCache = new Map<string, SupabaseClient>();

export function getCustomCredentialsFromStorage(): {
  url?: string;
  anonKey?: string;
  isCustom: boolean;
} {
  if (typeof window === 'undefined') {
    return { isCustom: false };
  }

  try {
    const raw = localStorage.getItem(CUSTOM_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed: CustomSupabaseStorageConfig = JSON.parse(raw);
      if (parsed.customConfigured && parsed.url && parsed.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          isCustom: true,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse custom Supabase config from localStorage:', err);
  }

  return { isCustom: false };
}

export function createClient(customUrl?: string, customAnonKey?: string): SupabaseClient {
  const custom = getCustomCredentialsFromStorage();
  const url = (
    customUrl ||
    custom.url ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://agafustlankeieewtvck.supabase.co'
  ).trim();

  const anonKey = (
    customAnonKey ||
    custom.anonKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  const cacheKey = `${url}::${anonKey}`;
  if (!clientCache.has(cacheKey)) {
    const client = createBrowserClient(url, anonKey);
    clientCache.set(cacheKey, client);
  }

  return clientCache.get(cacheKey)!;
}
