# dashboard

## Overview
Clipped AI Studio command center providing high-altitude operations monitoring, featuring the Studio Pulse KPI deck, Omni-Launchpad rapid creation bar, real-time Active Operations Deck, and completed video gallery with full playback and download capabilities.

## Interface
- [page.tsx:DashboardPage] Default async React Server Component orchestrating dashboard data retrieval
- [page.tsx:dynamic] Segment config `export const dynamic = 'force-dynamic'`
- [page.tsx:revalidate] Cache config `export const revalidate = 0`
- [page.tsx:ACTIVE_STATUSES] Array constant defining active rendering and planning statuses
- [page.tsx:WorkspaceSummary] Interface defining workspace metadata (`id`, `name`, `color`)
- Core Sub-components:
  - `StudioPulse` (`components/dashboard/StudioPulse.tsx`): 4-card live metrics tracker
  - `OmniLaunchpad` (`components/dashboard/OmniLaunchpad.tsx`): Unified prompt bar leading to signature studios
  - `ActiveOperationsDeck` (`components/dashboard/ActiveOperationsDeck.tsx`): Real-time live status and progress tracker
  - `DashboardCard` (`components/dashboard/DashboardCard.tsx`): Video card with inline playback and cinema modal launcher

## Invariants
- [page.tsx:JobPresentation] Must parse all job records through `extractJobPresentation` to normalize legacy logs into standardized title, poster thumbnail, aspect ratio, and video output URL
- [page.tsx:DatabaseQueries] Fetches up to 30 recent jobs ordered by `created_at` descending and exact count of scheduled posts

## Side Effects
- [page.tsx:supabase] Performs server-side SELECT queries against `render_jobs`, `workspaces`, and `scheduled_posts` tables

## Verification
- Run: `node tests/e2e/standalone-runner.js`
