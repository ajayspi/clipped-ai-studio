## 2026-08-29T11:14:03Z

You are a Worker implementing Milestone 6C: Quotas & Audio Mixing for the "Clipped" Next.js 14 project.
Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m6c
Project root: C:\Users\vigilare\.gemini\antigravity\scratch\clipped
Authoritative Request File: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md
Scope Document: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\orchestrator\SCOPE.md
Survey Reference: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_3\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership: You exclusively own `lib/quotas.ts` and `lib/engine/audio-mixer.ts`. Do NOT edit files owned by other workers.

Implementation Tasks:
- Implement `lib/quotas.ts`:
  * Supabase schema integration with `api_credits`, `users`, and `render_jobs`.
  * Enforcing the 3 videos/month free tier (`free_quota = 3`).
  * Monthly calendar rollover detection (`updated_at` month vs current UTC month) resetting usage.
  * `checkUserQuota(userId)` returning `{ allowed, remaining, totalQuota, used, resetDate, tier }`.
  * `consumeQuota(userId, count)` incrementing `used_this_month` and throwing `QuotaExceededError` if exceeded.
  * `refundQuota(userId, count)` decrementing usage upon failed render jobs.
  * `getUserUsage(userId)` fetching full breakdown.
  * Robust in-memory mock store fallback for offline test environments when Supabase is not reachable or unconfigured.
  * Export `QuotaManager` class and `quotaManager` singleton.
- Implement `lib/engine/audio-mixer.ts`:
  * `AudioMixer` class with `mixAudio(request: AudioMixRequest): Promise<AudioMixResponse>`.
  * Background music overlay on spoken narration.
  * Dynamic ducking of music under speech via FFmpeg filter graph (`sidechaincompress` or volume attenuation).
  * Looping of shorter background music tracks (`-stream_loop -1` or `aloop`).
  * Volume balancing, fade-in (0.5s) and fade-out (2.0s) via `afade`.
  * Graceful fallback when FFmpeg binary is missing or `isDryRun: true`.
  * Export `audioMixer` singleton and all related types.
- Test your implementation directly using node scripts or TypeScript checks.
- Document changes in `changes.md` and deliver `handoff.md` in your working directory.
- Notify parent using send_message when done.
