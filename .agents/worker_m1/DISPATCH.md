## 2026-09-05T03:24:28Z
You are a specialized Worker (worker_m1) executing Milestone 1: Backend Storage & API Keys Route Refactoring.

Working Directory: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\worker_m1
Workspace Directory: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router
Original Request Path: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\ORIGINAL_REQUEST.md
Explorer Handoff: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_backend\handoff.md
Explorer Analysis: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_backend\analysis.md
Scope Document: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files for Milestone 1:
- `lib/keys.ts`
- `app/api/settings/keys/route.ts`
- `app/api/settings/keys/check/route.ts`

Tasks:
1. Read the user request at c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\ORIGINAL_REQUEST.md.
2. Read the backend explorer's report at c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_backend\handoff.md and analysis at c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_backend\analysis.md.
3. Update `lib/keys.ts`:
   - Add `getOmniRouteConfig()` function that looks up OmniRoute configuration from the Supabase `settings` table (`provider = 'omniroute'`), with fallback to `omniroute_endpoint_url` / `omniroute_api_key`, with fallback to environment variables (`OMNIROUTE_URL`, `OMNIROUTE_ENDPOINT_URL`, default `http://localhost:20128` or `http://localhost:20128/v1`, and `OMNIROUTE_API_KEY`).
   - Implement short TTL in-memory caching (e.g., 15–30s) to minimize repeated database queries.
4. Refactor `app/api/settings/keys/route.ts`:
   - Completely remove `PROVIDER_ENV_MAP` and all references to `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, and all other legacy provider keys.
   - Refactor `GET`:
     - Retrieve saved OmniRoute credentials (`endpointUrl`, `maskedApiKey`, `isConfigured`, `source`).
     - Return `{ omniroute: { endpointUrl, maskedApiKey, isConfigured, source }, keys: { omniroute: { endpointUrl, maskedApiKey, isConfigured } } }`.
     - Ensure strictly 0 legacy provider keys (`openai`, `azure_speech`, `elevenlabs`, etc.) are returned in the response.
   - Refactor `POST`:
     - Accept `{ endpointUrl, apiKey }`, or `{ provider: 'omniroute', endpointUrl, apiKey }`.
     - Validate that `endpointUrl` is provided and is a valid URL starting with `http://` or `https://`.
     - Reject submissions specifying legacy providers (e.g., `provider === 'openai'`) with a 400 Bad Request: `{ error: "Individual AI providers are deprecated. Only OmniRoute configuration is supported." }`.
     - Safely persist OmniRoute credentials in the Supabase `settings` table. Support schema column fallback (if `base_url` does not exist on table, store via deterministic provider keys like `omniroute_endpoint_url` and `omniroute_api_key`, and `provider = 'omniroute'`).
5. Refactor `app/api/settings/keys/check/route.ts`:
   - Remove legacy provider branches (`openai`, `azure`, `elevenlabs`, `google_tts`, etc.).
   - Support checking OmniRoute connectivity by pinging `${endpointUrl}/models` (or `${endpointUrl}/v1/models`) with the provided or stored `apiKey`.
   - Return latency in milliseconds and available models list.
6. Verify your implementation:
   - Run typecheck or test verification on the affected routes.
   - Verify that grep search across `app/api/settings/keys/route.ts` confirms 0 occurrences of `OPENAI_API_KEY`.
   - Write unit/integration verification scripts and run them.
7. Write your changes and test results to `handoff.md` in your working directory with the standard sections: Observation, Logic Chain, Caveats, Conclusion, Verification Methods.
8. Send a message back to parent when done.
