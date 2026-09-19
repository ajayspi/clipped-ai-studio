import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
const defaultSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTIxMjksImV4cCI6MjEwMzY4ODEyOX0.Wt6whskptxFUlwAmrtIchFSIPWiDAl0DbVEiC1uvCqc';
const defaultSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA';

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
