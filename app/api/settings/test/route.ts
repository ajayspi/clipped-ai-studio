import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleTest();
}

export async function POST() {
  return handleTest();
}

async function handleTest() {
  const env = process.env;

  const keyMap: Record<string, string | undefined> = {
    openrouter: env.OPENROUTER_API_KEY,
    gemini: env.GEMINI_API_KEY,
    groq: env.GROQ_API_KEY,
    cerebras: env.CEREBRAS_API_KEY,
    github: env.GITHUB_TOKEN,
    mistral: env.MISTRAL_API_KEY,
    claude: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    deepseek: env.DEEPSEEK_API_KEY,
    grok: env.GROK_API_KEY,
    azure: env.AZURE_SPEECH_KEY,
    google_tts: env.GOOGLE_TTS_KEY,
    remote_tts: env.REMOTE_TTS_URL,
    deepgram: env.DEEPGRAM_API_KEY,
    sarvam: env.SARVAM_API_KEY,
    elevenlabs: env.ELEVENLABS_API_KEY,
    pexels: env.PEXELS_API_KEY,
    pixabay: env.PIXABAY_API_KEY,
    coverr: env.COVERR_API_KEY,
    comfy: env.COMFYUI_URL,
    kling: env.KLING_API_KEY,
    luma: env.LUMA_API_KEY,
    fal: env.FAL_API_KEY,
    runway: env.RUNWAY_API_KEY,
    youtube: env.YOUTUBE_API_KEY || env.YOUTUBE_CLIENT_ID,
    tiktok: env.TIKTOK_API_KEY,
    instagram: env.INSTAGRAM_ACCESS_TOKEN,
  };

  const results: Record<string, { status: "ready" | "not set"; maskedKey: string | null }> = {};
  let workingCount = 0;
  let notSetCount = 0;

  for (const [providerId, rawKey] of Object.entries(keyMap)) {
    const key = rawKey?.trim();
    const isConfigured = Boolean(key && key.length > 5 && !key.includes("dummy") && !key.includes("mock"));

    if (isConfigured && key) {
      results[providerId] = {
        status: "ready",
        maskedKey: key.slice(-4),
      };
      workingCount++;
    } else {
      results[providerId] = {
        status: "not set",
        maskedKey: null,
      };
      notSetCount++;
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      working: workingCount,
      failing: 0,
      notSet: notSetCount,
      total: Object.keys(keyMap).length,
    },
    providers: results,
  });
}
