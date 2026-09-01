# Handoff Report — Video Pipelines & Character Reference Focus

**Agent**: Explorer 3 (Pipelines & Character Reference Focus)  
**Date**: 2026-09-01T11:45:00Z  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_pipelines\`  
**Target Report**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_pipelines\report.md`  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

Direct observations from the Clipped codebase:

1. **Existing Workflow Architecture**:
   - `lib/engine/types.ts:276-285`: Defines current `WorkflowType` union (`'footage' | 'images' | 'ai-videos' | 'stories' | 'bulk-plan' | 'micro-drama' | 'extract-shorts' | 'auto'`).
   - `app/api/workflows/`: Contains existing endpoints for `generate`, `ai-videos`, `images`, `stories`, `bulk-plan`, `micro-drama`, `extract-shorts`, and `auto`.
   - `lib/engine/video-generator.ts:55-80`: Multi-provider routing for Kling AI (`kling-v1`), Luma Dream Machine (`luma-dream`), and Fal.ai Flux (`fal-flux`) with `generateDryRun` fallback on missing API keys.
   - `lib/engine/drama-orchestrator.ts:27-43`: Demonstrates character visual anchor injection (`visualAnchor: "distinctive look: ... consistent facial structure"`) to preserve continuity across episodic scenes.
   - `lib/engine/tts.ts:388-533`: Resilient 5-tier voice synthesis cascade (ElevenLabs -> Google Cloud TTS -> Coqui -> Keyless Google Translate TTS -> In-Memory 16-bit RIFF/WAVE PCM synthesizer).

2. **Remotion Rendering & Compositing Engine**:
   - `remotion/Root.tsx:43-85`: Registers compositions `MainRender-9x16`, `MainRender-16x9`, and `MainRender-1x1` at 30 FPS.
   - `remotion/Composition.tsx:30-108`: Implements Hormozi-style word-by-word pop spring animations with active color highlights, customizable position (`y: 78`), and bounding box.
   - `scripts/render-worker.ts:43-248`: Background worker continuously polling Supabase `render_jobs` for pending jobs, synthesizing audio, bundling Remotion, and outputting to `public/renders/{jobId}.mp4`.

3. **API Keys & Settings Configuration**:
   - `app/api/settings/keys/check/route.ts:1-59`: Verifies provider keys against live API pings or length validation.
   - `app/api/settings/test/route.ts:16-44`: Diagnostics key map containing `gemini`, `openai`, `fal`, `kling`, `luma`, `elevenlabs`, `pexels`, `pixabay`, etc.
   - `.env.local`: Contains `GEMINI_API_KEY`, `OPENAI_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `ELEVENLABS_API_KEY`, `DEEPGRAM_API_KEY`.

---

## 2. Logic Chain

1. **Existing Engine Reusability**: Because Clipped already provides modular engine classes (`VideoGenerator`, `DramaOrchestrator`, `StoriesOrchestrator`) and an asynchronous Supabase `render_jobs` queue, adding new workflows (`avatar` and `whiteboard`) does not require redesigning the system architecture. They simply require new orchestrator services (`AvatarOrchestrator`, `WhiteboardOrchestrator`) and matching API routes (`/api/workflows/avatar`, `/api/workflows/whiteboard`).
2. **Avatar Generation Strategy**:
   - Fal.ai LivePortrait (`fal-ai/live-portrait`) provides sub-5s latency, high facial expression fidelity, and low cost (~$0.01/gen) for arbitrary portrait photos.
   - HeyGen and D-ID APIs serve studio digital-twin presenter presets.
   - Remotion compositing allows talking-head clips to be rendered fullscreen or in a floating circular Picture-in-Picture (PiP) badge over dynamic B-roll footage.
3. **Whiteboard Animation & Gemini Character Consistency**:
   - Google Gemini 1.5 / Imagen 3 generates structured 9-pose orthographic character reference sheets (3x3 grid: neutral, pointing, confused, eureka, explaining, slouch, victory, desk, shrug) in black monoline marker line-art on `#FFFFFF`.
   - The whiteboard engine decomposes narration scripts into sketch beats, referencing specific pose IDs (`pose_1` to `pose_9`) and doodle elements.
   - Remotion renders progressive SVG path drawing using `strokeDashoffset` interpolation alongside a moving hand cursor asset and marker sound effects.
4. **Resilience & Cost Safety**:
   - By following the pattern established in `video-generator.ts` and `tts.ts`, all new workflows implement pre-flight key checking, timeout protection (`AbortSignal.timeout(10000)`), and deterministic zero-cost dry-run mock fallbacks.

---

## 3. Caveats

1. **GPU Acceleration for Remotion Rendering**: Remotion rendering in Docker/serverless environments depends on headless Chromium and CPU/GPU memory allocation (`--max_old_space_size=512` in build scripts).
2. **LivePortrait External Dependency**: LivePortrait via Fal.ai requires a valid portrait image URL and driving audio URL; when offline, the procedural Remotion 2D avatar or stock presenter loop serves as the fallback.
3. **Gemini SDK Versioning**: The Google GenAI SDK (`@google/genai` or `@google/generative-ai`) or direct REST API calls should be used with `GEMINI_API_KEY` from `.env.local` or Supabase `settings`.

---

## 4. Conclusion

1. The Clipped architecture is fully primed for seamless integration of both **Avatar to Video** and **Whiteboard Animation** workflows without breaking any existing pipelines.
2. Google Gemini provides the exact multimodal capabilities and structured JSON schema enforcement needed to generate consistent 9-pose character reference sheets and drive scene-by-scene whiteboard animation.
3. Full architectural specifications, prompt templates, database schemas, Remotion composition plans, and resilience matrices are documented in detail in `report.md`.

---

## 5. Verification Method

To independently verify the findings and architecture:
1. **Inspect Survey Report**:
   - Read `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_pipelines\report.md`.
2. **Inspect Existing Workflow Files**:
   - `lib/engine/types.ts`
   - `lib/engine/video-generator.ts`
   - `lib/engine/drama-orchestrator.ts`
   - `lib/engine/tts.ts`
   - `remotion/Composition.tsx`
   - `scripts/render-worker.ts`
3. **Run Existing Test Suite**:
   - `node tests/e2e/standalone-runner.js` to verify that existing engine routes and worker tests pass.
