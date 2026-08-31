# BRIEFING — 2026-08-29T11:15:00Z

## Mission
Investigate and author authoritative specifications for R2: Social Publishing APIs (`lib/publishing/*` covering YouTube Data API v3, Instagram Graph API Reels, TikTok Content API, rate limiting / backoff with jitter, dry-run defaults, and unified publisher interface) in the Clipped project.

## 🔒 My Identity
- Archetype: Specification Miner / Teamwork Specialist
- Roles: Spec Miner, Architecture Explorer, API Designer
- Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_ext_2
- Original parent: 9f08eecd-2e34-409d-a9fe-a8db847488cb
- Milestone: Extension Milestone R2 (Social Publishing APIs)

## 🔒 Key Constraints
- Read-only regarding application source code during exploration (do not implement the actual production code, only create spec reports and handoff).
- Zero external vendor SDK dependencies; use native Node `fetch` patterns matching `lib/engine/*`.
- Strict "dry-run" execution defaults across all social clients (`isDryRun = true` default) to prevent accidental live posting.
- Maintain persistent memory via BRIEFING.md and liveness via progress.md.
- Follow communication guideline: use files for reports/handoffs and `send_message` to parent.

## Current Parent
- Conversation ID: 9f08eecd-2e34-409d-a9fe-a8db847488cb
- Updated: not yet

## Task Summary
- **What to build/specify**:
  1. YouTube Data API v3 client (`lib/publishing/youtube.ts`)
  2. Instagram Graph API Reels client (`lib/publishing/instagram.ts`)
  3. TikTok Content API client (`lib/publishing/tiktok.ts`)
  4. Common rate limiter & exponential backoff with jitter (`lib/publishing/rate-limiter.ts`)
  5. Dry-run execution model (`isDryRun = true` default, mock response schemas)
  6. Unified publishing interface & factory (`lib/publishing/index.ts` & `lib/publishing/types.ts`)
- **Success criteria**: Detailed, actionable, complete interface contracts, API payloads, endpoint specs, rate limit constraints, error handling rules, and E2E test verification hooks.
- **Interface contracts**: `lib/publishing/types.ts`, `lib/publishing/index.ts`, `schema.sql` (`published_videos`, `settings`)
- **Code layout**: `lib/publishing/`

## Key Decisions Made
- Architecture alignment: Model social publishers as classes implementing a common `SocialPublisher` interface with `publishVideo()`, `getAuthUrl()`, `exchangeCode()`, `refreshToken()`, `checkStatus()`.
- Dry-run default: Default `isDryRun: boolean = true` across all constructor configurations and publish calls unless explicit live credentials and `isDryRun: false` are provided.
- Zero extra dependencies: Rely on native `fetch`, standard `FormData` / `Blob` / URLSearchParams, and custom rate-limiter utility.

## Artifact Index
- `.agents/explorer_survey_ext_2/DISPATCH.md` — Assignment dispatch
- `.agents/explorer_survey_ext_2/BRIEFING.md` — Agent briefing & situational awareness
- `.agents/explorer_survey_ext_2/progress.md` — Liveness and step heartbeat
- `.agents/explorer_survey_ext_2/report.md` — Full specification report
- `.agents/explorer_survey_ext_2/handoff.md` — Standard 5-component handoff report
