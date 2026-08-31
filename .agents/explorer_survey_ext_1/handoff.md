# Handoff Report: R1 TTS Providers Investigation

**Agent**: `explorer_survey_ext_1`  
**Milestone / Task**: R1: TTS Providers Investigation for Clipped Next.js 14  
**Date**: 2026-08-29  
**Report Artifact**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_1\report.md`  

---

## 1. Observation

1. **Target Requirements**:
   - `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md:13-15`:
     > "### R1. Implement TTS Providers  
     > Build `lib/engine/tts.ts` to interface with Google Cloud TTS, Coqui, and ElevenLabs. MUST support English and 6 Indian languages (Hindi, Tamil, Telugu, Kannada, Bengali, Marathi)."
   - `ORIGINAL_REQUEST.md:25`:
     > "- [ ] `tts.ts` successfully maps language codes (e.g., `hi-IN`, `ta-IN`) across all 3 providers."

2. **Existing Codebase Architecture & Engine Interfaces**:
   - `PROJECT.md:107` and `PROJECT.md:11`: Mentions `lib/engine/tts.ts` and notes that engine singletons should use native `fetch` AI integrations with deterministic, cost-safe dry-run mock fallbacks when API keys are absent.
   - `lib/engine/types.ts:84,120,154,176,257`: All engine workflows (`ai-videos`, `stories`, `bulk-plan`, `micro-drama`, `auto`) accept an optional `voice?: string` parameter.
   - `lib/engine/video-generator.ts:48-93`: Establishes the project pattern for routing live API calls based on environment variables (`KLING_API_KEY`, `LUMA_API_KEY`, `FAL_API_KEY`), catching errors gracefully, and returning a structured response with `metadata.isDryRun`.
   - `schema.sql:43-52, 82-97`: Defines `api_credits` (for quota tracking) and `settings` (for user-level API key storage per provider).
   - `tests/e2e/standalone-runner.js`: Runs E2E integration test suites offline.

3. **Current State of TTS Engine**:
   - `find_by_name` for `*tts*` returned 0 results; `lib/engine/tts.ts` is currently not yet implemented.

---

## 2. Logic Chain

1. **Language Scope & Normalization**:
   - Observations (1.1, 1.2) mandate support for English (`en-US`, `en-IN`) and 6 Indian languages: Hindi (`hi-IN`), Tamil (`ta-IN`), Telugu (`te-IN`), Kannada (`kn-IN`), Bengali (`bn-IN`), and Marathi (`mr-IN`).
   - Callers and UI dropdowns may submit aliases (e.g. `"hindi"`, `"tamil"`, `"en-us"`, `"bn"`).
   - Therefore, `lib/engine/tts.ts` requires a dedicated normalization function `normalizeLanguageCode(input?: string): SupportedLanguage` mapping aliases to canonical BCP-47 identifiers.

2. **Provider Multi-Lingual Integration**:
   - **Google Cloud TTS**: Accepts BCP-47 codes directly in `voice.languageCode`. Supports high-fidelity Neural2 voices for `en-US`, `en-IN`, and `hi-IN`, and Wavenet/Standard voices for `ta-IN`, `te-IN`, `kn-IN`, `bn-IN`, and `mr-IN`.
   - **ElevenLabs**: Uses `eleven_multilingual_v2` model with 2-letter ISO 639-1 language codes (`en`, `hi`, `ta`, `te`, `kn`, `bn`, `mr`) and voice IDs (e.g. Rachel, Domi, Bella, Adam).
   - **Coqui TTS**: Uses `/api/tts` endpoint with `speaker_id` and 2-letter `language_id` (`en`, `hi`, `ta`, `te`, `kn`, `bn`, `mr`).

3. **Resilience & Fallback Strategy**:
   - In accordance with `PROJECT.md` design patterns (Observation 2.2), calls must never crash during testing or missing credentials.
   - The engine implements a 4-tier cascade: `ElevenLabs -> Google Cloud TTS -> Coqui TTS -> Cost-Safe Mock Generator`.
   - All attempts and failure reasons are appended to `metadata.providerAttempts`.

4. **Zero-Cost Mock & Dry-Run Engine**:
   - The dry-run engine generates in-memory standard RIFF/WAVE PCM audio buffers with accurate speech cadence calculation (~150 WPM for English, ~120 WPM for Indian languages) without external network or disk dependencies.

---

## 3. Caveats

- **External Live API Keys**: Live testing against ElevenLabs or Google Cloud TTS requires valid keys in `.env.local`. When unconfigured, the system operates completely in dry-run mock mode.
- **Coqui TTS Local Server**: Requires an active local or remote HTTP server (default `http://localhost:5002`). A 2.5s fast abort timeout is specified to prevent blocking Next.js route handlers if the local daemon is stopped.
- No other caveats.

---

## 4. Conclusion

The TTS engine architecture is fully specified, designed, and documented in `report.md`. The design provides:
1. `normalizeLanguageCode` supporting English + 6 Indian languages.
2. Complete voice and language mappings for Google Cloud TTS, ElevenLabs, and Coqui TTS.
3. Zero-dependency native `fetch` execution with automatic provider fallback cascade.
4. Pure in-memory synthetic PCM WAV dry-run generator.
5. Complete TypeScript interface definitions and ready-to-implement code blueprint.

---

## 5. Verification Method

To verify the investigation and specifications:
1. Inspect `report.md` in `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_1\report.md`.
2. Inspect the proposed TypeScript code in Section 10 of `report.md`.
3. Verify test runner execution with `node tests/e2e/standalone-runner.js` (once `tier6-integration.test.ts` is implemented).
4. Verify language normalization and mock audio generation with isolated unit assertions.
