import { NextResponse } from 'next/server';
import { geminiCharacterGenerator } from '@/lib/ai/gemini-character-generator';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { archetype, customDescription, style, mock } = body;

    const sheet = await geminiCharacterGenerator.generateCharacterSheet({
      archetype,
      customDescription,
      style,
      mock: mock ?? false,
    });

    return NextResponse.json({
      success: true,
      characterId: sheet.characterId,
      archetype: sheet.archetype,
      sheetImageUrl: sheet.sheetImageUrl,
      poses: sheet.poses,
      style: sheet.style,
      customDescription: sheet.customDescription,
      createdAt: sheet.createdAt,
    });
  } catch (error: any) {
    console.error('[API Whiteboard Character-Sheet] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate character reference sheet',
      },
      { status: 500 }
    );
  }
}
