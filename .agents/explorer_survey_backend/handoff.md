# Handoff Report: Backend Storage & Settings API Route Investigation

**Role**: `explorer_survey_backend` (Teamwork Explorer)  
**Recipient**: Parent Orchestrator (`ff4c3bf1-5754-474e-a782-3fbe0b4f7fd2`)  
**Working Directory**: `c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_backend`  
**Workspace**: `c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router`  
**Timestamp**: 2026-09-05T03:25:00+05:30  
**Handoff Type**: Hard Handoff (Investigation Complete)  

---

## 1. Observation

Direct code inspections and searches across the workspace revealed the following:

1. **`app/api/settings/keys/route.ts:11-44`**:
   Contains `PROVIDER_ENV_MAP` with 25 provider configurations across 4 categories:
   - AI Models: `gemini`, `openai`, `anthropic`, `openrouter`, `fal`, `grok`, `groq`, `deepseek`, `mistral`, `cerebras`, `github_models`, `ollama`
   - Stock Media: `pexels`, `pixabay`, `kling`, `luma`, `huggingface`
   - Voice & Audio: `azure_speech`, `azure_region`, `elevenlabs`, `google_tts`, `deepgram`, `suno`
   - Avatar: `heygen`, `did`
   Line 14 specifically specifies:
   ```ts
   openai: { envVars: ['OPENAI_API_KEY'], category: 'AI Models', name: 'OpenAI' },
   ```

2. **`app/api/settings/keys/route.ts:76-99`**:
   The `GET()` handler iterates over `PROVIDER_ENV_MAP`, inspects `process.env` for every legacy provider key, and seeds `result[provider]` and `result['api_' + provider]`:
   ```ts
   for (const [provider, config] of Object.entries(PROVIDER_ENV_MAP)) {
     let envKey: string | undefined;
     for (const envVar of config.envVars) {
       if (process.env[envVar]) {
         envKey = process.env[envVar];
         break;
       }
     }
     ...
     result[provider] = entry;
     result[`api_${provider}`] = entry;
   }
   ```
   It then queries `supabaseAdmin.from('settings').select('*')` (line 104) and returns all merged keys and dynamic custom providers in the response (lines 153–157).

3. **`app/api/settings/keys/route.ts:160-252`**:
   The `POST()` handler accepts `{ provider, apiKey, isActive, category, baseUrl, name }` and executes an upsert against the `settings` table matching `provider`. If column update fails (due to missing `category`, `base_url`, `name`), it falls back to `{ api_key, is_active }`.

4. **`schema.sql:82-93`**:
   The baseline PostgreSQL schema defines the `settings` table as:
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
   Columns `base_url`, `category`, and `name` are **not** present in the core `schema.sql`.

5. **`lib/keys.ts:10-15`**:
   The helper function `getApiKey(provider, envVarName)` looks up keys via:
   ```ts
   const { data: keyData } = await supabase
     .from('settings')
     .select('api_key')
     .eq('provider', provider)
     .is('user_id', null)
     .single();
   ```

6. **`app/api/settings/keys/check/route.ts:27-52` and `app/api/settings/test/route.ts:16-44`**:
   `check/route.ts` line 28 contains `openai: ['OPENAI_API_KEY']` and legacy ping endpoints. `test/route.ts` line 24 contains `openai: env.OPENAI_API_KEY`.

---

## 2. Logic Chain

1. **Observations 1 & 2** demonstrate that the current `GET /api/settings/keys` endpoint directly injects and returns 25 legacy providers into the JSON response whenever environment variables or database rows exist.
2. The user requirement strictly dictates:
   > *"Refactor the Settings page of the Clipped application to exclusively support a single OmniRoute/OpenRouter configuration. Remove all individual AI provider settings (OpenAI, Gemini, Azure, etc.) and replace them with a single panel to input the OmniRoute Endpoint URL and API Key."*  
   > Acceptance Criteria: *"Sending a GET request to `/api/settings/keys` successfully retrieves the saved OmniRoute credentials and contains no legacy provider keys."*  
   > Acceptance Criteria: *"Code search confirms no active references to `OPENAI_API_KEY` remain in the API settings storage logic."*
3. Therefore, removing `PROVIDER_ENV_MAP` and all references to `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, `ELEVENLABS_API_KEY`, etc. from `app/api/settings/keys/route.ts` is mandatory.
4. **Observation 4** indicates that the core `settings` table schema only has `provider` and `api_key` columns (no `base_url` column guaranteed). Attempting to update `base_url` on standard PostgreSQL causes a fatal SQL error.
5. **Observation 5** demonstrates that existing engine files and helpers retrieve configuration using `getApiKey(provider)`.
6. Therefore, an OmniRoute storage strategy storing:
   - `provider = 'omniroute'` (`api_key` = API Key, with `base_url` = Endpoint URL if column exists)
   - `provider = 'omniroute_endpoint_url'` (`api_key` = Endpoint URL)
   - `provider = 'omniroute_api_key'` (`api_key` = API Key)
   satisfies all database schema constraints, requires zero schema migrations, and provides 100% interoperability with `lib/keys.ts`.
7. **Observation 3** shows that the current POST handler accepts arbitrary provider strings without URL validation. Upgrading POST to validate HTTP/HTTPS endpoint URLs and reject deprecated legacy providers ensures that the system will never re-admit individual provider keys.

---

## 3. Caveats

1. **Database Schema Variance**: In some live Supabase environments, a migration might have added `base_url` to `settings`, whereas in baseline Docker/local Postgres (`schema.sql`), that column is absent. The proposed dual/triple-write pattern with try/catch fallback safely bridges both environments.
2. **Settings Check Route (`check/route.ts`)**: `app/api/settings/keys/check/route.ts` is a sub-route of `keys`. While the core task centers on `app/api/settings/keys/route.ts`, `check/route.ts` also contains references to `OPENAI_API_KEY` and legacy validation logic. It is strongly recommended to refactor `check/route.ts` alongside `keys/route.ts` to prevent test/audit failures.
3. **Local OmniRoute Gateway Default**: The local OmniRoute gateway runs on `http://localhost:20128` (as defined in `ecosystem.config.js`). This should be the default fallback if no URL is set in DB or env.

---

## 4. Conclusion

1. `app/api/settings/keys/route.ts` can be cleanly refactored without breaking downstream consumers by replacing `PROVIDER_ENV_MAP` with an exclusive OmniRoute configuration handler.
2. The new `GET` handler must return:
   - Saved OmniRoute credentials (`endpointUrl`, `maskedApiKey`, `isConfigured`, `source`)
   - `keys` dictionary containing only `omniroute`, `omniroute_endpoint_url`, and `omniroute_api_key`
   - Zero legacy provider keys (no `openai`, `azure`, `elevenlabs`, `gemini`, etc.)
3. The new `POST` handler must:
   - Accept `{ endpointUrl, apiKey }`, `{ omniroute_endpoint_url, omniroute_api_key }`, or `{ provider: 'omniroute', endpointUrl, apiKey }`
   - Validate that `endpointUrl` is a valid HTTP/HTTPS URL
   - Reject legacy provider submissions with a 400 Bad Request
   - Persist to the `settings` table using the robust dual/triple-key fallback pattern
4. The full refactoring plan and drop-in code specification have been recorded in `analysis.md`.

---

## 5. Verification Method

To verify the refactored implementation once applied:

1. **GET Verification**:
   Send a GET request to `/api/settings/keys` (or run a test script invoking `GET()`):
   - Verify HTTP 200 response.
   - Verify `json.keys.omniroute` is defined.
   - Verify `json.keys.openai === undefined`, `json.keys.azure_speech === undefined`, `json.keys.elevenlabs === undefined`.
   - Verify `json.availableCategories` does not list deprecated provider groups.

2. **POST Verification**:
   Send a POST request with OmniRoute credentials:
   ```bash
   curl -X POST http://localhost:3000/api/settings/keys \
     -H "Content-Type: application/json" \
     -d '{"endpointUrl": "http://localhost:20128", "apiKey": "sk-test-omniroute-12345"}'
   ```
   - Verify HTTP 200 response with `{ success: true, omniroute: { isConfigured: true } }`.
   - Query GET immediately after to verify `maskedApiKey` ends in `1234` and `endpointUrl` is `http://localhost:20128`.

3. **Legacy Provider Rejection Verification**:
   Send a POST request with legacy provider:
   ```bash
   curl -X POST http://localhost:3000/api/settings/keys \
     -H "Content-Type: application/json" \
     -d '{"provider": "openai", "apiKey": "sk-legacy-1234"}'
   ```
   - Verify HTTP 400 Bad Request: `"Individual AI providers are deprecated. Only OmniRoute configuration is supported."`

4. **Code Search Verification**:
   Run grep search across `app/api/settings/keys/route.ts`:
   - Confirm 0 occurrences of `OPENAI_API_KEY`.
   - Confirm 0 occurrences of `PROVIDER_ENV_MAP`.
