# Clipped AI Video Studio & OmniRoute — Daily Documentation & Changelog

> **Repository:** `clipped-omni-router`  
> **Master Project Gist:** [`docs/PROJECT_GIST.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/PROJECT_GIST.md)  
> **Detailed Daily Logs:** [`docs/devlogs/`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/INDEX.md)  
> **Protocol Rule:** [`.agents/rules/daily-documentation.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/.agents/rules/daily-documentation.md)

---

## 📅 2026-09-26 (Today)
- **Detailed Log:** [`docs/devlogs/2026-09-24_to_2026-09-26.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-09-24_to_2026-09-26.md)
- **Directives & Prompts:**
  - Bring scoped lint/typecheck to zero (WP4) and prove the full acceptance chain green.
  - Write a master maintenance document covering all work carried out and all project aspects; push it to Notion as a new file.
  - Push to GitHub and maintain the repository; create a Notion project hub.
- **Key Changes & Features:**
  - **WP4 Toolchain**: `pnpm lint:scoped` → 0 across 197 files; `pnpm typecheck` (via new `tsconfig.check.json`) → 0 (21 errors fixed). Harness `then`-arrow `this`-binding runtime bug fixed in BOTH `tests/e2e/test-harness.ts` and `standalone-runner.js`. New `types/ambient.d.ts` (fluent-ffmpeg / node-edge-tts / youtube-transcript). `render-worker.ts` compId block re-restored (T8-WRK-02).
  - **Acceptance chain green**: lint 0 → tsc 0 → vitest 189/189 → `pnpm test` 201/201 → build exit 0 (commit `62d2c7d4`).
  - **Master maintenance doc**: `docs/MAINTENANCE.md` (292 lines) — architecture, commands/verify chain, quirks, environment, deployments, complete work history, maintenance procedures. Mirrored to Notion Files DB as a page (146 blocks, sync-engine property shape).
  - **GitHub sync**: `origin/main` fast-forwarded `a745a0d3..31191087`; `docs/agent-guide` also pushed (in sync).
  - **Notion project hub**: "Clipped AI Studio — Project Documentation" with 9 subpages (Overview → Roadmap & Change Log) + quick-nav, under the workspace projects parent.
  - **AGENTS.md learning-loop updates**: Files DB not shared with Notion MCP integration; 2000-char code-block cap; `ntn pages create` first-heading title trap; `child_page` blocks rejected in append payloads.

## 📅 2026-09-08 (Today)
- **Detailed Log:** [`docs/devlogs/2026-09-08.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-09-08.md)
- **Directives & Prompts:**
  - Enforce zero-scroll 1080p viewport in `/create` creation wizard.
  - Implement dedicated `/queue` page and global render queue indicators across header & sidebar.
  - Harden subtitle FFmpeg filter strings against space splitting and RGBA syntax crashes.
  - Implement persistent daily documentation and prompt memory system (`/learn`).
- **Key Changes & Features:**
  - **Zero-Scroll Viewport**: Constrained `CreationWizard.tsx` (`h-[calc(100vh-4.25rem)] overflow-hidden`), compact 52px subtitle cards, 40px horizontal voice cards, scroll-capped 66px scene cards.
  - **Dedicated Queue Page**: Built `app/(app)/queue/page.tsx` with live progress bars, execution log drawer, and deep-link routing from wizard.
  - **Global Queue Indicator**: Created `components/RenderQueueIndicator.tsx` rendered in Desktop Header, Mobile Header, and Sidebar.
  - **Subtitle Engine Fix**: Migrated from `-vf` option strings to `cmd.videoFilters()`, aggressive character escaping (`'`, `:`, `\`), and native FFmpeg boxcolor formats.
  - **Daily Documentation System**: Converted `daily_documentation.md` to UTF-8, created `docs/PROJECT_GIST.md`, built chronological daily devlogs in `docs/devlogs/`, and codified persistent rule `.agents/rules/daily-documentation.md`.

---

## 📅 2026-09-07
- **Detailed Log:** [`docs/devlogs/2026-09-07.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-09-07.md)
- **Directives & Prompts:**
  - Execute Milestone 1 of the media pipeline overhaul.
  - Fix Edge TTS WebSocket drops and support Indian/international neural voices (`free-hi-in`, `free-ta-in`, etc.).
  - Prevent silent renders: Ensure audio is always properly muxed into the final MP4.
- **Key Changes & Features:**
  - **Edge TTS Catalog & 3-Tier Cascade (`lib/engine/tts.ts`)**: Built `resolveKeylessVoice()` mapping, 5000ms WebSocket timeout guard, sentence-chunked Google Translate REST fallback, and in-memory 24kHz PCM WAV generator.
  - **Render Worker Audio Stream (`scripts/render-worker.ts`)**: Direct base64 data URI decoding to disk, explicit `-map 0:v:0`, `-map 1:a:0`, `-c:a aac -b:a 192k` mapping with `anullsrc` padding.
  - **Remotion Player Audio (`remotion/Composition.tsx`)**: Rendered `<Audio />` for all beats.
  - **Gate Verdict**: Milestone 1 PASSED (16/16 unit tests, all adversarial stress checks passed, 0 TypeScript errors).

---

## 📅 2026-09-06
- **Detailed Log:** [`docs/devlogs/2026-09-06.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-09-06.md)
- **Directives & Prompts:**
  - Survey entire application to identify breaking gaps in video creation, rendering, queueing, and UI viewports.
  - Blueprint reliable Edge TTS free voiceover synthesis and Fal.ai media generation pipelines.
- **Key Changes & Features:**
  - **Master Architecture Blueprint (`PROJECT.md`)**: Formulated 5 Milestones (M1 Voice, M2 Subtitles, M3 Queue, M4 Viewport, M5 E2E Verification).
  - **Engineering Specifications**: Created `docs/superpowers/plans/2026-09-06-tts-voice-render-reliability.md` and `docs/superpowers/plans/2026-09-06-fal-image-video-pipeline.md`.
  - **Multi-Agent Swarm**: Initialized exploratory agents, sentinel monitors, and challenger test suites.

---

## 📅 2026-09-05
- **Detailed Log:** [`docs/devlogs/2026-09-05.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-09-05.md)
- **Directives & Prompts:**
  - Implement OmniRoute single-gateway architecture across the full application.
  - Consolidate settings into a clean single-gateway interface (Endpoint URL + API Key).
  - Rebuild Remotion player and add distributed render job lease locking.
- **Key Changes & Features:**
  - **Single Gateway Settings**: Refactored `app/(app)/settings/page.tsx` and `app/api/settings/keys/route.ts` to exclusively store/retrieve OmniRoute credentials.
  - **Unified Key Resolver (`lib/keys.ts`)**: Built `getOmniRouteConfig()` with DB -> env var -> `localhost:20128/v1` fallback chain.
  - **Orchestrator Refactor**: Patched `llm.ts`, `tts.ts`, `auto-pilot.ts`, `bulk-planner.ts`, `drama-orchestrator.ts`, `scene-matcher.ts`, `shorts-extractor.ts`, and `stories-orchestrator.ts` to route through OmniRoute.
  - **Remotion Player Rebuild**: Rebuilt `remotion/Composition.tsx` (`MainComposition`) from scratch with beats timeline and dynamic subtitles.
  - **Distributed Leases**: Created SQL migration `supabase/migrations/20260905_render_job_leases.sql` adding `lease_holder` and `lease_expires_at` to prevent dual-worker race conditions.

---

## 📅 2026-09-04
- **Detailed Log:** [`docs/devlogs/2026-09-04.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-09-04.md)
- **Directives & Prompts:**
  - Can I add my local omnirouter API to this repo?
  - Where is clipped file location?
- **Key Changes & Features:**
  - Investigated local OmniRoute server integration (`omniroute-server/`) to replace the fragmented 45-provider settings panel.
  - Located project assets, audited engine dependencies, and designed the single-gateway architecture migration plan.

---

## 📅 2026-09-03
- **Detailed Log:** [`docs/devlogs/2026-09-03.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-09-03.md)
- **Directives & Prompts:**
  - Supabase admin login SQL script; Fix settings page not loading API keys.
  - Verify video generation across all workflows; Remove heavy analytics section to optimize Oracle VM memory; Scrub any hardcoded secrets.
- **Key Changes & Features:**
  - **Settings RLS Bypass**: Fixed critical Supabase RLS bug on `settings` table by using `supabaseAdmin` service role client (`6579962`).
  - **Provider Hub UI**: Built interactive provider dashboard with live health ping tests (`262d343`).
  - **Security Scrub**: Purged all plaintext API keys and scratch files (`a745a0d`).
  - **Oracle VM Optimization**: Removed heavy analytics charting packages to fit within 952MB RAM (`78f8dd2`), disabled standalone build output (`1b575d1`).

---

## 📅 2026-09-02
- **Detailed Log:** [`docs/devlogs/2026-09-02.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-09-02.md)
- **Directives & Prompts:**
  - Expand to free/keyless API providers (Azure, Edge TTS, Pollinations).
  - Add custom Supabase connection settings with cookie sync.
  - Implement modern subtitle styling presets and generate cover images for each creation workflow.
- **Key Changes & Features:**
  - **Smart API Failover Router**: Built `lib/api-router.ts` with dynamic health monitoring and automatic fallbacks to zero-cost keyless endpoints.
  - **45+ Provider Registry**: Added support for extensive open-source and free AI endpoints.
  - **6 Subtitle Presets**: Designed Hormozi Pop, Cyber Neon, Minimalist Clean, Cinematic Boxed, Bold Impact, and Retro Karaoke.
  - **Workflow Cover Graphics**: Added thematic cover illustrations for all 10 video creation workflows.

---

## 📅 2026-09-01
- **Detailed Log:** [`docs/devlogs/2026-09-01.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-09-01.md)
- **Directives & Prompts:**
  - Fix blank/morphing platforms state glitch in creation wizard.
  - Implement live Supabase data in `/library` page.
  - Resolve background worker race conditions and adhere strictly to Oracle deployment rules.
- **Key Changes & Features:**
  - **Zustand State Isolation**: Fixed duplicate `platforms` state key in `components/wizard/wizard-store.ts`, splitting into `platforms` (stock media) and `publishingPlatforms` (social distribution).
  - **Live Library Page**: Implemented `app/(app)/library/page.tsx` fetching real Supabase video records and render jobs.
  - **Worker Race Condition Fix**: Ensured background workers wait for script beats before Remotion bundling.
  - **Oracle Deployment Guidelines**: Codified deployment safety rules in `.agents/rules/oracle-deployment.md` and patched `zip_fast.py`.

---

## 📅 2026-08-25 – 2026-08-29
- **Detailed Log:** [`docs/devlogs/2026-08-25_to_2026-08-29.md`](file:///c:/Users/vigilare/.gemini/antigravity/scratch/clipped-omni-router/docs/devlogs/2026-08-25_to_2026-08-29.md)
- **Directives & Prompts:**
  - Review ProstudioX to Clipped AI Studio handover brief.
  - Verify render job control on Oracle VM (952MB RAM).
  - Complete Week 1 testing and assess Week 2 status.
- **Key Changes & Features:**
  - Audited codebase and verified 195+ automated tests in `tests/e2e/standalone-runner.js`.
  - Configured PM2 ecosystem for low-memory execution.
  - Planned dynamic library hydration and multi-step background processing.
