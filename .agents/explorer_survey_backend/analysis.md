# Backend Storage & Settings API Route Investigation Report

**Subagent**: `explorer_survey_backend`  
**Working Directory**: `c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_backend`  
**Workspace**: `c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router`  
**Date**: 2026-09-05  

---

## 1. Executive Summary

This investigation explores the current backend architecture for application settings, focusing on `app/api/settings/keys/route.ts`, database schema (`schema.sql`), and related settings routes (`check/route.ts`, `test/route.ts`, `health/route.ts`).

The current implementation is tightly coupled to 25 legacy external AI and media providers (OpenAI, Anthropic, Gemini, Azure Speech, ElevenLabs, Kling, Luma, Pexels, Pixabay, etc.) and relies on `PROVIDER_ENV_MAP` to seed and return dozens of legacy keys.

To satisfy the user's requirement to **"exclusively support a single OmniRoute/OpenRouter configuration"** and verify that **"GET request to `/api/settings/keys` successfully retrieves the saved OmniRoute credentials and contains no legacy provider keys"** and **"no active references to `OPENAI_API_KEY` remain in the API settings storage logic"**, `app/api/settings/keys/route.ts` must undergo a complete overhaul.

---

## 2. Current Architecture & Code Inspection

### 2.1 Current `app/api/settings/keys/route.ts` Breakdown

The file currently spans 253 lines and handles key management via two endpoints:

#### A. Static Mapping: `PROVIDER_ENV_MAP` (Lines 11–44)
Contains 24 hardcoded providers categorized into:
- **AI Models**: `gemini`, `openai`, `anthropic`, `openrouter`, `fal`, `grok`, `groq`, `deepseek`, `mistral`, `cerebras`, `github_models`, `ollama`
- **Stock Media & Video**: `pexels`, `pixabay`, `kling`, `luma`, `huggingface`
- **Voice & Audio**: `azure_speech`, `azure_region`, `elevenlabs`, `google_tts`, `deepgram`, `suno`
- **Avatar**: `heygen`, `did`

Each entry maps to environment variables (e.g. `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, `ELEVENLABS_API_KEY`).

#### B. GET Handler (Lines 52–158)
1. **Env Seeding**: Loops over all 24 entries in `PROVIDER_ENV_MAP`. If an environment variable is present in `process.env`, it marks `isConfigured: true`, masks the key with `maskKey(envKey)`, sets `source: 'env'`, and injects both `result[provider]` and `result['api_' + provider]`.
2. **Supabase Query**: Calls `supabaseAdmin.from('settings').select('*')`.
3. **Database Merging**: Merges database rows into `result`. If a provider is not in `PROVIDER_ENV_MAP`, it flags it as `isCustom: true` and appends it to `customProviders`.
4. **Response**: Returns:
   ```json
   {
     "keys": { ... },
     "customProviders": [ ... ],
     "availableCategories": ["AI Models", "Stock Media", "Voice & Audio", "Brand Kits", "Usage & Quotas", "Database & Supabase"]
   }
   ```
   **Critical Defect**: When queried, GET automatically returns all 24 legacy providers if any environment variable exists or if any row exists in `settings`.

#### C. POST Handler (Lines 160–252)
1. Accepts `{ provider, apiKey, isActive, category, baseUrl, name }`.
2. Validates that `provider` is non-empty (`if (!provider) return NextResponse.json({ error: 'Provider is required' }, { status: 400 })`).
3. Queries Supabase: `supabaseAdmin.from('settings').select('id').eq('provider', cleanProvider).limit(1).single()`.
4. Updates existing row or inserts new row.
5. Employs a fallback mechanism: If `update` or `insert` fails (due to columns `category`, `base_url`, or `name` not existing in `settings`), it falls back to updating/inserting only `{ provider, api_key, is_active }`.

#### D. Key Masking & Persistence
- **Masking**: `maskKey(key)` masks all characters except the last 4 (`••••••••••••${key.slice(-4)}`) if length > 8, or returns `••••••••` if length <= 8.
- **Persistence**: Plaintext in Supabase PostgreSQL table `settings` (`api_key TEXT NOT NULL`). There is no application-layer encryption.
- **Fallback**: Read from `process.env` during GET.

---

## 3. Database Schema & Storage Strategy

### 3.1 PostgreSQL Schema (`schema.sql`)
The authoritative database schema definition in `schema.sql` (lines 82–93) defines:

```sql
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, provider)
);
```

#### Key Schema Constraints & Observations:
1. **Baseline Columns**: Only `id`, `user_id`, `provider`, `api_key`, `is_active`, `priority`, `created_at`, `updated_at` exist in standard `schema.sql`.
2. **Missing Columns**: `base_url`, `name`, and `category` do **not** exist in the core `schema.sql`! Any query attempting an update with `base_url` on standard postgres will fail with: `column "base_url" of relation "settings" does not exist`.
3. **Unique Constraint**: `UNIQUE(user_id, provider)`. When `user_id` is null, postgres allows unique `provider` strings per row.
4. **Existing Helper (`lib/keys.ts`)**:
   `lib/keys.ts` lines 10–15 queries:
   ```ts
   supabase.from('settings').select('api_key').eq('provider', provider).is('user_id', null).single();
   ```
   It retrieves the `api_key` column by matching the `provider` string.

### 3.2 Storage Strategy for OmniRoute

To ensure 100% compatibility across all deployment environments (local Docker, vanilla Postgres, cloud Supabase) without requiring database migrations:

#### Strategy: Dual/Triple-Key Storage
We store OmniRoute configuration across three complementary rows in `settings`:

| `provider` Value | Column `api_key` Content | Purpose |
|-------------------|--------------------------|---------|
| `omniroute` | The OmniRoute API Key (e.g. `sk-...` or dummy token) | Primary provider row. If `base_url` column exists in table, `base_url` is also stored here. |
| `omniroute_endpoint_url` | The Endpoint URL (e.g. `http://localhost:20128`) | Enables fetching the Endpoint URL via standard `getApiKey('omniroute_endpoint_url')` without schema changes. |
| `omniroute_api_key` | The OmniRoute API Key | Explicit key lookup alias for `getApiKey('omniroute_api_key')`. |

#### Fallback Environment Variables for OmniRoute
When database rows are not yet seeded:
- **Endpoint URL**: `process.env.OMNIROUTE_URL || process.env.OMNIROUTE_ENDPOINT_URL || process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128'`
- **API Key**: `process.env.OMNIROUTE_API_KEY || process.env.OMNIROUTE_KEY || ''`
- **Default Port**: Port 20128 is the configured port for OmniRoute in `ecosystem.config.js` (`PORT: 20128`).

---

## 4. Complete Inventory of Deprecated Providers & Logic to Eliminate

### 4.1 Legacy Providers to Eliminate from Settings
The following 25 provider IDs and all associated environment variable checks must be completely removed from `app/api/settings/keys/route.ts`:

1. `gemini` (`GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_AI_KEY`)
2. `openai` (`OPENAI_API_KEY`)
3. `anthropic` (`ANTHROPIC_API_KEY`)
4. `openrouter` (`OPENROUTER_API_KEY`)
5. `fal` (`FAL_API_KEY`, `FAL_KEY`)
6. `grok` (`GROK_API_KEY`, `XAI_API_KEY`)
7. `groq` (`GROQ_API_KEY`)
8. `deepseek` (`DEEPSEEK_API_KEY`)
9. `mistral` (`MISTRAL_API_KEY`)
10. `cerebras` (`CEREBRAS_API_KEY`)
11. `github_models` (`GITHUB_MODELS_KEY`, `GITHUB_TOKEN`)
12. `ollama` (`OLLAMA_BASE_URL`, `OLLAMA_URL`)
13. `pexels` (`PEXELS_API_KEY`)
14. `pixabay` (`PIXABAY_API_KEY`)
15. `kling` (`KLING_API_KEY`)
16. `luma` (`LUMA_API_KEY`)
17. `huggingface` (`HUGGINGFACE_API_KEY`, `HF_TOKEN`)
18. `azure_speech` (`AZURE_SPEECH_KEY`, `AZURE_TTS_KEY`, `AZURE_API_KEY`)
19. `azure_region` (`AZURE_SPEECH_REGION`, `AZURE_REGION`)
20. `elevenlabs` (`ELEVENLABS_API_KEY`, `XI_API_KEY`)
21. `google_tts` (`GOOGLE_TTS_KEY`, `GOOGLE_TTS_API_KEY`, `GOOGLE_API_KEY`)
22. `deepgram` (`DEEPGRAM_API_KEY`)
23. `suno` (`SUNO_API_KEY`)
24. `heygen` (`HEYGEN_API_KEY`)
25. `did` (`DID_API_KEY`, `D_ID_API_KEY`)

### 4.2 References to `OPENAI_API_KEY` in Settings API Storage Logic
A codebase-wide search revealed the following references in `app/api/settings`:
1. `app/api/settings/keys/route.ts:14`: `openai: { envVars: ['OPENAI_API_KEY'], category: 'AI Models', name: 'OpenAI' }` — **MUST BE REMOVED**.
2. `app/api/settings/keys/check/route.ts:28`: `openai: ['OPENAI_API_KEY']` and lines 62–67 checking OpenAI endpoint — **MUST BE REFOCUSED ON OMNIROUTE**.
3. `app/api/settings/test/route.ts:24`: `openai: env.OPENAI_API_KEY` — Diagnostic test route.

---

## 5. Concrete Refactoring Plan for `app/api/settings/keys/route.ts`

### 5.1 Proposed Interface Contracts

#### GET Request
- **URL**: `GET /api/settings/keys`
- **Output JSON Structure**:
```json
{
  "success": true,
  "endpointUrl": "http://localhost:20128",
  "maskedApiKey": "••••••••••••1234",
  "isConfigured": true,
  "source": "database",
  "keys": {
    "omniroute": {
      "name": "OmniRoute Gateway",
      "category": "AI Gateway",
      "isConfigured": true,
      "isActive": true,
      "maskedValue": "••••••••••••1234",
      "endpointUrl": "http://localhost:20128",
      "baseUrl": "http://localhost:20128",
      "updatedAt": "2026-09-05T03:00:00.000Z",
      "source": "database",
      "isCustom": false
    },
    "omniroute_endpoint_url": {
      "name": "OmniRoute Endpoint URL",
      "category": "AI Gateway",
      "isConfigured": true,
      "isActive": true,
      "maskedValue": "http://localhost:20128",
      "endpointUrl": "http://localhost:20128",
      "baseUrl": "http://localhost:20128",
      "updatedAt": "2026-09-05T03:00:00.000Z",
      "source": "database"
    },
    "omniroute_api_key": {
      "name": "OmniRoute API Key",
      "category": "AI Gateway",
      "isConfigured": true,
      "isActive": true,
      "maskedValue": "••••••••••••1234",
      "updatedAt": "2026-09-05T03:00:00.000Z",
      "source": "database"
    }
  },
  "omniroute": {
    "endpointUrl": "http://localhost:20128",
    "maskedApiKey": "••••••••••••1234",
    "isConfigured": true,
    "isActive": true,
    "updatedAt": "2026-09-05T03:00:00.000Z",
    "source": "database"
  },
  "customProviders": [],
  "availableCategories": ["AI Gateway"]
}
```
**Strict Compliance**: Contains **ZERO** legacy provider keys (`openai`, `azure_speech`, `elevenlabs`, `gemini`, etc.).

#### POST Request
- **URL**: `POST /api/settings/keys`
- **Supported Payload Formats**:
  1. Primary Clean Format:
     ```json
     {
       "endpointUrl": "http://localhost:20128",
       "apiKey": "sk-omniroute-token"
     }
     ```
  2. Provider Wrapper Format:
     ```json
     {
       "provider": "omniroute",
       "endpointUrl": "http://localhost:20128",
       "apiKey": "sk-omniroute-token"
     }
     ```
  3. Legacy Key-Value Format:
     ```json
     { "provider": "omniroute_endpoint_url", "apiKey": "http://localhost:20128" }
     ```
     ```json
     { "provider": "omniroute_api_key", "apiKey": "sk-omniroute-token" }
     ```
- **Validation Rules**:
  - `endpointUrl`: If provided, must be a valid HTTP/HTTPS URL. Reject invalid strings with 400.
  - `apiKey`: If provided, string trimmed.
  - At least one of `endpointUrl` or `apiKey` must be provided.
  - If a legacy provider is passed (e.g. `provider: 'openai'`), return 400: `"Individual AI providers are deprecated. Only OmniRoute configuration is supported."`

### 5.2 Proposed Implementation Code Snippet

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export const dynamic = 'force-dynamic';

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `••••••••••••${key.slice(-4)}`;
}

function isValidUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function upsertRow(provider: string, apiKey: string, baseUrl?: string, name?: string) {
  const { data: existing } = await supabaseAdmin
    .from('settings')
    .select('id')
    .eq('provider', provider)
    .limit(1)
    .single();

  const fullData: Record<string, any> = {
    provider,
    api_key: apiKey,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  if (baseUrl) fullData.base_url = baseUrl;
  if (name) fullData.name = name;

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .update(fullData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      // Fallback without extra columns
      const { data: fallbackData } = await supabaseAdmin
        .from('settings')
        .update({ api_key: apiKey, is_active: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      return fallbackData;
    }
    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .insert(fullData)
      .select()
      .single();

    if (error) {
      // Fallback without extra columns
      const { data: fallbackData } = await supabaseAdmin
        .from('settings')
        .insert({ provider, api_key: apiKey, is_active: true })
        .select()
        .single();
      return fallbackData;
    }
    return data;
  }
}

export async function GET() {
  let endpointUrl = process.env.OMNIROUTE_URL || process.env.OMNIROUTE_ENDPOINT_URL || process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128';
  let apiKey = process.env.OMNIROUTE_API_KEY || process.env.OMNIROUTE_KEY || '';
  let source: 'database' | 'env' | 'none' = (process.env.OMNIROUTE_URL || process.env.OMNIROUTE_API_KEY) ? 'env' : 'none';
  let updatedAt: string | null = null;
  let isActive = true;

  try {
    const { data: dbRows, error } = await supabaseAdmin
      .from('settings')
      .select('*');

    if (!error && Array.isArray(dbRows)) {
      for (const row of dbRows) {
        const provider = String(row.provider || '').toLowerCase();
        if (provider === 'omniroute') {
          if (row.api_key) apiKey = row.api_key;
          if (row.base_url) endpointUrl = row.base_url;
          if (row.updated_at) updatedAt = row.updated_at;
          if (row.is_active !== undefined) isActive = row.is_active;
          source = 'database';
        } else if (provider === 'omniroute_endpoint_url' || provider === 'omniroute_url') {
          if (row.api_key) endpointUrl = row.api_key;
          source = 'database';
          if (row.updated_at) updatedAt = row.updated_at;
        } else if (provider === 'omniroute_api_key') {
          if (row.api_key) apiKey = row.api_key;
          source = 'database';
          if (row.updated_at) updatedAt = row.updated_at;
        }
      }
    }
  } catch (err) {
    console.warn('[API Keys GET] Notice querying settings database:', err);
  }

  const isConfigured = Boolean(endpointUrl && endpointUrl.trim().length > 0);
  const maskedApiKey = maskKey(apiKey);

  const omnirouteEntry = {
    name: 'OmniRoute Gateway',
    category: 'AI Gateway',
    isConfigured,
    isActive,
    maskedValue: maskedApiKey || '••••••••',
    endpointUrl,
    baseUrl: endpointUrl,
    updatedAt: updatedAt || new Date().toISOString(),
    source,
    isCustom: false,
  };

  const keys: Record<string, any> = {
    omniroute: omnirouteEntry,
    omniroute_endpoint_url: {
      name: 'OmniRoute Endpoint URL',
      category: 'AI Gateway',
      isConfigured: Boolean(endpointUrl),
      isActive: true,
      maskedValue: endpointUrl,
      endpointUrl,
      baseUrl: endpointUrl,
      updatedAt: updatedAt || new Date().toISOString(),
      source,
    },
    omniroute_api_key: {
      name: 'OmniRoute API Key',
      category: 'AI Gateway',
      isConfigured: Boolean(apiKey),
      isActive: true,
      maskedValue: maskedApiKey,
      updatedAt: updatedAt || new Date().toISOString(),
      source,
    },
  };

  return NextResponse.json({
    success: true,
    endpointUrl,
    maskedApiKey,
    isConfigured,
    source,
    keys,
    omniroute: {
      endpointUrl,
      maskedApiKey,
      isConfigured,
      isActive,
      updatedAt,
      source,
    },
    customProviders: [],
    availableCategories: ['AI Gateway'],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, apiKey, endpointUrl, baseUrl, url, key } = body;

    // Reject legacy providers
    if (provider && typeof provider === 'string') {
      const cleanP = provider.toLowerCase().replace(/^api_/, '');
      const legacyList = ['openai', 'gemini', 'azure', 'azure_speech', 'elevenlabs', 'anthropic', 'openrouter', 'fal', 'grok', 'groq', 'deepseek', 'mistral', 'cerebras', 'github_models', 'ollama', 'pexels', 'pixabay', 'kling', 'luma', 'huggingface', 'google_tts', 'deepgram', 'suno', 'heygen', 'did'];
      if (legacyList.includes(cleanP)) {
        return NextResponse.json(
          { error: 'Individual AI providers are deprecated. Only OmniRoute configuration is supported.' },
          { status: 400 }
        );
      }
    }

    const resolvedUrl = (endpointUrl || baseUrl || url || (provider === 'omniroute_endpoint_url' ? apiKey : ''))?.trim();
    const resolvedKey = (apiKey || key || (provider === 'omniroute_api_key' ? apiKey : ''))?.trim();

    if (!resolvedUrl && resolvedKey === undefined && !provider) {
      return NextResponse.json(
        { error: 'OmniRoute Endpoint URL or API Key is required' },
        { status: 400 }
      );
    }

    if (resolvedUrl && !isValidUrl(resolvedUrl)) {
      return NextResponse.json(
        { error: 'Invalid Endpoint URL. Must be a valid HTTP or HTTPS URL (e.g. http://localhost:20128).' },
        { status: 400 }
      );
    }

    let savedSetting: any = null;

    if (resolvedUrl) {
      await upsertRow('omniroute_endpoint_url', resolvedUrl, resolvedUrl, 'OmniRoute Endpoint URL');
    }
    if (resolvedKey !== undefined) {
      await upsertRow('omniroute_api_key', resolvedKey, undefined, 'OmniRoute API Key');
    }
    // Main omniroute row
    savedSetting = await upsertRow('omniroute', resolvedKey || '', resolvedUrl, 'OmniRoute Gateway');

    return NextResponse.json({
      success: true,
      setting: savedSetting,
      omniroute: {
        endpointUrl: resolvedUrl,
        isConfigured: true,
      }
    });
  } catch (error: any) {
    console.error('Failed to update OmniRoute settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 6. Verification and Acceptance Matrix

| Requirement / Acceptance Criteria | Current Status | Refactoring Fix | Verification Method |
|-----------------------------------|----------------|-----------------|---------------------|
| Accept & store ONLY OmniRoute credentials | ❌ Accepts any provider | Validates & stores only OmniRoute URL & Key | POST test with `{ endpointUrl, apiKey }` |
| Reject/Remove legacy providers | ❌ 25 legacy providers in map | Removed `PROVIDER_ENV_MAP`; rejects legacy provider names | POST test with `{ provider: 'openai' }` returns 400 |
| GET returns OmniRoute credentials | ❌ Returns 25 legacy providers | Returns `omniroute`, `omniroute_endpoint_url`, `omniroute_api_key` | GET `/api/settings/keys` returns keys with NO `openai`, etc. |
| Zero references to `OPENAI_API_KEY` in settings storage | ❌ Found in line 14 of `keys/route.ts` and line 28 of `check/route.ts` | Complete deletion of `OPENAI_API_KEY` from settings storage | Code search: `grep_search` across `app/api/settings` for `OPENAI_API_KEY` returns 0 results |
