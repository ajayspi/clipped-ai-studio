# Changes Report - Milestone 6D (Tier 6 E2E Integration Suite & Standalone Runner)

## Overview
Implemented Milestone 6D: Tier 6 E2E Integration Test Suite & Standalone Runner for the Clipped Next.js 14 application. Created 20 comprehensive integration tests covering multi-provider TTS, social publishing, quota management, and audio mixing with ducking, expanding the test suite to 132 tests total across all tiers.

## Modified & Created Files

### 1. `tests/e2e/tier6-integration.test.ts` (Created)
- Implemented 20 TypeScript integration test cases:
  - **TTS Engine (5 tests)**:
    * `T6-TTS-01`: Language code normalization for 6 Indian languages (`hi-IN`, `ta-IN`, `te-IN`, `kn-IN`, `bn-IN`, `mr-IN`) + English (`en-US`, `en-IN`), colloquial alias mapping (`hindi`, `hinglish`, `tamil`, `bangla`), and Unicode script detection.
    * `T6-TTS-02`: Google Cloud TTS voice routing and gender catalog mapping (`hi-IN-Neural2-A`, `ta-IN-Wavenet-A`, `te-IN-Standard-A`, `en-US-Journey-F`, `en-IN-Neural2-A`).
    * `T6-TTS-03`: ElevenLabs multilingual v2 mapping (voice IDs `rachel`, `adam`, `domi`, `bella`, `nova`, `onyx` and ISO-639-1 language code resolution).
    * `T6-TTS-04`: Coqui TTS XTTS-v2 integration with 2.5s fast timeout guard and fallback logging.
    * `T6-TTS-05`: 4-Tier fallback cascade (`elevenlabs` -> `google` -> `coqui` -> `mock`) generating deterministic in-memory standard RIFF/WAVE PCM audio buffer with estimated duration calculation.
  - **Social Publishing (5 tests)**:
    * `T6-PUB-01`: YouTube Data API v3 OAuth URL generation, metadata validation (title max 100, desc max 5000, tags max 500), 1600 quota cost tracking, and dry-run resumable upload protocol.
    * `T6-PUB-02`: Instagram Graph API Reels 3-step publishing flow (media container init -> transcoding status polling -> media publish), caption length / 30 hashtag limits, and 50 posts/day limit tracking.
    * `T6-PUB-03`: TikTok Content API OAuth v2, creator privacy level mapping (`PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `SELF_ONLY`), and Direct Post video dry-run flow.
    * `T6-PUB-04`: Exponential backoff with full jitter on HTTP 429/503 status codes, `Retry-After` header extraction (seconds, ms, RFC 7231 dates), and `TokenBucketLimiter` burst control.
    * `T6-PUB-05`: Strict dry-run default execution guarantee (`isDryRun !== false`), verifying zero live unmocked external network POST requests.
  - **Quotas (5 tests)**:
    * `T6-QUOTA-01`: Free tier 3 videos/month limit enforcement with sequential credit consumption decreasing remaining balance (3 -> 2 -> 1 -> 0).
    * `T6-QUOTA-02`: Strict execution blocking and throwing `QuotaExceededError` on the 4th consumption attempt with descriptive reset date messaging.
    * `T6-QUOTA-03`: Monthly calendar rollover detection (`isMonthlyResetDue`), automatically resetting `used_this_month = 0` when the calendar advances to a new UTC month.
    * `T6-QUOTA-04`: Higher tier resolution (Pro tier allows 50 videos/month; Enterprise tier allows unlimited `-1` videos).
    * `T6-QUOTA-05`: Failed render job credit refunding (`refundQuota`) and atomic concurrency protection against parallel burst overconsumption.
  - **Audio Mixing (5 tests)**:
    * `T6-MIX-01`: Spoken dialogue ducking filter graph generation using FFmpeg `sidechaincompress=threshold=0.125:ratio=4:attack=50:release=300` and master composite `amix`.
    * `T6-MIX-02`: Background music seamless looping using `-stream_loop -1` input flag before the music asset and composite duration capping (`-t <duration>`).
    * `T6-MIX-03`: Volume level normalization & independent gain balance (`voiceVolume`, `bgmVolume`) with built-in presets (`lofi`, `upbeat`, `cinematic`, `ambient`, `dramatic`, `corporate`).
    * `T6-MIX-04`: Audio fade-in (`afade=t=in:ss=0:d=0.5`) and duration-based dynamic fade-out (`afade=t=out:st=${duration - 2}:d=2.0`) transitions.
    * `T6-MIX-05`: Cost-safe dry-run & missing FFmpeg CLI fallback, generating standard synthetic audio buffer with complete metadata.

### 2. `tests/e2e/standalone-runner.js` (Modified)
- Integrated fallback definitions and mock services for TTS (`TTSEngine`, `normalizeLanguageCode`, `detectLanguageFromScript`, `generateSyntheticWavBuffer`), Social Publishing (`YouTubePublisher`, `InstagramPublisher`, `TikTokPublisher`, `SocialPublisherManager`, `withRetry`, `TokenBucketLimiter`), Quotas (`QuotaManager`, `QuotaExceededError`, `TIER_LIMITS`), and Audio Mixing (`AudioMixer`, `BGM_PRESETS`).
- Added all 20 Tier 6 tests to the standalone suite.
- Total test count expanded from 112 to **132 tests** (T1: 30, T2: 30, T3: 10, T4: 5, T5: 25, API: 12, T6: 20).

### 3. `tests/e2e/runner.ts` (Modified)
- Imported `registerTier6Tests` from `./tier6-integration.test`.
- Invoked `await registerTier6Tests()` in `runAllTests()`.
- Added Tier 6 grouping to `tierMap` for console output summary.

### 4. `tests/e2e/types.ts` (Modified)
- Extended `TestCase['tier']` union to include `'tier6'`.
- Extended `TestCase['workflow']` union to include `'tts' | 'publishing' | 'quotas' | 'audio-mixer' | 'integration'`.

### 5. `tests/e2e/test-harness.ts` (Modified)
- Enhanced `MockSupabaseStore` to support chainable `.eq()`, `.in()`, `select()`, and `update()` operations across all tables (`users`, `api_credits`, `published_videos`, `render_jobs`, `videos`, `settings`).

### 6. `TEST_READY.md` (Modified)
- Updated executive summary and test counts matrix to reflect 132 tests total.
- Documented detailed breakdown of Tier 6 tests across all 4 external subsystem areas.
