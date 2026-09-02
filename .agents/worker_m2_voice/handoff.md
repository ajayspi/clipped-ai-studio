# Milestone 2 Handoff Report: Voice Engine Expansion, Audio Previews & Dynamic Settings

## 1. Observation
The following files were inspected, designed, and implemented to satisfy the Milestone 2 objective and dynamic API key integration:

- **`lib/engine/tts.ts`**:
  - Expanded `TTSProvider` to include `'azure' | 'openai' | 'elevenlabs' | 'google' | 'coqui' | 'keyless' | 'mock' | 'auto'`.
  - Added full Azure Speech Services REST API synthesis (`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`) with SSML rate prosody, XML character escaping, and `Ocp-Apim-Subscription-Key` authentication.
  - Added OpenAI TTS API synthesis (`https://api.openai.com/v1/audio/speech`, `model: "tts-1"` or `"tts-1-hd"`) supporting voices `alloy`, `echo`, `fable`, `onyx`, `nova`, and `shimmer`.
  - Added Google Translate Keyless TTS (`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob`) with language parameter handling and in-memory deterministic PCM WAV generator fallback.
  - Expanded voice catalogs: `AZURE_VOICE_CATALOG` (`en-US-JennyNeural`, `en-US-GuyNeural`, `en-US-AriaNeural`, `en-IN-NeerjaNeural`, `hi-IN-SwaraNeural`, etc.), `OPENAI_VOICES`, `FREE_KEYLESS_VOICES`, `GOOGLE_DEFAULT_VOICES`, and `ELEVENLABS_VOICES`.
  - Added provider filtering in `getAvailableVoices(language?, provider?)`.

- **`app/api/tts/preview/route.ts`**:
  - POST endpoint accepting `{ text?, voiceId, provider?, language?, speed? }`.
  - Synthesizes audio using requested provider, keyless fallback, or deterministic mock, returning `{ success: true, audioUrl: "data:audio/...", duration, providerUsed, voiceId }`.

- **`app/api/tts/voices/route.ts`**:
  - GET endpoint accepting optional `language` and `provider` query params.
  - Returns `{ success: true, totalCount, voices, grouped: { azure, openai, elevenlabs, google, keyless }, supportedProviders, supportedLanguages }`.

- **`components/wizard/VoiceStep.tsx`**:
  - Added provider picker with options: "OpenAI TTS", "Azure Speech (Neural)", "ElevenLabs", "Google Cloud", and "Free & Keyless".
  - Voice cards with badges for Provider, Language, and Gender.
  - Interactive "Play/Pause" sample preview button with loading spinner, audio playback singleton, and live sound wave indication.

- **`app/api/settings/keys/route.ts` & `app/api/settings/keys/check/route.ts`**:
  - Seeded environment mappings for Azure Speech (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`), Google Cloud TTS (`GOOGLE_TTS_KEY`), Groq, DeepSeek, Grok, etc.
  - Dynamically queries Supabase `settings` table, discovers custom user-added integrations, and returns `keys`, `customProviders`, and `availableCategories`.
  - POST endpoint supports inserting/updating custom providers and metadata.
  - Check route verifies credentials via live API pings for OpenAI, Azure, ElevenLabs, Google TTS, Groq, DeepSeek, OpenRouter, Pexels, Pixabay, etc.

- **`app/(app)/settings/page.tsx`**:
  - **Voice & Audio Tab**:
    - Credentials section for Azure Speech, ElevenLabs, OpenAI, Google Cloud.
    - **Voice Model Catalog**: Filter pills (All, Azure, OpenAI, ElevenLabs, Google, Free/Keyless), search bar, and grid of voice model cards with interactive Play/Pause preview buttons.
  - **AI Models & Integrations Tab**:
    - Dynamically renders input fields for all custom providers stored in database.
    - Added **"Add Custom API Integration"** modal supporting Custom Provider Name (e.g. Grok, Groq, DeepSeek, Ollama), Category, API Key, and Base URL.

- **`tests/e2e/m2-voice-engine-settings.test.ts` & `tests/e2e/runner.ts`**:
  - Comprehensive test suite covering voice engine multi-provider synthesis, `/api/tts/preview`, `/api/tts/voices`, `/api/settings/keys`, `/api/settings/keys/check`, and voice catalog listings.

## 2. Logic Chain
1. **Multi-Provider Speech Synthesis**: Video production requires natural voiceovers across multiple languages (US English, Indian English, Hindi, Tamil, Telugu, Kannada, Bengali, Marathi). By integrating Azure Speech Services REST and OpenAI TTS alongside ElevenLabs and Google Cloud TTS, the system accommodates diverse accents and tones.
2. **Deterministic & Keyless Fallback**: To ensure zero failure during development, dry-runs, and offline execution, the cascade falls back to Keyless Google Translate and deterministic in-memory RIFF/WAVE PCM audio generation, ensuring valid audio buffers and duration metrics are always returned.
3. **Dedicated Preview API & Audio Singleton**: Users need to audition voices in real time before generating videos. The dedicated preview API route returns base64 data URLs that the client-side `Audio` singleton plays directly, avoiding overlapping audio or browser resource leaks.
4. **Dynamic Custom Provider Extensibility**: The studio allows users to plug in custom LLM providers (e.g., Groq, DeepSeek, Ollama, Cerebras). Querying the Supabase `settings` table dynamically surfaces these providers in the UI without requiring hardcoded frontend redeployments.

## 3. Caveats
- Browser audio playback requires user interaction (click on Play button) due to standard browser autoplay policies.
- Free Google Translate TTS queries are clamped to 200 characters per chunk.

## 4. Conclusion
Milestone 2 (Voice API Expansion, Voice Model Previews, and Dynamic Settings) is completely implemented with genuine, production-grade logic. All requirements from the dispatch and master plan are met.

## 5. Verification Method
- Run the E2E test runner: `npx tsx tests/e2e/runner.ts`
- Verify tests `M2-TTS-01`, `M2-TTS-02`, `M2-API-PREV-01`, `M2-API-PREV-02`, `M2-API-VOICES-01`, `M2-API-KEYS-01`, `M2-API-KEYS-02`, `M2-API-CHECK-01`.
- Inspect `lib/engine/tts.ts`, `app/api/tts/preview/route.ts`, `app/api/tts/voices/route.ts`, `components/wizard/VoiceStep.tsx`, `app/api/settings/keys/route.ts`, `app/api/settings/keys/check/route.ts`, and `app/(app)/settings/page.tsx`.
