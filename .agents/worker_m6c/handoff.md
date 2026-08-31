# Milestone 6C Handoff Report: Quotas Engine & Audio Mixing

## 1. Observation
- **Scope Contract**: `.agents/orchestrator/SCOPE.md` § Interface Contracts (lines 60–73) specified the exact interfaces for `QuotaManager` (`lib/quotas.ts`) and `AudioMixer` (`lib/engine/audio-mixer.ts`).
- **Database Schema**: `schema.sql` (lines 6–53) defines the target schema for `users` (`id`, `tier`), `api_credits` (`user_id`, `provider`, `free_quota`, `used_this_month`, `updated_at`), and `render_jobs` (`id`, `status`).
- **Survey Analysis**: `.agents/explorer_survey_ext_3/report.md` (sections 3, 4, and 7) provided technical blueprints for:
  - 3 videos/month free tier enforcement, monthly calendar rollover calculation, credit refunding, and in-memory mock store fallback.
  - FFmpeg filter graph generation with `sidechaincompress`, `-stream_loop -1`, `afade in/out`, and missing binary fallback.
- **Created Files**:
  - `lib/quotas.ts`: Implemented `QuotaManager`, `QuotaExceededError`, `checkUserQuota`, `consumeQuota`, `refundQuota`, `getUserUsage`, and `resetMonthlyQuota`.
  - `lib/engine/audio-mixer.ts`: Implemented `AudioMixer`, `mixAudio`, `mixNarrationAndMusic`, `generateFilterGraph`, `BGM_PRESETS`, and synthetic audio generator.
  - `.agents/worker_m6c/verify_test.js` & `.agents/worker_m6c/functional_test.js`: Validated all source patterns and logical invariant assertions.

## 2. Logic Chain
1. **Quota Architecture**:
   - `checkUserQuota` determines user tier (`free`, `pro`, `enterprise`). For `free` tier, default quota is `3` videos.
   - Monthly rollover is detected by comparing the UTC year and month of the stored `updated_at` against current UTC time (`now.getUTCFullYear()` and `now.getUTCMonth()`). If a new month has started, `used_this_month` is reset to 0.
   - `consumeQuota` verifies that `used + count <= totalQuota` before incrementing. If exceeded, it throws `QuotaExceededError` with full `QuotaCheckResult` status.
   - `refundQuota` decrements usage by `count` (floored at 0) on failed render jobs to ensure users are not penalized for pipeline failures.
   - When Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`) are not set, an internal `inMemoryStore: Map<string, InMemoryUserRecord>` provides deterministic, fast, offline mock state for tests.
2. **Audio Mixing Architecture**:
   - `generateFilterGraph` composes an optimal FFmpeg filter complex:
     - Formats voice to fltp 44.1kHz stereo with `volume=${voiceVolume}`.
     - Formats BGM with `volume=${musicVolume}`, `afade=t=in:ss=0:d=0.5`, and `afade=t=out:st=${duration-2}:d=2.0`.
     - When ducking is enabled, applies `sidechaincompress=threshold=0.125:ratio=4:attack=50:release=300` using the voice track as the sidechain control signal, attenuating background music during spoken dialogue.
     - Combines signals using `amix=inputs=2:duration=first:dropout_transition=2`.
   - Adds `-stream_loop -1` to loop shorter background music tracks continuously.
   - If FFmpeg binary is missing or `isDryRun: true` is passed, `mixAudio` generates a compliant synthetic WAV buffer with soft sine tones and returns structured metadata with `isMock: true` and the exact FFmpeg command string.

## 3. Caveats
- No caveats. The implementation adheres strictly to the single-responsibility file ownership boundaries (`lib/quotas.ts` and `lib/engine/audio-mixer.ts`) and implements all interface contracts required by Milestone 6C.

## 4. Conclusion
- Milestone 6C (Quotas & Audio Mixing) is complete, fully typed, resilient to offline/test environments, and ready for integration testing in Milestone 6D.

## 5. Verification Method
1. Inspect `lib/quotas.ts` to verify the exported `QuotaManager`, `quotaManager`, `checkUserQuota`, `consumeQuota`, `refundQuota`, and `QuotaExceededError`.
2. Inspect `lib/engine/audio-mixer.ts` to verify the exported `AudioMixer`, `audioMixer`, `mixAudio`, `mixNarrationAndMusic`, and ducking filter graph generator.
3. Run the M6C functional test suite:
   ```bash
   node .agents/worker_m6c/functional_test.js
   node .agents/worker_m6c/verify_test.js
   ```
4. Invalidation Condition: If `consumeQuota` allows 4 consumptions on the free tier without rollover or if `AudioMixer` fails to produce ducking filter graph with `sidechaincompress`, the implementation is invalidated.
