# Scope: Milestone 7 — Targeted Deployment Configurations

## Architecture
This milestone adds 3 production deployment targets for Clipped:
1. **Local Docker Compose**: Multi-stage `Dockerfile` (Node 20 Alpine + FFmpeg + pnpm 11 corepack + standalone Next.js), `docker-compose.yml` with `postgres:16-alpine` (auto-loading `schema.sql`), `.dockerignore`, `.env.docker`.
2. **Google Colab Notebook**: `deployment/colab/clipped-studio.ipynb` (Jupyter Notebook v4 JSON) with automated dependency installation (Node 20 LTS, pnpm, FFmpeg, localtunnel), `.env.local` generator with dry-run defaults, background server with `/api/health` polling, and public tunnel URL + IP password display.
3. **Oracle Cloud Setup Script**: `deployment/oracle/setup.sh` (POSIX Bash with `set -euo pipefail`), supporting Oracle Linux 8/9 and Ubuntu 20.04/22.04 LTS on OCI A100 GPU and standard compute shapes, automated installation of Node 20, pnpm, Docker CE + Compose v2, FFmpeg (with static fallback), NVIDIA Container Toolkit detection, OS firewall rules (ports 80, 443, 3000), and systemd service template.

---

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 23 | Local Docker Environment | `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.docker`, `next.config.ts` standalone output | M7A | DONE |
| 24 | Google Colab Notebook | `deployment/colab/clipped-studio.ipynb` with Jupyter v4 JSON, FFmpeg, pnpm, localtunnel | M7B | DONE |
| 25 | Oracle Cloud Setup Script | `deployment/oracle/setup.sh` with dual OS support, Node 20, pnpm, Docker, FFmpeg, `set -e` | M7C | DONE |
| 26 | Multi-Agent Verification & Audit | Syntax validation, JSON validation, bash linting, stress tests, and forensic integrity audit | M7D | DONE |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M7A | Local Docker Environment | `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.docker`, `next.config.ts` | Survey | DONE |
| M7B | Google Colab Notebook | `deployment/colab/clipped-studio.ipynb` | Survey | DONE |
| M7C | Oracle Cloud Setup Script | `deployment/oracle/setup.sh` | Survey | DONE |
| M7D | Multi-Agent Verification & Audit | Reviewers (2x), Challengers (2x), Forensic Auditor | M7A, M7B, M7C | DONE |

---

## Interface Contracts

### 1. Local Docker Environment (`Dockerfile` & `docker-compose.yml`)
- **Dockerfile**:
  - Multi-stage: `base` (node:20-alpine with `ffmpeg`, `libc6-compat`, `procps`), `deps` (pnpm frozen lockfile), `builder` (pnpm run build), `runner` (non-root `nextjs:nodejs`, `HOSTNAME=0.0.0.0`, `PORT=3000`).
  - Standalone assets copied: `/app/public`, `/app/.next/standalone`, `/app/.next/static`.
- **docker-compose.yml**:
  - Services: `postgres` (`postgres:16-alpine`, port 5432:5432, volume `postgres_data`, schema mount `./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro`, healthcheck `pg_isready -U postgres -d clipped`), `web` (build `.`, port 3000:3000, `depends_on: { postgres: { condition: service_healthy } }`, bridge network `clipped-network`).

### 2. Google Colab Notebook (`deployment/colab/clipped-studio.ipynb`)
- **Format**: Valid Jupyter Notebook JSON format (`nbformat`: 4, `nbformat_minor`: 4).
- **Cells**:
  1. Markdown: Introduction, capabilities, hardware selection.
  2. Code: Hardware & environment diagnostics (GPU/CPU, RAM, OS).
  3. Code (bash): System dependencies (`ffmpeg`, Node.js 20 LTS via NodeSource, `pnpm`, `localtunnel`).
  4. Code: Workspace directory resolution and validation.
  5. Code: Interactive `.env.local` generation with dry-run defaults and random `NEXTAUTH_SECRET`.
  6. Code (bash): `pnpm install --prefer-offline`.
  7. Code: Next.js background server launch (`server.log`), `/api/health` polling readiness, public IP tunnel password discovery, and localtunnel launch.
  8. Markdown: Studio usage guide, credentials (`admin@clipped.ai`/`admin`), troubleshooting.

### 3. Oracle Cloud Setup Script (`deployment/oracle/setup.sh`)
- **Directives**: `#!/usr/bin/env bash` with `set -euo pipefail` and trap error handler.
- **OS Support**: Oracle Linux 8/9 (`dnf`) and Ubuntu 20.04/22.04 LTS (`apt`).
- **Core Components**: Node.js 20 LTS (NodeSource), pnpm (corepack/npm), Docker CE + Compose v2 (`docker compose`), FFmpeg (distro package with static JohnVanSickle binary fallback), NVIDIA Container Toolkit detection, OS firewall rules (ports 80, 443, 3000 for `firewalld`/`ufw`/`iptables`), systemd service template (`/etc/systemd/system/clipped.service`), post-install validation checks (`node -v`, `pnpm -v`, `docker -v`, `ffmpeg -version`).

---

## File Ownership
| File | Owner Worker |
|------|-------------|
| `Dockerfile` | `worker_m7a` |
| `docker-compose.yml` | `worker_m7a` |
| `.dockerignore` | `worker_m7a` |
| `.env.docker` | `worker_m7a` |
| `next.config.ts` | `worker_m7a` |
| `deployment/colab/clipped-studio.ipynb` | `worker_m7b` |
| `deployment/oracle/setup.sh` | `worker_m7c` |
