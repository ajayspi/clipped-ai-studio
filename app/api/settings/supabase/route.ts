import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CUSTOM_URL_COOKIE_KEY, CUSTOM_ANON_KEY_COOKIE_KEY } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const customUrl = cookieStore.get(CUSTOM_URL_COOKIE_KEY)?.value;
  const customAnonKey = cookieStore.get(CUSTOM_ANON_KEY_COOKIE_KEY)?.value;

  const defaultUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agafustlankeieewtvck.supabase.co';
  const defaultAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const isCustom = Boolean(customUrl && customAnonKey);
  const activeUrl = (customUrl || defaultUrl).trim();
  const activeAnonKey = (customAnonKey || defaultAnonKey).trim();

  const maskedKey = activeAnonKey && activeAnonKey.length > 8
    ? `••••••••••••${activeAnonKey.slice(-4)}`
    : activeAnonKey ? '••••' : 'Not configured';

  return NextResponse.json({
    success: true,
    isCustom,
    url: activeUrl,
    maskedAnonKey: maskedKey,
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    defaultConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });
}

export async function POST(request: Request) {
  // Delegate or forward to the test connection handler
  try {
    const body = await request.json().catch(() => ({}));
    const testUrl = new URL('/api/settings/supabase/test', request.url);
    
    const response = await fetch(testUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
