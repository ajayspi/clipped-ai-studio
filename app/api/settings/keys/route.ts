import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/db';

export interface ProviderConfig {
  envVars: string[];
  category: string;
  name: string;
  defaultBaseUrl?: string;
}

export const PROVIDER_ENV_MAP: Record<string, ProviderConfig> = {
  // AI Models
  gemini: { envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_KEY'], category: 'AI Models', name: 'Google Gemini' },
  openai: { envVars: ['OPENAI_API_KEY'], category: 'AI Models', name: 'OpenAI' },
  anthropic: { envVars: ['ANTHROPIC_API_KEY'], category: 'AI Models', name: 'Anthropic Claude' },
  openrouter: { envVars: ['OPENROUTER_API_KEY'], category: 'AI Models', name: 'OpenRouter' },
  fal: { envVars: ['FAL_API_KEY', 'FAL_KEY'], category: 'AI Models', name: 'Fal.ai' },
  grok: { envVars: ['GROK_API_KEY', 'XAI_API_KEY'], category: 'AI Models', name: 'xAI Grok' },
  groq: { envVars: ['GROQ_API_KEY'], category: 'AI Models', name: 'Groq Cloud' },
  deepseek: { envVars: ['DEEPSEEK_API_KEY'], category: 'AI Models', name: 'DeepSeek' },
  mistral: { envVars: ['MISTRAL_API_KEY'], category: 'AI Models', name: 'Mistral AI' },
  cerebras: { envVars: ['CEREBRAS_API_KEY'], category: 'AI Models', name: 'Cerebras' },
  github_models: { envVars: ['GITHUB_MODELS_KEY', 'GITHUB_TOKEN'], category: 'AI Models', name: 'GitHub Models' },
  ollama: { envVars: ['OLLAMA_BASE_URL', 'OLLAMA_URL'], category: 'AI Models', name: 'Ollama (Local LLM)', defaultBaseUrl: 'http://localhost:11434' },

  // Stock Media & Video
  pexels: { envVars: ['PEXELS_API_KEY'], category: 'Stock Media', name: 'Pexels' },
  pixabay: { envVars: ['PIXABAY_API_KEY'], category: 'Stock Media', name: 'Pixabay' },
  kling: { envVars: ['KLING_API_KEY'], category: 'Stock Media', name: 'Kling Video' },
  luma: { envVars: ['LUMA_API_KEY'], category: 'Stock Media', name: 'Luma Dream Machine' },
  huggingface: { envVars: ['HUGGINGFACE_API_KEY', 'HF_TOKEN'], category: 'Stock Media', name: 'Hugging Face' },

  // Voice & Audio
  azure_speech: { envVars: ['AZURE_SPEECH_KEY', 'AZURE_TTS_KEY', 'AZURE_API_KEY'], category: 'Voice & Audio', name: 'Azure Speech Services' },
  azure_region: { envVars: ['AZURE_SPEECH_REGION', 'AZURE_REGION'], category: 'Voice & Audio', name: 'Azure Speech Region' },
  elevenlabs: { envVars: ['ELEVENLABS_API_KEY', 'XI_API_KEY'], category: 'Voice & Audio', name: 'ElevenLabs' },
  google_tts: { envVars: ['GOOGLE_TTS_KEY', 'GOOGLE_TTS_API_KEY', 'GOOGLE_API_KEY'], category: 'Voice & Audio', name: 'Google Cloud TTS' },
  deepgram: { envVars: ['DEEPGRAM_API_KEY'], category: 'Voice & Audio', name: 'Deepgram' },
  suno: { envVars: ['SUNO_API_KEY'], category: 'Voice & Audio', name: 'Suno Audio' },

  // Avatar
  heygen: { envVars: ['HEYGEN_API_KEY'], category: 'Avatar', name: 'HeyGen' },
  did: { envVars: ['DID_API_KEY', 'D_ID_API_KEY'], category: 'Avatar', name: 'D-ID' },
};

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `••••••••••••${key.slice(-4)}`;
}

export async function GET() {
  const result: Record<string, {
    name?: string;
    category?: string;
    isConfigured: boolean;
    isActive: boolean;
    maskedValue: string;
    updatedAt: string | null;
    source: 'database' | 'env' | 'none';
    isCustom?: boolean;
    baseUrl?: string;
  }> = {};

  const customProviders: Array<{
    id: string;
    name: string;
    category: string;
    isConfigured: boolean;
    isActive: boolean;
    maskedValue: string;
    updatedAt: string | null;
  }> = [];

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
      name: config.name,
      category: config.category,
      isConfigured: hasEnv,
      isActive: hasEnv,
      maskedValue: hasEnv ? maskKey(envKey!) : '',
      updatedAt: hasEnv ? new Date().toISOString() : null,
      source: hasEnv ? ('env' as const) : ('none' as const),
      isCustom: false,
    };

    result[provider] = entry;
    result[`api_${provider}`] = entry; // Provide alias compatibility
  }

  // 2. Query Supabase database and merge/override known & dynamically load custom providers
  try {
    const { data: dbKeys, error } = await supabaseAdmin
      .from('settings')
      .select('*');

    if (!error && Array.isArray(dbKeys)) {
      for (const row of dbKeys) {
        if (!row.provider) continue;
        const rawProvider = String(row.provider);
        const cleanName = rawProvider.replace(/^api_/, '');
        const hasKey = Boolean(row.api_key && String(row.api_key).trim().length > 0);
        const isKnown = Boolean(PROVIDER_ENV_MAP[cleanName] || PROVIDER_ENV_MAP[rawProvider]);

        // Determine category & display name
        const knownConfig = PROVIDER_ENV_MAP[cleanName] || PROVIDER_ENV_MAP[rawProvider];
        const category = row.category || knownConfig?.category || 'AI Models';
        const name = row.name || knownConfig?.name || (cleanName.charAt(0).toUpperCase() + cleanName.slice(1));

        const dbEntry = {
          name,
          category,
          isConfigured: hasKey,
          isActive: row.is_active ?? hasKey,
          maskedValue: hasKey ? maskKey(row.api_key) : '',
          updatedAt: row.updated_at || new Date().toISOString(),
          source: (hasKey ? 'database' : (result[cleanName]?.source || 'none')) as 'database' | 'env' | 'none',
          isCustom: !isKnown,
          baseUrl: row.base_url || undefined,
        };

        result[cleanName] = dbEntry;
        result[`api_${cleanName}`] = dbEntry;
        result[rawProvider] = dbEntry;

        if (!isKnown) {
          customProviders.push({
            id: rawProvider,
            name,
            category,
            isConfigured: hasKey,
            isActive: row.is_active ?? hasKey,
            maskedValue: hasKey ? maskKey(row.api_key) : '',
            updatedAt: row.updated_at || new Date().toISOString(),
          });
        }
      }
    }
  } catch (dbErr) {
    console.warn('[API Keys GET] Supabase query notice (falling back to env vars):', dbErr);
  }

  return NextResponse.json({
    keys: result,
    customProviders,
    availableCategories: ['AI Models', 'Stock Media', 'Voice & Audio', 'Brand Kits', 'Usage & Quotas', 'Database & Supabase'],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, apiKey, isActive, category, baseUrl, name } = body;

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const cleanProvider = String(provider).trim();

    const { data: existing } = await supabaseAdmin
      .from('settings')
      .select('id')
      .eq('provider', cleanProvider)
      .limit(1)
      .single();

    let result;
    if (existing) {
      // Update existing record
      const updateData: any = {};
      if (apiKey !== undefined && apiKey !== '') updateData.api_key = apiKey;
      if (isActive !== undefined) updateData.is_active = isActive;
      if (category !== undefined) updateData.category = category;
      if (baseUrl !== undefined) updateData.base_url = baseUrl;
      if (name !== undefined) updateData.name = name;
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabaseAdmin
        .from('settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        // Fallback without extra columns if columns are not present in schema
        const basicUpdate: any = {};
        if (apiKey !== undefined && apiKey !== '') basicUpdate.api_key = apiKey;
        if (isActive !== undefined) basicUpdate.is_active = isActive;
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from('settings')
          .update(basicUpdate)
          .eq('id', existing.id)
          .select()
          .single();
        if (fallbackError) throw fallbackError;
        result = fallbackData;
      } else {
        result = data;
      }
    } else {
      // Insert new record
      const insertData: any = {
        provider: cleanProvider,
        api_key: apiKey || '',
        is_active: isActive !== undefined ? isActive : true,
      };
      if (category) insertData.category = category;
      if (baseUrl) insertData.base_url = baseUrl;
      if (name) insertData.name = name;

      const { data, error } = await supabaseAdmin
        .from('settings')
        .insert(insertData)
        .select()
        .single();
        
      if (error) {
        // Fallback to basic columns (provider, api_key, is_active)
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from('settings')
          .insert({
            provider: cleanProvider,
            api_key: apiKey || '',
            is_active: isActive !== undefined ? isActive : true,
          })
          .select()
          .single();
        if (fallbackError) throw fallbackError;
        result = fallbackData;
      } else {
        result = data;
      }
    }

    return NextResponse.json({ success: true, setting: result });
  } catch (error: any) {
    console.error('Failed to update key:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
