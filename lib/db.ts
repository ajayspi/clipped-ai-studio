import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbneetfubybzleuwhbnx.supabase.co';
const defaultSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';
const defaultSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || defaultSupabaseAnonKey;

export const supabase = createClient(defaultSupabaseUrl, defaultSupabaseAnonKey);

export const supabaseAdmin = createClient(defaultSupabaseUrl, defaultSupabaseServiceKey || defaultSupabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export function getSupabase(customUrl?: string, customKey?: string): SupabaseClient {
  const url = customUrl || defaultSupabaseUrl;
  const key = customKey || defaultSupabaseAnonKey;
  return createClient(url, key);
}

export function getSupabaseAdmin(customUrl?: string, customServiceKey?: string): SupabaseClient {
  const url = customUrl || defaultSupabaseUrl;
  const key = customServiceKey || defaultSupabaseServiceKey || defaultSupabaseAnonKey;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
