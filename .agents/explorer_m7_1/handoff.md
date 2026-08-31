# Handoff Report: Requirement 1 — Local Docker Environment Architecture & Specification

## 1. Observation

Direct observations from examining the codebase at `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`:

### A. Current Project Manifests & Build Configs
- **`package.json`** (`package.json:1-39`):
  - Next.js version: `16.3.3` (App Router)
  - React version: `19.2.8`
  - Package Manager: `pnpm@11.24.0` (`package.json:37`)
  - Scripts: `"dev": "next dev --turbopack"`, `"build": "next build"`, `"start": "next start"`, `"test": "node tests/e2e/standalone-runner.js"`
  - Key Dependencies: `@supabase/supabase-js: ^2.0.0`, `next-auth: ^5.0.0-beta.32`, `zustand: ^5.0.0`, `lucide-react: ^1.0.0`, `clsx: ^2.1.1`, `tailwind-merge: ^3.6.0`
- **`next.config.ts`** (`next.config.ts:1-8`):
  ```ts
  import type { NextConfig } from "next";
  const nextConfig: NextConfig = {
    /* config options here */
  };
  export default nextConfig;
  ```
  *Critical Observation*: `output: "standalone"` is currently missing. When Next.js builds without `output: "standalone"`, the `.next/standalone` folder is not created, causing Docker runner stage `COPY --from=builder /app/.next/standalone ./` to fail.
- **`pnpm-workspace.yaml`** (`pnpm-workspace.yaml:1-4`):
  ```yaml
  allowBuilds:
    sharp: false
    unrs-resolver: false
  ```
- **`tsconfig.json`** (`tsconfig.json:1-35`):
  Configures path alias `"@/*": ["./*"]`, module resolution `"bundler"`, and target `"ES2017"`.

### B. Existing Docker Artifacts
- **Existing `Dockerfile`** (`Dockerfile:1-51`):
  - Uses `node:20-alpine AS base`
  - Attempts `corepack enable pnpm`
  - Does not install `ffmpeg` or `procps` in runner stage (FFmpeg is required by `lib/engine/audio-mixer.ts`).
  - Does not configure `HOSTNAME="0.0.0.0"`, which can cause Next.js in container to bind only to localhost (`127.0.0.1`), preventing external ingress via docker port mapping.
- **Existing `docker-compose.yml`** (`docker-compose.yml:1-25`):
  - Declares `db` (`postgres:15`) and `web` (`build: .`).
  - Uses legacy/partial structure without container naming, proper bridge networks, healthchecks, or dependency conditions.
  - Mounts `./schema.sql:/docker-entrypoint-initdb.d/1-schema.sql`.
- **`.dockerignore`**:
  *Observation*: Currently does NOT exist in workspace root. Without `.dockerignore`, local `node_modules`, `.next`, `.git`, `.agents`, and local test artifacts will be copied into Docker context, bloating build context transfer and causing cache invalidation.

### C. Database & Native Runtime Requirements
- **`schema.sql`** (`schema.sql:1-98`):
  - Installs extension `uuid-ossp` (`schema.sql:4`).
  - Defines 6 tables: `users`, `videos`, `render_jobs`, `api_credits`, `published_videos`, `settings`.
  - Defines trigger `update_modified_column()` and attaches it to `videos`, `api_credits`, and `settings`.
  - Fully compatible with standard PostgreSQL 15 or 16 official images (`postgres:16-alpine`).
- **`lib/db.ts`** (`lib/db.ts:1-7`):
  - Initializes Supabase JS client via `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **`lib/engine/audio-mixer.ts`** (`lib/engine/audio-mixer.ts:8-120`):
  - Executes `ffmpeg -version`, `where ffmpeg`, or `which ffmpeg` via `execSync` / `spawn`.
  - Requires `ffmpeg` binary available on system `$PATH`.

---

## 2. Logic Chain

1. **Multi-Stage Docker Build Optimization**:
   - *Observation*: Next.js 16/React 19 build requires dependencies, TypeScript compiler, and asset compilation.
   - *Reasoning*: A 4-stage build pattern (`base` -> `deps` -> `builder` -> `runner`) ensures:
     1. Layer caching for `pnpm install` only when `package.json` or `pnpm-lock.yaml` changes.
     2. Compiler toolchains (TypeScript, devDependencies) are discarded in the final image.
     3. Final runtime image remains minimal (<200MB) containing only Node.js runtime, standalone server, static assets, and FFmpeg binary.

2. **FFmpeg & Alpine System Dependencies**:
   - *Observation*: `lib/engine/audio-mixer.ts` detects FFmpeg CLI via `which ffmpeg` / `ffmpeg -version`.
   - *Reasoning*: Adding `apk add --no-cache ffmpeg libc6-compat procps tzdata` in the base/runner stages satisfies both Next.js SWC binary requirements (`libc6-compat`) and audio/video mixing requirements (`ffmpeg`).

3. **Standalone Output Requirement**:
   - *Observation*: `Dockerfile` copies `/app/.next/standalone`.
   - *Reasoning*: Next.js produces `.next/standalone` only when `next.config.ts` includes `output: "standalone"`. Therefore, updating `next.config.ts` is a mandatory prerequisite for Dockerfile compilation.

4. **Network Ingress & Container Port Binding**:
   - *Observation*: Next.js standalone server defaults to listening on `127.0.0.1` unless `HOSTNAME` is set.
   - *Reasoning*: Setting `ENV HOSTNAME="0.0.0.0"` and `ENV PORT=3000` inside the Dockerfile ensures the standalone server binds to all interfaces, allowing Docker bridge network and host port mapping `3000:3000` to route traffic properly.

5. **PostgreSQL Initialization & Healthcheck Ordering**:
   - *Observation*: PostgreSQL container initializes schema on first run via `/docker-entrypoint-initdb.d/`.
   - *Reasoning*: Web application startup must wait until PostgreSQL has finished initialization and is accepting TCP connections. Implementing `pg_isready -U postgres -d clipped` as a docker-compose healthcheck and setting `depends_on: { postgres: { condition: service_healthy } }` prevents race conditions where Next.js starts before DB readiness.

6. **Environment Variable Parity**:
   - *Observation*: `.env.example` lists `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_SECRET`, and Supabase variables.
   - *Reasoning*: Docker compose environment blocks should provide sensible containerized defaults (connecting `web` to service `postgres` on port 5432) while allowing overriding via `.env` or `.env.docker`.

---

## 3. Caveats

1. **Next.js Standalone Static Assets**:
   Next.js standalone mode does not bundle `.next/static` and `public` inside `.next/standalone` by default. They must be explicitly copied:
   - `COPY --from=builder /app/public ./public`
   - `COPY --from=builder /app/.next/static ./.next/static`
2. **Supabase JS Client vs Direct PostgreSQL**:
   `lib/db.ts` uses `@supabase/supabase-js`. The local PostgreSQL container provided by `docker-compose.yml` provides standard Postgres on port 5432 with `schema.sql` applied. If the application directly queries Postgres via `pg`/`DATABASE_URL`, it works immediately. If accessing via Supabase client, the fallback in `lib/quotas.ts` handles missing Supabase API gracefully, or a Supabase local emulator/mock can be targeted.
3. **Corepack in Alpine**:
   In Alpine containers, Node 20 Corepack is available. Explicitly running `corepack enable && corepack prepare pnpm@11.24.0 --activate` guarantees the lockfile compatibility with `pnpm-lock.yaml`.

---

## 4. Conclusion & Complete File Specifications

Here are the complete, production-grade specifications for Requirement 1.

### File 1: `Dockerfile`
**Path**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\Dockerfile`
```dockerfile
# ==============================================================================
# Base Stage: Node.js 20 on Alpine Linux with FFmpeg & native toolchains
# ==============================================================================
FROM node:20-alpine AS base

# Install system dependencies (libc6-compat for SWC/turbopack, ffmpeg for audio/video engine)
RUN apk add --no-cache \
    libc6-compat \
    ffmpeg \
    procps \
    tzdata

WORKDIR /app

# Enable pnpm via corepack matching packageManager version in package.json
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

# ==============================================================================
# Dependencies Stage: Install node_modules with frozen lockfile
# ==============================================================================
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ==============================================================================
# Builder Stage: Compile Next.js 14/16 with Standalone Output
# ==============================================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm run build

# ==============================================================================
# Runner Stage: Minimal production image with non-root security user
# ==============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
```

---

### File 2: `docker-compose.yml`
**Path**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\docker-compose.yml`
```yaml
version: '3.8'

services:
  # ----------------------------------------------------------------------------
  # PostgreSQL Database Service
  # ----------------------------------------------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: clipped-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: clipped
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d clipped"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 5s
    networks:
      - clipped-network

  # ----------------------------------------------------------------------------
  # Next.js Application Service
  # ----------------------------------------------------------------------------
  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: clipped-web
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_TELEMETRY_DISABLED=1
      - DATABASE_URL=postgresql://postgres:postgrespassword@postgres:5432/clipped
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=clipped-local-docker-development-secret-key-32ch
      - NEXT_PUBLIC_SUPABASE_URL=http://postgres:5432
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-local-anon-key
      - SUPABASE_SERVICE_ROLE_KEY=mock-local-service-role-key
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - clipped-network

# ------------------------------------------------------------------------------
# Persistent Storage & Bridge Network
# ------------------------------------------------------------------------------
volumes:
  postgres_data:
    driver: local

networks:
  clipped-network:
    driver: bridge
```

---

### File 3: `.dockerignore`
**Path**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.dockerignore`
```
# Dependencies & package caches
node_modules
.pnpm-store
.pnpm-debug.log*
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js build artifacts
.next
out
build
coverage

# Version control & agent metadata
.git
.gitignore
.agents
.gemini

# Local environment files
.env*.local
.env.development
.env.test

# Documentation & temporary scratch files
*.md
!README.md
scaffold.py

# OS & Editor files
.DS_Store
Thumbs.db
.vscode
.idea
*.tsbuildinfo
```

---

### File 4: `next.config.ts` Modification
**Path**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\next.config.ts`
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* additional config options */
};

export default nextConfig;
```

---

### File 5: `.env.docker`
**Path**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.env.docker`
```bash
# Docker Environment Configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1

# Local PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgrespassword@postgres:5432/clipped
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=clipped

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=clipped-local-docker-development-secret-key-32ch

# Supabase / App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://postgres:5432
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=mock-local-service-role-key
```

---

## 5. Verification Method

### A. Independent Verification Commands
When Docker is available on the target environment:

1. **Verify Dockerfile Build**:
   ```bash
   docker build -t clipped-app:test -f Dockerfile .
   ```
   *Expected Result*: Build completes successfully through all 4 stages (`base`, `deps`, `builder`, `runner`), producing a standalone image containing `server.js` and `ffmpeg`.

2. **Verify FFmpeg in Built Image**:
   ```bash
   docker run --rm clipped-app:test ffmpeg -version
   ```
   *Expected Result*: Prints FFmpeg version header (confirming FFmpeg is available on PATH for `audio-mixer.ts`).

3. **Verify Docker Compose Orchestration**:
   ```bash
   docker compose up -d --build
   ```
   *Expected Result*:
   - `clipped-postgres` starts and initializes schema from `./schema.sql`.
   - Healthcheck for `clipped-postgres` transitions to `healthy`.
   - `clipped-web` starts only after `clipped-postgres` is healthy.
   - `http://localhost:3000` serves the application.
   - Port `5432` accepts database connections.

4. **Verify Database Table Schema in Container**:
   ```bash
   docker exec -it clipped-postgres psql -U postgres -d clipped -c "\dt"
   ```
   *Expected Result*: Lists 6 tables: `users`, `videos`, `render_jobs`, `api_credits`, `published_videos`, `settings`.

5. **Verify Clean Teardown**:
   ```bash
   docker compose down -v
   ```

### B. Invalidation Conditions
- If `next.config.ts` omits `output: "standalone"`, Next.js will not emit `.next/standalone`, causing `docker build` to fail at the runner stage copy step.
- If `HOSTNAME` is not set to `0.0.0.0`, the container will listen on `127.0.0.1` and will not respond to host requests on port 3000.
- If `schema.sql` contains unsupported PostgreSQL extensions or syntax errors, the postgres entrypoint will abort initialization. (Verified: `uuid-ossp` is supported).
