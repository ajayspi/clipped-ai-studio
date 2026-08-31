# Milestone 6C: Quotas & Audio Mixing Changes Report

**Worker**: `worker_m6c`  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m6c`  
**Files Modified/Created**:
1. `lib/quotas.ts` (Created, 420 lines)
2. `lib/engine/audio-mixer.ts` (Created, 375 lines)

---

## 1. `lib/quotas.ts` Implementation Summary

Implemented the comprehensive usage tracking, rate limiting, and quota enforcement engine:
- **Supabase Schema Integration**:
  - Direct alignment with `users` (tier resolution), `api_credits` (provider credit tracking and updated timestamp), and `render_jobs` (active concurrency monitoring).
- **Tier Quota Matrix**:
  - Free Tier: Default limit of `3` videos / month (`free_quota = 3`, `10,000` TTS chars, `60s` max video duration).
  - Pro Tier: `50` videos / month (`free_quota = 50`, `250,000` TTS chars, `180s` max duration).
  - Enterprise Tier: Unlimited (`-1` quota limit, `remaining = 999999`, always allowed).
- **Monthly Calendar Rollover**:
  - `isMonthlyResetDue(lastDateStr)` parses UTC timestamps (`getUTCFullYear()`, `getUTCMonth()`) to detect calendar month changes.
  - Automatically resets `used_this_month = 0` and updates timestamp upon monthly rollover.
  - Computes standard ISO 8601 reset date (`getNextMonthResetDate()`) on the 1st of the next UTC month at 00:00:00 UTC.
- **Atomic Operations**:
  - `checkUserQuota(userId, provider)`: Evaluates user tier, checks rollover, returns `{ allowed, remaining, totalQuota, used, resetDate, tier, provider }`.
  - `consumeQuota(userId, count, provider)`: Pre-checks availability, throws descriptive `QuotaExceededError` with embedded status if exceeded, and atomically increments usage.
  - `refundQuota(userId, count, provider)`: Decrements usage down to minimum 0 on failed render jobs to protect user credits.
  - `getUserUsage(userId)`: Returns multi-provider breakdown, active render jobs count, and renewal dates.
- **In-Memory Store Fallback**:
  - Maintains `Map<string, InMemoryUserRecord>` with time-travel testing hooks (`advanceMockTime`, `clearMockStore`, `setMockUser`) to guarantee zero-network offline test execution when Supabase credentials are not configured.
- **Exports**:
  - `QuotaManager` class, `quotaManager` singleton.
  - Named functional exports: `checkUserQuota`, `consumeQuota`, `refundQuota`, `getUserUsage`, `resetMonthlyQuota`.
  - Types: `UserTier`, `QuotaCheckResult`, `QuotaStatus`, `QuotaConsumptionResult`, `UserUsageRecord`, `QuotaExceededError`, `TIER_LIMITS`.

---

## 2. `lib/engine/audio-mixer.ts` Implementation Summary

Implemented the FFmpeg-powered audio mixing, voice ducking, and video muxing engine:
- **Audio Transformation Pipeline**:
  - Voice channel formatting and volume gain (`volume=1.0` default).
  - Background music (BGM) gain attenuation (`volume=0.2` default) and smooth fades (`afade=t=in:ss=0:d=0.5` and `afade=t=out:st=${duration-2}:d=2.0`).
  - Dynamic sidechain ducking via `sidechaincompress=threshold=0.125:ratio=4:attack=50:release=300` automatically ducking BGM when narration is spoken and restoring during pauses.
  - Music looping via `-stream_loop -1` to match longer narration durations without cutting off abruptly.
  - Output multiplexing via `amix=inputs=2:duration=first:dropout_transition=2`.
- **Cost-Safe Dry-Run & Missing CLI Fallback**:
  - Detects host FFmpeg CLI via `where ffmpeg` / `which ffmpeg` and `ffmpeg -version`.
  - If FFmpeg is missing or `isDryRun: true` / `dryRun: true` is passed, generates deterministic synthetic WAV PCM audio buffer with valid RIFF headers and soft sine waveforms.
  - Calculates target duration and returns rich structured metadata including `commandUsed`, `filterComplex`, and `isMock: true`.
- **Preset Support**:
  - Built-in presets for `'upbeat'`, `'cinematic'`, `'ambient'`, `'lofi'`, `'dramatic'`, and `'corporate'`.
- **Exports**:
  - `AudioMixer` class, `audioMixer` singleton.
  - Named functional exports: `mixAudio`, `mixNarrationAndMusic`.
  - Types: `AudioMixRequest`, `AudioMixResponse`, `AudioMixOptions`, `AudioMixResult`, `BgmPreset`, `BGM_PRESETS`.
