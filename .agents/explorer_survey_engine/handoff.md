# Handoff Report: Engine Integrations & OmniRoute Transition Survey

**Agent**: `explorer_survey_engine`  
**Working Directory**: `c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_engine`  
**Timestamp**: 2026-09-04T22:00:00Z  
**Type**: Hard Handoff (Investigation Complete)  

---

## 1. Observation

1. **Absence of `lib/engine/llm.ts` and Implementation in `lib/ai/llm.ts`**:
   - `find_by_name` across `lib/` identified `lib/ai/llm.ts` but confirmed no `lib/engine/llm.ts` currently exists.
   - In `lib/ai/llm.ts` (lines 48–63):
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
     ```
     `complete()` has a hardcoded URL (`http://localhost:20128/v1/chat/completions`), passes no `Authorization` header, and does not look up settings in the Supabase database or environment variables.

2. **Legacy Provider Cascade and Key Dependencies in `lib/engine/tts.ts`**:
   - In `lib/engine/tts.ts` (lines 483–498):
     ```typescript
     if (requestedProvider === 'azure') {
       providersToTry = ['azure', 'openai', 'elevenlabs', 'google', 'coqui', 'keyless'];
     } else if (requestedProvider === 'openai') {
       providersToTry = ['openai', 'azure', 'elevenlabs', 'google', 'coqui', 'keyless'];
     ...
     } else {
       // Default auto cascade: Azure -> OpenAI -> ElevenLabs -> Google -> Coqui -> Keyless
       providersToTry = ['azure', 'openai', 'elevenlabs', 'google', 'coqui', 'keyless'];
     }
     ```
     The default 'auto' cascade prioritizes Azure first, then OpenAI, then ElevenLabs.
   - Provider credentials in `lib/engine/tts.ts`:
     - Line 507–509: `process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY || process.env.AZURE_API_KEY`
     - Line 537: `request.apiKey || (process.env.OPENAI_API_KEY || 'omniroute-dummy-key') || 'omniroute-dummy-key'`
     - Line 559: `request.apiKey || process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY`
     - Line 583–586: `process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_KEY || process.env.GOOGLE_API_KEY`
   - OpenAI speech synthesis in `lib/engine/tts.ts` (lines 771–777):
     ```typescript
     const url = 'http://localhost:20128/v1/audio/speech';
     const response = await fetch(url, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${apiKey}`,
         'Content-Type': 'application/json',
       },
     ```
     The URL is hardcoded to `http://localhost:20128/v1/audio/speech` and is gated by `OPENAI_API_KEY`.

3. **Duplicated Engine HTTP Fetch Calls and `OPENAI_API_KEY` References**:
   - `lib/engine/auto-pilot.ts`: Line 177 (`apiKey = process.env.OPENAI_API_KEY`), line 213 (`fetch('http://localhost:20128/v1/chat/completions')`), line 235 (`JSON.parse(content)`).
   - `lib/engine/drama-orchestrator.ts`: Line 48 (`apiKey = process.env.OPENAI_API_KEY`), line 93 (`fetch('http://localhost:20128/v1/chat/completions')`).
   - `lib/engine/bulk-planner.ts`: Line 39 (`apiKey = process.env.OPENAI_API_KEY`), line 80 (`fetch('http://localhost:20128/v1/chat/completions')`).
   - `lib/engine/scene-matcher.ts`: Line 39 (`apiKey = process.env.OPENAI_API_KEY`), line 41 (`throw new Error("OPENAI_API_KEY is not set. Cannot perform scene matching.")`), line 63 (`fetch("http://localhost:20128/v1/chat/completions")`).
   - `lib/engine/stories-orchestrator.ts`: Line 38 (`apiKey = process.env.OPENAI_API_KEY`), line 81 (`fetch('http://localhost:20128/v1/chat/completions')`).
   - `lib/engine/shorts-extractor.ts`: Line 45 (`apiKey = process.env.OPENAI_API_KEY`), line 90 (`fetch('http://localhost:20128/v1/chat/completions')`).
   - `lib/ai/gemini-character-generator.ts`: Line 222 (`fetch('http://localhost:20128/v1/chat/completions')`), line 242 (`JSON.parse(rawText)`).

4. **Settings Storage and API Routes**:
   - `app/api/settings/keys/route.ts` (lines 11–44): Defines `PROVIDER_ENV_MAP` for 20+ legacy providers including `gemini`, `openai`, `anthropic`, `azure_speech`, `elevenlabs`.
   - `lib/keys.ts` (lines 10–33): Looks up API keys by `provider` column in Supabase `settings` table.

5. **OmniRoute Gateway Surface**:
   - Verified via `omniroute-server/docs/reference/API_REFERENCE.md` that OmniRoute exposes standard OpenAI-compatible endpoints:
     - `POST /v1/chat/completions` (chat models: `gpt-4o`, `gpt-4o-mini`, `gemini-1.5-flash`, `auto`, etc.)
     - `POST /v1/audio/speech` (TTS models: `tts-1`, `tts-1-hd`, ElevenLabs voices upstream)
     - `GET /v1/models` (health check)

---

## 2. Logic Chain

1. **Step 1 (Credential Centralization)**:
   - *Premise*: `lib/ai/llm.ts`, `lib/engine/tts.ts`, and 6 orchestrators currently hardcode `http://localhost:20128` and expect `OPENAI_API_KEY` (Observation 1, 2, 3).
   - *Inference*: If a user customizes their OmniRoute Endpoint URL or API Key in Settings, none of these modules will respect the new configuration.
   - *Action*: Centralize credential lookup into a cached resolver function `getOmniRouteConfig()` in `lib/keys.ts` that checks Supabase `settings` (`provider = 'omniroute'`) first, with fallback to environment variables (`OMNIROUTE_URL`, `OMNIROUTE_API_KEY`).

2. **Step 2 (Engine LLM Unification & `lib/engine/llm.ts`)**:
   - *Premise*: User prompt Requirement R3 explicitly names `lib/engine/llm.ts`, but the codebase only contains `lib/ai/llm.ts` (Observation 1). Furthermore, 6 orchestrators duplicate ad-hoc fetch calls (Observation 3).
   - *Inference*: Creating `lib/engine/llm.ts` as a unified facade exporting `complete`, `parseJson`, and `getOmniRouteConfig` fulfills Requirement R3, eliminates duplicated code across `auto-pilot.ts`, `drama-orchestrator.ts`, `bulk-planner.ts`, `scene-matcher.ts`, `stories-orchestrator.ts`, and `shorts-extractor.ts`, and guarantees compliance with User Rule 2 (safe JSON parsing).

3. **Step 3 (Engine TTS Refactoring)**:
   - *Premise*: `lib/engine/tts.ts` prioritizes Azure and OpenAI, hardcodes `http://localhost:20128/v1/audio/speech`, and falls back through deprecated keys (Observation 2).
   - *Inference*: OmniRoute natively implements `POST /v1/audio/speech` (Observation 5).
   - *Action*: Add `'omniroute'` as the primary provider in `lib/engine/tts.ts`, re-order the cascade so `omniroute` is executed first using credentials from `getOmniRouteConfig()`, and remove the hard requirement for `AZURE_SPEECH_KEY` and `OPENAI_API_KEY`.

4. **Step 4 (Settings Storage Alignment)**:
   - *Premise*: `app/api/settings/keys/route.ts` manages a legacy map of 20+ providers (Observation 4).
   - *Inference*: Acceptance criteria R2 requires `POST /api/settings/keys` and `GET /api/settings/keys` to accept and return only OmniRoute credentials with no legacy provider keys.
   - *Action*: Refactor `app/api/settings/keys/route.ts` to upsert and query `{ provider: 'omniroute', base_url, api_key, is_active }`.

---

## 3. Caveats

1. **No External Network Calls in Code-Only / Development Mode**: Live API requests to external cloud endpoints (e.g. OpenAI or ElevenLabs) depend on the local OmniRoute proxy daemon running on `http://localhost:20128`. If OmniRoute is offline, the deterministic mock engines and keyless fallbacks in `lib/engine/tts.ts` and `lib/ai/llm.ts` ensure the application remains stable and operable.
2. **Supabase Schema Columns**: In the Supabase `settings` table, verify whether the column is named `base_url` or `url`. `app/api/settings/keys/route.ts` currently references `base_url` (line 129), and fallback column handling is already implemented in lines 198–210.
3. **Scope Discipline**: As an explorer/surveyor, this investigation is strictly read-only. No application code has been edited.

---

## 4. Conclusion

The engine transition to OmniRoute is straightforward and well-bounded. The optimal refactoring strategy consists of:
1. Creating `lib/keys.ts::getOmniRouteConfig()` (with 15s TTL in-memory cache) to retrieve `{ baseUrl, apiKey }` dynamically from the Supabase `settings` table with env fallback.
2. Creating `lib/engine/llm.ts` and updating `lib/ai/llm.ts` so `complete()` uses `getOmniRouteConfig()` and sends `Authorization: Bearer ${apiKey}` to `${baseUrl}/v1/chat/completions`.
3. Updating `lib/engine/tts.ts` to add `'omniroute'` as the top-priority synthesis provider, routing audio speech requests to `${baseUrl}/v1/audio/speech` with OmniRoute credentials.
4. Refactoring the 6 engine orchestrators (`auto-pilot.ts`, `drama-orchestrator.ts`, `bulk-planner.ts`, `scene-matcher.ts`, `stories-orchestrator.ts`, `shorts-extractor.ts`) and `gemini-character-generator.ts` to replace ad-hoc `OPENAI_API_KEY` checks and raw fetch calls with the unified `complete()` and `parseJson()` helpers.
5. Updating `app/api/settings/keys/route.ts` to exclusively store and return OmniRoute credentials.

---

## 5. Verification Method

Once implemented, the following verification procedure will confirm system correctness:

1. **Database & API Storage Verification**:
   - Send a `POST` request to `/api/settings/keys` with body:
     ```json
     { "provider": "omniroute", "baseUrl": "http://localhost:20128", "apiKey": "sk-test-omniroute-key", "isActive": true }
     ```
   - Verify `GET /api/settings/keys` returns:
     ```json
     { "keys": { "omniroute": { "isConfigured": true, "baseUrl": "http://localhost:20128" } } }
     ```
     with zero legacy provider keys (`openai`, `azure_speech`, `elevenlabs`).

2. **Engine Credential Dynamic Resolution**:
   - Update the base URL in Supabase `settings` to a test port (e.g. `http://localhost:20129`).
   - Invoke `lib/engine/llm.ts::complete(...)` and verify it directs the request to `http://localhost:20129/v1/chat/completions` with header `Authorization: Bearer sk-test-omniroute-key`.

3. **TTS Speech Synthesis**:
   - Invoke `POST /api/tts/preview` with `{ "text": "Testing OmniRoute voice preview", "voiceId": "alloy" }`.
   - Verify the engine attempts `POST /v1/audio/speech` using OmniRoute credentials and returns audio data with `providerUsed: "omniroute"`.

4. **Codebase Grep Verification**:
   - Run grep across `lib/` and `app/api/` to verify zero active dependencies on `process.env.OPENAI_API_KEY` in the engine files or settings storage routes.
