# Dual-Engine 60fps Code Video Pipeline

* **Author:** Clipped AI Core Architecture Team
* **Date:** 2026-11-04
* **Target Delivery:** Vertical Shorts (9:16) & Technical Educational Series (16:9)
* **Status:** In Review (EGM Brainstorm Synthesized)

## Overview

The **Dual-Engine Code Video Pipeline** pairs a **Deterministic Headless 60fps Simulation Engine** (Puppeteer + Canvas + Matter.js 2D physics + Paper Origami Folding + Fireship-style AST typing) with a **Remotion/FFmpeg Audio-Visual Mastering Compositor** to produce viral vertical shorts (9:16) and technical educational series (16:9).

Calibrated against top-tier YouTube creators (**Fireship**, **ByteByteGo**, **3Blue1Brown**, **Vox/Johnny Harris**, and **Juxtopposed**), this architecture eliminates the catastrophic frame drops, clock drift, and multi-minute render stalls of naive browser screencasting while maintaining Clipped's strict **$0 cloud GPU, 8GB Linode VM** operational profile.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ENGINE A: SIMULATION RUNTIME                            │
│  Puppeteer Headless (Deterministic Seek Clock: window.__SEEK_FRAME__(f, fps))          │
│  ┌───────────────────────┬─────────────────────────┬────────────────────────────────┐  │
│  │ AST Terminal Engine   │ Matter.js 2D Physics    │ Paper Origami 3D Engine        │  │
│  │ (Babel/TS AST Typing, │ (Token dropping, stack  │ (Torn newsprint, 3D folds,     │  │
│  │  Shiki token diffs)   │  overflows, packet hits)│  12fps stop-motion jitter)     │  │
│  └───────────────────────┴─────────────────────────┴────────────────────────────────┘  │
│                        │ Pipeline Pipe / Intermediate Lossless Track                   │
└────────────────────────┼───────────────────────────────────────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ENGINE B: MASTERING COMPOSITOR                          │
│  Remotion 4 + FFmpeg Filtergraph Mastering Subsystem                                   │
│  ┌───────────────────────┬─────────────────────────┬────────────────────────────────┐  │
│  │ Word-Level Narration  │ Sidechain Ducked BGM    │ Procedural SFX Foley Synth     │  │
│  │ (Edge/OpenAI TTS sync)│ (-18dB voiceover under) │ (Bandpass whooshes, mech clack)│  │
│  ├───────────────────────┴─────────────────────────┴────────────────────────────────┤  │
│  │ Hormozi Kinetic Subtitles + Dynamic 9:16 Safe Zone Bounding Boxes + Color Grading   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                        │ FFmpeg YUV420P H.264 FastStart Packaging                      │
└────────────────────────┼───────────────────────────────────────────────────────────────┘
                         ▼
             Final Production-Grade 1080x1920 MP4 (YouTube Shorts / Reels / TikTok)
```

---

## YouTube Creator Reference Calibration Benchmarks

| Creator / Benchmark | Visual Formula | Retention Pacing Mechanic | Pipeline Translation |
| :--- | :--- | :--- | :--- |
| **Fireship (100s Explainer)** | Terminal typing bursts, syntax color diff morphing, instant AST visual jumps, meme pop-ins. | 140–160 WPM narration; visual state change every 1.8–2.4s; zero visual dead-air. | AST token typing generator + Shiki token diff engine + mechanical keyboard audio cues. |
| **ByteByteGo (Alex Xu)** | Clean isometric/2D architecture diagrams, glowing packet paths, database shard animations. | Flowing kinetic indicators along network edges, active node pulsing, clear topological layout. | Canvas packet simulation + Matter.js particle emitter along SVG bezier connection paths. |
| **Vox / Johnny Harris** | Tactile torn paper dossiers, 3D origami folds, masking tape fasteners, stop-motion jitter. | High tactile visual intrigue; physical document reveals break technical monotony. | `papercraft-studio.tsx` CSS 3D transform matrices + 12fps posterization jitter overlay. |
| **3Blue1Brown (Manim)** | Smooth vector morphs, mathematical coordinate transformations, elegant color transitions. | Continuity of visual focus; morphing existing tokens rather than harsh jump cuts. | SVG/Canvas token interpolation (`code-morph-engine.tsx`) with cubic bezier easing. |
| **Juxtopposed** | Split-screen code vs real-time rendered UI preview, micro-interaction zooms, cursor glow. | Immediate cause-and-effect validation; viewers see code execute into UI live. | Dual-viewport Remotion layout: Code terminal on bottom, live rendered preview on top. |

---

## Analysis (The 6 Goldfish Lenses)

### 1. Contrarian / YAGNI Lens (`egm-zoom-out`)
* **Core Objection**: Remotion already renders React components to video. Adding a separate Puppeteer simulation runtime introduces duplicate Chromium engines, IPC overhead, and synchronization fragility.
* **Resolution**: Remotion's React execution model is fundamentally unsuited for 60fps continuous rigid-body physics (Matter.js) and DOM AST parsing. React state updates cannot maintain 60Hz deterministic physics solver accuracy without triggering memory-leaking reconciliation thrashing. Running physics in a raw Canvas/WebGL page and capturing it as a pre-rendered plate isolates compute-heavy simulation from Remotion's audio-visual mastering stage.

### 2. Architecture & Systems Lens (`egm-structural`)
* **Two-Stage Decoupled Pipeline**:
  * **Stage 1 (Simulation Engine)**: Puppeteer renders the pure visual plate (`sim_track.mp4` or direct stdout pipe) without audio.
  * **Stage 2 (Mastering Compositor)**: Remotion composites `sim_track.mp4` with audio narration, sidechain-ducked background music, word-anchored kinetic captions, and procedural foley sound effects.
* **Job State Machine**: Extends `render_jobs.orchestration_state` transitions:
  `queued` -> `simulating` (Puppeteer Canvas/Matter.js) -> `mastering` (Remotion + FFmpeg) -> `completed`.
  All states remain compliant with Supabase `claim_render_job` lease-locking invariants.

### 3. Codebase Integration Lens (`egm-codebase-details`)
* **Eliminating Screencast Debt**: Existing naive screenshot loops in `render-worker.ts` lines 560–600 rely on `setTimeout(r, 10)` and dump thousands of uncompressed PNG files to disk. Under Linode CPU contention, this drops frames and causes micro-stutter.
* **Deterministic Seek Clock (`window.__SEEK_FRAME__`)**: The simulation runtime replaces real-time browser clocks (`performance.now()`, `requestAnimationFrame`) with a deterministic seek hook:
  ```typescript
  window.__SEEK_FRAME__ = (frameIndex: number, fps: number) => {
    const timeMs = (frameIndex / fps) * 1000;
    matterEngine.timing.timestamp = timeMs;
    Matter.Engine.update(matterEngine, 1000 / fps);
    timeline.seek(timeMs);
  };
  ```
* **Pipe Streaming**: Puppeteer streams raw video or uncompressed frames directly into FFmpeg `stdin` via pipe (`mkfifo` or stdout), reducing intermediate disk I/O to zero.

### 4. Hardware Constraints & Linode 8GB Deployment (`egm-implementation-readiness`)
* **Memory Limits**: The Linode server runs Postgres, Next.js, and PM2 workers on 8GB RAM. Chromium instances can spike past 600MB if unconstrained.
* **Strict Browser Sandboxing**: Chromium must launch with `--disable-gpu`, `--use-gl=angle`, `--use-angle=swiftshader`, `--disable-dev-shm-usage`, and `--no-sandbox`.
* **Phased Execution Invariant**: The worker MUST NEVER run Puppeteer simulation and Remotion mastering concurrently. Stage 1 completes, releases Chromium memory, and only then does Stage 2 spin up Remotion/FFmpeg mastering threads.

### 5. Mobile Ergonomics & Visual Retention (`egm-design`)
* **9:16 Vertical Safe Zones**: In vertical video (1080x1920), mobile app chrome (TikTok, Shorts, Reels) obscures 180px on the right and 240px at the bottom. Critical code, diagram elements, and captions must be strictly clamped within an **800x1400px centered bounding box**.
* **Typographic Hierarchy & Code Legibility**: Code on mobile cannot exceed **36–42 characters per line** without becoming microscopic. The engine must implement intelligent code zoom/pan-follow: the viewport auto-tracks the typing cursor with smooth springs, preventing tiny font sizes.
* **Semantic Physics**: Matter.js simulations must represent real computing concepts (e.g., incoming HTTP requests falling into a queue bucket; memory leaks piling up until a container bursts), avoiding meaningless eye-fatiguing chaos.

### 6. Developer Ergonomics & AST Synthesis (`egm-comprehension`)
* **Declarative DSL**: Creators and AI planners declare high-level animation timelines through a typed JSON schema (`CodeVideoTimeline`) specifying scenes, AST typing targets, physics collision events, and origami folds, rather than writing imperative canvas draw calls.
* **Humanized Typing Rhythm**: Rather than robotic constant-velocity character typing, the AST engine parses tokens with Babel/TypeScript, pausing at semantic boundaries (e.g., 200ms pause after opening braces or function declarations) and typing tokens in natural bursts.

---

## Prioritized Swarm Findings & Architectural Risks

### 🔴 Blocker (Must Resolve Before Full Implementation)
1. **Puppeteer Screencast Non-Determinism**: Real-time `setTimeout` loops in `render-worker.ts` cause catastrophic frame pacing errors under Linode CPU load.
   * **Mitigation**: Implement `window.__SEEK_FRAME__(frame, fps)` synchronous step execution in the simulation harness.
2. **Headless Chrome Memory Leaks & OOM Crashes**: Unmanaged Chromium instances will crash the 8GB Linode VM.
   * **Mitigation**: Launch with `--disable-dev-shm-usage`, reuse a single managed browser process with a 10-job recycling threshold, and wrap lifecycle in guaranteed `try/finally` cleanup.
3. **Audio-Visual Timing Drift in Multi-Beat Videos**: If word-level speech timestamps drift from visual typing beats, keyboard clicks and syntax highlights fire out of sync.
   * **Mitigation**: Anchor visual trigger frames directly to speech token timestamps: `frame = Math.round(word.start * 60)`.

### 🟡 Major (Pacing, Formatting & Ergonomic Gaps)
1. **Vertical 9:16 Code Overflow**: Code snippets exceeding 40 characters get clipped or scaled down to unreadable sizes on mobile screens.
   * **Mitigation**: Implement a pan-and-scan camera module that automatically centers the active typing line with smooth spring interpolation.
2. **Intermediate Disk I/O Thrashing**: Writing thousands of PNG frames (`frame_0001.png`) saturates disk bandwidth.
   * **Mitigation**: Stream raw RGBA/YUV bytes directly into FFmpeg `stdin`.
3. **Physics Visual Fatigue**: Uncontrolled 2D physics creates visual noise that distracts from educational content.
   * **Mitigation**: Restrict physics to purposeful micro-animations (token drops, stack pushes, collision bounces lasting under 3 seconds).

### 🟢 Nit (Aesthetic & Polish Improvements)
1. **Authentic macOS Window Polish**: Terminal window headers should render realistic traffic lights with subtle gradient reflections and crisp drop shadows (`shadow-2xl shadow-black/80`).
2. **Procedural Typing SFX Variety**: Mechanical keyboard clacks should alternate between 3 distinct pitch-shifted audio samples to avoid robotic "machine gun" repetition.
3. **12 FPS Posterization Jitter on Origami**: Pair smooth 60fps camera pan with 12fps posterized paper fold transforms to nail the authentic Vox documentary stop-motion aesthetic.

---

## Goals vs. Non-Goals

### In-Scope Goals
1. **Deterministic 60fps Simulation Engine**: Pure Canvas/WebGL harness executing Matter.js 2D physics, paper origami 3D folds, and AST-driven code typing step-by-step via `window.__SEEK_FRAME__`.
2. **Remotion Master Audio-Visual Compositor**: Automated layering of TTS voiceovers, sidechain-ducked BGM, procedural foley SFX, and word-synchronized kinetic subtitles.
3. **Creator Reference Verification**: Benchmark tests proving visual parity with Fireship, ByteByteGo, and Vox formats.
4. **Linode 8GB Compatibility**: Memory footprint strictly under 1GB per render job, with zero disk frame dumping.
5. **Declarative Timeline DSL**: Typed JSON specification for declarative multi-scene choreography.

### Out-of-Scope Non-Goals
1. **Full 3D Physics (Three.js Cannon/Ammo)**: Heavy volumetric 3D meshes are excluded; the engine focuses on 2D rigid bodies, 2.5D paper folds, and SVG/Canvas particles.
2. **Real-time User-in-the-Loop Dragging**: The simulation runs headless for video export, not as an interactive video game.
3. **Cloud GPU Acceleration**: The pipeline must operate strictly on CPU via SwiftShader/FFmpeg without requiring Nvidia/CUDA hardware.

---

## Alternatives Weighed

| Alternative | Pros | Cons / Reason for Rejection |
| :--- | :--- | :--- |
| **Alternative 1: Monolithic Remotion Canvas Compositor** | Single runtime; everything in React; simplified deployment. | React state updates cannot maintain 60Hz deterministic physics solver accuracy without triggering memory-leaking reconciliation thrashing. Fails on heavy Matter.js and AST simulation. |
| **Alternative 2: Dual-Engine Pipeline (Selected)** | Isolates complex physics and AST simulation in high-performance Canvas/Puppeteer; uses Remotion for what it excels at (audio mastering, kinetic typography, export). | Requires two-stage render orchestration and deterministic frame clock synchronization. |
| **Alternative 3: Pure Code-to-FFmpeg Procedural Pipe (Zero Browser)** | Extremely fast; minimal memory; zero Chromium dependencies. | Impossible to render modern CSS typography, Shiki syntax highlighting, and fluid paper fold transforms without a browser engine. |

---

## Key Decisions & Staging for Next Steps

1. **Adopt Two-Stage Phased Architecture**:
   * Stage 1: Headless Puppeteer Canvas/WebGL simulation (`sim_track.mp4`).
   * Stage 2: Remotion + FFmpeg mastering (audio ducking, subtitles, foley SFX).
2. **Implement Deterministic HyperClock**:
   * Add `window.__SEEK_FRAME__(frame, fps)` to eliminate non-deterministic `setTimeout` loops.
3. **Direct Pipe Streaming**:
   * Pipe raw video frames directly into FFmpeg to eliminate intermediate PNG file I/O.
4. **Anchor SFX and Captions to Word Tokens**:
   * Calculate all trigger frames from TTS word boundaries (`Math.round(word.start * 60)`).
5. **Staging for `/egm-draft`**:
   * Feed `concepts_brief.md` into `/egm-draft` to produce the full technical specification in `docs/designs/dual_engine_code_video_pipeline.md`.
