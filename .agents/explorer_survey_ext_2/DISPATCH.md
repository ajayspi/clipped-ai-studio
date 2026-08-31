## 2026-08-29T11:10:02Z
You are a Spec Miner investigating R2: Social Publishing APIs for the "Clipped" Next.js 14 project.
Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_2
Project root: C:\Users\vigilare\.gemini\antigravity\scratch\clipped
Authoritative Request: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md

Task:
1. Read ORIGINAL_REQUEST.md and examine the codebase in lib/engine/*, lib/db.ts, schema.sql, etc.
2. Investigate the design, API specs, and implementation architecture for `lib/publishing/*`:
   - YouTube Data API v3 (`lib/publishing/youtube.ts`): OAuth authorization url, token exchange, refresh token flow, resumable/direct video upload, metadata (title, description, tags, privacyStatus, categoryId), rate limits (10,000 quota units/day, video upload = 1600 units).
   - Instagram Graph API for Reels (`lib/publishing/instagram.ts`): OAuth long-lived user token exchange, Reels container creation `POST /{ig-user-id}/media`, status polling `GET /{container-id}`, publish `POST /{ig-user-id}/media_publish`.
   - TikTok Content API (`lib/publishing/tiktok.ts`): OAuth v2 token refresh, video initialization `POST /v2/post/publish/video/init/`, direct upload / creator inbox, status check.
   - Common rate-limiting and exponential backoff utility with jitter (`lib/publishing/rate-limiter.ts` or helper).
   - Strict "dry-run" execution defaults across all social clients (`isDryRun = true` default) to prevent accidental live posting during tests/dev.
   - Unified publisher interface & factory in `lib/publishing/index.ts` and type definitions in `lib/publishing/types.ts`.
3. Write a comprehensive specification and analysis report to:
   `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_2\report.md`
   and write a standard `handoff.md` in your working directory.
4. Notify parent using send_message with your report summary when complete.
