# Original User Request

## 2026-08-29T11:08:24Z

Integrating the 6 external systems for the "Clipped" Next.js 14 application: TTS providers (Google, Coqui, ElevenLabs), Social Publishing (YouTube, Instagram, TikTok), Analytics/Quotas, and Audio mixing.

Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
Integrity mode: development
Requested team: Standard team (parallel execution)

## Requirements

### R1. Implement TTS Providers
Build `lib/engine/tts.ts` to interface with Google Cloud TTS, Coqui, and ElevenLabs. MUST support English and 6 Indian languages (Hindi, Tamil, Telugu, Kannada, Bengali, Marathi).

### R2. Implement Social Publishing APIs
Build `lib/publishing/*` modules to handle OAuth flows and direct video uploads to YouTube Data API v3, Instagram Graph API (Reels), and TikTok Content API.

### R3. Implement Quotas & Audio Mixing
Build `lib/quotas.ts` to track usage in Supabase (enforcing the 3 videos/month free tier). Build `lib/engine/audio-mixer.ts` for FFmpeg background music overlay.

## Acceptance Criteria

### Implementation Quality
- [ ] `tts.ts` successfully maps language codes (e.g., `hi-IN`, `ta-IN`) across all 3 providers.
- [ ] Publishing modules correctly implement rate-limit handling and exponential backoff.
- [ ] Quota system successfully increments usage in Supabase and blocks execution if limits are exceeded.

### Verification (Cost-Safe Execution)
- [ ] MUST implement strict "dry-run" execution defaults for the Social APIs to prevent accidental live posting to social accounts during testing.
- [ ] Must build E2E integration tests in `tests/e2e/tier6-integration.test.ts` verifying dry-run paths.

## 2026-08-29T11:49:50Z

Creating the three targeted deployment configurations for the "Clipped" Next.js application: Local Docker Compose, Google Colab Notebook, and Oracle Cloud A100 setup script.

Working directory: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
Integrity mode: development
Requested team: Standard team (parallel execution)

## Requirements

### R1. Implement Local Docker Environment
Create `Dockerfile` and `docker-compose.yml` in the project root. It must include the Next.js web app, a local PostgreSQL database (to mimic Supabase), and FFmpeg installed in the web container.

### R2. Implement Google Colab Notebook
Create `deployment/colab/clipped-studio.ipynb`. It must contain a valid Jupyter Notebook JSON structure with cells that install `pnpm`, `ffmpeg`, and expose the Next.js port 3000 to the public web via `localtunnel` or `ngrok`.

### R3. Implement Oracle Cloud Setup Script
Create `deployment/oracle/setup.sh`. It must be a bash script that installs Node 20, pnpm, Docker, and FFmpeg on an Oracle Linux / Ubuntu server, designed for their free tier A100 instances.

## Acceptance Criteria

### Implementation Quality
- [ ] `docker-compose.yml` successfully passes syntax validation via `docker-compose config` or equivalent parsing.
- [ ] Colab Notebook is a syntactically valid JSON file.
- [ ] Oracle script is well-commented and includes `set -e` for fail-fast error handling.

### Verification (Cost-Safe Execution)
- [ ] Agents must run local linters to verify file syntax but do NOT need to actually spin up heavy cloud instances during testing to avoid incurring deployment costs.
