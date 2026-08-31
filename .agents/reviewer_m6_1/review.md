# M6 External Systems Integration Review: TTS Engine & Audio Mixer

**Reviewer**: Reviewer 1 (Roles: Reviewer, Critic)  
**Date**: 2026-08-29  
**Target Modules**: `lib/engine/tts.ts`, `lib/engine/audio-mixer.ts`, `tests/e2e/tier6-integration.test.ts`, `tests/e2e/standalone-runner.js`  
**Reference Contracts**: `ORIGINAL_REQUEST.md`, `SCOPE.md`  

---

## 1. Review Summary

**Verdict**: **`APPROVE`**

### Summary Rationale
The implementation of the **TTS Engine (`lib/engine/tts.ts`)** and the **Audio Mixer Engine (`lib/engine/audio-mixer.ts`)** fully and strictly satisfies all requirements outlined in `ORIGINAL_REQUEST.md` (R1, R3) and `SCOPE.md` (Features 1–5, 13; Interface Contracts 1 & 4). 

Key architectural strengths verified:
1. **Multi-Lingual BCP-47 Normalization & Script Detection**: Canonical normalization across English (`en-US`, `en-IN`) and 6 Indian languages (`hi-IN`, `ta-IN`, `te-IN`, `kn-IN`, `bn-IN`, `mr-IN`), paired with automated Unicode script detection for Tamil, Telugu, Kannada, Bengali, and Devanagari (Hindi/Marathi).
2. **True 4-Tier Fallback Cascade**: Prioritized provider execution (`ElevenLabs -> Google Cloud TTS -> Coqui TTS -> In-Memory PCM Generator`) with detailed latency and error tracking in `metadata.providerAttempts`.
3. **Deterministic RIFF/WAVE PCM Synthesizer**: Bit-accurate, zero-dependency 16-bit PCM WAV audio generator used for cost-safe offline execution and fallback.
4. **Professional FFmpeg Filter Graph & Sidechain Compression**: Audio mixing with `-stream_loop -1` BGM looping, dynamic speech ducking (`sidechaincompress`), volume gain balancing, and `afade` transitions.
5. **Zero-Side-Effect Dry-Run Execution**: Complete support for offline execution, missing FFmpeg binary fallback, and temporary file lifecycle management without disk leaks.
6. **Integrity & Test Compliance**: Comprehensive test suite expansion in `tests/e2e/tier6-integration.test.ts` and `tests/e2e/standalone-runner.js` reaching 132 tests with zero dummy facades or integrity violations.

---

## 2. Detailed Findings

### Positive Findings (Good Engineering Practices)
- **[Positive] Robust Script-Based Language Detection**: `detectLanguageFromScript` in `lib/engine/tts.ts` accurately inspects Unicode character ranges (`[\u0B80-\u0BFF]` Tamil, `[\u0C00-\u0C7F]` Telugu, `[\u0C80-\u0CFF]` Kannada, `[\u0980-\u09FF]` Bengali, `[\u0900-\u097F]` Devanagari) and differentiates Marathi using the unique Marathi retroflex lateral approximant `\u0933` (ळ) and auxiliary verbs (`आहे`, `झाला`).
- **[Positive] Fast Timeout Guard for Self-Hosted Endpoints**: `synthesizeWithCoqui` uses an `AbortController` with a 2,500ms timeout to avoid thread/worker blockage when remote endpoints are slow or offline.
- **[Positive] Reliable File Lifecycle in Audio Mixer**: In `lib/engine/audio-mixer.ts`, all temporary audio input files written to `os.tmpdir()` are enclosed in a `try...finally` block that unlinks temp files regardless of whether FFmpeg execution succeeds or throws.
- **[Positive] Deterministic RIFF/WAVE Header Generation**: Both `generateSyntheticWavBuffer` and `generateMockAudioBuffer` construct fully conformant 44-byte RIFF/WAVE PCM headers (Little-Endian byte rates, block alignment, fmt/data chunks) rather than returning dummy mock strings.

### [Minor] Finding 1: Target Duration Sanitization in Audio Mixer
- **What**: If a negative or zero `targetDuration` is explicitly passed into `audioMixer.mixAudio({ targetDuration: -10 })`, `generateFilterGraph` produces `-t -10` which is rejected by FFmpeg CLI.
- **Where**: `lib/engine/audio-mixer.ts`, line 195 (`const duration = options.targetDuration ?? 30;`).
- **Why**: While standard workflows always supply positive durations (typically 15s–60s), defensive clamping (`Math.max(1, Math.floor(options.targetDuration ?? 30))`) would eliminate any unexpected CLI failure on aberrant inputs.
- **Suggestion**: Add `const duration = Math.max(1, options.targetDuration ?? 30);` in `generateFilterGraph`.
- **Severity**: Minor (does not affect core flows; fallback handles CLI errors gracefully).

### [Minor] Finding 2: ElevenLabs Voice Catalog Language Scope
- **What**: In `getAvailableVoices(language)`, ElevenLabs voices are only appended if `!targetLang || targetLang.startsWith('en')`. Since `eleven_multilingual_v2` also supports Indian languages, these voices could optionally be returned for non-English queries.
- **Where**: `lib/engine/tts.ts`, line 785.
- **Why**: Google Cloud TTS voices are returned specifically per language, while ElevenLabs multilingual voices can theoretically voice Indian languages as well.
- **Suggestion**: Consider exposing ElevenLabs voices as cross-lingual options when querying Indian language voice catalogs.
- **Severity**: Minor (Google Cloud TTS defaults provide high-quality native voices for all Indian languages).

---

## 3. Verified Claims

| Requirement / Claim | Verification Target | Method | Result |
|---|---|---|---|
| **English + 6 Indian Languages Support** | `lib/engine/tts.ts` | Inspected language alias maps (`LANGUAGE_ALIASES`), Google voice tables (`GOOGLE_DEFAULT_VOICES`), ElevenLabs map (`ELEVENLABS_LANG_MAP`), Coqui map (`COQUI_LANG_MAP`). | **PASS** |
| **Unicode Script Auto-Detection** | `detectLanguageFromScript` | Verified Unicode regex character ranges for Tamil, Telugu, Kannada, Bengali, Hindi, Marathi. | **PASS** |
| **Google Cloud TTS Integration** | `synthesizeWithGoogle` | Verified endpoint URL, SSML gender mapping, API key / bearer token auth, audioConfig encoding. | **PASS** |
| **ElevenLabs Multilingual v2** | `synthesizeWithElevenLabs` | Verified `eleven_multilingual_v2` model payload, voice ID dictionary mapping, xi-api-key header. | **PASS** |
| **Coqui TTS with 2.5s Timeout** | `synthesizeWithCoqui` | Verified `AbortController` timeout guard, `speaker_id` / `language_id` mapping. | **PASS** |
| **4-Tier Fallback Cascade** | `TTSEngine.synthesize` | Verified sequential fallback cascade (`ElevenLabs -> Google -> Coqui -> Mock`) and audit log capturing. | **PASS** |
| **Deterministic In-Memory PCM WAV** | `generateSyntheticWavBuffer` | Verified 44-byte RIFF/WAVE header fields (RIFF, WAVE, fmt, data, 24kHz/44.1kHz, 16-bit PCM). | **PASS** |
| **FFmpeg Speech Ducking** | `lib/engine/audio-mixer.ts` | Verified `sidechaincompress` filter graph construction (`threshold`, `ratio`, `attack`, `release`, `amix`). | **PASS** |
| **BGM Infinite Looping** | `generateFilterGraph` | Verified `-stream_loop -1` argument placement before `-i "${bgmPath}"`. | **PASS** |
| **Audio Fade In/Out Transitions** | `generateFilterGraph` | Verified `afade=t=in:ss=0:d=${fadeIn}` and `afade=t=out:st=${fadeOutStart}:d=${fadeOut}`. | **PASS** |
| **Missing FFmpeg Binary Fallback** | `mixAudio` | Verified `detectFFmpeg()` platform checks (`where`/`which`), override switch, and synthetic WAV fallback. | **PASS** |
| **Tier 6 Test Suite Expansion** | `tests/e2e/standalone-runner.js` | Verified test registry scaling across all 7 tiers (132 tests total). | **PASS** |

---

## 4. Adversarial Stress-Testing & Integrity Audit

### Integrity Violation Check
- [x] **No hardcoded test results**: Synthesis returns genuine dynamic buffers and calculations based on input length/cadence.
- [x] **No dummy facades**: Real HTTP REST calls for Google/ElevenLabs/Coqui; real FFmpeg commands with `execSync`.
- [x] **No task shortcuts**: All 6 Indian languages and English are fully mapped across all providers.
- [x] **No unhandled exceptions**: Unconfigured environments fall back safely to deterministic mock audio without crashing.

### Adversarial Scenarios Evaluated

#### 1. Unset API Keys / Offline Network
- **Attack Scenario**: Production server boots without `ELEVENLABS_API_KEY`, `GOOGLE_TTS_API_KEY`, or local Coqui server.
- **Observed Behavior**: `synthesize()` marks live providers as skipped/failed, appends logs to `providerAttempts`, and returns a valid deterministic RIFF/WAVE PCM buffer with `isDryRun: true`.
- **Verdict**: PASS.

#### 2. Missing FFmpeg CLI on Host System
- **Attack Scenario**: Host environment lacks `ffmpeg` binary on PATH.
- **Observed Behavior**: `detectFFmpeg()` returns `false`, and `mixAudio()` immediately falls back to generating a synthetic stereo WAV buffer and writing to `outputPath` if specified, preventing process crash.
- **Verdict**: PASS.

#### 3. Mixed Devanagari Text (Hindi vs. Marathi)
- **Attack Scenario**: Devanagari text supplied without explicit language code.
- **Observed Behavior**: `detectLanguageFromScript()` searches for Marathi-specific glyph `\u0933` (ळ) or Marathi keywords (`आहे`, `नाही`, `झाला`, `केला`); if found, routes to `mr-IN`, otherwise defaults to `hi-IN`.
- **Verdict**: PASS.

#### 4. Temporary File Cleanup Under Command Failure
- **Attack Scenario**: FFmpeg command throws an error midway through processing.
- **Observed Behavior**: `finally` block in `mixAudio` ensures `tempVoiceFile` and `tempBgmFile` are deleted from disk, preventing `/tmp` exhaustion.
- **Verdict**: PASS.

---

## 5. Coverage Gaps & Unverified Items

- **Live Provider Network Calling**: Verification was performed statically and via offline fallback simulation; actual live API calls with paid billing keys (ElevenLabs / Google Cloud) were not executed to avoid billing costs in development/testing mode (consistent with cost-safe execution requirements).
- **Risk Level**: LOW (interfaces and payload structures strictly match official Google Cloud TTS v1 and ElevenLabs v1 API specifications).

---

## 6. Final Recommendation

**Approve M6 implementation without blocking changes.**
The TTS and Audio Mixing modules are well-engineered, robust, resilient to missing infrastructure, and fully meet all user requirements and architectural specifications.
