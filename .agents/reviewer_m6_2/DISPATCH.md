## 2026-08-29T11:23:07Z
Objectively and adversarially review `lib/publishing/*` (YouTube Data API v3, Instagram Graph API Reels, TikTok Content API, OAuth flows, rate-limiting & backoff with jitter, strict dry-run defaults, Supabase logging) and `lib/quotas.ts` (Supabase tracking, 3 videos/month free tier, monthly calendar rollover, atomic consumption & refunding).
Verify all requirements in ORIGINAL_REQUEST.md and SCOPE.md.
Run tests: `node tests/e2e/standalone-runner.js` to ensure all 132 tests pass.
Write review report to `review.md` and `handoff.md`.
Notify parent with verdict and findings.
