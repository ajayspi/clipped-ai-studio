# BRIEFING — 2026-08-29T11:15:00Z

## Mission
Investigate and design the TTS provider architecture (lib/engine/tts.ts) for Clipped supporting Google Cloud TTS, Coqui TTS, ElevenLabs, fallback chain, mock/dry-run, and 7 languages (EN + 6 Indian languages).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_1
- Original parent: 9f08eecd-2e34-409d-a9fe-a8db847488cb
- Milestone: survey_ext_1 (R1: TTS Providers)

## 🔒 Key Constraints
- Read-only investigation — do NOT modify source code (produce structured report in agent directory)
- Must cover Google Cloud TTS (Neural2, Wavenet, Journey voices, language mappings)
- Must cover Coqui TTS (local/remote API client, voice models, language mappings)
- Must cover ElevenLabs API (multilingual v2, voice ID selection, language mappings)
- Must support English (en-US, en-IN) and 6 Indian languages: Hindi (hi-IN), Tamil (ta-IN), Telugu (te-IN), Kannada (kn-IN), Bengali (bn-IN), Marathi (mr-IN)
- Language code normalization & validation across all 3 providers
- Provider fallback chain (e.g. ElevenLabs -> Google -> Coqui -> Mock)
- Cost-safe dry-run / mock audio generation when API keys absent

## Current Parent
- Conversation ID: 9f08eecd-2e34-409d-a9fe-a8db847488cb
- Updated: 2026-08-29T11:15:00Z

## Investigation State
- **Explored paths**: `PROJECT.md`, `lib/engine/types.ts`, `lib/engine/video-generator.ts`, `lib/engine/drama-orchestrator.ts`, `schema.sql`, `tests/e2e/engine-loader.ts`, `tests/e2e/tier1-feature-coverage.test.ts`
- **Key findings**: Complete mapping for 7 languages across Google Cloud TTS (Neural2/Wavenet), ElevenLabs (`eleven_multilingual_v2`), and Coqui TTS. Fully defined fallback cascade (`ElevenLabs -> Google -> Coqui -> Mock`) and in-memory synthetic PCM WAV dry-run generator.
- **Unexplored areas**: None. Ready for implementation.

## Key Decisions Made
- Use native Web APIs (`fetch`, `crypto`, `Buffer`/`Uint8Array`) with zero external npm dependencies.
- Map language aliases to canonical BCP-47 codes (`en-US`, `en-IN`, `hi-IN`, `ta-IN`, `te-IN`, `kn-IN`, `bn-IN`, `mr-IN`).
- Build in-memory RIFF/WAVE PCM tone generator for zero-cost deterministic dry-runs.
- Implement 2.5s fast timeout on Coqui TTS calls to prevent hanging local route handlers.

## Artifact Index
- `report.md` — Comprehensive TTS architecture, API schemas, and production-ready code blueprint
- `handoff.md` — Standard 5-component handoff report
