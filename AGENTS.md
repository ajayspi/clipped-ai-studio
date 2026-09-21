<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent guide — clipped (Next.js 16 video studio)

> Authoritative for the `clipped` root app only. `omniroute-server/` is a **separate vendored project** (own deps/build/test) with its own `AGENTS.md` — don't run its scripts from root. `CLAUDE.md` → `@AGENTS.md`.

## Commands
Use **pnpm** (`packageManager: pnpm@11.24.0`; `pnpm-lock.yaml` canonical — ignore the stray `package-lock.json`):
- `pnpm dev` — Next 16.3.3 + Turbopack on `:3000`
- `pnpm build` — standalone build
- `pnpm lint` and `pnpm exec tsc --noEmit` — **typecheck is NOT run by `build`** (`next.config.ts` sets `typescript: { ignoreBuildErrors: true }`); keep types clean via `tsc --noEmit` + lint
- `pnpm exec vitest run` — unit tests (`test/**/*.test.{ts,tsx}`, setup `test/setup.ts` mocks Supabase). **There is no `test:unit` script.**
- `pnpm test` / `pnpm test:e2e` — `node tests/e2e/standalone-runner.js` (self-contained, mocks Supabase, ~132 tests). **Not the unit suite.**
- Verify order: `lint` → `tsc --noEmit` → `vitest run` → `test`.

## Layout (root-relative — there is NO `src/`)
- `app/` — App Router: `(app)/`, `(auth)/`, `api/` (API routes are App Router: `app/api/.../route.ts` → health, jobs, publish, settings, tts, v1, workflows, workspaces, export), `layout.tsx`, `page.tsx`.
- `lib/` — `ai/`, `engine/`, `media/`, `publishing/`, `jobs/`, `supabase/{client,context,middleware,server}`, `db.ts`, `api-router.ts`, `keys.ts`, `quotas.ts`, `store.ts`, `utils.ts`.
- `components/` — shadcn/ui (see `components.json`); aliases `@/components/ui`, `@/lib/utils`.
- `remotion/Composition.tsx` — video composition; render-worker drives Remotion + FFmpeg.
- `scripts/` — `seed.ts`, `seed-dev-auth.ts`, `render-worker.ts`, `publish-worker.ts`, `lib/`.
- `supabase/migrations/` — DB migrations (tracked).
- `tests/` (e2e) vs `test/` (vitest + unit tests) — **two different directories.**

## Workers / deploy
- `pnpm workers` → PM2 (`ecosystem.config.js`): `omniroute-gateway` (:20128, omniroute-server), `clipped-web` (:3000), `render-worker`, `publish-worker`.
- Workers run under **bun** (PM2 `interpreter: 'bun'`); the `worker`/`worker:publish` npm scripts use `tsx` instead — different runtimes, don't conflate them.

## Environment
- `.env.local` is gitignored (`.env*`); copy from `.env.example`. **Never commit it.**
- Supabase default remote: `agafustlankeieewtvck.supabase.co` (local docker optional).
- OmniRoute local gateway: `http://localhost:20128/v1` (provided by `omniroute-server`).
