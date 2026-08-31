## 2026-08-29T11:54:42Z

You are worker_m7a (Role: Docker Environment Worker).
Your Working Directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m7a
Original User Request: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md
Scope Document: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\orchestrator\SCOPE.md
Explorer Report: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m7_1\handoff.md
Workspace Root: C:\Users\vigilare\.gemini\antigravity\scratch\clipped

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
You exclusively own and are responsible for creating/modifying:
- `Dockerfile` (in project root)
- `docker-compose.yml` (in project root)
- `.dockerignore` (in project root)
- `.env.docker` (in project root)
- `next.config.ts` (in project root)

TASK:
Implement Requirement 1 (Local Docker Environment):
1. Update `next.config.ts` to include `output: "standalone"`.
2. Create `.dockerignore` ignoring `node_modules`, `.next`, `.agents`, `.git`, temporary files, and test caches.
3. Create `Dockerfile` with multi-stage build:
   - `base`: `node:20-alpine`, installs `ffmpeg`, `libc6-compat`, `procps`, `tzdata`, enables `corepack` for `pnpm@11.24.0`.
   - `deps`: copies `package.json`, `pnpm-lock.yaml`, runs `pnpm install --frozen-lockfile`.
   - `builder`: copies `node_modules`, copies source, sets `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`, runs `pnpm run build`.
   - `runner`: `node:20-alpine`, non-root user `nextjs:nodejs` (uid/gid 1001), copies `/app/public`, `/app/.next/standalone`, `/app/.next/static` with proper chown, `HOSTNAME="0.0.0.0"`, `PORT=3000`, `EXPOSE 3000`, `HEALTHCHECK`, `CMD ["node", "server.js"]`.
4. Create `docker-compose.yml`:
   - Service `postgres`: `postgres:16-alpine`, container name `clipped-postgres`, port 5432:5432, volume `postgres_data`, schema mount `./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro`, healthcheck `test: ["CMD-SHELL", "pg_isready -U postgres -d clipped"]`, network `clipped-network`.
   - Service `web`: builds from `Dockerfile` runner target, container name `clipped-web`, port 3000:3000, environment config, `depends_on: { postgres: { condition: service_healthy } }`, network `clipped-network`.
   - Persistent volume `postgres_data` and bridge network `clipped-network`.
5. Create `.env.docker` with standard container environment configurations.
6. Verify file syntax locally in a cost-safe manner (e.g. YAML parse validation via node/python, docker-compose syntax parsing if available, test runner validation).

Deliver your handoff report to `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m7a\handoff.md`.
Use `send_message` to notify the orchestrator when complete.
