## 2026-08-29T11:14:03Z
You are a Worker implementing Milestone 6B: Social Publishing APIs for the "Clipped" Next.js 14 project.
Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m6b
Project root: C:\Users\vigilare\.gemini\antigravity\scratch\clipped
Authoritative Request File: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md
Scope Document: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\orchestrator\SCOPE.md
Survey Reference: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_2\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership: You exclusively own `lib/publishing/*` (`lib/publishing/types.ts`, `lib/publishing/rate-limiter.ts`, `lib/publishing/youtube.ts`, `lib/publishing/instagram.ts`, `lib/publishing/tiktok.ts`, `lib/publishing/index.ts`). Do NOT edit files owned by other workers.

Implementation Tasks:
- Implement `lib/publishing/types.ts`: `ISocialPublisher`, `PublishRequest`, `PublishResponse`, `SocialCredentials`, `RateLimitConfig`, `OAuthToken`, error classes.
- Implement `lib/publishing/rate-limiter.ts`: Exponential backoff with full jitter, `withRetry` helper, `Retry-After` header parsing, token bucket rate limiter.
- Implement `lib/publishing/youtube.ts`: `YouTubePublisher` handling Google OAuth 2.0 (auth url, exchange, token refresh), 2-step resumable upload protocol, metadata payload formatting, quota tracking (1,600 units/upload), 403 quotaExceeded handling, and strict dry-run mock execution.
- Implement `lib/publishing/instagram.ts`: `InstagramPublisher` handling Meta OAuth long-lived tokens, 3-step Reels container flow (creation `POST /{ig-user-id}/media`, status polling `GET /{container-id}`, publication `POST /{ig-user-id}/media_publish`), 50 posts/24hr rate limit, and strict dry-run mock execution.
- Implement `lib/publishing/tiktok.ts`: `TikTokPublisher` handling TikTok OAuth v2 token refresh, video publishing init (`POST /v2/post/publish/video/init/`), status fetch polling, and strict dry-run mock execution.
- Implement `lib/publishing/index.ts`: Unified publisher exports, `getPublisher(platform)` polymorphic factory, `SocialPublisherManager` supporting `publish()` and `publishToMultiple()` with automatic Supabase `published_videos` table logging.
- STRICT SAFETY: Default `isDryRun = true` across all publishers to prevent accidental live posting during tests/dev.
- Test your implementation directly using node scripts or TypeScript checks.
- Document changes in `changes.md` and deliver `handoff.md` in your working directory.
- Notify parent using send_message when done.
