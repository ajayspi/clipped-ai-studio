<div align="center">
  <img src="public/hero-bg.jpg" alt="Clipped AI Studio" width="100%" />
  
  <br />
  <h1>🚀 Clipped AI Studio - The Ultimate Open-Source Video Engine</h1>
  <p><strong>A fully autonomous, AI-driven video studio and render pipeline built on Next.js 16, FFmpeg, and Supabase.</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg?style=flat&logo=supabase)](https://supabase.com/)
  [![FFmpeg](https://img.shields.io/badge/FFmpeg-Render_Engine-orange.svg?style=flat&logo=ffmpeg)](https://ffmpeg.org/)
  [![Zustand](https://img.shields.io/badge/Zustand-State_Manager-brown.svg?style=flat&logo=react)](https://github.com/pmndrs/zustand)
</div>

<hr />

## 🎥 What is Clipped AI?

Clipped AI is a **massive "super-repository"** containing a complete, end-to-end video generation pipeline. It replaces expensive SaaS tools by providing a self-hosted engine that can take a simple text prompt, a blog URL, or a raw script, and autonomously output a fully-edited, highly-retaining short-form video (TikTok, Shorts, Reels) within minutes.

By leveraging **OmniRoute** (our proprietary LLM routing gateway), **FFmpeg**, and cutting-edge **Agentic Orchestration**, the system acts as a digital editor, voice actor, and director all in one.

---

## 🔥 The 9-Phase Epic Feature Set

Clipped has recently undergone a massive architectural upgrade spanning 9 distinct phases, synthesizing the best features from over 20 state-of-the-art open-source filmmaking repos (including milimovideo, SceneFlow, OpenMontage, and the Wasserman Filmmaker Suite).

### 1. 🌌 The Infinite Master Canvas
A sprawling React Flow spatial workspace (/editor/canvas) where directors can visually orchestrate Screenplay Nodes, Character Nodes, and Storyboard Nodes before compiling them into a final video job.

### 2. 🥽 3D Previs Blockout Engine
Using @react-three/fiber, directors can stage motion-reference camera paths in a WebGL Grey-Box Stage (/create/previs) before spending API credits on expensive AI video models.

### 3. 💻 Code-Native Hyperframes (HTML/GSAP/Framer to MP4)
Clipped doesn't just prompt traditional pixel-based video models. The engine features a revolutionary **Code-to-Video** pipeline. It uses LLMs to write raw HTML, Tailwind CSS, GSAP, and Framer Motion animations. 
Our PM2 render worker then spins up a headless **Puppeteer** instance, injects the code, and natively screen-records the DOM animations frame-by-frame into a buttery-smooth 60fps MP4. 
**Why?** Zero AI hallucinations, crisp vector graphics, perfectly legible text, and exact brand-color matching—ideal for UI mockups, typographic kinetic videos, and data visualizations.

### 4. 🗂️ Shotbuddy NLE & VLM SceneFlow Evaluation
Assets are intelligently grouped by shot_id into version stacks (V1, V2). The engine uses **Vision-Language Models (VLMs)** in a dedicated Quality Gate to automatically evaluate generated clips against the original prompt, rejecting hallucinations before they reach the timeline.

### 5. 📉 ScriptBreak & Emotional Analytics
Drop in a massive 50-page screenplay. The **ScriptBreak** engine parses it into standard SH001 shot sequences, computes dynamic **Tension Scores**, and charts the emotional arc of the film on an interactive Recharts SVG curve directly inside the Timeline Editor.

### 6. 🌐 Real-Time SSE & Zustand NLE State
We ported the lightning-fast architecture of milimovideo. The timeline uses a robust 7-slice **Zustand + Zundo** state manager for flawless Cmd+Z Undo/Redo capabilities. The Next.js frontend connects to a Supabase Realtime **SSE (Server-Sent Events)** stream, giving you micro-granular live progress bars instead of static spinners.

### 7. 🎬 The Director's Intelligence (Framewright & VideoClaw)
- **Framewright**: An AI agent that intercepts basic user prompts (e.g., "A dog") and automatically rewrites them with professional cinematography direction ("Medium close-up, 50mm lens, golden hour lighting, ARRI Alexa").
- **VideoClaw**: If our local stock libraries fail, this autonomous web-scraper hunts the internet for guaranteed fallback B-roll, ensuring the render engine never starves.

### 8. 🎧 Stem Studio & Volumetric Export
The engine supports exporting isolated audio layers (Dialogue, SFX, Music) for DaVinci Resolve. By requesting spectRatio: 'volumetric', the engine natively packs an RGB video and a computed Grayscale Depth Map side-by-side for Apple Vision Pro / Spatial computing playback.

### 9. 🤖 Clipped MCP (Model Context Protocol) Server
Clipped exposes a native MCP server (mcp/clipped-mcp), allowing external AI agents (like Claude) to directly control the studio, enqueue jobs, and export timelines.

---

## 🛠️ System Architecture & Media Pipeline

For a deep dive into how Clipped ticks, see our [**ARCHITECTURE.md**](ARCHITECTURE.md).

### 🏗️ Interactive Architecture Diagram
We have mapped the entire system into a beautiful, interactive diagram using the **[Archify](https://github.com/tt-a1i/archify)** tool! 
Explore the live architecture here: [**View the Interactive Architecture Diagram ➔**](docs/architecture.html)

---

## 🚀 Getting Started

### 1. Requirements
- **Node.js**: v20+
- **Package Manager**: pnpm (v11+)
- **FFmpeg**: Must be installed globally and accessible on your PATH.

### 2. Installation
`ash
# Clone the repository
git clone https://github.com/clipped-ai/clipped.git
cd clipped

# Install monorepo dependencies
pnpm install --frozen-lockfile
`

### 3. Configure Environment
Copy .env.example to .env.local. You MUST fill in your Supabase credentials. OmniRoute keys and media API keys are optional but recommended for high-quality outputs.
`ash
cp .env.example .env.local
`

### 4. Run the Studio Stack (PM2 Ecosystem)
The easiest way to run the full stack (Web UI, OmniRoute Gateway, Quality Gate Worker, Render Worker) is via PM2:
`ash
# Start everything defined in ecosystem.config.js
npm run workers
`

Open [http://localhost:3000](http://localhost:3000) with your browser to enter the studio!

---

## 🤝 Contributing

We welcome PRs, bug reports, and new workflow integrations! See [**CONTRIBUTING.md**](CONTRIBUTING.md) for our contribution guidelines, local development setup, and testing procedures.

### Testing
Clipped is backed by an incredibly rigorous automated headless E2E test suite (248+ tests). Before submitting a PR, ensure you pass the gates:
`ash
pnpm lint:scoped
pnpm typecheck
pnpm test
`

---

## 📚 Internal Documentation

For developers, contributors, and agents working on the codebase, refer to the internal architectural docs:
- **Master System Architecture**: [docs/PROJECT_GIST.md](docs/PROJECT_GIST.md)
- **Master Daily Changelog**: [daily_documentation.md](daily_documentation.md)
- **Chronological Devlogs**: [docs/devlogs/](docs/devlogs/INDEX.md)
- **Agent Rules**: [AGENTS.md](AGENTS.md)

