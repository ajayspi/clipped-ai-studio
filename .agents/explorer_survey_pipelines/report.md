# Video Pipelines & Character Reference Architecture Report

**Author**: Explorer 3 (Pipelines & Character Reference Focus)  
**Date**: 2026-09-01  
**Project**: Clipped AI Studio  
**Target File**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_pipelines\report.md`

---

## 1. Executive Summary

This investigation surveys the backend video generation pipelines in Clipped AI Studio and establishes the architectural blueprints for two new flagship workflows: **Avatar to Video** (talking head / AI presenter) and **Whiteboard Animation** (sketch / doodle video with character consistency powered by Google Gemini).

Key findings:
1. **Existing Pipeline Architecture**: Clipped features an extensible modular engine in `lib/engine/` powering 8 distinct workflows (`footage`, `images`, `ai-videos`, `stories`, `bulk-plan`, `micro-drama`, `extract-shorts`, and `auto`). Video compositing is handled by a background Remotion worker (`scripts/render-worker.ts`) consuming `render_jobs` from Supabase with multi-provider TTS audio synthesis (`lib/engine/tts.ts`).
2. **Avatar to Video Architecture**: Designed a hybrid pipeline supporting studio avatar generation (HeyGen / D-ID) and lightweight photo-driven expressive animation (Fal.ai LivePortrait / SadTalker) with Remotion compositing (fullscreen or PiP circular webcam overlay) and cost-safe procedural 2D/SVG talking-head mock fallbacks.
3. **Whiteboard Animation Architecture**: Designed a sketch-and-doodle rendering engine combining progressive SVG path stroke-dashoffset / alpha wipe animation, realistic moving hand cursor tracking, whiteboard textures, and marker sound effects.
4. **Character Consistency via Google Gemini**: Defined an end-to-end framework using Google Gemini (via `@google/genai` and Gemini REST API) to generate consistent 9-pose orthographic character reference sheets (stickman, saint, wise old man, tech founder, etc.) that directly drive and anchor scene-by-scene doodle composition.
5. **Cost Safety & Dry-Run Fallbacks**: Built a multi-tier fallback cascade ensuring that missing API keys or test/offline environments seamlessly trigger deterministic, zero-cost mock outputs without throwing uncaught exceptions.

---

## 2. Existing Video Generation Pipelines Survey

### 2.1 Codebase & Engine Structure
The backend generation architecture is organized into clean separation of concerns:

```
clipped/
├── app/api/
│   ├── settings/keys/           # Key retrieval, masking & verification (/check)
│   ├── settings/test/           # Environment diagnostic probe
│   └── workflows/
│       ├── generate/            # Core footage generation entry point
│       ├── ai-videos/           # Kling / Luma / Fal text-to-video workflow
│       ├── images/              # Fal.ai Flux text-to-image workflow
│       ├── stories/             # Multi-part episodic story series
│       ├── bulk-plan/           # 1-30 day content calendar batch generator
│       ├── micro-drama/         # Character-anchored cinematic mini-series
│       ├── extract-shorts/      # Viral shorts extractor from transcripts
│       └── auto/                # Autonomous hands-off pipeline scheduler
├── lib/
│   ├── ai/llm.ts                # OpenAI GPT-4o-mini client + Pollinations fallback
│   ├── keys.ts                  # Dynamic API key resolver (Env + Supabase settings)
│   └── engine/
│       ├── types.ts             # TypeScript interface contracts for all workflows
│       ├── prompts.ts           # System prompts and prompt builders
│       ├── orchestrator.ts      # Core stock footage orchestrator
│       ├── scene-matcher.ts     # Script narration to visual scene parser
│       ├── video-sourcer.ts     # Pexels, Pixabay, Openverse API sourcer
│       ├── video-generator.ts   # AI video model generator (Kling, Luma, Fal)
│       ├── image-generator.ts   # AI image generator (Flux Dev/Schnell)
│       ├── stories-orchestrator.ts # Story series engine with cliffhangers
│       ├── drama-orchestrator.ts   # Micro-drama engine with visual anchors
│       ├── bulk-planner.ts      # Omnichannel content planner
│       ├── shorts-extractor.ts  # Viral transcript segment analyzer
│       ├── auto-pilot.ts        # Automated pipeline scheduler
│       ├── audio-mixer.ts       # Audio track layering & volume balancer
│       └── tts.ts               # Multi-provider voice synthesis engine
├── remotion/
│   ├── Root.tsx                 # Compositions: MainRender-9x16, 16x9, 1x1
│   └── Composition.tsx          # Sequence player, Hormozi word-pop subtitles, BGM, watermark
└── scripts/
    └── render-worker.ts         # Supabase polling worker with Remotion bundler & renderer
```

### 2.2 Catalog of Existing Workflows

| Workflow | Primary Engine Class | Primary APIs / Models | Output Format | Fallback Strategy |
|---|---|---|---|---|
| **Footage Video** | `VideoOrchestrator` (`orchestrator.ts`) | OpenAI GPT-4o-mini, Pexels API, Pixabay API | Multi-beat stock video sequence | Openverse / royalty-free sample clips |
| **AI Images** | `ImageGenerator` (`image-generator.ts`) | Fal.ai Flux (`flux-schnell`, `flux-dev`), SDXL | Sequence of styled static images | Pollinations.ai Keyless Image API |
| **AI Videos** | `VideoGenerator` (`video-generator.ts`) | Kling AI (`kling-v1`), Luma Dream Machine, Fal.ai | Generative MP4 video clips per beat | Aspect-ratio adaptive Mixkit stock video loops |
| **Stories Generator** | `StoriesOrchestrator` (`stories-orchestrator.ts`) | OpenAI GPT-4o-mini structured JSON | 1-10 part serialized scripts with cliffhangers | Deterministic genre-specific story templates |
| **Bulk Planner** | `BulkPlanner` (`bulk-planner.ts`) | OpenAI GPT-4o-mini structured JSON | 1-30 day content calendar with hooks & batch job IDs | Algorithmic niche pillar content generator |
| **Micro-Drama** | `DramaOrchestrator` (`drama-orchestrator.ts`) | OpenAI GPT-4o-mini with character visual anchors | Multi-episode dramatic series with character continuity | Archetype-based episodic drama templates |
| **Extract Shorts** | `ShortsExtractor` (`shorts-extractor.ts`) | OpenAI GPT-4o-mini transcript parser | Viral clip timestamps (30-60s) with viral scores | Algorithmic sliding-window transcript splitter |
| **Auto Pilot** | `AutoPilot` (`auto-pilot.ts`) | OpenAI GPT-4o-mini + Cron calculator | Scheduled recurring autonomous video jobs | Algorithmic trending topic synthesizer |

### 2.3 Audio & Speech Subsystem (`lib/engine/tts.ts`)
The TTS engine implements a resilient 5-tier fallback cascade:
1. **ElevenLabs API**: `eleven_multilingual_v2` with mapped presets (`rachel`, `adam`, `nova`, etc.).
2. **Google Cloud Text-to-Speech**: `Journey`, `Neural2`, and `Wavenet` voices supporting 8 Indian and English locales (`en-US`, `en-IN`, `hi-IN`, `ta-IN`, `te-IN`, `kn-IN`, `bn-IN`, `mr-IN`).
3. **Coqui TTS**: Fast local/remote endpoint with 2.5-second timeout guard.
4. **Keyless Google Translate TTS**: Zero-config free MP3 voice synthesis.
5. **Deterministic In-Memory Synthesizer**: Zero-cost standard RIFF/WAVE 16-bit PCM buffer generator creating harmonic 440Hz sine waveforms sized to exact estimated speech durations.

### 2.4 Remotion Video Compositing (`remotion/` + `scripts/render-worker.ts`)
- **Compositions**: Supports `MainRender-9x16` (1080x1920), `MainRender-16x9` (1920x1080), and `MainRender-1x1` (1080x1080) at 30 FPS.
- **Dynamic Word-by-Word Subtitles**: Hormozi-style word-pop spring animations (`damping: 12, stiffness: 200`) with active yellow highlight and customizable font, size, outline, and box backgrounds.
- **BGM & Watermark**: Automatic background music track volume ducking (`volume: 0.15`) and brand watermark logo positioning.
- **Worker Execution**: Worker dynamically bundles Remotion via `@remotion/bundler`, extracts metadata via `selectComposition`, renders MP4 via `@remotion/renderer`, and updates Supabase `render_jobs` with the public URL `/renders/{jobId}.mp4`.

---

## 3. Architecture for "Avatar to Video" Workflow

### 3.1 Overview & Goals
The **Avatar to Video** workflow enables creators to produce talking-head videos from text or audio. A photorealistic or stylized avatar delivers spoken dialogue with realistic lip-synchronization, natural head gestures, and eye blinks.

```
[User Input / Script]
         │
         ▼
[TTS Audio Synthesis (TTSEngine)] ──► [Exact Audio MP3 + Duration]
         │                                       │
         ▼                                       ▼
[Avatar Engine / LivePortrait / HeyGen / D-ID / Mock]
         │
         ▼
[Talking Head Video Clip (MP4 with alpha/chroma or background)]
         │
         ▼
[Remotion Compositor (AvatarComposition)]
  ├── Track 1: Background Media (Stock B-Roll / AI Image / Studio / Solid)
  ├── Track 2: Talking Head Avatar (Fullscreen OR Circular PiP Overlay)
  ├── Track 3: Synced TTS Spoken Audio
  ├── Track 4: Hormozi Pop Subtitles
  └── Track 5: Ambient BGM Track
         │
         ▼
[Final Rendered Video]
```

### 3.2 Model & API Provider Comparison

| Provider / Model | Integration Method | Strengths | Limitations | Estimated Cost | Recommended Role |
|---|---|---|---|---|---|
| **Fal.ai LivePortrait** (`fal-ai/live-portrait`) | REST API | Extremely fast (sub-5s), stunning facial dynamics, eye blinks, works on any single portrait photo | Requires static source image + driving audio/video | ~$0.01 / generation | **Primary default for custom photo & stylized avatars** |
| **HeyGen API** (`/v2/video/generate`) | REST API | Industry-standard photorealism, full studio bodies, corporate gestures, multi-language | High latency (30-90s), requires paid credits | ~$0.20-$0.40 / minute | **Enterprise / studio presenter preset mode** |
| **D-ID API** (`/talks`, `/clips`) | REST API | Reliable talking photo API, fast turnaround, established ecosystem | Occasional robotic mouth artifact on low-res images | ~$0.08 / minute | **Secondary talking-photo alternative** |
| **SadTalker / Hallo (Replicate/Fal)** | REST API | Open-source weights, cost-effective | Head pose range is slightly narrower than LivePortrait | ~$0.015 / generation | **Backup open-source provider** |
| **Deterministic Mock Fallback** | Local in-memory | Zero cost, instant, 100% offline, zero external dependencies | Stylized 2D avatar or pre-rendered stock presenter | $0.00 | **Dry-run, test suite & missing-key fallback** |

### 3.3 Avatar Layout & Compositing Modes

1. **Fullscreen Presenter**: The talking avatar fills the entire screen (16:9 or 9:16) with an AI-generated or studio background.
2. **Picture-in-Picture (PiP) Overlay**:
   - **Circular PiP**: Avatar rendered inside a circular badge (e.g. bottom-left or bottom-right, `width: 280px, height: 280px`, `borderRadius: 50%`, glowing border, subtle shadow). Background displays relevant B-roll footage or slides matching script keywords.
   - **Split Screen (50/50)**: Top/Left shows avatar; Bottom/Right shows dynamic visual b-roll.
3. **Floating Transparent Presenter**: Uses chroma-key or green screen removal in Remotion canvas to overlay upper-torso presenter directly over background footage.

### 3.4 Procedural Mock Fallback for Avatar
When API keys (`FAL_API_KEY`, `HEYGEN_API_KEY`, `DID_API_KEY`) are missing or `mock: true`:
- **Tier 1 (Video Mock)**: Routes to royalty-free talking-head presenter stock videos (Mixkit / Pexels portrait clips).
- **Tier 2 (Interactive SVG/Canvas Avatar in Remotion)**: Renders a clean 2D vector avatar component where mouth opening is driven by audio amplitude frames (`Math.sin(frame * 0.5)`), head bobbing uses Remotion `spring()`, and eye blinks trigger every 60 frames.

---

## 4. Architecture for "Whiteboard Animation" Workflow

### 4.1 Overview & Aesthetic Principles
Whiteboard Animation (also known as Video Scribe / Doodle Video) simulates illustrations, diagrams, and characters being hand-drawn on a whiteboard in real time.

**Key Aesthetic Mechanics**:
1. **Whiteboard Canvas**: Off-white matte background (`#FAFAFA` or subtle parchment/dry-erase texture).
2. **Stroke-by-Stroke Path Drawing**: Vector lines animate from 0% to 100% stroke length using Remotion SVG `strokeDasharray` and `strokeDashoffset`.
3. **Realistic Drawing Hand Cursor**: A photorealistic hand holding a dry-erase marker tracks the active drawing coordinate `(x, y)` across the canvas.
4. **Scene Wipes & Transitions**: Hand holding an eraser wipes the screen clean between major concepts.
5. **Acoustic Feedback**: Subtle marker squeaks, scribbles, and paper taps mixed at low volume under voiceover.

```
[User Prompt / Topic / Script]
         │
         ▼
[Gemini Scriptwriter & Scene Analyzer]
  ├── Breaks script into visual sketch beats
  └── Specifies doodle diagrams & layout (left/center/right)
         │
         ▼
[Gemini Character Reference Generator]
  └── Generates consistent 9-pose orthographic character sheet
         │
         ▼
[Scene Vectorizer / Doodle Synthesizer]
  ├── Extracts/selects character pose (e.g. Pose 4: Eureka Lightbulb)
  └── Generates matching black-marker doodle line-art for diagram
         │
         ▼
[Whiteboard Remotion Composition (WhiteboardComposition.tsx)]
  ├── Layer 1: Textured Whiteboard Canvas
  ├── Layer 2: Animated SVG Sketch Paths (strokeDashoffset interpolation)
  ├── Layer 3: Drawing Hand Tracking Cursor (tracks stroke tip)
  ├── Layer 4: Handwritten Subtitles (Caveat / Patrick Hand font)
  └── Layer 5: Mixed Audio (TTS Narration + Marker SFX + Lo-Fi BGM)
         │
         ▼
[Rendered Whiteboard MP4]
```

### 4.2 Progressive Path Drawing Mechanics in Remotion
For any vector doodle (SVG path `d="..."` with total length $L$):
$$\text{progress}(t) = \text{interpolate}(t, [0, T_{\text{draw}}], [0, 1], \{\text{extrapolateRight: 'clamp'}\})$$
$$\text{strokeDashoffset} = L \times (1 - \text{progress}(t))$$
$$\text{HandPosition}(t) = \text{path.getPointAtLength}(L \times \text{progress}(t))$$

The drawing hand cursor PNG is translated so its marker tip aligns precisely with $\text{HandPosition}(t)$ with a slight subtle natural wobble ($\pm 2\text{px}$).

---

## 5. Gemini Character Reference Sheet Generation Deep Dive

### 5.1 Requirement & Objectives
Requirement R3 mandates:
> "The whiteboard pipeline must use Google Gemini to generate consistent character reference sheets (e.g., stickman, saint, old man, etc.) that drive the video generation."

To achieve visual consistency across multiple scenes without characters morphing between cuts, we generate a **9-pose master character reference sheet** upfront, and reference specific pose coordinates and visual anchors across all scene illustrations.

### 5.2 Character Archetypes
The system supports built-in and user-customizable archetypes:
1. **Stickman (`stickman`)**: Monoline minimalist doodle figure with expressive head shapes, question marks, lightbulbs, and dynamic limbs. Ideal for fast-paced tech, finance, and conceptual explainers.
2. **Saint / Philosopher (`saint`)**: Robed, serene figure with halo/aura, parchment scroll, meditative poses. Ideal for spiritual, historical, and motivational stories.
3. **Wise Old Man (`old_man`)**: Classic elder with beard, spectacles, walking stick, armchair, pointing at blackboard. Ideal for life lessons, history, and educational summaries.
4. **Tech Founder (`founder`)**: Modern hoodie/casual blazer, laptop, coffee cup, rocket ship, whiteboard chart. Ideal for startups, SaaS, and business breakdowns.
5. **Doctor / Scientist (`doctor`)**: Lab coat, stethoscope, beaker, clipboard, microscope. Ideal for health, medical, and scientific explainers.

### 5.3 Google Gemini API Prompt Engineering

#### Master Character Sheet Prompt Template:
```
Prompt:
"Orthographic character model sheet and multi-pose expression grid of [CHARACTER_NAME], a [ARCHETYPE].
Style: Minimalist black marker line-art on pure white background (#FFFFFF).
High-contrast vector doodle illustration, uniform clean black monoline stroke width, zero shading, zero color fills, zero photorealism.
Arranged in a precise 3x3 grid containing exactly 9 distinct poses:
- Row 1, Col 1 (pose_1_neutral): Standing neutral front view, calm expression, hands at sides.
- Row 1, Col 2 (pose_2_pointing): Standing, pointing right towards an invisible chart with index finger.
- Row 1, Col 3 (pose_3_confused): Hand scratching head, puzzled facial expression with floating question mark.
- Row 2, Col 1 (pose_4_eureka): Excited Eureka moment, jumping slightly, index finger pointing up at glowing lightbulb.
- Row 2, Col 2 (pose_5_explaining): Open-arms welcoming posture, speaking dynamically to the audience.
- Row 2, Col 3 (pose_6_slouch): Frustrated facepalm posture with hand over eyes.
- Row 3, Col 1 (pose_7_victory): Celebratory pose, double thumbs up, energetic stance.
- Row 3, Col 2 (pose_8_desk): Sitting at a simple sketch desk working on a laptop/drawing.
- Row 3, Col 3 (pose_9_shrug): Palms turned up, shrugging shoulders, questioning expression.
CRITICAL: The character's face, clothing, proportions, and stroke thickness MUST BE 100% IDENTICAL across all 9 panels."
```

### 5.4 Gemini Scene Driving & Prompt Chaining
Gemini operates as a two-stage orchestrator:

#### Stage 1: Reference Sheet Generation & Pose Cataloging
Gemini generates the master sheet image and emits the structured metadata:
```json
{
  "characterName": "Professor Aris",
  "archetype": "old_man",
  "sheetUrl": "https://.../sheet-aris.png",
  "grid": { "rows": 3, "cols": 3 },
  "poses": {
    "pose_1": { "name": "neutral", "description": "Standing front view" },
    "pose_2": { "name": "pointing_board", "description": "Pointing right at whiteboard" },
    "pose_3": { "name": "confused", "description": "Scratching head with question mark" },
    "pose_4": { "name": "eureka_lightbulb", "description": "Eureka lightbulb idea" },
    "pose_5": { "name": "explaining", "description": "Dynamic open-hand explanation" }
  }
}
```

#### Stage 2: Scene Breakdown with Pose Assignment
Gemini takes the user script and maps each sentence to a specific character pose and doodle layout:
```json
{
  "title": "The Power of Compound Interest",
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "Most people think wealth is built through sudden luck, but math proves otherwise.",
      "characterPose": "pose_3",
      "characterPlacement": "left",
      "doodleElements": ["money_bag", "lightning_bolt_crossed_out"],
      "doodlePlacement": "right",
      "handAction": "draw_character_then_diagram",
      "duration": 4.5
    },
    {
      "sceneNumber": 2,
      "narration": "When you reinvest your returns, your money starts making money automatically.",
      "characterPose": "pose_4",
      "characterPlacement": "left",
      "doodleElements": ["exponential_curve_graph", "stack_of_coins_growing"],
      "doodlePlacement": "right",
      "handAction": "draw_graph_curve",
      "duration": 5.2
    }
  ]
}
```

---

## 6. Error Handling, Dry-Run Fallbacks & Cost Safety

### 6.1 Resilience Cascade Matrix

```
[Trigger Workflow API]
         │
         ▼
[Check API Keys: DB settings & process.env]
  ├── Key Configured & Valid ────► Execute Live Provider (Gemini / HeyGen / Fal)
  │                                      │
  │                                (If HTTP Error / 429 Quota)
  │                                      ▼
  └── Key Missing or Mock Flag ──► Deterministic Zero-Cost Fallback Engine
                                         ├── Avatar: 2D SVG Talking Avatar / Royalty-Free Presenter Loop
                                         ├── Whiteboard: Procedural SVG Stickman / Pre-bundled Reference Sheets
                                         └── TTS: In-Memory RIFF/WAVE PCM Audio Generator
```

### 6.2 Pre-flight & Safety Policies
1. **Zero-Crash Guarantee**: Missing API keys must never crash the server or return HTTP 500. They must return a 200 response with `isDryRun: true` and working mock video assets.
2. **Explicit Mock Flag**: All routes support `{ "mock": true }` in JSON body, bypassing all paid API endpoints instantly.
3. **Timeout Protection**: All external API calls wrapped with `AbortSignal.timeout(10000)` (10-second ceiling).
4. **Database Non-Blocking**: Initial `render_jobs` record is inserted synchronously with `status: 'pending'`, while heavy generation executes asynchronously in a worker or deferred task.

---

## 7. Database Schema & Job Payload Specifications

### 7.1 Schema Extensions (`schema.sql`)

```sql
-- 1. Extend videos table workflow check
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_workflow_check;
-- Allowed workflows: footage, images, ai-videos, stories, bulk-plan, micro-drama, extract-shorts, auto, avatar, whiteboard

-- 2. New Table: character_sheets (for reusable Gemini character reference sheets)
CREATE TABLE IF NOT EXISTS character_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    archetype TEXT NOT NULL,
    art_style TEXT DEFAULT 'black_marker_lineart',
    sheet_url TEXT NOT NULL,
    poses JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Settings Provider Extensions
-- Recognized providers in settings table:
-- 'api_openai', 'api_gemini', 'api_anthropic', 'api_openrouter',
-- 'api_pexels', 'api_pixabay', 'api_kling', 'api_luma', 'api_fal',
-- 'api_elevenlabs', 'api_google', 'api_heygen', 'api_did'
```

### 7.2 Render Job Payload Contracts (`render_jobs.logs`)

#### Avatar Workflow Job Payload:
```json
{
  "workflow": "avatar",
  "input": {
    "script": "Hello and welcome to Clipped AI Studio.",
    "avatarId": "ethan_business",
    "avatarImageUrl": "https://.../avatar.png",
    "voice": "alloy",
    "layout": "pip_circle_left",
    "aspectRatio": "9:16",
    "burnSubtitles": true
  },
  "result": {
    "success": true,
    "avatarVideoUrl": "/renders/avatar-clip-1.mp4",
    "totalDuration": 12.0,
    "beats": [
      {
        "id": "beat-1",
        "text": "Hello and welcome to Clipped AI Studio.",
        "duration": 4.0,
        "avatarClipUrl": "/renders/avatar-clip-1.mp4",
        "backgroundUrl": "https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-41484-large.mp4",
        "audioUrl": "data:audio/mp3;base64,..."
      }
    ]
  }
}
```

#### Whiteboard Workflow Job Payload:
```json
{
  "workflow": "whiteboard",
  "input": {
    "script": "Here is how neural networks learn...",
    "archetype": "stickman",
    "characterSheetUrl": "/assets/characters/stickman-sheet.png",
    "artStyle": "black_marker_lineart",
    "aspectRatio": "16:9",
    "handStyle": "marker_right_hand"
  },
  "result": {
    "success": true,
    "characterSheet": {
      "archetype": "stickman",
      "sheetUrl": "https://.../stickman-sheet.png",
      "poses": [
        { "id": "pose_1", "name": "neutral" },
        { "id": "pose_4", "name": "eureka_lightbulb" }
      ]
    },
    "scenes": [
      {
        "id": "wb-scene-1",
        "text": "Here is how neural networks learn...",
        "characterPose": "pose_4",
        "characterPosition": "left",
        "doodleSvgUrl": "/assets/doodles/neural-net.svg",
        "drawDuration": 4.5,
        "duration": 5.0,
        "audioUrl": "data:audio/mp3;base64,..."
      }
    ]
  }
}
```

---

## 8. Implementation Roadmap & Verification Plan

### 8.1 Backend Implementation Steps
1. **Types & Models**: Update `lib/engine/types.ts` with `AvatarGenerationRequest`, `AvatarGenerationResponse`, `WhiteboardGenerationRequest`, `WhiteboardGenerationResponse`, `CharacterSheetRecord`.
2. **Avatar Orchestrator**: Implement `lib/engine/avatar-orchestrator.ts` handling HeyGen, D-ID, Fal.ai LivePortrait, and SVG/2D deterministic mock.
3. **Gemini Character Reference & Whiteboard Orchestrator**: Implement `lib/engine/whiteboard-orchestrator.ts` integrating `@google/genai` for reference sheet generation, scene parsing, and SVG path extraction.
4. **API Routes**: Add `app/api/workflows/avatar/route.ts` and `app/api/workflows/whiteboard/route.ts`.
5. **Remotion Compositions**: Add `AvatarComposition.tsx` and `WhiteboardComposition.tsx` into `remotion/` and register in `remotion/Root.tsx`.
6. **Worker Update**: Extend `scripts/render-worker.ts` to recognize `avatar` and `whiteboard` job logs.

### 8.2 Verification & Test Suite
- **API Route Contract Tests**: Verify HTTP 200, valid `jobId`, and initial pending state in Supabase.
- **Dry-Run / Mock Tests**: Verify that missing API keys gracefully generate deterministic mock assets without crashing.
- **Gemini Character Reference Consistency Tests**: Test prompt synthesis and pose cataloging against mock and live Gemini endpoints.
- **Render Worker E2E**: Test Remotion compilation for 9:16 and 16:9 aspect ratios.

---
*Report complete. Self-contained handoff available in `handoff.md`.*
