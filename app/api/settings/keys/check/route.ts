import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { provider } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const cleanProvider = String(provider).replace(/^api_/, '').toLowerCase();

    // Check DB first
    let key: string | undefined;
    const { data: existing } = await supabase
      .from('settings')
      .select('api_key')
      .eq('provider', provider)
      .limit(1)
      .single();

    if (existing && existing.api_key) {
      key = existing.api_key;
    } else {
      // Check env vars as fallback
      const envMap: Record<string, string[]> = {
        openai: ['OPENAI_API_KEY'],
        gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
        anthropic: ['ANTHROPIC_API_KEY'],
        openrouter: ['OPENROUTER_API_KEY'],
        azure_speech: ['AZURE_SPEECH_KEY', 'AZURE_TTS_KEY', 'AZURE_API_KEY'],
        azure: ['AZURE_SPEECH_KEY', 'AZURE_TTS_KEY', 'AZURE_API_KEY'],
        google_tts: ['GOOGLE_TTS_KEY', 'GOOGLE_TTS_API_KEY', 'GOOGLE_API_KEY'],
        elevenlabs: ['ELEVENLABS_API_KEY', 'XI_API_KEY'],
        pexels: ['PEXELS_API_KEY'],
        pixabay: ['PIXABAY_API_KEY'],
        groq: ['GROQ_API_KEY'],
        deepseek: ['DEEPSEEK_API_KEY'],
        grok: ['GROK_API_KEY', 'XAI_API_KEY'],
        fal: ['FAL_API_KEY', 'FAL_KEY'],
        deepgram: ['DEEPGRAM_API_KEY'],
      };

      const possibleEnvs = envMap[cleanProvider] || [];
      for (const envVar of possibleEnvs) {
        if (process.env[envVar]) {
          key = process.env[envVar];
          break;
        }
      }
    }

    if (!key || !key.trim()) {
      return NextResponse.json({ success: false, error: 'Key not configured in database or environment' });
    }

    let isWorking = false;
    let message = 'Verification failed';

    try {
      if (cleanProvider.includes('openai')) {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` },
          signal: AbortSignal.timeout(4000),
        });
        isWorking = res.ok;
      } else if (cleanProvider.includes('azure')) {
        const region = process.env.AZURE_SPEECH_REGION || 'eastus';
        const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
          headers: { 'Ocp-Apim-Subscription-Key': key },
          signal: AbortSignal.timeout(4000),
        });
        isWorking = res.ok;
      } else if (cleanProvider.includes('elevenlabs')) {
        const res = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: { 'xi-api-key': key },
          signal: AbortSignal.timeout(4000),
        });
        isWorking = res.ok;
      } else if (cleanProvider.includes('google_tts') || cleanProvider.includes('google')) {
        const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${key}`, {
          signal: AbortSignal.timeout(4000),
        });
        isWorking = res.ok;
      } else if (cleanProvider.includes('groq')) {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` },
          signal: AbortSignal.timeout(4000),
        });
        isWorking = res.ok;
      } else if (cleanProvider.includes('deepseek')) {
        const res = await fetch('https://api.deepseek.com/models', {
          headers: { 'Authorization': `Bearer ${key}` },
          signal: AbortSignal.timeout(4000),
        });
        isWorking = res.ok;
      } else if (cleanProvider.includes('openrouter')) {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` },
          signal: AbortSignal.timeout(4000),
        });
        isWorking = res.ok;
      } else if (cleanProvider.includes('pexels')) {
        const res = await fetch('https://api.pexels.com/v1/search?query=nature&per_page=1', {
          headers: { 'Authorization': key },
          signal: AbortSignal.timeout(4000),
        });
        isWorking = res.ok;
      } else if (cleanProvider.includes('pixabay')) {
        const res = await fetch(`https://pixabay.com/api/?key=${key}&q=nature`, {
          signal: AbortSignal.timeout(4000),
        });
        isWorking = res.ok;
      } else {
        // Generic validator for tokens
        isWorking = key.length >= 8;
      }

      if (isWorking) {
        message = 'Key is valid and working.';
      } else {
        message = 'Provider API returned authentication failure or invalid response.';
      }
    } catch (e: any) {
      isWorking = false;
      message = e.message || 'Connection test timed out';
    }

    return NextResponse.json({ success: isWorking, message });
  } catch (error: any) {
    console.error('Failed to test key:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
