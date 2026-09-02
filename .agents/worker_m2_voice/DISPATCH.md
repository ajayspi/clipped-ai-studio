## 2026-09-03T04:31:33Z
Objective: Implement Milestone 2 (Voice API Expansion & Audio Previews) PLUS Dynamic API Keys & Custom API Integration:
1. Update `lib/engine/tts.ts`:
   - Add Azure Speech Services REST synthesis (`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`) with SSML prosody rate and `Ocp-Apim-Subscription-Key`.
   - Add OpenAI TTS synthesis (`https://api.openai.com/v1/audio/speech`, `model: "tts-1"`).
   - Add/expand Free & Keyless TTS synthesis (Google Translate TTS + deterministic high-fidelity in-memory PCM WAV generator).
   - Expand voice catalog with Azure voices (`en-US-JennyNeural`, `en-US-GuyNeural`, `en-US-AriaNeural`, `en-IN-NeerjaNeural`, `hi-IN-SwaraNeural`), OpenAI voices (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`), ElevenLabs, Google Cloud, and Free/Keyless voices.
2. Create dedicated preview API routes:
   - `app/api/tts/preview/route.ts`: POST endpoint accepting `{ text?, voiceId, provider?, language?, speed? }`. Synthesizes audio with provider or keyless fallback and returns `{ success: true, audioUrl: "data:audio/mp3;base64,...", duration, providerUsed, voiceId }`.
   - `app/api/tts/voices/route.ts`: GET endpoint returning all available voices grouped by provider.
3. Update `components/wizard/VoiceStep.tsx`:
   - Add Azure, OpenAI, and Free/Keyless voice options with provider badges.
   - Add interactive "Play/Pause" sample preview button next to each voice option that plays sample audio in the browser.
4. Update `app/api/settings/keys/route.ts` & `app/api/settings/keys/check/route.ts`:
   - Support Azure (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`) and Google TTS (`GOOGLE_TTS_KEY`).
   - Dynamically load and return ALL custom providers found in the Supabase `settings` table (e.g., Grok, Groq, Suno, Cerebras, Mistral, GitHub Models, DeepSeek, local LLMs).
   - Support saving custom provider definitions to `settings`.
5. Update `app/(app)/settings/page.tsx`:
   - Under "Voice & Audio" tab:
     - Add API key inputs for Azure Speech, ElevenLabs, OpenAI, Google Cloud.
     - Add **Voice Model Catalog with Play/Pause Previews**:
       - Filter pills (All, Azure, OpenAI, ElevenLabs, Google, Free/Keyless).
       - Grid of voice model cards with badges (Language, Gender, Provider).
       - Interactive **Play/Pause preview button** with audio playback singleton, loading spinner, playing wave animation, and pause state.
   - Under "AI Models" / Provider tabs:
     - Dynamically render input fields for any custom provider from the database.
     - Add a prominent **"Add Custom API Integration"** button and modal allowing users to enter custom provider name (e.g. "Grok", "Groq", "DeepSeek", "Ollama"), API key, and base URL.

Scope Boundaries:
- You exclusively own `lib/engine/tts.ts`, `app/api/tts/`, `components/wizard/VoiceStep.tsx`, `app/api/settings/keys/`, and the Voice & AI Models tabs in `app/(app)/settings/page.tsx`.
