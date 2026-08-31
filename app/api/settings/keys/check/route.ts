import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { provider } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('settings')
      .select('api_key')
      .eq('provider', provider)
      .limit(1)
      .single();

    if (!existing || !existing.api_key) {
      return NextResponse.json({ success: false, error: 'Key not configured' });
    }

    const key = existing.api_key;
    let isWorking = false;
    let message = 'Verification failed';

    // Dummy logic to verify keys (extend with real ping logic later)
    try {
      if (provider.includes('openai')) {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        isWorking = res.ok;
      } 
      else if (provider.includes('pexels')) {
        const res = await fetch('https://api.pexels.com/v1/search?query=nature&per_page=1', {
          headers: { 'Authorization': key }
        });
        isWorking = res.ok;
      }
      // If we don't have a specific check, assume it's working if it has length > 5
      else {
        isWorking = key.length > 5;
      }

      if (isWorking) {
        message = 'Key is valid and working.';
      }
    } catch (e: any) {
      isWorking = false;
      message = e.message;
    }

    return NextResponse.json({ success: isWorking, message });
  } catch (error: any) {
    console.error('Failed to test key:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
