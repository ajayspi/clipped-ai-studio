<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent guide — clipped (Next.js 16 video studio)

> Authoritative for the `clipped` root app only. `omniroute-server/` is a **separate vendored project** (own deps/build/test, huge own `AGENTS.md`) — don't run its scripts, tests, or lint from root; the root `package.json` has none of them. `CLAUDE.md` → `@AGENTS.md`.

## Commands
Use **pnpm** (`packageManager: pnpm@11.24.0`; `pnpm-lock.yaml` canonical — ignore the stray untracked `package-lock.json`):
- `pnpm dev` — Next 16.3.3 + Turbopack on `:3000`
- `pnpm build` — standalone build (`next.config.ts` sets `output: 'standalone'`)
- `pnpm lint:scoped` — `eslint app lib components remotion scripts test tests` (**the usable lint**; root `pnpm lint` = `eslint .` → red-by-construction, see quirks)
- `pnpm typecheck` — `tsc -p tsconfig.check.json --noEmit` (via `tsconfig.check.json`, excludes vendored trees; **typecheck is NOT run by `build`** — `typescript: { ignoreBuildErrors: true }`; keep types clean manually)
- `pnpm exec vitest run` — unit tests (`test/**/*.test.{ts,tsx}`, jsdom; `test/setup.ts` mocks `@/lib/supabase/*`, `next/navigation`, fonts, fetch). **There is no `test:unit` script.**
- `pnpm test` / `pnpm test:e2e` — `node tests/e2e/standalone-runner.js` (zero-dependency runner, in-memory Supabase mock, **201 tests**: tiers 1–19 + API routes + workers). **Not the unit suite.**
- Verify order: `lint:scoped` → `typecheck` → `vitest run` → `test` → `build`.

## Layout (root-relative — there is NO `src/`)
- `app/` — App Router: `(app)/` (create, dashboard, library, planner, queue, settings), `(auth)/`, `api/` (health, jobs, publish, settings, tts, v1, workflows, workspaces, export), `layout.tsx`, `page.tsx`.
- `lib/` — `ai/`, `engine/`, `media/`, `publishing/`, `jobs/`, `supabase/{client,context,middleware,server}`, `db.ts`, `api-router.ts`, `keys.ts`, `quotas.ts`, `store.ts`, `utils.ts`.
- `components/` — shadcn/ui (see `components.json`); path alias `@/*` → root (tsconfig).
- `remotion/Composition.tsx` — video composition; workers drive Remotion + FFmpeg.
- `scripts/` — `seed.ts`, `seed-dev-auth.ts`, `render-worker.ts`, `publish-worker.ts`, `lib/`.
- `supabase/migrations/` — tracked DB migrations.
- `tests/` (e2e) vs `test/` (vitest) — **two different directories, keep it that way.**
- Docs: `docs/PROJECT_GIST.md` = master architecture; `daily_documentation.md` + `docs/devlogs/` = dev journal (README points here).

## Workers / deploy
- `pnpm workers` → PM2 (`ecosystem.config.js`): `omniroute-gateway` (:20128, cwd `omniroute-server`, `npm run start`), `clipped-web` (:3000, `npm run start` — needs a prior build), `render-worker` + `publish-worker` (`scripts/*.ts`, **`interpreter: 'bun'`**). Only the two workers run under bun; web/gateway are plain node.
- The `worker`/`worker:publish` npm scripts run the same TS workers under `tsx` — a different runtime, don't conflate.
- Docker: `Dockerfile` (node:20-alpine + pnpm via corepack + standalone output) and `docker-compose.yml` (postgres:16 seeded from `schema.sql` + web). Compose hardcodes `NEXT_PUBLIC_APP_URL` to an old OCI box IP and reads env from `.env` — override for local docker runs.

## Repo quirks (verify before touching)
- **Two vendored OmniRoute trees exist.** `omniroute-server/` is the real, tracked one — used by `pnpm workers` and the app's AI gateway. `omniroute-server-untracked/` is an **untracked stale copy** (own `.git/`, `node_modules/`, own docs) — ignore it; never run, edit, or deploy from it.
- Root is littered with **untracked one-off deploy artifacts** (`deploy_*.py`, `*.zip`/`*.tar.gz`, `*.patch`, `build_out.txt`, `test_final*.txt`, …). Historical debris, not the deploy flow — don't read them as docs, don't clean the tree blindly (`0001-*.patch`/`patch.diff` are the same class).
- `.env.example`, `.env.local`, `.env.docker` are **all untracked**: `.gitignore` has a bare `.env*` with no `!.env.example` exception — a **fresh clone has no env file at all**. Tests don't care (`test/setup.ts` falls back to the remote Supabase project + mock keys); for dev copy `.env.example` from this checkout or ask the operator.
- `pnpm-workspace.yaml` uses pnpm 11's `allowBuilds` with **unfilled placeholder strings** (`set this to true or false`) for esbuild + `@ffmpeg-installer/linux-x64` — those build scripts currently don't run. That's the repo's current state; don't "fix" it. `pnpm install --frozen-lockfile` completes fine.
- `.gitignore` is ASCII but has a **UTF-16LE-encoded trailer** (`clipped_update.zip`, `next_build.tar.gz` rules) — the NUL bytes make the read tool / ripgrep treat it as binary. Use `git check-ignore -v <path>` to resolve ignore rules instead.
- **Root lint/tsc are red-by-construction; scoped commands are green (VERIFIED 2026-09-25).** `pnpm lint` = `eslint .` (only `.next/out/build/next-env.d.ts` in `globalIgnores`) → also lints the vendored `omniroute-server*` trees + root debris → **20,273 problems (14,057 errors)**. `pnpm exec tsc --noEmit` reads root tsconfig `include` → also globs the vendored trees → **Node OOM (exit 134, ~4GB heap)**. Both are repo-state issues, not code defects. Use `pnpm lint:scoped` + `pnpm typecheck` (via `tsconfig.check.json`, excludes `omniroute-server*`) — **green: 0 problems / exit 0** across app/lib/components/remotion/scripts/test/tests.
- `vitest run` under CPU contention (lint+tsc running) flakes with **fork-worker start timeouts** (`test/pages/create/mission.test.tsx` et al. — "Timeout waiting for worker to respond", not assertion failures); re-run the affected files alone when the machine is idle.

## Environment
- `.env.local` is gitignored — **never commit it** (and the tracked `.env.example` everyone expects doesn't exist — see quirks).
- Supabase default remote: `agafustlankeieewtvck.supabase.co` (same fallback in `test/setup.ts`); local docker optional.
- OmniRoute gateway: `http://localhost:20128/v1` (provided by `omniroute-server`). When no key is configured the app keyless-falls back to Edge TTS / Pollinations / Openverse.