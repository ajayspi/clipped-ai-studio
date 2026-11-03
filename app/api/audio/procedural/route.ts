import { NextResponse } from 'next/server';
import { PROCEDURAL_SFX_CATALOG } from '@/lib/engine/2d-studio';
import {
  generateProceduralSfx,
  generateProceduralMusic,
} from '@/lib/engine/2d-studio/procedural-audio-server';

export async function GET() {
  return NextResponse.json({
    success: true,
    catalog: PROCEDURAL_SFX_CATALOG,
    musicMoods: ['ambient', 'mystery', 'lofi', 'dramatic', 'chill'],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type = 'sfx', name = 'whoosh', mood = 'ambient', dur, gainDb, seed, format = 'wav' } = body;

    let wavBuffer: Buffer;

    if (type === 'music') {
      wavBuffer = await generateProceduralMusic({
        mood,
        dur: dur || 8,
        gainDb,
      });
    } else {
      wavBuffer = await generateProceduralSfx({
        name,
        dur,
        gainDb,
        seed,
      });
    }

    if (format === 'binary') {
      return new Response(wavBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Disposition': `inline; filename="${name || 'audio'}.wav"`,
        },
      });
    }

    const base64 = wavBuffer.toString('base64');
    const dataUrl = `data:audio/wav;base64,${base64}`;

    return NextResponse.json({
      success: true,
      type,
      name: type === 'music' ? mood : name,
      duration: dur,
      audioBase64: base64,
      audioUrl: dataUrl,
    });
  } catch (error) {
    console.error('[API Procedural Audio] Error generating audio:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Audio synthesis failed' },
      { status: 500 }
    );
  }
}
