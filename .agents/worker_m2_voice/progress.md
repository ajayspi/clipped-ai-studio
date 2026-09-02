# Progress Heartbeat - Worker 2 (Voice Engine & Dynamic Settings)
Last visited: 2026-09-03T04:37:40Z

## Current Status
- Implemented `lib/engine/tts.ts` with Azure Speech REST, OpenAI TTS, Google Cloud TTS, ElevenLabs, Keyless TTS, and deterministic in-memory PCM WAV generator.
- Implemented `app/api/tts/preview/route.ts` with full request parsing, fallback handling, and dataUrl response.
- Implemented `app/api/tts/voices/route.ts` with language/provider filtering and grouped voice responses.
- Implemented `components/wizard/VoiceStep.tsx` with Azure, OpenAI, ElevenLabs, Google, Keyless voices, provider selector, provider badges, and interactive Play/Pause sample preview with browser audio singleton.
- Implemented `app/api/settings/keys/route.ts` and `app/api/settings/keys/check/route.ts` supporting Azure Speech (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`), Google TTS (`GOOGLE_TTS_KEY`), Groq, DeepSeek, OpenRouter, and dynamic custom providers from Supabase.
- Implemented `app/(app)/settings/page.tsx` with:
  - Voice Synthesis Credentials and Voice Model Catalog (Play/Pause preview, filter pills, sound wave animation, badges).
  - Dynamic Custom Providers rendering and "Add Custom API Integration" modal.
- Implemented and registered Milestone 2 test suite `tests/e2e/m2-voice-engine-settings.test.ts` into `tests/e2e/runner.ts`.

## Roadmap
1. [x] Create `app/api/tts/preview/route.ts`.
2. [x] Update `lib/engine/tts.ts` with Azure Speech REST, OpenAI TTS, Google Translate Keyless TTS, and expanded voice catalogs.
3. [x] Create `app/api/tts/voices/route.ts`.
4. [x] Update `components/wizard/VoiceStep.tsx` with Azure, OpenAI, Free/Keyless voice options, provider badges, and interactive Play/Pause sample preview button.
5. [x] Update `app/api/settings/keys/route.ts` & `app/api/settings/keys/check/route.ts` with Azure Speech, Google TTS, dynamic custom provider loading from Supabase, and saving custom integrations.
6. [x] Update `app/(app)/settings/page.tsx` with Voice Model Catalog (Play/Pause preview, filter pills, badges) and "Add Custom API Integration" modal & dynamic custom provider rendering.
7. [x] Add unit/integration tests for TTS and preview routes in `tests/e2e/m2-voice-engine-settings.test.ts`.
8. [ ] Verify and generate handoff report.
