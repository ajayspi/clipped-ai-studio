## 2026-08-29T11:14:03Z

You are a Worker implementing Milestone 6A: TTS Engine for the "Clipped" Next.js 14 project.
Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m6a
Project root: C:\Users\vigilare\.gemini\antigravity\scratch\clipped
Authoritative Request File: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md
Scope Document: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\orchestrator\SCOPE.md
Survey Reference: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_1\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership: You exclusively own `lib/engine/tts.ts`. Do NOT edit files owned by other workers.

Implementation Tasks:
- Implement `lib/engine/tts.ts` in full TypeScript.
- Support English (`en-US`, `en-IN`) and 6 Indian languages: Hindi (`hi-IN`), Tamil (`ta-IN`), Telugu (`te-IN`), Kannada (`kn-IN`), Bengali (`bn-IN`), Marathi (`mr-IN`).
- Implement `normalizeLanguageCode` function handling uppercase/lowercase and language aliases.
- Implement Google Cloud Text-to-Speech API integration (`GOOGLE_TTS_API_KEY` / `GOOGLE_APPLICATION_CREDENTIALS` / REST endpoint) with Neural2/Wavenet/Standard/Journey voice mapping.
- Implement Coqui TTS API integration (`COQUI_TTS_URL`, default `http://localhost:5002/api/tts`, with language_id, speaker_id, 2.5s fast timeout guard).
- Implement ElevenLabs API integration (`ELEVENLABS_API_KEY`, `eleven_multilingual_v2` model, voice presets).
- Implement fallback cascade: `ElevenLabs -> Google -> Coqui -> Mock`.
- Implement pure in-memory deterministic synthetic RIFF/WAVE PCM buffer generator when API keys are absent or `mock: true`, computing speech duration based on word count (~150 WPM English, ~120 WPM Indian languages).
- Export `export const ttsEngine: TTSEngine` singleton, `TTSEngine` class, and all relevant interfaces/types.
- Test your implementation directly using node scripts or TypeScript checks.
- Document changes in `changes.md` and deliver `handoff.md` in your working directory.
- Notify parent using send_message when done.
