# Handoff Report: R3 (Quotas & Audio Mixing) + Tier 6 E2E Integration

**Agent**: Explorer Survey Ext 3  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_3`  
**Target Milestone**: R3 (Quotas & Audio Mixing) + Tier 6 E2E Integration  
**Date**: 2026-08-29  

---

## 1. Observation

1. **Authoritative Request (`ORIGINAL_REQUEST.md`)**:
   - `R3. Implement Quotas & Audio Mixing`: "Build `lib/quotas.ts` to track usage in Supabase (enforcing the 3 videos/month free tier). Build `lib/engine/audio-mixer.ts` for FFmpeg background music overlay." (Lines 19-20)
   - `Acceptance Criteria`:
     - "`tts.ts` successfully maps language codes (e.g., `hi-IN`, `ta-IN`) across all 3 providers." (Line 25)
     - "`Publishing modules correctly implement rate-limit handling and exponential backoff.`" (Line 26)
     - "`Quota system successfully increments usage in Supabase and blocks execution if limits are exceeded.`" (Line 27)
     - "`MUST implement strict "dry-run" execution defaults for the Social APIs to prevent accidental live posting to social accounts during testing.`" (Line 30)
     - "`Must build E2E integration tests in tests/e2e/tier6-integration.test.ts verifying dry-run paths.`" (Line 31)

2. **Database Schema (`schema.sql`)**:
   - Lines 7-15: `users` table with `id UUID PRIMARY KEY`, `tier TEXT DEFAULT 'free'`, `created_at`.
   - Lines 44-52: `api_credits` table with `id UUID PRIMARY KEY`, `user_id UUID REFERENCES users(id)`, `provider TEXT NOT NULL`, `free_quota INTEGER DEFAULT 0`, `used_this_month INTEGER DEFAULT 0`, `created_at`, `updated_at`.
   - Lines 54-63: `published_videos` table with `id UUID PRIMARY KEY`, `video_id UUID REFERENCES videos(id)`, `platform TEXT NOT NULL`, `platform_id TEXT`, `url TEXT`, `view_count INTEGER`, `published_at`.

3. **Existing E2E Test Suite (`tests/e2e/`)**:
   - `tests/e2e/runner.ts`: Orchestrates Tiers 1-5 and API routes.
   - `tests/e2e/test-harness.ts`: Contains `MockSupabaseStore`, `expect` assertion helpers, `createMockRequest`, and `TestRegistry`.
   - `tests/e2e/standalone-runner.js`: Zero-dependency standalone runner executing 112 tests across Tier 1 (30), Tier 2 (30), Tier 3 (10), Tier 4 (5), Tier 5 (25), and API Routes (12) with 100% pass rate.

---

## 2. Logic Chain

1. **Quota Architecture (`lib/quotas.ts`)**:
   - Given `schema.sql` defines `users.tier` and `api_credits(user_id, provider, free_quota, used_this_month, updated_at)`, `lib/quotas.ts` must query and update these records.
   - Free tier users receive 3 video generation credits per calendar month (`free_quota = 3`).
   - By inspecting `updated_at`, the system detects if a new calendar month has started (`updated_at.getUTCMonth() !== currentUTCMonth`) and resets `used_this_month = 0`.
   - When checking quota (`checkUserQuota`), if `used_this_month >= free_quota` (and tier is not enterprise), the system returns `allowed: false` and `consumeQuota` throws `QuotaExceededError`.
   - When a render job fails, `refundQuota` decrements `used_this_month` so users are not penalized for server errors.
   - To support offline and test environments, an in-memory store fallback guarantees 100% test reliability when Supabase credentials are not present.

2. **Audio Mixing & Ducking Engine (`lib/engine/audio-mixer.ts`)**:
   - High-quality video generation requires overlaying background music (BGM) onto spoken narration audio.
   - To prevent music from drowning out speech, audio ducking is implemented using FFmpeg's `sidechaincompress` filter (`threshold=0.125:ratio=4:attack=50:release=300`), which dynamically attenuates music to ~15-20% when voice activity is detected.
   - Background music tracks shorter than speech narration must loop seamlessly using `-stream_loop -1` or `aloop`.
   - To prevent abrupt cuts, `afade` filters provide smooth 0.5s fade-in and 2.0s fade-out at the video tail.
   - If FFmpeg is not installed on the host system or during dry-run testing, the mixer generates deterministic mock output metadata without crashing.

3. **Tier 6 Integration Test Suite (`tier6-integration.test.ts` & `standalone-runner.js`)**:
   - Tier 6 fulfills the acceptance criteria by executing 20 targeted integration tests:
     - 5 tests for TTS language mapping (6 Indian languages + English across Google Cloud TTS, Coqui, ElevenLabs, fallback chain).
     - 5 tests for Social Publishing (YouTube, Instagram Reels, TikTok dry-run uploads, exponential backoff on HTTP 429/503, strict dry-run verification).
     - 5 tests for Quota enforcement (3 videos/month limit, blocking at limit, monthly calendar rollover, Pro tier, failed job refund).
     - 5 tests for Audio Mixing (speech ducking, BGM looping, volume control, fade transitions, dry-run fallback).
   - Extending `standalone-runner.js` with Tier 6 expands the standalone test matrix from 112 tests to 132 tests, maintaining 100% genuine contract compliance with zero external dependencies.

---

## 3. Caveats

1. **Native FFmpeg Binary**: In production deployment, the host environment (or Docker container) must install `ffmpeg` and `ffprobe` in `$PATH` for live rendering. The dry-run and mock fallbacks ensure development and test environments work cleanly without it.
2. **Social API Tokens**: Live OAuth tokens for YouTube, Instagram, and TikTok require user authorization. Dry-run mode tests all payload formatting, container workflows, and backoff routines safely without live tokens.
3. **Calendar Month vs 30-Day Rolling**: The quota reset uses UTC calendar months (1st of each month at 00:00:00 UTC), which aligns with standard billing cycles.

---

## 4. Conclusion

The architectural designs and specifications for `lib/quotas.ts`, `lib/engine/audio-mixer.ts`, and `tests/e2e/tier6-integration.test.ts` are fully defined and documented in `report.md`. Implementers can directly build the production files and runner updates according to these specifications.

---

## 5. Verification Method

1. **Inspect Specification Artifacts**:
   - View `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_3\report.md` for complete technical details, code templates, and test matrix.
2. **Implementation Verification**:
   - Once implementers write `lib/quotas.ts`, `lib/engine/audio-mixer.ts`, and `tests/e2e/tier6-integration.test.ts`, verify the entire test suite by running:
     ```bash
     node tests/e2e/standalone-runner.js
     ```
   - Target result: 132/132 tests passing across all tiers (Tier 1: 30, Tier 2: 30, Tier 3: 10, Tier 4: 5, Tier 5: 25, API: 12, Tier 6: 20).
