<div align="center">
  <img src="public/hero-bg.jpg" alt="Clipped AI Studio" width="100%" />
  
  <br />
  <h1>✨ Clipped AI Studio - The Ultimate Open-Source Video Engine</h1>
  <p><strong>A fully autonomous, AI-driven video studio and render pipeline built on Next.js 16, FFmpeg, and Supabase.</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg?style=flat&logo=supabase)](https://supabase.com/)
  [![FFmpeg](https://img.shields.io/badge/FFmpeg-Render_Engine-orange.svg?style=flat&logo=ffmpeg)](https://ffmpeg.org/)
  [![Stars](https://img.shields.io/github/stars/clipped-ai/clipped.svg?style=social)](https://github.com/clipped-ai/clipped)
</div>

<hr />

## 🚀 What is Clipped AI?

Clipped AI is a **massive "super-repository"** containing a complete, end-to-end video generation pipeline. It replaces expensive SaaS tools by providing a self-hosted engine that can take a simple text prompt, a blog URL, or a raw script, and autonomously output a fully-edited, highly-retaining short-form video (TikTok, Shorts, Reels) within minutes.

By leveraging **OmniRoute** (our proprietary LLM routing gateway), **FFmpeg**, and **Remotion**, the system acts as a digital editor, voice actor, and director all in one.

---

## ⚡ Core Features & Superpowers

### 🧠 OmniRoute AI Orchestration
Our local `omniroute-server` gateway handles intelligent routing between OpenAI, Anthropic, Gemini, DeepSeek, Mistral, and local models. It features automatic rate-limit detection, circuit breakers, and cascading fallbacks, ensuring your generation pipelines never fail.

### 🎙️ Multi-Tiered TTS Cascade (incl. Local Models)
Clipped integrates a highly resilient Text-to-Speech (TTS) fallback system. It attempts high-fidelity voice cloning via **ElevenLabs** or **Azure**, falls back to **OpenAI TTS**, uses **Sarvam AI** for native Indian regional languages, and if all cloud quotas are exhausted, flawlessly defaults to **Piper TTS** and **Edge TTS** so your rendering queue never blocks.

### 🎬 Heavy-Duty FFmpeg Render Worker
The background worker orchestrates complex video compositions locally. It supports:
- Dynamic Ken-Burns zoom and pan camera moves
- "Hormozi-style" word-by-word Karaoke subtitles with custom glows and outlines
- Automated B-roll fetching and intelligent scene matching
- Pre-flight **Quality Gates** that ensure all media URLs are reachable before processing
- Background music ducking natively in FFmpeg

### 🛠️ Declarative YAML Workflows (OpenMontage Port)
Define complex video pipelines using raw YAML as code! Fully ported from the OpenMontage spec, you can create deterministic video generations simply by feeding YAML manifests into the engine.

---

## 🧩 14+ Autonomous Workflows

Clipped supports highly specialized workflows tailored to specific content niches.

| Workflow | Description | Output Format |
|---|---|---|
| **Auto-Pilot Engine** | Generate complete videos from a single prompt | Cinematic / Narrative |
| **URL to Video / Scrape** | Scrape blogs & news articles into viral shorts | Informative |
| **Reddit Stories** | Split-screen gameplay and TTS narration | Reddit TTS |
| **Whiteboard Animation** | Educational sketch-style explainers | Educational |
| **Micro-Drama** | Multi-character AI soap operas | Entertainment |
| **Trivia / Quizzes** | Automated countdown timers and answer reveals | Interactive |
| **Stickman Animation** | Stickman action sequences and visualizations | Humor / Explainer |
| **Podcast to Video** | Highlights extraction from YouTube URLs | Repurposed Clips |
| **YAML Pipelines** | Pure declarative video-as-code manifests | Developer Custom |

---

## 🏗️ System Architecture & Media Pipeline

For a deep dive into how Clipped ticks, see our [**ARCHITECTURE.md**](ARCHITECTURE.md).

Clipped relies on an intelligent cascading media pipeline for generation:
1. **API Boundary**: Routes receive requests, immediately return HTTP 200/202, and drop a `qc_pending` payload into the Supabase `render_jobs` table.
2. **Quality Gate Worker**: A PM2 microservice intercepts jobs, rigorously validates beat constraints and media URL reachability (via `HEAD` requests), and promotes healthy jobs to `queued`.
3. **Render Worker**: The local worker claims the job, handles the TTS cascade, downloads all transient media (e.g., from fal.ai or Pollinations) to local disk, compiles an OTIO-style layout, and executes a monstrous multi-pass FFmpeg string.

---

## 🚀 Getting Started

### 1. Requirements
- **Node.js**: v20+
- **Package Manager**: `pnpm` (v11+)
- **FFmpeg**: Must be installed globally and accessible on your PATH.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/clipped-ai/clipped.git
cd clipped

# Install monorepo dependencies
pnpm install --frozen-lockfile
```

### 3. Configure Environment
Copy `.env.example` to `.env.local`. You MUST fill in your Supabase credentials. OmniRoute keys and media API keys are optional but recommended for high-quality outputs.
```bash
cp .env.example .env.local
```

### 4. Run the Studio Stack (PM2 Ecosystem)
The easiest way to run the full stack (Web UI, OmniRoute Gateway, Quality Gate Worker, Render Worker) is via PM2:
```bash
# Start everything defined in ecosystem.config.js
npm run workers
```
*Alternatively, you can run services individually in separate terminals (e.g., `pnpm dev`, `npm run worker`).*

Open [http://localhost:3000](http://localhost:3000) with your browser to enter the studio!

---

## 🤝 Contributing

We welcome PRs, bug reports, and new workflow integrations! See [**CONTRIBUTING.md**](CONTRIBUTING.md) for our contribution guidelines, local development setup, and testing procedures.

### Testing
Clipped is backed by an incredibly rigorous automated headless E2E test suite (248+ tests). Before submitting a PR, ensure you pass the gates:
```bash
pnpm lint:scoped
pnpm typecheck
pnpm test
```

---

## 📚 Internal Documentation

For developers, contributors, and agents working on the codebase, refer to the internal architectural docs:
- **Master System Architecture**: [`docs/PROJECT_GIST.md`](docs/PROJECT_GIST.md)
- **Master Daily Changelog**: [`daily_documentation.md`](daily_documentation.md)
- **Chronological Devlogs**: [`docs/devlogs/`](docs/devlogs/INDEX.md)
- **Agent Rules**: [`AGENTS.md`](AGENTS.md)
