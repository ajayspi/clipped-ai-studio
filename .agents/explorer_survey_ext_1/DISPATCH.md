## 2026-08-29T11:10:00Z

You are an Explorer investigating R1: TTS Providers for the "Clipped" Next.js 14 project.
Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_1
Project root: C:\Users\vigilare\.gemini\antigravity\scratch\clipped
Authoritative Request: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md

Task:
1. Read ORIGINAL_REQUEST.md and examine the existing codebase in lib/engine/*, lib/db.ts, schema.sql, etc.
2. Investigate the design and implementation specifications for `lib/engine/tts.ts` supporting:
   - Google Cloud Text-to-Speech (Neural2, Wavenet, Journey voices, languageCode mappings).
   - Coqui TTS API (local/remote API client, voice models, language mappings).
   - ElevenLabs API (multilingual v2, voice ID selection, language mappings).
   - Full support for English (en-US / en-IN) and 6 Indian languages: Hindi (hi-IN), Tamil (ta-IN), Telugu (te-IN), Kannada (kn-IN), Bengali (bn-IN), Marathi (mr-IN).
   - Language code normalization & validation across all 3 providers.
   - Provider fallback chain (e.g. ElevenLabs -> Google -> Coqui -> Mock).
   - Cost-safe dry-run / mock audio generation when API keys are absent.
3. Write a comprehensive specification and analysis report to:
   `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_1\report.md`
   and write a standard `handoff.md` in your working directory.
4. Notify parent using send_message with your report summary when complete.
