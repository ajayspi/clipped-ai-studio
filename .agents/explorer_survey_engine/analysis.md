# Comprehensive Analysis: Transitioning Clipped Engine & Credentials to OmniRoute

**Working Directory**: `c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_engine`  
**Date**: September 2026  
**Investigator**: `explorer_survey_engine`  
**Scope**: `lib/engine/llm.ts`, `lib/ai/llm.ts`, `lib/engine/tts.ts`, `lib/ai/*`, `lib/engine/*`, `app/api/*`, `scripts/*`, and credential storage.

---

## 1. Executive Summary

The Clipped AI Studio platform is undergoing a architectural shift to consolidate all individual AI model and voice providers (OpenAI, Gemini, Anthropic, Azure Speech, ElevenLabs, etc.) behind a single unified gateway: **OmniRoute** (OpenAI-compatible gateway running locally at `http://localhost:20128` or at a custom user-defined endpoint).

Our survey revealed:
1. **Engine LLM Integration**: There is currently no `lib/engine/llm.ts`; instead, the core LLM driver is located at `lib/ai/llm.ts`. In `lib/ai/llm.ts`, `complete()` hardcodes `http://localhost:20128/v1/chat/completions` with no authorization header or database lookup. Six other engine orchestrators (`auto-pilot.ts`, `drama-orchestrator.ts`, `bulk-planner.ts`, `scene-matcher.ts`, `stories-orchestrator.ts`, `shorts-extractor.ts`) replicate raw `fetch('http://localhost:20128/v1/chat/completions')` calls while checking `(process.env.OPENAI_API_KEY || 'omniroute-dummy-key')`.
2. **Engine TTS Integration**: `lib/engine/tts.ts` contains a 1,255-line multi-provider speech synthesis engine. It still prioritizes Azure (`AZURE_SPEECH_KEY`), followed by OpenAI (`OPENAI_API_KEY`), ElevenLabs (`ELEVENLABS_API_KEY`), and Google. While `synthesizeWithOpenAI()` was partially pointed to `http://localhost:20128/v1/audio/speech`, it is gated behind `OPENAI_API_KEY` and secondary in cascade priority.
3. **Storage & Credentials**: `lib/keys.ts` queries the Supabase `settings` table on a per-provider basis (`select('api_key').eq('provider', provider)`), while `app/api/settings/keys/route.ts` manages a 20+ provider map (`PROVIDER_ENV_MAP`). Both need to be refactored to support a single OmniRoute provider configuration with `base_url` and `api_key`.
4. **Offline Workers**: `scripts/render-worker.ts` and `scripts/publish-worker.ts` also interact with TTS and images, currently attempting lookups for legacy provider keys.

---

## 2. Current State Inspection & Line-by-Line Tracing

### 2.1 `lib/ai/llm.ts` (and missing `lib/engine/llm.ts`)
- **Location**: `lib/ai/llm.ts`
- **Key Functions**:
  - `parseJson<T>(raw: string): T` (Lines 1–44): Robust JSON parser handling markdown fences, unescaped newlines, and trailing narration text. Conforms to User Rule 2.
  - `complete(request, provider?, model?): Promise<string>` (Lines 48–72):
    ```typescript
    export async function complete(request: { system: string; user: string; maxTokens?: number; json?: boolean }, provider?: string, model?: string): Promise<string> {
      const response = await fetch('http://localhost:20128/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          max_tokens: request.maxTokens || 4000,
          response_format: request.json ? { type: "json_object" } : undefined,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user }
          ]
        })
      });
      ...
    ```
- **Deficiencies**:
  - URL is statically hardcoded to `http://localhost:20128/v1/chat/completions`. If a user configures a custom remote OmniRoute host in Settings (e.g. `https://omniroute.example.com`), `complete()` ignores it.
  - No `Authorization` header is passed (`Authorization: Bearer <apiKey>`).
  - No query to Supabase `settings` table or env fallback (`OMNIROUTE_URL`, `OMNIROUTE_API_KEY`).
  - Requirement R3 explicitly references `lib/engine/llm.ts`. Creating `lib/engine/llm.ts` as a facade or moving/re-exporting ensures complete adherence to module specifications.

### 2.2 `lib/engine/tts.ts`
- **Location**: `lib/engine/tts.ts` (1,255 lines)
- **Key Findings**:
  - **Provider Cascade Order** (Lines 483–498):
    ```typescript
    if (requestedProvider === 'azure') {
      providersToTry = ['azure', 'openai', 'elevenlabs', 'google', 'coqui', 'keyless'];
    } ... else {
      // Default auto cascade: Azure -> OpenAI -> ElevenLabs -> Google -> Coqui -> Keyless
      providersToTry = ['azure', 'openai', 'elevenlabs', 'google', 'coqui', 'keyless'];
    }
    ```
    The default 'auto' cascade tests `azure` first, requiring `AZURE_SPEECH_KEY`.
  - **Credential Fetching for Providers**:
    - **Azure** (Lines 505–514): Checks `process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY || process.env.AZURE_API_KEY`.
    - **OpenAI** (Lines 537–545): Checks `request.apiKey || (process.env.OPENAI_API_KEY || 'omniroute-dummy-key')`.
    - **ElevenLabs** (Lines 559–567): Checks `process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY`.
    - **Google Cloud** (Lines 582–587): Checks `GOOGLE_TTS_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`.
  - **OpenAI Implementation** (Lines 757–786):
    Points to `http://localhost:20128/v1/audio/speech`. Accepts `model: 'tts-1'`, `input`, `voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'`, `speed`, and `response_format: 'mp3'`.
  - **Deficiencies**:
    - OmniRoute is not recognized as a distinct first-class provider (`'omniroute'`).
    - The fallback cascade treats Azure as the default, rather than OmniRoute.
    - URL `http://localhost:20128` is hardcoded inside `synthesizeWithOpenAI()` instead of dynamically reading user-configured OmniRoute base URL and API key from `settings`.

### 2.3 Redundant Direct LLM Calls in Engine Orchestrators
The following 6 engine files duplicate raw HTTP fetch calls and key checks instead of delegating to a unified client:
1. `lib/engine/auto-pilot.ts` (Lines 177, 213–227):
   - `const apiKey = (process.env.OPENAI_API_KEY || 'omniroute-dummy-key');`
   - `fetch('http://localhost:20128/v1/chat/completions', ...)`
   - Unsafe `JSON.parse(content)` (Line 235).
2. `lib/engine/drama-orchestrator.ts` (Lines 48, 93–105):
   - `const apiKey = (process.env.OPENAI_API_KEY || 'omniroute-dummy-key');`
   - `fetch('http://localhost:20128/v1/chat/completions', ...)`
3. `lib/engine/bulk-planner.ts` (Lines 39, 80–94):
   - `const apiKey = (process.env.OPENAI_API_KEY || 'omniroute-dummy-key') || 'dummy';`
   - `fetch('http://localhost:20128/v1/chat/completions', ...)`
4. `lib/engine/scene-matcher.ts` (Lines 39–43, 63–77):
   - `const apiKey = (process.env.OPENAI_API_KEY || 'omniroute-dummy-key');`
   - `if (!apiKey) throw new Error("OPENAI_API_KEY is not set. Cannot perform scene matching.");`
   - `fetch("http://localhost:20128/v1/chat/completions", ...)`
5. `lib/engine/stories-orchestrator.ts` (Lines 38, 81–95):
   - `const apiKey = (process.env.OPENAI_API_KEY || 'omniroute-dummy-key');`
   - `fetch('http://localhost:20128/v1/chat/completions', ...)`
6. `lib/engine/shorts-extractor.ts` (Lines 45, 90–103):
   - `const apiKey = (process.env.OPENAI_API_KEY || 'omniroute-dummy-key');`
   - `fetch('http://localhost:20128/v1/chat/completions', ...)`
7. `lib/ai/gemini-character-generator.ts` (Lines 222–242):
   - `fetch('http://localhost:20128/v1/chat/completions', ...)` with no Auth header.
   - Unsafe `JSON.parse(rawText)` (violates Rule 2).

In contrast, `lib/engine/mission-orchestrator.ts`, `app/api/v1/script/route.ts`, and `app/api/v1/analyze/route.ts` already use `complete(...)` and `parseJson(...)` from `lib/ai/llm.ts`. Refactoring all engine modules to use the unified engine LLM client will eliminate 7 redundant implementations.

---

## 3. Reference Inventory: `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, `ELEVENLABS_API_KEY`

Across the application code (`lib/`, `app/`, `scripts/`):

| File Path | Deprecated Keys Referenced | Current Role / Usage |
|---|---|---|
| `lib/engine/tts.ts` | `AZURE_SPEECH_KEY`, `AZURE_TTS_KEY`, `AZURE_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `XI_API_KEY`, `GOOGLE_TTS_API_KEY` | Live provider API authentication in synthesis cascade |
| `lib/engine/auto-pilot.ts` | `OPENAI_API_KEY` | Gate for OpenAI LLM topic synthesis |
| `lib/engine/drama-orchestrator.ts` | `OPENAI_API_KEY` | Gate for drama script generation |
| `lib/engine/bulk-planner.ts` | `OPENAI_API_KEY` | Gate for content calendar generation |
| `lib/engine/scene-matcher.ts` | `OPENAI_API_KEY` | Hard requirement: throws if `OPENAI_API_KEY` missing |
| `lib/engine/stories-orchestrator.ts` | `OPENAI_API_KEY` | Gate for story outline and narration generation |
| `lib/engine/shorts-extractor.ts` | `OPENAI_API_KEY` | Gate for viral hook extraction |
| `app/api/v1/source/route.ts` | `OPENAI_API_KEY` | Fallback key lookup for script generation |
| `app/api/settings/keys/route.ts` | `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, `ELEVENLABS_API_KEY`, + 18 other provider env vars | Seed dictionary and database mapping for Settings |
| `app/api/settings/keys/check/route.ts` | `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, `ELEVENLABS_API_KEY`, etc. | Provider key verification endpoints |
| `app/api/settings/test/route.ts` | `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, `ELEVENLABS_API_KEY`, etc. | Key status test route |
| `app/(app)/settings/page.tsx` | UI cards for OpenAI, Azure, ElevenLabs | Provider management UI and voice catalog filters |
| `scripts/render-worker.ts` | `ELEVENLABS_API_KEY`, `GOOGLE_TTS_API_KEY` | Offline video rendering TTS synthesis selection |

---

## 4. OmniRoute Capabilities & Compatibility Mapping

OmniRoute is a drop-in OpenAI-compatible API gateway that exposes:
1. **Chat Completions**: `POST /v1/chat/completions`
   - Accepts standard OpenAI chat messages, `response_format: { type: 'json_object' }`, and routing models like `auto`, `gpt-4o`, `gpt-4o-mini`, `gemini-1.5-flash`, `claude-3-5-sonnet`.
2. **Audio Speech (TTS)**: `POST /v1/audio/speech`
   - Conforms exactly to the OpenAI Audio API contract:
     ```json
     {
       "model": "tts-1",
       "input": "Narration text here",
       "voice": "alloy",
       "speed": 1.0,
       "response_format": "mp3"
     }
     ```
   - OmniRoute can route speech generation upstream to ElevenLabs, OpenAI TTS, Deepgram, Cartesia, PlayHT, or local engines based on backend configurations.
   - Returns raw binary audio buffer (`audio/mpeg`).
3. **Model Listing**: `GET /v1/models`
   - Lightweight endpoint for connectivity and health check verification.

---

## 5. OmniRoute Credential Resolution Architecture

To eliminate hardcoded `http://localhost:20128` strings and fragmented key checks, we formulate a single authoritative credential resolver.

### 5.1 Credential Resolution Flow
```
                     +---------------------------------------+
                     |         getOmniRouteConfig()          |
                     +---------------------------------------+
                                         |
                                         v
                         +-------------------------------+
                         | Check In-Memory Cache (TTL)   |
                         +-------------------------------+
                                         | (cache miss)
                                         v
                         +-------------------------------+
                         | Query Supabase settings table |
                         | provider IN ('omniroute')     |
                         +-------------------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v (found in DB)                     v (not in DB / DB error)
         +---------------------------+       +-------------------------------+
         | Extract base_url, api_key |       | Fallback to Environment Vars  |
         | from DB record            |       | OMNIROUTE_URL,                |
         +---------------------------+       | OMNIROUTE_API_KEY             |
                       |                     +-------------------------------+
                       +-----------------+-----------------+
                                         |
                                         v
                         +-------------------------------+
                         | URL Normalization & Clean-up  |
                         | (strip trailing /, /v1)       |
                         +-------------------------------+
                                         |
                                         v
                      Return { baseUrl, apiKey }
```

### 5.2 Implementation Specification (`lib/keys.ts` & `lib/engine/llm.ts`)

```typescript
// lib/keys.ts (or lib/engine/credentials.ts)
import { supabase } from '@/lib/db';

export interface OmniRouteConfig {
  baseUrl: string;
  apiKey: string;
}

let cachedConfig: { config: OmniRouteConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 15_000; // 15 seconds cache to balance speed and UI responsiveness

export async function getOmniRouteConfig(bypassCache = false): Promise<OmniRouteConfig> {
  const now = Date.now();
  if (!bypassCache && cachedConfig && cachedConfig.expiresAt > now) {
    return cachedConfig.config;
  }

  let dbUrl: string | undefined;
  let dbKey: string | undefined;

  try {
    const { data } = await supabase
      .from('settings')
      .select('api_key, base_url, is_active')
      .in('provider', ['omniroute', 'api_omniroute', 'openrouter'])
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      dbUrl = data.base_url;
      dbKey = data.api_key;
    }
  } catch (err) {
    // Database query error: fail-safe to environment variables
  }

  const rawUrl =
    dbUrl?.trim() ||
    process.env.OMNIROUTE_ENDPOINT_URL ||
    process.env.OMNIROUTE_URL ||
    process.env.OPENROUTER_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'http://localhost:20128';

  // Normalize: remove trailing slashes and trailing /v1
  let baseUrl = rawUrl.replace(/\/+$/, '');
  if (baseUrl.endsWith('/v1')) {
    baseUrl = baseUrl.slice(0, -3);
  }

  const apiKey =
    dbKey?.trim() ||
    process.env.OMNIROUTE_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    'omniroute-default-key';

  const config: OmniRouteConfig = { baseUrl, apiKey };
  cachedConfig = { config, expiresAt: now + CACHE_TTL_MS };
  return config;
}
```

---

## 6. Concrete Refactoring Plan for Engine Files

### Refactoring Module 1: `lib/engine/llm.ts` & `lib/ai/llm.ts`
1. **Provide `lib/engine/llm.ts`**:
   - Create `lib/engine/llm.ts` exporting:
     - `complete(request, provider?, model?): Promise<string>`
     - `parseJson<T>(raw: string): T`
     - `getOmniRouteConfig(): Promise<OmniRouteConfig>`
2. **Update `complete()` in `lib/ai/llm.ts`**:
   - Replace hardcoded `'http://localhost:20128/v1/chat/completions'` with dynamic resolution:
     ```typescript
     const { baseUrl, apiKey } = await getOmniRouteConfig();
     const response = await fetch(`${baseUrl}/v1/chat/completions`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${apiKey}`,
       },
       body: JSON.stringify({
         model: model || 'gpt-4o-mini',
         max_tokens: request.maxTokens || 4000,
         response_format: request.json ? { type: "json_object" } : undefined,
         messages: [
           { role: 'system', content: request.system },
           { role: 'user', content: request.user }
         ]
       })
     });
     ```

### Refactoring Module 2: `lib/engine/tts.ts`
1. **Add `omniroute` Provider**:
   - Update `TTSProvider` type union:
     `export type TTSProvider = 'omniroute' | 'openai' | 'azure' | 'elevenlabs' | 'google' | 'coqui' | 'keyless' | 'mock' | 'auto';`
2. **Re-order Provider Cascade**:
   - In `TTSEngine.synthesize(request)`:
     ```typescript
     // Default auto cascade: OmniRoute -> OpenAI -> Keyless -> Mock
     providersToTry = requestedProvider
       ? [requestedProvider, 'omniroute', 'keyless']
       : ['omniroute', 'openai', 'keyless'];
     ```
3. **Add `synthesizeWithOmniRoute`**:
   - Fetch credentials via `await getOmniRouteConfig()`.
   - Call `${baseUrl}/v1/audio/speech`.
   - Header: `Authorization: Bearer ${apiKey}`.
   - Body:
     ```json
     {
       "model": request.model || "tts-1",
       "input": rawText,
       "voice": voice,
       "speed": speed,
       "response_format": "mp3"
     }
     ```
   - Return standard `TTSResponse` with `providerUsed: 'omniroute'`.
4. **Deprecate Direct External API Requirements**:
   - If `AZURE_SPEECH_KEY` or `ELEVENLABS_API_KEY` are absent, log cleanly without blocking or failing; OmniRoute fulfills all TTS requests.
   - Remove hardcoded `http://localhost:20128/v1/audio/speech` from `synthesizeWithOpenAI` and delegate to `getOmniRouteConfig()`.

### Refactoring Module 3: Consolidate Engine Orchestrators
Replace direct `fetch('http://localhost:20128/...')` and `process.env.OPENAI_API_KEY` in:
- `lib/engine/auto-pilot.ts`: Call `complete()` and `parseJson()` from `@/lib/engine/llm`.
- `lib/engine/drama-orchestrator.ts`: Call `complete()` and `parseJson()`.
- `lib/engine/bulk-planner.ts`: Call `complete()` and `parseJson()`.
- `lib/engine/scene-matcher.ts`: Call `complete()` and `parseJson()`. Remove the `throw new Error("OPENAI_API_KEY is not set")`.
- `lib/engine/stories-orchestrator.ts`: Call `complete()` and `parseJson()`.
- `lib/engine/shorts-extractor.ts`: Call `complete()` and `parseJson()`.
- `lib/ai/gemini-character-generator.ts`: Use `getOmniRouteConfig()`, pass `Authorization: Bearer ${apiKey}`, and parse with `parseJson()`.

### Refactoring Module 4: Backend API Storage & Verification Routes
1. **`app/api/settings/keys/route.ts`**:
   - Strip out individual provider entries from `PROVIDER_ENV_MAP`.
   - Focus `GET` and `POST` on the `omniroute` provider:
     - `POST`: Expects `{ provider: 'omniroute', baseUrl, apiKey, isActive }`. Upserts to `settings` table where `provider = 'omniroute'`.
     - `GET`: Returns current configured status, masked key, and base URL for `omniroute`.
2. **`app/api/settings/keys/check/route.ts`**:
   - Pings `${baseUrl}/v1/models` using `Authorization: Bearer ${apiKey}`.
   - Returns `{ isWorking: true, latencyMs, models }`.
3. **`app/api/settings/test/route.ts`**:
   - Replace legacy keys dictionary with `omniroute` gateway test.

### Refactoring Module 5: Settings UI & Voice Catalog
1. **`app/(app)/settings/page.tsx`**:
   - Replace the legacy multi-card layout with a sleek glassmorphic **OmniRoute Configuration Panel**:
     - OmniRoute Endpoint URL input (e.g. `http://localhost:20128`)
     - OmniRoute API Key input (with password toggle and mask)
     - Real-time "Test Connection" button calling `/api/settings/keys/check`
     - Save button persisting via `POST /api/settings/keys`
   - Update Voice Catalog tab:
     - Display OpenAI TTS voices (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`) and keyless voices that route seamlessly through OmniRoute.
     - Play preview button calls `/api/tts/preview` which now exercises the OmniRoute `/v1/audio/speech` pipeline.

---

## 7. Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|
| OmniRoute daemon is offline when engine runs | Low | Medium | Retain the automatic cascade to `keyless` (Google Translate) and in-memory deterministic `mock` in `tts.ts` and `llm.ts`. |
| User enters URL with trailing slash or `/v1` | High | Medium | Canonical URL normalization in `getOmniRouteConfig()` strips trailing slashes and `/v1`. |
| Database query latency during rapid video generation | Medium | Low | 15-second in-memory TTL caching in `getOmniRouteConfig()`. |
| Missing `lib/engine/llm.ts` breaks imports | Medium | High | Create `lib/engine/llm.ts` as a clean facade re-exporting from `lib/ai/llm.ts`. |
| Backward compatibility with existing video render jobs | Low | Low | Supabase `render_jobs` schema remains unchanged; jobs continue to be picked up by workers and orchestrators. |
