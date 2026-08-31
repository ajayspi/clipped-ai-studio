# Changes Implemented: Milestone 6B (Social Publishing APIs)

**Worker**: worker_m6b  
**Date**: 2026-08-29  
**Milestone**: M6B - Social Publishing APIs  
**Project**: Clipped (Next.js 14 / TypeScript)

---

## Summary of Changes

Implemented the complete zero-SDK native `fetch` Social Publishing subsystem in `lib/publishing/`:
1. `lib/publishing/types.ts`: Comprehensive TypeScript contracts, interfaces, and custom error classes.
2. `lib/publishing/rate-limiter.ts`: Exponential backoff with full jitter, `withRetry` wrapper, `Retry-After` header parsing, and `TokenBucketLimiter` for request throttling.
3. `lib/publishing/youtube.ts`: `YouTubePublisher` handling Google OAuth 2.0 (auth URL, code exchange, token refresh), 2-step resumable upload protocol, metadata payload formatting, quota tracking (1,600 units/upload), 403 quotaExceeded handling, and strict dry-run mock execution.
4. `lib/publishing/instagram.ts`: `InstagramPublisher` handling Meta OAuth long-lived tokens, 3-step Reels container flow (container creation, status polling, media publication), 50 posts/24hr rate limit enforcement, and strict dry-run mock execution.
5. `lib/publishing/tiktok.ts`: `TikTokPublisher` handling TikTok OAuth v2 token refresh, video publishing init (`/v2/post/publish/video/init/`), status fetch polling, and strict dry-run mock execution.
6. `lib/publishing/index.ts`: Unified publisher exports, `getPublisher(platform)` polymorphic factory, `SocialPublisherManager` supporting single and multi-platform publishing (`publish()`, `publishToMultiple()`) with automatic Supabase `published_videos` table logging.

---

## File Details

### 1. `lib/publishing/types.ts`
- **Models**: `SocialPlatform` ('youtube' | 'instagram' | 'tiktok'), `PublishStatus`, `VideoPrivacy`, `SocialCredentials`, `PublishRequest`, `PublishResponse`, `OAuthToken`, `OAuthConfig`, `RateLimitConfig`.
- **Interfaces**: `ISocialPublisher` standardizing auth URLs, token exchange, token refresh, video publishing, and status checking.
- **Errors**: `PublishingError`, `ValidationError`, `RateLimitError`, `TokenExpiredError`, `YouTubePublishError`, `YouTubeQuotaExceededError`, `InstagramPublishError`, `InstagramRateLimitError`, `TikTokPublishError`.

### 2. `lib/publishing/rate-limiter.ts`
- **Functions**: `calculateBackoffWithJitter()` (decorrelated full jitter), `extractRetryAfterMs()` (numeric seconds or RFC 7231 HTTP-Date parsing), `isDefaultRetryableError()` (429, 500-504, network drops).
- **Wrapper**: `withRetry<T>()` managing retries, delay calculation, and retry hooks.
- **Classes**: `TokenBucketLimiter` with non-blocking `tryAcquire()`, async `acquire()`, and automatic timestamp refill; exported platform singletons (`youtubeRateLimiter`, `instagramRateLimiter`, `tiktokRateLimiter`).

### 3. `lib/publishing/youtube.ts`
- **Class**: `YouTubePublisher` implementing `ISocialPublisher`.
- **OAuth 2.0**: `getAuthUrl` with `youtube.upload` and `youtube.readonly` scopes; `exchangeCode` and `refreshToken` with Google Identity token endpoints.
- **Resumable Upload**: 2-step protocol creating resumable session on `https://www.googleapis.com/upload/youtube/v3/videos` and uploading binary chunk to `Location` header.
- **Validation**: Enforces title <= 100 chars, description <= 5000 chars, total tags <= 500 chars.
- **Dry-run**: Defaults to `isDryRun = true`, returning valid watch URL `https://www.youtube.com/watch?v=mock_yt_...` and quota metadata.

### 4. `lib/publishing/instagram.ts`
- **Class**: `InstagramPublisher` implementing `ISocialPublisher`.
- **Meta OAuth**: `getAuthUrl` for Facebook dialog OAuth; `exchangeCode` supporting 2-tier short-lived to 60-day long-lived token exchange (`fb_exchange_token`) and IG Business Account resolution; `refreshToken`.
- **3-Step Reels Publishing**:
  - Step 1: POST `/{ig-user-id}/media` (media_type=REELS)
  - Step 2: Poll GET `/{container-id}?fields=status_code,status` until `FINISHED` (3s interval, 90s max)
  - Step 3: POST `/{ig-user-id}/media_publish`
- **Validation**: Enforces caption <= 2200 chars and maximum 30 hashtags.
- **Dry-run**: Defaults to `isDryRun = true`, returning valid Reel URL `https://www.instagram.com/reel/mock_ig_.../`.

### 5. `lib/publishing/tiktok.ts`
- **Class**: `TikTokPublisher` implementing `ISocialPublisher`.
- **TikTok OAuth v2**: `getAuthUrl` for `https://www.tiktok.com/v2/auth/authorize/`; `exchangeCode` and `refreshToken` with `https://open.tiktokapis.com/v2/oauth/token/`.
- **Direct Video Publishing**:
  - Step 1: Init `POST https://open.tiktokapis.com/v2/post/publish/video/init/`
  - Step 2: Status fetch poll `POST https://open.tiktokapis.com/v2/post/publish/status_fetch/`
- **Validation**: Enforces title presence and length <= 2200 chars; maps privacy levels to `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `SELF_ONLY`.
- **Dry-run**: Defaults to `isDryRun = true`, returning valid video URL `https://www.tiktok.com/@creator/video/mock_tt_...`.

### 6. `lib/publishing/index.ts`
- **Exports**: Submodule exports, `getPublisher(platform)` polymorphic factory, `SocialPublisherManager` class, and `socialPublisherManager` singleton.
- **Orchestrator**: `publish()` handles single platform publishing + Supabase `published_videos` table persistence; `publishToMultiple()` handles parallel multi-platform broadcast, aggregating results, partial error catching, and individual database logging.
