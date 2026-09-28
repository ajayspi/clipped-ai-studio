import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbneetfubybzleuwhbnx.supabase.co';
const defaultSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibmVldGZ1YnliemxldXdoYm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDk0NzAsImV4cCI6MjEwMjkyNTQ3MH0.ecQ1lDbSkxJDUOZoAgS3kPSf5Qw6tidesSJ4HmirYGg';
const defaultSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibmVldGZ1YnliemxldXdoYm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzM0OTQ3MCwiZXhwIjoyMTAyOTI1NDcwfQ.w5J5ybitjIhPZpWt6OEPuyUm0iqSCk8qtesryC-sRBo';

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
