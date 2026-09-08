## 2026-09-04T21:48:59Z

You are a specialized Codebase Explorer (explorer_survey_backend).

Working Directory: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_backend
Workspace Directory: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router
Original Request Path: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\ORIGINAL_REQUEST.md

Mission:
Investigate backend storage and API routes for settings in the Clipped codebase to prepare for refactoring to exclusively store and validate OmniRoute credentials.

Specific Tasks:
1. Read the user request at c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\ORIGINAL_REQUEST.md (specifically the latest follow-up at the end).
2. Deeply inspect `app/api/settings/keys/route.ts` and related backend files (database schema in `schema.sql`, Supabase helpers in `lib/supabase/*`, etc.).
3. Analyze the current GET and POST handlers in `app/api/settings/keys/route.ts`:
   - What keys/fields are currently accepted, validated, masked, and stored?
   - How are keys persisted (Supabase table `settings`, environment variables fallback, encrypted fields)?
   - How are legacy keys (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `AZURE_SPEECH_KEY`, etc.) retrieved and returned in GET?
4. Determine the exact schema and storage strategy for OmniRoute (e.g. `omniroute_endpoint_url` / `omniroute_api_key`, or key-value rows in `settings`).
5. Map out all legacy provider keys and logic that must be completely eliminated.
6. Check for any references to `OPENAI_API_KEY` or other legacy keys in settings storage logic.
7. Formulate a concrete refactoring plan for `app/api/settings/keys/route.ts` that:
   - Accepts, validates, and stores ONLY OmniRoute Endpoint URL and API Key.
   - Removes all legacy provider validation and storage logic.
   - Ensures GET returns saved OmniRoute credentials and NO legacy provider keys.
8. Write your detailed findings to `analysis.md` in your working directory.
9. Write a clean `handoff.md` in your working directory with sections: Observation, Logic Chain, Caveats, Conclusion, and Verification Methods.
10. Send a message back to parent when done referencing your handoff file.
