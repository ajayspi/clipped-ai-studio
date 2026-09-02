import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CUSTOM_URL_COOKIE_KEY, CUSTOM_ANON_KEY_COOKIE_KEY } from './client';

export async function createClient(customUrl?: string, customAnonKey?: string) {
  const cookieStore = await cookies();

  const cookieUrl = cookieStore.get(CUSTOM_URL_COOKIE_KEY)?.value;
  const cookieAnonKey = cookieStore.get(CUSTOM_ANON_KEY_COOKIE_KEY)?.value;

  const url = (
    customUrl ||
    cookieUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://agafustlankeieewtvck.supabase.co'
  ).trim();

  const anonKey = (
    customAnonKey ||
    cookieAnonKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
