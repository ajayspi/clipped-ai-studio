import { NextResponse } from 'next/server';
import { ttsEngine, TTSVoiceOption, TTSProvider } from '@/lib/engine/tts';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language') || undefined;
    const provider = searchParams.get('provider') || undefined;

    const voices = ttsEngine.getAvailableVoices(language, provider);

    // Group voices by provider
    const grouped: Record<string, TTSVoiceOption[]> = {
      azure: [],
      openai: [],
      elevenlabs: [],
      google: [],
      keyless: [],
    };

    voices.forEach((v) => {
      const p = v.provider;
      if (!grouped[p]) {
        grouped[p] = [];
      }
      grouped[p].push(v);
    });

    return NextResponse.json({
      success: true,
      totalCount: voices.length,
      voices,
      grouped,
      supportedProviders: ['azure', 'openai', 'elevenlabs', 'google', 'keyless'],
      supportedLanguages: ['en-US', 'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN'],
    });
  } catch (error: any) {
    console.error('[TTS Voices API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}
