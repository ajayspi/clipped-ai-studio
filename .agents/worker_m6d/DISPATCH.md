## 2026-08-29T11:17:47Z
You are a Test Writer implementing Milestone 6D: E2E Integration Test Suite & Standalone Runner for the "Clipped" Next.js 14 project.
Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m6d
Project root: C:\Users\vigilare\.gemini\antigravity\scratch\clipped
Authoritative Request File: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md
Scope Document: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\orchestrator\SCOPE.md
Survey Reference: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_3\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership: You exclusively own `tests/e2e/tier6-integration.test.ts`, `tests/e2e/standalone-runner.js`, `tests/e2e/runner.ts`, `TEST_READY.md`.

Implementation Tasks:
1. Build `tests/e2e/tier6-integration.test.ts` in TypeScript:
   - 20 comprehensive E2E integration test cases covering:
     * TTS Engine (5 tests): Language code normalization across all 6 Indian languages (hi-IN, ta-IN, te-IN, kn-IN, bn-IN, mr-IN) + English (en-US, en-IN), Google Cloud TTS voice routing, ElevenLabs multilingual v2 mapping, Coqui TTS integration with timeout, 4-tier fallback cascade to in-memory PCM WAV generator.
     * Social Publishing (5 tests): YouTube Data API v3 OAuth & dry-run upload, Instagram Graph API Reels 3-step container creation/polling/publishing, TikTok Content API OAuth v2 & direct video publishing, exponential backoff with full jitter on HTTP 429/503, strict dry-run default verification (isDryRun = true).
     * Quotas (5 tests): Free tier 3 videos/month limit enforcement, blocking execution and throwing QuotaExceededError when quota is exceeded, monthly calendar rollover reset, Pro/Enterprise tier unlimited quota, refunding quota on failed render jobs.
     * Audio Mixing (5 tests): Spoken dialogue ducking (sidechaincompress filter graph generation), background music looping (-stream_loop -1), volume normalization/balance, fade-in and fade-out transitions (afade), dry-run / missing FFmpeg fallback.
2. Integrate Tier 6 test definitions directly into `tests/e2e/standalone-runner.js` and `tests/e2e/runner.ts`:
   - Standalone runner must now execute 132 tests total (T1: 30, T2: 30, T3: 10, T4: 5, T5: 25, API: 12, T6: 20).
   - Run `node tests/e2e/standalone-runner.js` to ensure all 132 tests pass with 0 failures.
3. Update `TEST_READY.md` to reflect the 132 total tests across Tiers 1-6.
4. Write `changes.md` and deliver `handoff.md` in your working directory.
5. Notify parent using send_message when complete.
