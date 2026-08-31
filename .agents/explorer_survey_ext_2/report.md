# Comprehensive Specification Report: R2 Social Publishing APIs

**Project**: Clipped (Next.js 14 / TypeScript)  
**Author**: Spec Miner (Survey Ext 2)  
**Target Module**: `lib/publishing/*`  
**Date**: 2026-08-29  
**Status**: Specification Complete / Ready for Implementation  

---

## Executive Summary

This report establishes the authoritative architecture, API specifications, data models, error handling strategies, and cost-safe execution mechanisms for **R2: Social Publishing APIs** in the Clipped application. 

The social publishing subsystem enables creators and autonomous pipelines (such as AutoPilot and Bulk Content Planner) to publish AI-generated short-form video assets directly to **YouTube Shorts**, **Instagram Reels**, and **TikTok**.

### Core Architecture Highlights
1. **Zero External Vendor SDKs**: Implemented with native Node.js / Web `fetch`, standard `FormData`, `URLSearchParams`, and `AbortController`, perfectly matching existing engine modules in `lib/engine/*`.
2. **Strict Dry-Run Safety by Default**: Every publisher defaults to `isDryRun = true`. Live HTTP calls to external social APIs are blocked unless explicit live production credentials and `isDryRun: false` are provided. Mock modes generate deterministic, valid response structures while completely exercising input validation logic.
3. **Full Jitter Exponential Backoff**: Centralized retry mechanism in `lib/publishing/rate-limiter.ts` implementing decorrelated full jitter and handling HTTP 429, 5xx server errors, platform rate limits, and `Retry-After` headers.
4. **Unified Publisher Interface & Multi-Platform Manager**: A polymorphic `ISocialPublisher` interface with a factory `getPublisher(platform)` and a multi-platform orchestrator `SocialPublisherManager` that writes publishing history directly to the Supabase `published_videos` table.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Architecture | Unified Type Definitions | Centralized TypeScript contracts in `lib/publishing/types.ts` defining all requests, responses, OAuth credentials, and platform enums | Platform config, metadata | Type definitions | Compile-time validation | Codebase Analysis |
| 2 | Architecture | Unified Publisher Interface | `ISocialPublisher` standardizing `getAuthUrl`, `exchangeCode`, `refreshToken`, `publishVideo`, and `checkStatus` | Polymorphic requests | Polymorphic responses | Typed `PublishingError` | Spec Mining |
| 3 | Architecture | Publisher Factory & Manager | `getPublisher(platform)` factory and `SocialPublisherManager` for broadcasting videos to multiple platforms and saving to Supabase `published_videos` | `MultiPublishRequest` | `MultiPublishResult` | Partial success aggregation | `schema.sql` & `lib/db.ts` |
| 4 | Safety | Strict Dry-Run Execution | Default `isDryRun = true` across all clients preventing accidental live posting during testing/development while validating inputs | `isDryRun: true` | Realistic mock response (`https://youtube.com/watch?v=...`, `https://instagram.com/reel/...`) | Validates payload, throws validation errors if inputs invalid | `ORIGINAL_REQUEST.md` |
| 5 | Resilience | Exponential Backoff with Jitter | Centralized retry utility implementing full jitter exponential backoff for transient HTTP and platform rate errors | `fn: () => Promise<T>`, `RetryOptions` | Resolved promise `T` | Max retries exceeded throws last error | System Resilience Spec |
| 6 | Resilience | Platform Token Bucket Limiters | In-memory token bucket rate limiters per platform enforcing request frequency and burst caps | `tokensRequested: number` | `Promise<void>` delay | Throws on unrecoverable rate limits | API Docs |
| 7 | YouTube | OAuth 2.0 Authorization URL | Generates Google OAuth 2.0 authorization URL with `youtube.upload` and `youtube.readonly` scopes and `access_type=offline` | `clientId`, `redirectUri`, `state` | Formatted Google auth URL | Throws if clientId/redirectUri missing | Google Identity Spec |
| 8 | YouTube | OAuth Code & Refresh Exchange | Exchanges authorization code or refresh token with `https://oauth2.googleapis.com/token` | `code`/`refreshToken`, `clientId`, `clientSecret` | `OAuthTokenResponse` | Throws `YouTubePublishError` on invalid grant | Google OAuth 2.0 Spec |
| 9 | YouTube | Resumable Video Upload | Implements 2-step resumable upload protocol to `https://www.googleapis.com/upload/youtube/v3/videos` | `title`, `description`, `tags`, `privacyStatus`, `categoryId`, video buffer/URL | `PublishVideoResponse` with YouTube Watch URL | Throws `YouTubeQuotaExceededError` or `YouTubePublishError` | YouTube Data API v3 Spec |
| 10 | YouTube | Quota & Limit Tracking | Manages YouTube daily quota consumption (1,600 units per video insert out of 10,000 units/day project budget) | Upload call | Quota metadata | Identifies 403 `quotaExceeded` with midnight PT reset warning | YouTube API Quota Spec |
| 11 | Instagram | OAuth Long-Lived Token Exchange | Exchanges short-lived Facebook OAuth user token for 60-day long-lived token via `fb_exchange_token` | `code`, `appId`, `appSecret`, `redirectUri` | `OAuthTokenResponse` (60-day validity) | Throws `InstagramPublishError` on OAuth error | Meta Graph API Spec |
| 12 | Instagram | Account ID Resolution | Resolves Instagram Business Account ID by querying linked Facebook Pages (`/me/accounts` -> `/{page-id}?fields=instagram_business_account`) | `accessToken` | `igUserId` string | Throws if no linked IG Business account found | Instagram Graph API Spec |
| 13 | Instagram | Reels Media Container Creation | Step 1 of Reels publishing: `POST /{ig-user-id}/media` with `media_type=REELS` and `video_url` | `videoUrl`, `caption`, `shareToFeed`, `coverUrl`, `thumbOffset` | Container Creation ID (`{ id: string }`) | Throws if URL inaccessible or caption > 2200 chars | Instagram Content Publishing API |
| 14 | Instagram | Reels Status Polling | Step 2 of Reels publishing: Polls `GET /{container-id}?fields=status_code` until `FINISHED` or `ERROR` | `containerId`, `accessToken`, `timeoutMs` | Container ready confirmation | Throws on `ERROR` transcoding or timeout | Instagram Content Publishing API |
| 15 | Instagram | Reels Container Publishing | Step 3 of Reels publishing: `POST /{ig-user-id}/media_publish` with `creation_id` | `containerId`, `igUserId`, `accessToken` | Published Media ID & Reel URL | Throws on publication failure or rate limit | Instagram Content Publishing API |
| 16 | Instagram | Rate Limit & Quota Enforcement | Tracks 50 posts per 24-hour limit per Instagram Business Account | Upload call | Account quota tracking | Catches Facebook error codes 32, 4, 2207001 | Meta Platform Policy Spec |
| 17 | TikTok | OAuth 2.0 v2 Flow | Generates TikTok authorize URL and exchanges auth code / refresh token at `https://open.tiktokapis.com/v2/oauth/token/` | `clientKey`, `clientSecret`, `code`/`refreshToken` | `OAuthTokenResponse` (access + refresh tokens) | Throws `TikTokPublishError` on invalid token | TikTok for Developers Spec |
| 18 | TikTok | Video Publish Initialization | Direct Post Step 1: `POST /v2/post/publish/video/init/` with `PULL_FROM_URL` or `FILE_UPLOAD` | `title`, `privacyLevel`, `videoUrl` / size, duet/stitch settings | `publish_id` and optional `upload_url` | Throws `TikTokPublishError` on parameter violations | TikTok Content Posting API |
| 19 | TikTok | Video Status Fetching | Polls `POST /v2/post/publish/status_fetch/` to monitor `PROCESSING_DOWNLOAD`, `PUBLISH_COMPLETE`, or `FAILED` | `publish_id`, `accessToken` | Published video confirmation & URL | Throws on `FAILED` status with `fail_reason` | TikTok Content Posting API |
| 20 | TikTok | Creator Settings & Privacy | Supports `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `SELF_ONLY`, and commercial content toggle | Privacy settings | Formatted post metadata | Throws if privacy string invalid | TikTok Content Posting API |
| 21 | Database | Supabase `published_videos` Sync | Automatically inserts `{ video_id, platform, platform_id, url, published_at }` into Supabase | Publish response, `videoId` | Supabase DB row insertion | Handles DB write errors gracefully | `schema.sql` (Table 5) |
| 22 | Database | Supabase `settings` Token Store | Securely reads and updates OAuth tokens and client secrets in `settings` table | `userId`, `provider`, `apiKey` | Credentials object | Encrypted/JSON parsed credentials | `schema.sql` (Table 6) |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | All Publishers (Dry-Run) | `isDryRun: true` or missing API keys | Skips live HTTP request, generates valid deterministic mock URLs (`https://youtube.com/watch?v=mock_...`, `https://instagram.com/reel/mock_...`, `https://tiktok.com/@creator/video/mock_...`) with realistic latency (50ms). |
| 2 | YouTube Validation | `title` exceeding 100 characters | Throws `ValidationError: YouTube video title cannot exceed 100 characters (received N chars)`. |
| 3 | YouTube Validation | `tags` exceeding 500 total character length | Throws `ValidationError: YouTube total tags string length cannot exceed 500 characters`. |
| 4 | YouTube Quota | Google API returns HTTP 403 `quotaExceeded` | Throws `YouTubeQuotaExceededError: Daily quota of 10,000 units exceeded (1600 units required for video upload). Resets at 00:00 Pacific Time.` |
| 5 | Instagram Validation | `caption` exceeding 2200 characters | Throws `ValidationError: Instagram caption cannot exceed 2200 characters`. |
| 6 | Instagram Validation | More than 30 hashtags in caption | Throws `ValidationError: Instagram Reels support a maximum of 30 hashtags`. |
| 7 | Instagram Container Status | Container status poll returns `ERROR` or times out (>90s) | Throws `InstagramPublishError: Container processing failed with status ERROR: [transcoding error details]`. |
| 8 | Instagram Rate Limit | Account exceeds 50 posts in 24 hours | Catches Meta error code 2207001, throws `InstagramRateLimitError: Account publishing limit of 50 posts per 24 hours reached`. |
| 9 | TikTok Validation | Empty title / caption | Throws `ValidationError: TikTok video title is required`. |
| 10 | TikTok Status Polling | Status poll returns `FAILED` with `fail_reason: "video_too_short"` | Throws `TikTokPublishError: TikTok video publishing failed: video_too_short`. |
| 11 | Token Refresh Expiry | Access token expired and refresh token is invalid or absent | Throws `TokenExpiredError: OAuth token expired for [platform]. Re-authentication required.` |
| 12 | Exponential Backoff | HTTP 429 response with `Retry-After: 12` header | `withRetry` utility pauses execution for exactly 12,000ms before retrying the operation. |
| 13 | Multi-Platform Manager | 1 out of 3 platforms fails (e.g. TikTok fails, YouTube and IG succeed) | Returns `MultiPublishResult` with `success: false`, `results: { youtube: ok, instagram: ok, tiktok: failed }`, persisting successful posts to Supabase. |
| 14 | Video Sourcing | Video passed as remote URL vs local Buffer | YouTube uploads buffer directly; Instagram requires public HTTPS URL (`PULL_FROM_URL`); TikTok supports both `PULL_FROM_URL` and `FILE_UPLOAD`. |

---

## Detailed Specifications by Component

### 1. YouTube Data API v3 (`lib/publishing/youtube.ts`)

#### Authorization Flow
- **Authorization URL Endpoint**: `https://accounts.google.com/o/oauth2/v2/auth`
  - Parameters:
    - `client_id`: string (from config or `process.env.YOUTUBE_CLIENT_ID`)
    - `redirect_uri`: string (from config or `process.env.YOUTUBE_REDIRECT_URI`)
    - `response_type`: `'code'`
    - `scope`: `'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'`
    - `access_type`: `'offline'` (enables issuance of a refresh token)
    - `prompt`: `'consent'` (guarantees refresh token generation on repeated authorizations)
    - `state`: optional CSRF token
- **Token Exchange Endpoint**: `POST https://oauth2.googleapis.com/token`
  - Headers: `Content-Type: application/x-www-form-urlencoded`
  - Body: `code=${code}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&grant_type=authorization_code`
  - Response: `{ access_token: string, refresh_token: string, expires_in: number, token_type: 'Bearer', scope: string }`
- **Token Refresh Endpoint**: `POST https://oauth2.googleapis.com/token`
  - Body: `refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`

#### Video Upload Protocol (Resumable Upload)
- **Step 1: Create Resumable Upload Session**
  - Endpoint: `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
  - Headers:
    - `Authorization: Bearer <access_token>`
    - `Content-Type: application/json; charset=UTF-8`
    - `X-Upload-Content-Type: video/mp4`
    - `X-Upload-Content-Length: <filesize_in_bytes>`
  - Request Body:
    ```json
    {
      "snippet": {
        "title": "Short Title #shorts",
        "description": "Short Description with hashtags",
        "tags": ["shorts", "ai", "viral"],
        "categoryId": "22"
      },
      "status": {
        "privacyStatus": "public",
        "selfDeclaredMadeForKids": false,
        "publishAt": "2026-08-30T10:00:00Z"
      }
    }
    ```
  - Response: HTTP 200 with header `Location: <upload_url>`.
- **Step 2: Upload Binary Video Payload**
  - Endpoint: `PUT <upload_url>`
  - Headers: `Content-Type: video/mp4`, `Content-Length: <filesize_in_bytes>`
  - Response: HTTP 200 / 201 returning YouTube Video Resource JSON:
    ```json
    {
      "id": "dQw4w9WgXcQ",
      "snippet": { "title": "...", "publishedAt": "..." },
      "status": { "privacyStatus": "public", "uploadStatus": "uploaded" }
    }
    ```
- **Published Watch URL Format**: `https://www.youtube.com/watch?v=${id}` or `https://youtu.be/${id}`.

#### Quota & Constraints
- Daily Project Quota: 10,000 units.
- Video Upload Cost (`videos.insert`): 1,600 units per video.
- Daily Upload Limit on Free Quota: ~6 videos/day.
- Rate limit headers: Inspect `Retry-After` on HTTP 429 / 403.

---

### 2. Instagram Graph API for Reels (`lib/publishing/instagram.ts`)

#### Authorization Flow
- **Authorization URL**: `https://www.facebook.com/v19.0/dialog/oauth`
  - Scope: `'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement'`
  - Response Type: `'code'`
- **Long-Lived Token Exchange**:
  - Step 1: `POST https://graph.facebook.com/v19.0/oauth/access_token` with `code` -> short-lived token.
  - Step 2: `GET https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}` -> long-lived user token (valid for 60 days).
  - Step 3: Query linked Instagram Business Account:
    `GET https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}` -> find Page ID -> `GET https://graph.facebook.com/v19.0/{page-id}?fields=instagram_business_account&access_token=${longLivedToken}` -> `{ instagram_business_account: { id: "<ig_user_id>" } }`.

#### 3-Step Reels Publishing Workflow
- **Step 1: Create Media Container**
  - Endpoint: `POST https://graph.facebook.com/v19.0/{ig-user-id}/media`
  - Body / Form Parameters:
    ```json
    {
      "media_type": "REELS",
      "video_url": "https://pub-storage.clipped.app/renders/video-123.mp4",
      "caption": "Exciting AI video story! #reels #ai #trending",
      "share_to_feed": true,
      "thumb_offset": 1000,
      "cover_url": "https://pub-storage.clipped.app/renders/video-123-thumb.jpg"
    }
    ```
  - Response: `{ "id": "17928374928374928" }` (Creation ID).
- **Step 2: Poll Container Transcoding Status**
  - Endpoint: `GET https://graph.facebook.com/v19.0/{creation-id}?fields=status_code,status&access_token=${accessToken}`
  - Polling interval: Every 3,000ms with max 30 attempts (90-second timeout).
  - Valid status codes:
    - `IN_PROGRESS`: Transcoding in progress, continue polling.
    - `FINISHED`: Ready to publish.
    - `ERROR`: Transcoding failed, read `status` message and throw `InstagramPublishError`.
    - `EXPIRED`: Container timed out (24h lifespan).
- **Step 3: Publish Media Container**
  - Endpoint: `POST https://graph.facebook.com/v19.0/{ig-user-id}/media_publish`
  - Body: `{ "creation_id": "17928374928374928" }`
  - Response: `{ "id": "18012345678901234" }` (Published Media ID).
- **Permalink URL**: `https://www.instagram.com/reel/{id}/`.

#### Constraints & Limits
- Maximum 50 posts per 24 hours per Instagram Business Account.
- Video requirements: 9:16 aspect ratio, duration between 3s and 90s, H.264 video codec, AAC audio codec.
- Caption limit: 2,200 characters, maximum 30 hashtags.

---

### 3. TikTok Content Posting API (`lib/publishing/tiktok.ts`)

#### Authorization Flow
- **Authorization URL**: `https://www.tiktok.com/v2/auth/authorize/`
  - Parameters:
    - `client_key`: string (App Client Key)
    - `scope`: `'user.info.basic,video.publish,video.upload'`
    - `response_type`: `'code'`
    - `redirect_uri`: string
    - `state`: CSRF token
- **Token Exchange Endpoint**: `POST https://open.tiktokapis.com/v2/oauth/token/`
  - Headers: `Content-Type: application/x-www-form-urlencoded`
  - Body: `client_key=${clientKey}&client_secret=${clientSecret}&code=${code}&grant_type=authorization_code&redirect_uri=${redirectUri}`
  - Response:
    ```json
    {
      "data": {
        "access_token": "act.example_token",
        "expires_in": 86400,
        "open_id": "_000example_open_id",
        "refresh_expires_in": 31536000,
        "refresh_token": "rft.example_refresh_token",
        "scope": "user.info.basic,video.publish,video.upload",
        "token_type": "Bearer"
      },
      "error": { "code": "ok", "message": "" }
    }
    ```
- **Token Refresh Endpoint**: `POST https://open.tiktokapis.com/v2/oauth/token/`
  - Body: `client_key=${clientKey}&client_secret=${clientSecret}&grant_type=refresh_token&refresh_token=${refreshToken}`

#### Direct Video Publishing Flow
- **Step 1: Initialize Video Publish**
  - Endpoint: `POST https://open.tiktokapis.com/v2/post/publish/video/init/`
  - Headers: `Authorization: Bearer <access_token>`, `Content-Type: application/json; charset=UTF-8`
  - Body:
    ```json
    {
      "post_info": {
        "title": "Mind-blowing AI creation! #fyp #viral",
        "privacy_level": "PUBLIC_TO_EVERYONE",
        "disable_duet": false,
        "disable_stitch": false,
        "disable_comment": false,
        "video_cover_timestamp_ms": 1000
      },
      "source_info": {
        "source": "PULL_FROM_URL",
        "video_url": "https://pub-storage.clipped.app/renders/video-123.mp4"
      }
    }
    ```
  - Response: `{ "data": { "publish_id": "v_pub_file_12345", "upload_url": "" }, "error": { "code": "ok" } }`.
- **Step 2: Check Publish Status**
  - Endpoint: `POST https://open.tiktokapis.com/v2/post/publish/status_fetch/`
  - Headers: `Authorization: Bearer <access_token>`, `Content-Type: application/json`
  - Body: `{ "publish_id": "v_pub_file_12345" }`
  - Response:
    ```json
    {
      "data": {
        "status": "PUBLISH_COMPLETE",
        "fail_reason": ""
      },
      "error": { "code": "ok" }
    }
    ```
  - Valid status values: `PROCESSING_DOWNLOAD`, `PROCESSING_UPLOAD`, `PUBLISH_COMPLETE`, `FAILED`.
- **Published URL**: `https://www.tiktok.com/@creator/video/{publish_id}`.

---

### 4. Common Rate-Limiter & Exponential Backoff (`lib/publishing/rate-limiter.ts`)

#### Full Jitter Algorithm
The standard exponential backoff algorithm with full jitter avoids the "thundering herd" problem and spreads retry attempts smoothly across time:
```ts
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 16000
): number {
  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  // Full jitter: uniformly distributed random delay in [0, exponentialDelay]
  return Math.floor(Math.random() * exponentialDelay);
}
```

#### Generic `withRetry` Wrapper
```ts
export interface RetryOptions {
  maxAttempts?: number; // default: 3
  baseDelayMs?: number; // default: 1000
  maxDelayMs?: number;  // default: 16000
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 16000;

  let lastError: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      const isLastAttempt = attempt >= maxAttempts - 1;
      if (isLastAttempt) break;

      // Check if error is retryable (HTTP 429, 500, 502, 503, 504, network timeout)
      const isRetryable = options.shouldRetry
        ? options.shouldRetry(error, attempt)
        : isDefaultRetryableError(error);

      if (!isRetryable) {
        throw error;
      }

      // Check for Retry-After header
      const retryAfterMs = extractRetryAfterMs(error);
      const delayMs = retryAfterMs ?? calculateBackoffWithJitter(attempt, baseDelayMs, maxDelayMs);

      if (options.onRetry) {
        options.onRetry(error, attempt, delayMs);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
```

#### Token Bucket Platform Rate Limiters
```ts
export class TokenBucketLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly capacity: number;
  private readonly fillRatePerMs: number;

  constructor(capacity: number, fillRatePerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.fillRatePerMs = fillRatePerSecond / 1000;
    this.lastRefillTime = Date.now();
  }

  async acquire(tokens: number = 1): Promise<void> {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }
    const missing = tokens - this.tokens;
    const waitTimeMs = Math.ceil(missing / this.fillRatePerMs);
    await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
    this.refill();
    this.tokens = Math.max(0, this.tokens - tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.fillRatePerMs);
    this.lastRefillTime = now;
  }
}
```

---

### 5. Unified Publisher Interface & Factory (`lib/publishing/index.ts` & `lib/publishing/types.ts`)

#### Unified TypeScript Contracts (`lib/publishing/types.ts`)

```ts
export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok';

export type PublishStatus = 'pending' | 'processing' | 'published' | 'scheduled' | 'failed';

export type VideoPrivacy = 'public' | 'unlisted' | 'private';

export interface SocialCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string | number;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  platformUserId?: string; // e.g. ig-user-id or open_id
  extra?: Record<string, any>;
}

export interface PublishVideoRequest {
  platform: SocialPlatform;
  videoId?: string; // Clipped Supabase video UUID
  title: string;
  description?: string;
  caption?: string; // Alias / platform-specific text
  tags?: string[];
  videoUrl?: string; // Public CDN URL
  videoBuffer?: Buffer | Uint8Array;
  coverUrl?: string;
  privacy?: VideoPrivacy;
  scheduledAt?: string; // ISO 8601 string
  isDryRun?: boolean; // Defaults to true
  credentials?: SocialCredentials;
  extraMetadata?: Record<string, any>;
}

export interface PublishVideoResponse {
  success: boolean;
  platform: SocialPlatform;
  platformVideoId: string;
  publishedUrl: string;
  status: PublishStatus;
  isDryRun: boolean;
  metadata?: Record<string, any>;
  error?: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
  platformUserId?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  state?: string;
  scopes?: string[];
}

export interface ISocialPublisher {
  readonly platform: SocialPlatform;
  getAuthUrl(config: OAuthConfig): string;
  exchangeCode(code: string, config: OAuthConfig): Promise<OAuthTokenResponse>;
  refreshToken(refreshToken: string, config: OAuthConfig): Promise<OAuthTokenResponse>;
  publishVideo(request: PublishVideoRequest): Promise<PublishVideoResponse>;
  checkStatus(platformVideoId: string, credentials?: SocialCredentials): Promise<PublishVideoResponse>;
}
```

#### Factory & Multi-Platform Manager (`lib/publishing/index.ts`)

```ts
import { ISocialPublisher, SocialPlatform, PublishVideoRequest, PublishVideoResponse } from './types';
import { YouTubePublisher, youtubePublisher } from './youtube';
import { InstagramPublisher, instagramPublisher } from './instagram';
import { TikTokPublisher, tiktokPublisher } from './tiktok';
import { supabase } from '../db';

/**
 * Returns the publisher singleton instance for a given platform.
 */
export function getPublisher(platform: SocialPlatform): ISocialPublisher {
  switch (platform) {
    case 'youtube':
      return youtubePublisher;
    case 'instagram':
      return instagramPublisher;
    case 'tiktok':
      return tiktokPublisher;
    default:
      throw new Error(`Unsupported publishing platform: ${platform}`);
  }
}

export interface MultiPublishRequest {
  videoId?: string;
  title: string;
  description?: string;
  tags?: string[];
  videoUrl?: string;
  privacy?: 'public' | 'unlisted' | 'private';
  scheduledAt?: string;
  platforms: SocialPlatform[];
  isDryRun?: boolean;
  credentialsMap?: Partial<Record<SocialPlatform, any>>;
}

export interface MultiPublishResult {
  success: boolean;
  totalPlatforms: number;
  successfulPlatforms: number;
  results: Record<SocialPlatform, PublishVideoResponse>;
  errors?: Record<SocialPlatform, string>;
}

export class SocialPublisherManager {
  /**
   * Publishes a single video across multiple social networks in parallel,
   * aggregating results and writing records to Supabase published_videos table.
   */
  async publishToMultiple(request: MultiPublishRequest): Promise<MultiPublishResult> {
    const isDryRun = request.isDryRun !== false; // Strict default true
    const platforms = request.platforms && request.platforms.length > 0
      ? request.platforms
      : (['youtube', 'instagram', 'tiktok'] as SocialPlatform[]);

    const results: Partial<Record<SocialPlatform, PublishVideoResponse>> = {};
    const errors: Partial<Record<SocialPlatform, string>> = {};

    const publishPromises = platforms.map(async (platform) => {
      try {
        const publisher = getPublisher(platform);
        const creds = request.credentialsMap?.[platform];
        
        const res = await publisher.publishVideo({
          platform,
          videoId: request.videoId,
          title: request.title,
          description: request.description,
          tags: request.tags,
          videoUrl: request.videoUrl,
          privacy: request.privacy,
          scheduledAt: request.scheduledAt,
          isDryRun,
          credentials: creds,
        });

        results[platform] = res;

        // Persist to Supabase published_videos table if videoId is provided
        if (request.videoId && res.success) {
          try {
            await supabase.from('published_videos').insert({
              video_id: request.videoId,
              platform,
              platform_id: res.platformVideoId,
              url: res.publishedUrl,
              published_at: new Date().toISOString(),
            });
          } catch (dbErr) {
            console.warn(`[SocialPublisherManager] Failed to record publish in DB for ${platform}:`, dbErr);
          }
        }
      } catch (err: any) {
        errors[platform] = err?.message || String(err);
        results[platform] = {
          success: false,
          platform,
          platformVideoId: '',
          publishedUrl: '',
          status: 'failed',
          isDryRun,
          error: err?.message || String(err),
        };
      }
    });

    await Promise.all(publishPromises);

    const successfulPlatforms = Object.values(results).filter((r) => r?.success).length;
    return {
      success: successfulPlatforms === platforms.length,
      totalPlatforms: platforms.length,
      successfulPlatforms,
      results: results as Record<SocialPlatform, PublishVideoResponse>,
      errors: Object.keys(errors).length > 0 ? (errors as Record<SocialPlatform, string>) : undefined,
    };
  }
}

export const socialPublisherManager = new SocialPublisherManager();
```

---

## Supabase Database Integration

The publishing subsystem integrates directly with Supabase PostgreSQL tables defined in `schema.sql`:

1. **`published_videos` Table**:
   - Schema:
     - `id`: UUID (Primary Key)
     - `video_id`: UUID (Foreign Key -> `videos.id`)
     - `platform`: TEXT (`'youtube'` | `'instagram'` | `'tiktok'`)
     - `platform_id`: TEXT (Platform Video ID, e.g. `dQw4w9WgXcQ` or `mock_yt_...`)
     - `url`: TEXT (Public Web URL, e.g. `https://youtube.com/watch?v=...`)
     - `view_count`: INTEGER (Default 0)
     - `published_at`: TIMESTAMP (UTC)
   - Usage: Inserted upon successful video publication by `SocialPublisherManager`.

2. **`settings` Table**:
   - Schema:
     - `id`: UUID (Primary Key)
     - `user_id`: UUID (Foreign Key -> `users.id`)
     - `provider`: TEXT (`'youtube_oauth'`, `'instagram_oauth'`, `'tiktok_oauth'`)
     - `api_key`: TEXT (Encrypted JSON string containing `{ accessToken, refreshToken, expiresAt, platformUserId }`)
     - `is_active`: BOOLEAN (Default true)
   - Usage: Read by publishers to retrieve active OAuth credentials; updated during `refreshToken()` flows.

---

## Test & Verification Matrix (Tier 6 E2E Integration)

The upcoming Tier 6 test suite (`tests/e2e/tier6-integration.test.ts`) and runner (`tests/e2e/standalone-runner.js`) must verify the following test cases:

| Test ID | Test Category | Target Component | Description | Expected Assertion |
|---------|---------------|------------------|-------------|--------------------|
| T6-PUB-01 | YouTube Dry-Run | `youtube.ts` | Publish video with default `isDryRun = true` | Returns `{ success: true, platform: 'youtube', isDryRun: true, publishedUrl: /youtube\.com\/watch\?v=/ }` |
| T6-PUB-02 | YouTube Validation | `youtube.ts` | Attempt publish with title > 100 characters | Throws `ValidationError` indicating title length limit exceeded |
| T6-PUB-03 | YouTube Auth URL | `youtube.ts` | Generate Google OAuth authorization URL | URL contains `accounts.google.com`, `scope=...youtube.upload`, and `access_type=offline` |
| T6-PUB-04 | Instagram Dry-Run | `instagram.ts` | Publish Reel with default `isDryRun = true` | Returns `{ success: true, platform: 'instagram', isDryRun: true, publishedUrl: /instagram\.com\/reel\// }` |
| T6-PUB-05 | Instagram Validation | `instagram.ts` | Attempt publish with caption > 2200 characters or > 30 hashtags | Throws `ValidationError` with specific parameter message |
| T6-PUB-06 | Instagram Auth URL | `instagram.ts` | Generate Instagram / Meta OAuth authorization URL | URL contains `facebook.com`, `instagram_content_publish`, and `response_type=code` |
| T6-PUB-07 | TikTok Dry-Run | `tiktok.ts` | Publish video with default `isDryRun = true` | Returns `{ success: true, platform: 'tiktok', isDryRun: true, publishedUrl: /tiktok\.com\/@/ }` |
| T6-PUB-08 | TikTok Validation | `tiktok.ts` | Attempt publish with empty title or invalid privacy level | Throws `ValidationError` |
| T6-PUB-09 | Rate Limiter Backoff | `rate-limiter.ts` | Execute `withRetry` on simulated transient failure | Retries with full jitter delay, succeeds within max attempts |
| T6-PUB-10 | Rate Limiter Retry-After | `rate-limiter.ts` | Execute `withRetry` receiving HTTP 429 with `Retry-After` | Respects exact header delay duration |
| T6-PUB-11 | Multi-Platform Manager | `index.ts` | Publish video across all 3 platforms simultaneously in dry-run mode | Returns `MultiPublishResult` with `success: true`, 3/3 platforms successful |
| T6-PUB-12 | Partial Failure Resilience | `index.ts` | Publish across 3 platforms where 1 platform fails validation | Returns `success: false`, `successfulPlatforms: 2`, without crashing or rejecting |

---

## Implementation Checklist & File Map

| Target File | Scope / Responsibilities | Dependencies |
|-------------|--------------------------|--------------|
| `lib/publishing/types.ts` | Polymorphic TypeScript types, interfaces, request/response models, error classes | None |
| `lib/publishing/rate-limiter.ts` | Exponential backoff with jitter, retry wrapper, token bucket limiters | None |
| `lib/publishing/youtube.ts` | `YouTubePublisher` class (OAuth, resumable upload, quota tracking, dry-run) | `types.ts`, `rate-limiter.ts` |
| `lib/publishing/instagram.ts` | `InstagramPublisher` class (OAuth, 3-step Reels container flow, polling, dry-run) | `types.ts`, `rate-limiter.ts` |
| `lib/publishing/tiktok.ts` | `TikTokPublisher` class (OAuth v2, direct post init, status fetch, dry-run) | `types.ts`, `rate-limiter.ts` |
| `lib/publishing/index.ts` | `getPublisher(platform)` factory, `SocialPublisherManager`, Supabase sync | `types.ts`, `youtube.ts`, `instagram.ts`, `tiktok.ts`, `lib/db.ts` |

---
*Report compiled by Spec Miner for Clipped R2 Extension Milestone.*
