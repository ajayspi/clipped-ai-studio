import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const PROVIDER_ENV_MAP: Record<string, { envVars: string[]; category: string }> = {
  gemini: { envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_KEY'], category: 'AI Models' },
  openai: { envVars: ['OPENAI_API_KEY'], category: 'AI Models' },
  anthropic: { envVars: ['ANTHROPIC_API_KEY'], category: 'AI Models' },
  openrouter: { envVars: ['OPENROUTER_API_KEY'], category: 'AI Models' },
  pexels: { envVars: ['PEXELS_API_KEY'], category: 'Stock Media' },
  pixabay: { envVars: ['PIXABAY_API_KEY'], category: 'Stock Media' },
  fal: { envVars: ['FAL_API_KEY', 'FAL_KEY'], category: 'AI Models' },
  kling: { envVars: ['KLING_API_KEY'], category: 'Stock Media' },
  luma: { envVars: ['LUMA_API_KEY'], category: 'Stock Media' },
  elevenlabs: { envVars: ['ELEVENLABS_API_KEY', 'XI_API_KEY'], category: 'Voice & Audio' },
  heygen: { envVars: ['HEYGEN_API_KEY'], category: 'Avatar' },
  did: { envVars: ['DID_API_KEY', 'D_ID_API_KEY'], category: 'Avatar' },
  deepgram: { envVars: ['DEEPGRAM_API_KEY'], category: 'Voice & Audio' },
  huggingface: { envVars: ['HUGGINGFACE_API_KEY', 'HF_TOKEN'], category: 'Stock Media' },
};

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `••••••••••••${key.slice(-4)}`;
}

export async function GET() {
  const result: Record<string, {
    isConfigured: boolean;
    isActive: boolean;
    maskedValue: string;
    updatedAt: string | null;
    source: 'database' | 'env' | 'none';
  }> = {};

  // 1. Seed with known providers from environment variables
  for (const [provider, config] of Object.entries(PROVIDER_ENV_MAP)) {
    let envKey: string | undefined;
    for (const envVar of config.envVars) {
      if (process.env[envVar]) {
        envKey = process.env[envVar];
        break;
      }
    }

    const hasEnv = Boolean(envKey && envKey.trim().length > 0);
    const entry = {
      isConfigured: hasEnv,
      isActive: hasEnv,
      maskedValue: hasEnv ? maskKey(envKey!) : '',
      updatedAt: hasEnv ? new Date().toISOString() : null,
      source: hasEnv ? ('env' as const) : ('none' as const),
    };

    result[provider] = entry;
    result[`api_${provider}`] = entry; // Provide alias compatibility
  }

  // 2. Query Supabase database and merge/override
  try {
    const { data: dbKeys, error } = await supabase
      .from('settings')
      .select('provider, api_key, is_active, updated_at');

    if (!error && Array.isArray(dbKeys)) {
      for (const row of dbKeys) {
        if (!row.provider) continue;
        const cleanName = row.provider.replace(/^api_/, '');
        const hasKey = Boolean(row.api_key && row.api_key.trim().length > 0);

        // If DB has a configured key, use DB entry; otherwise preserve env key if present
        if (hasKey || !result[cleanName]?.isConfigured) {
          const dbEntry = {
            isConfigured: hasKey,
            isActive: row.is_active ?? hasKey,
            maskedValue: hasKey ? maskKey(row.api_key) : '',
            updatedAt: row.updated_at || new Date().toISOString(),
            source: (hasKey ? 'database' : (result[cleanName]?.source || 'none')) as 'database' | 'env' | 'none',
          };

          result[cleanName] = dbEntry;
          result[`api_${cleanName}`] = dbEntry;
          result[row.provider] = dbEntry;
        }
      }
    }
  } catch (dbErr) {
    console.warn('[API Keys GET] Supabase query notice (falling back to env vars):', dbErr);
  }

  return NextResponse.json({ keys: result });
}

export async function POST(req: Request) {
  try {
    const { provider, apiKey, isActive } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('provider', provider)
      .limit(1)
      .single();

    let result;
    if (existing) {
      // Update
      const updateData: any = {};
      if (apiKey !== undefined && apiKey !== '') updateData.api_key = apiKey;
      if (isActive !== undefined) updateData.is_active = isActive;
      
      const { data, error } = await supabase
        .from('settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('settings')
        .insert({
          provider,
          api_key: apiKey || '',
          is_active: isActive !== undefined ? isActive : true
        })
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, setting: result });
  } catch (error: any) {
    console.error('Failed to update key:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
