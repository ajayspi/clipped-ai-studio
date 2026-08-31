# Handoff Report: Spec Miner Survey Ext 2 (R2 Social Publishing APIs)

## 1. Observation

1. **Authoritative Request (`ORIGINAL_REQUEST.md`)**:
   - Lines 39-41 & 49-54:
     - "R2. Implement Social Publishing APIs: Build `lib/publishing/*` modules to handle OAuth flows and direct video uploads to YouTube Data API v3, Instagram Graph API (Reels), and TikTok Content API."
     - "Publishing modules correctly implement rate-limit handling and exponential backoff."
     - "MUST implement strict 'dry-run' execution defaults for the Social APIs to prevent accidental live posting to social accounts during testing."
     - "Must build E2E integration tests in `tests/e2e/tier6-integration.test.ts` verifying dry-run paths."

2. **Existing Codebase Architecture & Conventions**:
   - `lib/engine/*`: Singletons (`video-generator.ts`, `image-generator.ts`, `bulk-planner.ts`, `auto-pilot.ts`) use native `fetch` with standard bearer authentication and zero vendor SDK dependencies (no `@fal-ai/serverless-client`, `@google-cloud/video`, etc.).
   - `lib/engine/video-generator.ts:16-94`: Implements strict dry-run / mock fallbacks when API keys are absent or when `mock: true` is requested.
   - `schema.sql:54-63`: Table `published_videos` contains `id UUID PRIMARY KEY`, `video_id UUID REFERENCES videos(id)`, `platform TEXT NOT NULL`, `platform_id TEXT`, `url TEXT`, `view_count INTEGER DEFAULT 0`, `published_at TIMESTAMP WITH TIME ZONE`.
   - `schema.sql:82-94`: Table `settings` stores OAuth API keys and configurations per user/provider (`provider TEXT NOT NULL`, `api_key TEXT NOT NULL`, `is_active BOOLEAN`).
   - `lib/db.ts:1-7`: Supabase client initialized via `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`.
   - `app/(app)/settings/page.tsx:57-61`: Settings UI documents publishing providers: `youtube` ("YouTube Data API"), `tiktok` ("TikTok Content API"), and `instagram` ("Instagram Graph API").

3. **External API Protocols**:
   - **YouTube Data API v3**:
     - OAuth Auth URL: `https://accounts.google.com/o/oauth2/v2/auth?scope=...youtube.upload...&access_type=offline&prompt=consent`
     - Token endpoint: `POST https://oauth2.googleapis.com/token`
     - Video upload: Resumable 2-step protocol at `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
     - Quota constraints: 10,000 units/day default; 1,600 units per video insert; catches 403 `quotaExceeded`.
   - **Instagram Graph API for Reels**:
     - OAuth & Long-Lived Token: `https://www.facebook.com/v19.0/dialog/oauth` and `GET /oauth/access_token?grant_type=fb_exchange_token` (60 days validity).
     - 3-step Reels container flow:
       1. `POST /{ig-user-id}/media` (`media_type=REELS`, `video_url=...`)
       2. Polling `GET /{container-id}?fields=status_code` until `FINISHED` or `ERROR`
       3. `POST /{ig-user-id}/media_publish` with `creation_id`
     - Rate limit: 50 posts per 24 hours per IG Business Account.
   - **TikTok Content API**:
     - OAuth v2 Auth URL: `https://www.tiktok.com/v2/auth/authorize/`
     - Token endpoint: `POST https://open.tiktokapis.com/v2/oauth/token/`
     - Video init: `POST https://open.tiktokapis.com/v2/post/publish/video/init/` (`PULL_FROM_URL` or `FILE_UPLOAD`)
     - Status fetch: `POST https://open.tiktokapis.com/v2/post/publish/status_fetch/`

---

## 2. Logic Chain

1. **Consistency with Zero-SDK Native Fetch Architecture**:
   - Observation: All `lib/engine/*` modules interact with external AI systems (Kling, Luma, Fal, OpenAI) via native `fetch`.
   - Inference: `lib/publishing/*` should not introduce third-party client libraries (e.g. `googleapis`, `instagram-private-api`). Native `fetch` provides faster startup, smaller bundle sizes, complete transparency, and flawless execution in Next.js Edge / Serverless runtimes.

2. **Strict Dry-Run Safety Model**:
   - Observation: Requirement mandates strict dry-run execution defaults to prevent accidental live posting during testing.
   - Inference: Defaulting `isDryRun = true` across all publisher constructors and method parameter signatures ensures that unit and E2E test suites can exercise 100% of the parameter validation, URL building, and workflow logic without making any network calls to external platforms.
   - Inference: Validation (e.g. title lengths, tag limits, caption rules) must occur before the dry-run mock response is returned, guaranteeing that invalid inputs are detected identically in test and production environments.

3. **Rate Limiting & Backoff with Jitter**:
   - Observation: Social APIs enforce strict burst limits and quota budgets (YouTube 10,000 units, Instagram 50 posts/24hr, TikTok 5 req/sec).
   - Inference: A centralized `withRetry` utility implementing full jitter exponential backoff (`delay = Math.random() * Math.min(maxDelay, baseDelay * 2^attempt)`) plus support for HTTP `Retry-After` headers guarantees high resilience against transient 429 and 5xx errors.

4. **Polymorphic Factory & Supabase Persistence**:
   - Observation: `published_videos` table in Supabase stores records per video and platform.
   - Inference: Implementing a unified `ISocialPublisher` interface, a `getPublisher(platform)` factory, and a `SocialPublisherManager` allows multi-platform publishing (`publishToMultiple`) with automatic persistence into Supabase `published_videos`.

---

## 3. Caveats

1. **Public URL Requirement for Instagram / TikTok**:
   - Instagram Graph API Reels requires a publicly accessible HTTPS video URL (`video_url`) reachable by Meta's servers. In local development or dry-run mode, mock URLs or local files cannot be directly fetched by Meta without an external tunnel or CDN upload (e.g., Supabase Storage bucket).
2. **Facebook App & Instagram Business Account Setup**:
   - Real-world Instagram Reels publishing requires an active Facebook Developer App with `instagram_content_publish` permissions and an Instagram Professional/Creator account connected to a Facebook Page. In dry-run mode, these prerequisites are fully bypassed.
3. **YouTube Quota Budget**:
   - With 1,600 units per video insert, a free-tier Google Cloud project (10,000 units/day) can upload at most 6 live videos per day before requiring a quota increase request from Google.

---

## 4. Conclusion

The specification and architecture for `lib/publishing/*` are complete, authoritative, and ready for immediate implementation.

### Recommended File Structure to Implement:
1. `lib/publishing/types.ts`: Core data structures, request/response models, error classes, and `ISocialPublisher` interface.
2. `lib/publishing/rate-limiter.ts`: Exponential backoff with full jitter, `withRetry` wrapper, and platform token bucket limiters.
3. `lib/publishing/youtube.ts`: `YouTubePublisher` handling Google OAuth 2.0, resumable video upload, quota tracking, and dry-run mocking.
4. `lib/publishing/instagram.ts`: `InstagramPublisher` handling Meta OAuth, 3-step Reels container creation/polling/publishing, and dry-run mocking.
5. `lib/publishing/tiktok.ts`: `TikTokPublisher` handling TikTok OAuth v2, video publishing initialization, status fetching, and dry-run mocking.
6. `lib/publishing/index.ts`: Unified exports, `getPublisher(platform)` factory, and `SocialPublisherManager` with Supabase `published_videos` sync.

---

## 5. Verification Method

To verify the implementation once coded:
1. **Direct Module Import & TypeScript Compilation**:
   - Run Next.js build or TypeScript check: `npx tsc --noEmit`.
2. **Unit & Dry-Run Integration Tests**:
   - Execute Tier 6 test suite: `node tests/e2e/standalone-runner.js` (or specifically `tests/e2e/tier6-integration.test.ts`).
3. **Inspect Output Files**:
   - Verify `lib/publishing/report.md` exists and matches this specification.
   - Verify that all publishers export singleton instances (`youtubePublisher`, `instagramPublisher`, `tiktokPublisher`, `socialPublisherManager`).
