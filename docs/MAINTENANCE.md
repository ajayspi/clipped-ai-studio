# Clipped AI Studio — Master Maintenance & Operations Document

> **Purpose:** Single authoritative maintenance reference for the **clipped** project — every subsystem, every command, every work item carried out, every quirk, and every operating rule. Live document: update it whenever a gotcha, command, or decision changes.
>
> **Repository:** `github.com/ajayspi/clipped-ai-studio.git` (local: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`)
> **Framework:** Next.js 16.3.3 (React 19, App Router, TypeScript, **Turbopack**) — this is *not* the Next.js of older training data; breaking changes are real (read `node_modules/next/dist/docs/` before writing code).
> **Package manager:** pnpm 11.24.0 (`packageManager: pnpm@11.24.0`; `pnpm-lock.yaml` is canonical).
> **AI Gateway:** OmniRoute single-gateway (`omniroute-server/` vendored; localhost `:20128/v1`) with keyless fallbacks.
> **DB & Auth:** Supabase PostgreSQL (remote `agafustlankeieewtvck.supabase.co`), multi-tenant workspaces.
> **Video engine:** Remotion 4 + FFmpeg (`@ffmpeg-installer/ffmpeg`) + Edge TTS.
> **Status snapshot (2026-09-25):** WP4 toolchain remediation GREEN — scoped lint 0 / scoped tsc 0 / vitest 189 / e2e 201 / build exit 0. Branch `docs/agent-guide`, tip `62d2c7d4`, pushed and in sync.

---

## 1. Project Mission

**Clipped AI Studio** is a full-stack, autonomous video creation, editing, and publishing platform: text prompts, long-form URLs, and media assets become high-retention vertical (9:16), horizontal (16:9), and square (1:1) videos.

It combines:

1. **10 dedicated creation workflows** (`/create/*`):
   | Route | Workflow |
   |---|---|
   | `/create/stories` | Stories Generator — narrative scenes, text overlays, emotion-matched narration |
   | `/create/images` | AI Images Video — text-to-image via Fal.ai Flux/SDXL, Pollinations free fallback |
   | `/create/video` | Generative AI Video — Kling, Luma Dream Machine, Runway Gen-3, Fal.ai video models |
   | `/create/stock` | Stock Footage — keyword B-roll from Pexels, Pixabay, Openverse |
   | `/create/bulk` | Bulk 30-Day Planner — content calendar + batch production + scheduled publishing |
   | `/create/shorts` | Extract Shorts — long-form → viral short clips via transcript analysis + hook detection |
   | `/create/drama` | Micro-Drama Series — multi-episode arcs, consistent characters, cliffhangers |
   | `/create/auto` | Auto Pilot — single-prompt autonomous mission with live multi-stage steppers |
   | `/create/avatar` | Talking Head Avatars — HeyGen / D-ID presenter synthesis |
   | `/create/whiteboard` | Whiteboard Animation — Gemini vision-prompted character sheets (stickman / saint / modern) |
2. **OmniRoute integration** — 45+ AI models unified behind one OpenAI-compatible endpoint. Fallback hierarchy: DB-configured OmniRoute key/URL → env vars → `http://localhost:20128/v1` → zero-cost keyless fallbacks (Edge TTS, Google Translate TTS, Pollinations, Openverse).
3. **Modern subtitles + Remotion player** — 6 styling presets (Hormozi Pop, Cyber Neon, Minimalist Clean, Cinematic Boxed, Bold Impact, Retro Karaoke); word-by-word pop animations, frosted-glass pills, neon glows, 3-zone vertical positioning; FFmpeg drawtext rendering.
4. **Global queue + background workers** — async queue with live status in desktop/mobile header + sidebar; dedicated `/queue` page; decoupled `render-worker.ts` / `publish-worker.ts` under PM2.

---

## 2. System Architecture Topology

```
┌────────────────────────────────────────────────────────────────────────────┐
│ CLIENT INTERFACE                                                           │
│  • App shell: glassmorphism sidebar, desktop/mobile headers, dark/light    │
│  • Creation Wizard (/create/stories): zero-scroll 1080p viewport           │
│  • Creation Hub (/create): 10 workflow cards + API health dots             │
│  • Queue (/queue): progress, badges, execution logs                        │
│  • Library (/library): playback, workspace filtering, downloads            │
│  • Settings (/settings): OmniRoute gateway URL + key, Supabase probe       │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────────────────┐
│ NEXT.JS APP ROUTER APIS                                                    │
│  • /api/workflows/*   generate, bulk-plan, extract-shorts, mission, scrape │
│  • /api/jobs          live count, polling, retry, status                    │
│  • /api/tts/preview   low-latency voice samples                            │
│  • /api/settings/keys OmniRoute single-gateway credentials                 │
│  • /api/v1/*          REST developer API, HMAC-SHA256 webhooks             │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────────────────┐
│ CORE ENGINE (lib/engine)                                                   │
│  • OmniRoute key resolver            lib/keys.ts (DB → env → localhost)    │
│  • LLM dispatcher                    lib/engine/llm.ts (auto model + JSON   │
│  • TTS voice engine                  lib/engine/tts.ts (Edge → Google →     │
│  • Media sourcing/generation         lib/engine/video-generator.ts,         │
│                                      image-orchestrator.ts                  │
│  • Subtitle styling                  remotion/Composition.tsx + render-     │
│                                      worker.ts drawtext                     │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────────────────┐
│ PERSISTENCE & BACKGROUND (Supabase + PM2)                                  │
│  • Tables: render_jobs, videos, settings, scheduled_posts, workspaces      │
│  • render-worker.ts: polls render_jobs, lease-locked                       │
│  • publish-worker.ts: social distribution (YT, TikTok, IG)                 │
│  • Storage: local /public/renders or Supabase Storage buckets              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack & Dependencies

Runtime (`dependencies`): `next 16.3.3`, `react/react-dom 19.2.8`, `@supabase/ssr 0.12.5`, `@supabase/supabase-js 2.112.4`, `remotion 4.0.520` (+ `@remotion/player`), `fluent-ffmpeg 2.1.3`, `@ffmpeg-installer/ffmpeg`, `node-edge-tts`, `youtube-transcript`, `zustand 5`, `framer-motion 13`, `radix-ui`, `lucide-react`, `@dnd-kit/*`, `clsx`, `class-variance-authority`, `tailwind-merge`, `date-fns`, `dotenv`, `tsx`, `@gradio/client`.

Dev (`devDependencies`): `eslint 9` + `eslint-config-next 16.3.3`, `typescript ^5`, `vitest ^5` + testing-library + jsdom 30, `tailwindcss 4` + `@tailwindcss/postcss`, `vite-tsconfig-paths`, `@vitejs/plugin-react`.

Toolchain scripts (`package.json`):

| Script | Command | Purpose |
|---|---|---|
| `pnpm dev` | `next dev --turbopack` | Dev server (Aura owns :3000 → use :3100 in this workspace) |
| `pnpm build` | `next build` | Standalone production build (`output: 'standalone'`) |
| `pnpm lint:scoped` | `eslint app lib components remotion scripts test tests` | **The usable lint** (root `lint` = `eslint .` → red-by-construction, see §10) |
| `pnpm typecheck` | `tsc -p tsconfig.check.json --noEmit` | Scoped typecheck (strict, via check config; excludes vendored trees) |
| `pnpm exec vitest run` | — | Unit tests (`test/**/*.test.{ts,tsx}`, jsdom) — **no `test:unit` script** |
| `pnpm test` / `pnpm test:e2e` | `node tests/e2e/standalone-runner.js` | 201-test e2e runner (zero-dependency, in-memory Supabase mock) |
| `pnpm seed` / `seed:dev-auth` | `tsx scripts/seed.ts` / `scripts/seed-dev-auth.ts` | DB seeding |
| `pnpm workers` | `pm2 start ecosystem.config.js` | PM2 fleet (gateway + web + 2 workers) |
| `worker`/`worker:render`/`worker:publish` | `tsx scripts/*-worker.ts` | Workers under tsx (different runtime from PM2 bun) |

---

## 4. Directory Layout (root-relative — there is NO `src/`)

- `app/` — App Router: `(app)/` (create, dashboard, library, planner, queue, settings), `(auth)/`, `api/` (health, jobs, publish, settings, tts, v1, workflows, workspaces, export), `layout.tsx`, `page.tsx`.
- `lib/` — `ai/`, `engine/`, `media/`, `publishing/`, `jobs/`, `supabase/{client,context,middleware,server}`, `db.ts`, `api-router.ts`, `keys.ts`, `quotas.ts`, `store.ts`, `utils.ts`.
- `components/` — shadcn/ui (see `components.json`); path alias `@/*` → root (tsconfig).
- `remotion/Composition.tsx` — video composition; workers drive Remotion + FFmpeg.
- `scripts/` — `seed.ts`, `seed-dev-auth.ts`, `render-worker.ts`, `publish-worker.ts`, `lib/`.
- `supabase/migrations/` — tracked DB migrations (3 files, §6).
- `tests/` (e2e) vs `test/` (vitest) — **two different directories, keep it that way.**
- `docs/` — `PROJECT_GIST.md` (master architecture), `MAINTENANCE.md` (this file), `devlogs/` (daily journal, INDEX.md), `superpowers/plans/`.
- `omniroute-server/` — **vendored separate project** (own deps/build/tests, own AGENTS.md). Never run its scripts/lint from root. `omniroute-server-untracked/` is a **stale untracked copy** — ignore entirely.

---

## 5. Commands — Verify & Acceptance Chain (Order Matters)

The canonical green wall for any change (VERIFIED 2026-09-25):

```
pnpm lint:scoped   → eslint on the 7 scoped dirs      (0 problems / exit 0)
pnpm typecheck     → tsc -p tsconfig.check.json       (exit 0)
pnpm exec vitest run                                  (189 tests / 18 files, exit 0)
pnpm test          → node tests/e2e/standalone-runner.js (201 tests, exit 0)
pnpm build         → standalone build                  (exit 0)
```

Add the DEBUG-eslint rule: **confirm verdicts by exit codes, never by re-reading edits.**

- Dev server: `pnpm dev` — in THIS workspace run on **:3100** (`next dev --turbopack -p 3100`); **never touch Aura's :3000 dev server**.
- Docker: `docker compose` hardcodes `NEXT_PUBLIC_APP_URL` to an old OCI IP and reads `.env` — override for local runs.

---

## 6. Database (Supabase PostgreSQL)

Remote project: `agafustlankeieewtvck.supabase.co` (same fallback lives in `test/setup.ts`). Key tables:

1. **`render_jobs`** — `id` (uuid PK), `status` (`pending | generating | rendering | completed | failed`), `progress` (0–100), `payload` (full JSON workflow config), `video_url`, `lease_holder` + `lease_expires_at` (distributed lease locking), `error_message`, `render_log`.
2. **`videos`** — completed library records (metadata, thumbnail, duration, tags, status).
3. **`settings`** — key-value config (`omniroute_api_key`, `omniroute_endpoint`, provider keys). **RLS bypass via `supabaseAdmin` service role** (server-side query drops were a real bug, fixed 2026-09-03).
4. **`workspaces`**, **`scheduled_posts`** — multi-tenant grouping + social scheduling queue.

Migrations (`supabase/migrations/`, applied):
- `20260831_create_scheduled_posts.sql`
- `20260905_realtime_renders_bucket.sql`
- `20260905_render_job_leases.sql` (lease columns added to prevent dual-worker races)

---

## 7. Video Rendering Pipeline

1. **Submission** — wizard or Auto-Pilot creates a `render_jobs` row `pending`; client navigates to `/queue?jobId=...`.
2. **Worker processing** (`scripts/render-worker.ts`) — PM2 worker atomically claims the job (`UPDATE ... SET lease_holder = ... WHERE lease_expires_at < NOW()`); downloads/decodes assets (native `data:` base64 URI support); assembles timeline via Remotion or FFmpeg `cmd.videoFilters()`; applies word-by-word subtitles with escaped characters and safety margins; outputs H.264 MP4 with AAC; marks `completed` and inserts into `videos`.
3. **TTs cascade** (`lib/engine/tts.ts`) — Edge TTS (WebSocket, 5000ms timeout guard) → Google Translate REST (sentence-chunked) → in-memory 24kHz PCM WAV generator. Includes `resolveKeylessVoice()` mapping for Indian/international neural voices (`free-hi-in`, `free-ta-in`, …).
4. **Audio muxing** — explicit `-map 0:v:0`, `-map 1:a:0`, `-c:a aac -b:a 192k` with `anullsrc` padding so silent renders are impossible.

---

## 8. Workers & Deployment

- **PM2 (`ecosystem.config.js`, `pnpm workers`):**
  - `omniroute-gateway` — :20128, cwd `omniroute-server`, `npm run start`
  - `clipped-web` — :3000, `npm run start` (needs prior build)
  - `render-worker` + `publish-worker` — `scripts/*.ts`, **`interpreter: 'bun'`** (only workers run under bun)
- **Oracle Cloud VM (legacy target):** strict **952MB RAM** limit; **never build Next.js on the VM** (OOM panic) — build locally, `zip_fast.py` (excludes `.zip`), SCP, `pm2 restart clipped-web`. **Zero hardcoded secrets** — keys live in Supabase `settings` or env.
- **Docker:** `Dockerfile` (node:20-alpine + pnpm corepack + standalone output) + `docker-compose.yml` (postgres:16 seeded from `schema.sql` + web).

---

## 9. Test Infrastructure

Two suites — do not conflate:

- **Unit: `test/` + vitest** (jsdom). `test/setup.ts` mocks `@/lib/supabase/*`, `next/navigation`, fonts, fetch. **189 tests / 18 files.** Run: `pnpm exec vitest run`. No `test:unit` script.
- **E2E: `tests/e2e/`** — zero-dependency runner `standalone-runner.js` with an in-memory `MockSupabaseStore`; **201 tests** across tiers 1–19 + API routes + workers. Includes `test-harness.ts` (typed harness — its `then` methods are arrow-bound so awaited selects/updates keep `this` = the store, not the query object — a real runtime fix, see §11).
- **Methodology (TEST_INFRA.md):** opaque-box, requirement-driven, zero external network; Category-Partition + Boundary Value + Pairwise Combinatorial + real-world workloads. Coverage: Tier 1 ≥70 cases across 14 features, Tier 2 ≥70 boundary cases, Tier 3 ≥15 cross-feature, Tier 4 ≥5 realistic scenarios (≥160 total assertions).
- **Known flake:** vitest `fork-worker start timeouts` under CPU contention (not code failures) — re-run affected files alone when idle.

---

## 10. Repo Quirks & Gotchas (verify before touching)

1. **Two vendored OmniRoute trees.** `omniroute-server/` is the real, tracked one (used by `pnpm workers` + the app's AI gateway). `omniroute-server-untracked/` is an **untracked stale copy** (own `.git/`, `node_modules/`, own docs) — never run, edit, or deploy from it.
2. **Root lint/tsc are red-by-construction; scoped commands are green.**
   - `pnpm lint` = `eslint .` → also lints vendored trees + root debris → **20,273 problems (14,057 errors)**.
   - `pnpm exec tsc --noEmit` (root tsconfig) → globs vendored trees → **Node OOM (exit 134, ~4GB heap)**.
   - Use `pnpm lint:scoped` + `pnpm typecheck` (via `tsconfig.check.json`, excludes `omniroute-server*`): **green, exit 0.**
3. **Next.js 16 breaking changes** — read `node_modules/next/dist/docs/` (resolved from repo root) before writing code; heed deprecation notices. The `next dev`-generated AGENTS.md block must not be deleted from diffs.
4. **`.env` situation:** `.env.example`, `.env.local`, `.env.docker` are **all untracked** — `.gitignore` has a bare `.env*` with no `!.env.example` exception; a fresh clone has **no env file at all** (tests fall back to the remote Supabase project + mock keys). Never commit `.env.local`.
5. **`.gitignore` has a UTF-16LE-encoded trailer** (`clipped_update.zip`, `next_build.tar.gz` rules) — NUL bytes make read tools/ripgrep treat it as binary. Use `git check-ignore -v <path>`.
6. **`pnpm-workspace.yaml`** uses pnpm 11 `allowBuilds` with **unfilled placeholder strings** (`set this to true or false`) for esbuild + linux-x64 ffmpeg — those build scripts currently don't run. That's the repo's current state; don't "fix" it. `pnpm install --frozen-lockfile` completes fine.
7. **Stray untracked artifacts** at root — `deploy_*.py`, `*.zip`/`*.tar.gz`, `*.patch`, `build_out.txt`, `test_final*.txt`, plus a stray `package-lock.json` (ignore — pnpm-lock is canonical). Historical debris: don't read as docs, don't clean blindly.
8. **New-version quirks already discovered:** Aura owns :3000 (dev on :3100 here); `typescript: { ignoreBuildErrors: true }` in next config — **typecheck is NOT run by `build`**, keep types clean manually.
9. **Local tooling dirs** (`.agent/`, `.kilo/`, `.sandbox/`, `__pycache__/`) are untracked local tooling — excluded from commits by choice.

---

## 11. Work Carried Out — Chronological Record

### Handover & baseline (2026-08-25 → 08-29)
- Audited ProstudioX → Clipped handover; verified render job control on Oracle VM (952MB); **195+ automated tests** in `standalone-runner.js`; PM2 ecosystem tuned for low memory. `docs/devlogs/2026-08-25_to_2026-08-29.md`.

### 2026-09-01 — State isolation & library
- Fixed duplicate `platforms` Zustand key (`components/wizard/wizard-store.ts`) → split `platforms` (stock media) vs `publishingPlatforms` (social).
- Live Supabase `/library` page; worker race fix (wait for beats before Remotion bundling); Oracle deployment rules codified + `zip_fast.py` patched.

### 2026-09-02 — 45+ providers & smart router
- `lib/api-router.ts` with dynamic health-check failover to zero-cost keyless endpoints; 45+ provider registry; 6 subtitle presets; workflow cover graphics.

### 2026-09-03 — VM optimization & provider hub
- **Settings RLS bypass** via `supabaseAdmin` service role; Provider Hub UI with live health pings; **removed heavy analytics** to fit 952MB; disabled standalone output (`1b575d1`); purged plaintext keys (`a745a0d`).

### 2026-09-04 — OmniRoute discovery
- Local `omniroute-server` integration study; single-gateway migration plan.

### 2026-09-05 — Single-gateway architecture
- `/settings` + `/api/settings/keys` refactored to OmniRoute-only; `lib/keys.ts` `getOmniRouteConfig()` DB→env→`localhost:20128/v1` cascade; orchestrators routed through OmniRoute (llm, tts, auto-pilot, bulk-planner, drama-orchestrator, scene-matcher, shorts-extractor, stories-orchestrator); Remotion `MainComposition` rebuilt with beats timeline + dynamic subtitles; **lease-locking migration** `20260905_render_job_leases.sql`.

### 2026-09-06 — Master blueprint & multi-agent swarm
- `PROJECT.md` 5-milestone plan (M1 Voice, M2 Subtitles, M3 Queue, M4 Viewport, M5 E2E); engineering specs in `docs/superpowers/plans/`; exploratory/sentinel/challenger agents.

### 2026-09-07 — Media pipeline M1 (voice)
- Edge TTS catalog + 3-tier cascade (`lib/engine/tts.ts`); render-worker audio stream (base64 decode, explicit maps, `anullsrc` padding); Remotion `<Audio />` for all beats; **Milestone 1 PASSED** (16/16 unit, 0 TS errors).

### 2026-09-08 — Viewport, queue, subtitles hardening
- Zero-scroll 1080p wizard (`CreationWizard.tsx` `h-[calc(100vh-4.25rem)] overflow-hidden`, compact 52px subtitle cards, 40px voice cards, 66px scene cards); dedicated `/queue` page with progress bars + log drawer + deep links; global `RenderQueueIndicator` (desktop header, mobile header, sidebar); FFmpeg subtitle string hardening (`cmd.videoFilters()`, char escaping, native boxcolor fills).

### 2026-09-22+ — Recent app fixes
- Settings fix: "OmniRoute config not reflected after save" (`1ee2c49a`); `lib/media` added (`cd41a7fd`); AGENTS.md agent guide (`4a0826b0`); gitignore local `.mcp.json` (ctx7 bearer token) (`4e9a2337`).

### WP4 — Lint/typecheck remediation (2026-09-24/25, commit `62d2c7d4`)
Full scoped lint + typecheck cleanup across app/lib/components/remotion/scripts/test/tests:
- **197 files lint 0**; tsc **21 errors → 0**; vitest **189/189**; `pnpm test` **201/201**; `pnpm build` exit 0.
- Genuine fixes, no `as any`/`any` casts (concrete casts OK; lazy-required untyped modules stay lazy):
  - `settings/page.tsx:365` cast; `keys/check/route.ts:137` type predicate; `v1/jobs/[id]/route.ts` log widening; `api-router.ts:757` predicate; `mission-orchestrator.ts:627` platform cast; `rate-limiter.ts` response.status; `render-worker.ts` RPC async adapter + `mediaUrl || ''`; Dashboard/DashboardCard/PublishModal narrowings.
  - **Harness runtime bug fixed:** `then`-as-method `this` binding was broken (awaited selects/updates bound `this` = query object → empty results). Arrow conversion in BOTH `tests/e2e/test-harness.ts` and `standalone-runner.js`'s inline mock; `select` param restored (`(fields?: string)` + `void fields`).
  - `compId`/`MainRender-*` block re-restored in `render-worker.ts` (pinned by T8-WRK-02) with genuine log read for `no-unused-vars`.
  - Whiteboard adversarial 1D realigned: per-click macrotask yield via `waitFor` (dedupes synchronous 4-click bursts).
  - `types/ambient.d.ts` added: fluent-ffmpeg / node-edge-tts / youtube-transcript ambient declarations.
- Toolchain: `tsconfig.check.json` (strict, includes test+tests, excludes `omniroute-server*`); `lint:scoped` + `typecheck` scripts; docs updated (`AGENTS.md`, `.opencode/spec-test-repair.md` FINAL).
- Committed `62d2c7d4` (132 files, +1645/−873) on `docs/agent-guide`, **pushed, in sync**.

---

## 12. Environment & Configuration

- Supabase remote default: `agafustlankeieewtvck.supabase.co`; local docker optional (`docker-compose.yml`).
- OmniRoute gateway: `http://localhost:20128/v1` (provided by `omniroute-server`). No key configured → app keyless-falls back to Edge TTS / Pollinations / Openverse.
- Never commit `.env.local`; fresh clones must copy `.env.example` from this checkout or ask the operator.
- Aura's environment owns :3000 — this workspace's daily dev runs on **:3100**.

---

## 13. Maintenance Procedures & Learning-Loop Rules

**Verify before done — never "looks fine":**
1. After ANY change run the §5 chain (lint → typecheck → vitest → e2e → build) and report exit codes, not "I checked it".
2. Fix failures at root cause; re-run the exact failing command until green.

**Plan before code (spec-first):**
3. Clarify → search first (don't assume code doesn't exist) → brief spec → sign-off → implement test-first → verify.

**Discipline:**
4. Linters/tests are the law; `git commit --no-verify` is a deliberate, documented decision.
5. One task per session; fan out read-only exploration; summarize subagent output, don't dump it.
6. Update plan/state after each step so the work survives conversation loss.

**Learning loop:**
7. Append one-line rules to `AGENTS.md` when hitting a gotcha, missing command, or wrong assumption.
8. At session end write conclusions (decisions, what worked, what didn't) — conclusions, never a transcript.

**Maintenance cadence:**
- Keep this document current: new commands, quirks, deployments, and work items land here the same session they happen.
- Keep `daily_documentation.md` + `docs/devlogs/` per the INDEX.md format standard (date/milestone, directives, changes, verification, end-of-day status).
- The `next dev`-generated AGENTS.md block is re-added automatically — removing it from a diff only recreates the uncommitted change; committing it keeps the tree clean.

---

## 14. References

- `docs/PROJECT_GIST.md` — master architecture (this doc is the operations companion).
- `docs/devlogs/INDEX.md` + `docs/devlogs/2026-*.md` — day-by-day work logs.
- `daily_documentation.md` — feature changelog.
- `TEST_INFRA.md` — e2e methodology, feature inventory, coverage thresholds.
- `AGENTS.md` — the agent guide (commands, layout, quirks, environment).
- `.opencode/spec-test-repair.md` — WP4 acceptance spec (FINAL, with verified results).
- `omniroute-server/AGENTS.md` — vendored gateway project's own authoritative guide.