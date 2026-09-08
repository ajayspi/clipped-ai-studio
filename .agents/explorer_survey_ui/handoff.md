# Handoff Report: Settings Page Survey & OmniRoute Refactoring

**Agent**: `explorer_survey_ui`  
**Working Directory**: `c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_ui`  
**Handoff Type**: Hard (Task Complete)  
**Target Milestone**: OmniRoute Single Configuration Panel Refactor  

---

## 1. Observation

Direct code observations from the inspected files:

1. **`app/(app)/settings/page.tsx` (1,608 lines, 80,965 bytes)**:
   - Contains `BASE_PROVIDERS` at lines 73–102 defining 21 legacy providers:
     - AI Models: `api_openai` ("OpenAI (GPT-4o & TTS)"), `api_gemini` ("Google Gemini"), `api_anthropic` ("Anthropic Claude"), `api_openrouter` ("OpenRouter"), `api_groq` ("Groq Cloud (Fast Llama)"), `api_deepseek` ("DeepSeek API"), `api_grok` ("xAI Grok"), `api_fal` ("Fal.ai").
     - Voice & Audio: `api_azure_speech` ("Azure Speech Services (Neural TTS)"), `api_azure_region` ("Azure Speech Region (e.g. eastus)"), `api_elevenlabs` ("ElevenLabs Voice AI"), `api_google_tts` ("Google Cloud Text-to-Speech"), `api_deepgram` ("Deepgram Audio"), `api_suno` ("Suno AI Music").
     - Stock Media: `api_pexels`, `api_pixabay`, `api_kling`, `api_luma`, `api_huggingface`.
     - Avatar: `api_heygen`, `api_did`.
   - "Voice Synthesis Credentials" card at lines 728–813 renders individual password inputs and test buttons for each voice provider (Azure, ElevenLabs, etc.).
   - Header button "Add Custom API" at lines 661–667 and tab button at lines 1305–1314 trigger the custom provider modal.
   - "Add Custom API Integration Modal" at lines 1400–1521 (`showCustomModal`) manages custom keys and base URLs.
   - Batch diagnostics `testAll()` and button at lines 669–675 test all legacy keys in parallel.
   - "API Health Hub" panel at lines 1590–1605 renders `<ApiProviderHub />`.

2. **`components/settings/ApiProviderHub.tsx` (452 lines, 18,824 bytes)**:
   - Pings `/api/settings/health` every 2 minutes and renders individual status cards for each provider in `PROVIDER_REGISTRY` (OpenAI, Anthropic, Gemini, Azure, ElevenLabs, etc.).

3. **`app/api/settings/keys/route.ts` (253 lines, 9,662 bytes)**:
   - `PROVIDER_ENV_MAP` (lines 11–44) hardcodes environment variable arrays for 20+ legacy providers (e.g., `openai: ['OPENAI_API_KEY']`, `azure_speech: ['AZURE_SPEECH_KEY', ...]`, `elevenlabs: ['ELEVENLABS_API_KEY', ...]`).
   - `GET` (lines 52–158) returns `{ keys: Record<string, ApiKeyData>, customProviders: [...] }` containing all individual legacy providers.
   - `POST` (lines 160–252) accepts `{ provider, apiKey, category, baseUrl, name }` and upserts into Supabase `settings` table.

4. **`app/api/settings/keys/check/route.ts` (136 lines, 5,144 bytes)**:
   - Hardcodes distinct verification branches for `openai` (line 63), `azure` (line 68), `elevenlabs` (line 75), `google_tts` (line 81), `groq` (line 86), `deepseek` (line 92), `openrouter` (line 98).
   - Notably, line 63 already tests OpenAI compatibility via:
     `fetch('http://localhost:20128/v1/models', { headers: { Authorization: `Bearer ${key}` } })`

5. **`lib/ai/llm.ts` (73 lines)**:
   - Line 49 already executes requests against `http://localhost:20128/v1/chat/completions`.

6. **UI Component Design System**:
   - Uses Tailwind dark theme tokens: `bg-card`, `bg-muted/20`, `border-border/40`, `text-primary`, `text-muted-foreground`.
   - Cards use `rounded-xl border bg-card shadow-sm overflow-hidden`.
   - Inputs use `flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring`.
   - Framer motion active tabs use layout pill `<motion.div layoutId="active-tab" ... />`.

---

## 2. Logic Chain

1. **User Mandate Requirements**:
   - The user request explicitly demands: "Modify the SettingsPage to remove all individual AI provider panels (Azure, OpenAI, ElevenLabs, etc.). Create a single 'OmniRoute Configuration' panel containing input fields for an Endpoint URL and an API Key. Use the existing Shadcn UI design patterns."
   - Acceptance criteria require: "Visual inspection confirms that individual provider panels (Azure, OpenAI, ElevenLabs) are completely removed from the UI code. A single OmniRoute panel is present and accepts URL and Key inputs."
   - Backend requirements require: "Update the backend API route for settings (`app/api/settings/keys/route.ts`) to accept, validate, and store only the OmniRoute Endpoint URL and API Key. Remove all storage and validation logic pertaining to the deprecated individual provider keys."

2. **Necessity of Eliminating `BASE_PROVIDERS` and Custom Modal**:
   - Since `BASE_PROVIDERS` contains static records for `api_openai`, `api_azure_speech`, `api_elevenlabs`, `api_gemini`, etc., and renders them via `.map()`, removing this array and its rendering loop guarantees complete removal of individual provider panels from the UI code.
   - Similarly, the custom provider modal and "Add Custom API" button were added for arbitrary legacy keys and are redundant under the single OmniRoute paradigm.

3. **Consolidation into a Single Panel**:
   - By creating a single `OmniRoute Configuration` panel on the primary tab of `SettingsPage`, users get a dedicated interface with:
     - `Endpoint URL` input (defaulting to `http://localhost:20128/v1` with quick presets for local or OpenRouter).
     - `API Key` input (password field with visibility toggle).
     - `Save Configuration` button (calls `POST /api/settings/keys`).
     - `Test Connection` button (calls `POST /api/settings/keys/check` which pings `${endpoint}/models`).
     - Real-time diagnostic feedback banner displaying latency (ms) and available models.

4. **Preservation of Unrelated Capabilities**:
   - The `Database & Supabase` tab (custom project URL, anon key, schema table checklist, and DDL viewer), `Brand Kits` tab, and `Usage & Quotas` tab are unrelated to individual AI keys and must be preserved intact.
   - The `Voice & Audio` credentials card must be removed, while the voice audition catalog can be retained as a showcase previewing models through OmniRoute.

---

## 3. Caveats

1. **Local OmniRoute Server Running Requirement**:
   - The local OmniRoute server runs on `http://localhost:20128`. If the background server is stopped, connection tests to `http://localhost:20128/v1/models` will return connection refused (`ECONNREFUSED`). The UI test handler must handle this error gracefully with clear instructions to start the gateway.
2. **Stock Media Providers**:
   - Providers like Pexels and Pixabay were in `BASE_PROVIDERS`. The user prompt specifies removing all *individual AI provider panels* (Azure, OpenAI, ElevenLabs, Gemini, etc.). If stock media keys are not needed or handled via keyless proxies / built-in fallbacks, removing `BASE_PROVIDERS` cleanly satisfies the acceptance criteria.
3. **Database Schema Constraints**:
   - In Supabase, the `settings` table has columns `(id, user_id, provider, api_key, is_active, priority)`. Some deployments may not have a dedicated `base_url` column. The backend must support saving the endpoint URL either in `base_url` or via a deterministic key convention (e.g. `provider = 'omniroute'` with `base_url`, and fallback storage if column does not exist).

---

## 4. Conclusion

The Settings page is primed for refactoring. The path forward is unambiguous:
1. Strip all individual AI provider panels (`BASE_PROVIDERS`, Voice Credentials card, Custom Provider Modal, Legacy Batch Diagnostics, and `ApiProviderHub`) from `app/(app)/settings/page.tsx`.
2. Replace them with a single "OmniRoute Configuration" panel featuring Endpoint URL and API Key inputs, Save and Test Connection buttons, and a status banner.
3. Update `app/api/settings/keys/route.ts` to manage only OmniRoute credentials (`endpoint`, `apiKey`) and remove all legacy `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, etc. mappings.
4. Update `app/api/settings/keys/check/route.ts` to verify the OmniRoute `/models` endpoint directly.
5. Ensure `lib/ai/llm.ts` and `lib/engine/tts.ts` fetch credentials from the new OmniRoute settings.

All details and exact implementation blueprints are documented in `analysis.md`.

---

## 5. Verification Method

To verify the refactoring when implemented:

1. **Settings UI Code Inspection**:
   - Run grep on `app/(app)/settings/page.tsx` for `api_openai`, `api_azure`, `api_elevenlabs`, `BASE_PROVIDERS`.
   - Invalidation condition: If any individual provider card or input for Azure, OpenAI, or ElevenLabs exists in `page.tsx`, verification fails.

2. **UI Render Verification**:
   - Start Next.js dev server: `npm run dev`.
   - Navigate to `http://localhost:3000/settings`.
   - Invalidation condition: Any React error, blank screen, or console error fails verification.

3. **Backend Key Storage Verification**:
   - Run:
     ```bash
     curl -s -X POST http://localhost:3000/api/settings/keys \
       -H "Content-Type: application/json" \
       -d '{"provider":"omniroute","endpoint":"http://localhost:20128/v1","apiKey":"sk-test-omniroute"}'
     ```
   - Verify HTTP 200 and `{ "success": true }`.
   - Run:
     ```bash
     curl -s http://localhost:3000/api/settings/keys
     ```
   - Invalidation condition: If response contains `api_openai`, `api_azure`, `api_elevenlabs`, or fails to return the saved OmniRoute endpoint, verification fails.

4. **Connection Test Verification**:
   - Run:
     ```bash
     curl -s -X POST http://localhost:3000/api/settings/keys/check \
       -H "Content-Type: application/json" \
       -d '{"provider":"omniroute","endpoint":"http://localhost:20128/v1","apiKey":"dummy"}'
     ```
   - Verify response returns `{ "success": true, "latencyMs": ..., "models": [...] }`.
