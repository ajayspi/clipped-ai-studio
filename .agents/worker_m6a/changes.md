# Changes: Milestone 6A - TTS Engine

**Agent**: Worker M6A  
**Date**: 2026-08-29  
**Files Created / Modified**:
- `lib/engine/tts.ts` (New File): Full TypeScript multi-lingual Text-to-Speech engine implementing Google Cloud TTS, ElevenLabs API, Coqui TTS, and pure in-memory deterministic synthetic RIFF/WAVE PCM mock audio generator.

---

## Detailed Summary of Changes

### 1. `lib/engine/tts.ts`
- **Interface & Type Definitions**:
  - `TTSProvider`: `'elevenlabs' | 'google' | 'coqui' | 'mock' | 'auto'`
  - `SupportedLanguage`: `'en-US' | 'en-IN' | 'hi-IN' | 'ta-IN' | 'te-IN' | 'kn-IN' | 'bn-IN' | 'mr-IN'`
  - `VoiceGender`: `'male' | 'female' | 'neutral'`
  - `TTSVoiceOption`: `{ id, name, provider, language, gender, description, sampleUrl }`
  - `TTSRequest` & `TTSGenerationRequest`: `{ text, language, provider, voice, voiceId, gender, speed, speakingRate, pitch, volumeGainDb, audioFormat, mock, apiKey }`
  - `TTSResponse` & `TTSGenerationResponse`: `{ success, jobId, audioBuffer, audioUrl, audioBase64, mimeType, duration, providerUsed, language, voiceId, voiceUsed, format, characterCount, metadata, error }`
  - `ProviderAttemptLog`: `{ provider, status, error, latencyMs }`

- **Multi-Lingual Normalization & Script Auto-Detection**:
  - `normalizeLanguageCode(input?: string)`: Normalizes case-insensitive, hyphenated, underscored language codes and common aliases for English and 6 Indian languages.
  - `detectLanguageFromScript(text: string)`: Analyzes Unicode blocks for Tamil (`\u0B80-\u0BFF`), Telugu (`\u0C00-\u0C7F`), Kannada (`\u0C80-\u0CFF`), Bengali (`\u0980-\u09FF`), and Devanagari (`\u0900-\u097F`, discerning Marathi vs Hindi) when language parameter is omitted.

- **Provider Integrations**:
  - **Google Cloud TTS**: REST synthesis via `GOOGLE_TTS_API_KEY` / `GOOGLE_APPLICATION_CREDENTIALS` / `GOOGLE_TTS_BEARER_TOKEN`, configured with Neural2/Wavenet/Standard/Journey voice catalogs for all 8 locales.
  - **ElevenLabs API**: Multilingual v2 model (`eleven_multilingual_v2`), mapping ISO-639-1 codes (`en`, `hi`, `ta`, `te`, `kn`, `bn`, `mr`) and curated voice presets (`rachel`, `domi`, `bella`, `antoni`, `elli`, `josh`, `arnold`, `adam`, `sam`, `daniel`).
  - **Coqui TTS**: Fast HTTP client for self-hosted / remote endpoint (`COQUI_TTS_URL`, default `http://localhost:5002/api/tts`) with 2.5s `AbortController` timeout guard.

- **4-Tier Fallback Cascade**:
  - Automatically cascades: `ElevenLabs -> Google Cloud -> Coqui -> Mock`.
  - Captures structured attempt logs in `response.metadata.providerAttempts`.

- **Pure In-Memory RIFF/WAVE PCM Buffer Generator**:
  - `generateSyntheticWavBuffer(durationSeconds, sampleRate)`: Generates valid RIFF/WAVE 16-bit 24kHz mono PCM buffers with soft harmonic tones.
  - `calculateEstimatedDuration(text, language, speedRate)`: Computes cadence-accurate speech durations (~150 WPM English, ~120 WPM Indian languages).

- **Exports**:
  - `ttsEngine` (singleton)
  - `TTSEngine` (class)
  - `normalizeLanguageCode`, `detectLanguageFromScript`, `generateSyntheticWavBuffer`, `calculateEstimatedDuration`
  - All types and catalog constants (`ELEVENLABS_VOICES`, `GOOGLE_DEFAULT_VOICES`, `COQUI_LANG_MAP`, `ELEVENLABS_LANG_MAP`, `LANGUAGE_ALIASES`)
