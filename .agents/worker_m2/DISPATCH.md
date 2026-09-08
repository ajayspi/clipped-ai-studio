## 2026-09-04T22:00:50Z

You are a specialized Worker (worker_m2) executing Milestone 2: Engine Integration Updates.

Working Directory: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\worker_m2
Workspace Directory: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router
Original Request Path: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\ORIGINAL_REQUEST.md
Engine Explorer Handoff: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_engine\handoff.md
Engine Explorer Analysis: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_engine\analysis.md
Scope Document: c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files for Milestone 2:
- `lib/engine/llm.ts`
- `lib/ai/llm.ts`
- `lib/engine/tts.ts`
- `lib/engine/auto-pilot.ts`
- `lib/engine/drama-orchestrator.ts`
- `lib/engine/bulk-planner.ts`
- `lib/engine/scene-matcher.ts`
- `lib/engine/stories-orchestrator.ts`
- `lib/engine/shorts-extractor.ts`
- `lib/ai/gemini-character-generator.ts`

Tasks:
1. Read the user request at c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\ORIGINAL_REQUEST.md.
2. Read the engine explorer handoff at c:\Users\vigilare\.gemini\antigravity\scratch\clipped-omni-router\.agents\explorer_survey_engine\handoff.md and analysis.md.
3. Create `lib/engine/llm.ts` as the unified LLM engine facade:
   - Import `getOmniRouteConfig` from `@/lib/keys`.
   - Export `complete(request: { system: string; user: string; maxTokens?: number; json?: boolean }, provider?: string, model?: string): Promise<string>` that fetches OmniRoute credentials dynamically, issues `POST ${baseUrl}/v1/chat/completions` with header `Authorization: Bearer ${apiKey}`, and includes fallback handling if offline.
   - Export `parseJson<T>(content: string, fallback?: T): T` using safe parsing (per Rule 2: NEVER use raw JSON.parse on LLM output).
4. Update `lib/ai/llm.ts`:
   - Connect `complete()` to use `getOmniRouteConfig()` dynamically with `Authorization: Bearer ${apiKey}`.
5. Update `lib/engine/tts.ts`:
   - Add `'omniroute'` to `TTSProvider` and update the auto cascade to prioritize `'omniroute'` first.
   - Implement `synthesizeOmniRoute(request: TTSRequest): Promise<TTSResponse>` using `getOmniRouteConfig()` to post to `${baseUrl}/v1/audio/speech` with `Authorization: Bearer ${apiKey}`.
   - Remove hard requirements and errors for `OPENAI_API_KEY` and `AZURE_SPEECH_KEY`.
6. Update engine orchestrators (`auto-pilot.ts`, `drama-orchestrator.ts`, `bulk-planner.ts`, `scene-matcher.ts`, `stories-orchestrator.ts`, `shorts-extractor.ts`, `gemini-character-generator.ts`):
   - Replace direct checks on `process.env.OPENAI_API_KEY` and duplicated raw `fetch('http://localhost:20128/v1/chat/completions')` calls with `complete` and `parseJson` from `lib/engine/llm` or `lib/ai/llm`.
7. Verify all changes compile cleanly (`npx tsc --noEmit`).
8. Create a test script to verify that `lib/engine/llm.ts` and `lib/engine/tts.ts` resolve OmniRoute credentials.
9. Write `handoff.md` in your working directory with the standard sections: Observation, Logic Chain, Caveats, Conclusion, Verification Methods.
10. Send a message back to parent when done.
