import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { CUSTOM_URL_COOKIE_KEY, CUSTOM_ANON_KEY_COOKIE_KEY } from './client';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const customUrl = request.cookies.get(CUSTOM_URL_COOKIE_KEY)?.value;
  const customAnonKey = request.cookies.get(CUSTOM_ANON_KEY_COOKIE_KEY)?.value;

  const url = (
    customUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://agafustlankeieewtvck.supabase.co'
  ).trim();

  const anonKey = (
    customAnonKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    // This will refresh session if expired
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protect routes
    const isAuthRoute =
      request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register');
    const isProtectedRoute =
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/create') ||
      request.nextUrl.pathname.startsWith('/planner') ||
      request.nextUrl.pathname.startsWith('/library') ||
      request.nextUrl.pathname.startsWith('/settings');

    if (!user && isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isAuthRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
  } catch (err) {
    console.warn('Middleware auth error:', err);
  }

  return supabaseResponse;
}
