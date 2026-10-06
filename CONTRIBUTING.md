# Contributing to Clipped AI Studio

First off, thank you for considering contributing to Clipped AI! We aim to build the most robust open-source AI video engine available, and community contributions are essential to making that happen.

## Development Environment Setup

Clipped AI relies heavily on a strictly typed, multi-worker ecosystem. 

1. **Install Prerequisites**: Ensure you have Node 20+, `pnpm` (v11+), and `ffmpeg` installed globally.
2. **Database**: We use Supabase. You can link your local project to a remote Supabase instance by setting the `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local`.
3. **Install Dependencies**: Run `pnpm install --frozen-lockfile`. Do **not** use `npm install` at the root, as this repo relies on `pnpm-workspace.yaml`.

## Branching & Pull Requests

1. **Fork & Branch**: Fork the repo and create a new branch from `main` (e.g., `feat/add-new-workflow` or `fix/tts-fallback-bug`).
2. **Commit Formatting**: We follow Conventional Commits (e.g., `feat: ...`, `fix: ...`, `chore: ...`).
3. **No Direct Master Commits**: All changes must go through a Pull Request.

## The Golden Rules of Clipped

When contributing code, you must adhere to the core architectural principles that keep the system stable:

1. **Never crash the Render Worker**: Any data parsing, URL fetching, or LLM parsing must be wrapped in `try/catch`. 
2. **Quality Gates First**: If you add a new workflow route, you MUST set the initial `orchestration_state` to `qc_pending` (not `queued`). The Quality Gate worker must be allowed to validate your media URLs before the FFmpeg worker attempts to encode them.
3. **LLM Parsing**: Never use native `JSON.parse()` on LLM outputs. Always use the `parseJson` helper in `lib/ai/llm.ts` to cleanly handle markdown fences and conversational garbage.
4. **Time Math**: Use integer frames (`Math.round(seconds * fps)`) when interacting with OTIO/Remotion math. Do not use raw floats for video cuts.

## Testing Your Changes

Our codebase is guarded by a massive standalone E2E test suite (`tests/e2e/standalone-runner.js`) that enforces everything from DB state machines to API payloads.

Before pushing, you MUST pass:

```bash
# 1. Scoped Linting (Do not run global eslint)
pnpm lint:scoped

# 2. Typechecking
pnpm typecheck

# 3. Vitest Unit Tests
pnpm exec vitest run --no-file-parallelism

# 4. Standalone E2E Runner (248+ assertions)
pnpm test
```

If your PR breaks a Tier test in the runner, it will not be merged. If you are adding a new Workflow, you must append a new Tier to `tests/e2e/standalone-runner.js` to prove its route boundary is safe.

Happy coding! 🚀
