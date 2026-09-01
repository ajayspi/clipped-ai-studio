# Technical Specification: Backend Architecture for Automatic Mission Mode (Milestone 2)

**Author**: Explorer M2-1 (Backend Architecture Investigator)  
**Target Milestone**: Milestone 2 — Automatic Mission Mode & Progress View  
**Target Files**: `lib/engine/mission-orchestrator.ts`, `app/api/workflows/mission/route.ts`, and `lib/engine/types.ts`

---

## 1. Observation

Direct observations from inspection of the existing Clipped AI Studio codebase:

1. **Type Definitions (`lib/engine/types.ts:475-512`)**:
   - `MissionStage` is declared as `'prompt_analysis' | 'script_generation' | 'scene_planning' | 'asset_sourcing' | 'voice_synthesis' | 'video_composition' | 'ready'`.
   - `MissionStepStatus` specifies `{ stage, label, status: 'pending' | 'in_progress' | 'completed' | 'failed', progress, startedAt, completedAt, log }`.
   - `MissionJobState` defines `{ jobId, prompt, aspectRatio, style, voice, currentStage, overallProgress, steps, script, scenes, audioUrl, videoUrl, error }`.
   - `Scene` (`lines 12-24`) defines `{ id, text, keywords, description, duration, emotion, cameraMotion, visualPrompt, selectedVideo, imageUrl, videoUrl }`.
   - `RenderJobRecord` (`lines 294-304`) represents the database row for `render_jobs`.

2. **AI & LLM Provider Layer (`lib/ai/llm.ts:48-113`)**:
   - `complete(request, provider, model)` looks for `process.env.OPENAI_API_KEY` or Supabase `settings` (`provider = 'api_openai'`).
   - If missing, it falls back to the keyless Pollinations.ai Text API (`https://text.pollinations.ai/?json=true`).
   - `parseJson<T>(raw)` cleans markdown code fences, slices between `{` and `}`, sanitizes unescaped newlines, and provides regex fallbacks.
   - For Gemini, `app/api/settings/keys/route.ts:5` supports `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_AI_KEY` and DB `provider = 'api_gemini'`.

3. **Voice & Audio Synthesis Engine (`lib/engine/tts.ts:362-822`)**:
   - `ttsEngine.synthesize(request)` executes a 4-tier provider cascade: ElevenLabs (`eleven_multilingual_v2`) -> Google Cloud TTS (`Journey`/`Neural2`) -> Coqui -> Free Keyless Google Translate TTS (`translate.google.com/translate_tts`) -> Deterministic synthetic RIFF/WAVE PCM buffer generator (`generateSyntheticWavBuffer`).
   - Returns `{ success: true, jobId, audioBuffer, audioUrl, mimeType, duration, voiceUsed, ... }`.

4. **Visual Asset Sourcing & Generative Video (`lib/engine/` & `app/api/v1/source/route.ts`)**:
   - `videoSourcer.searchForKeywords(keywords, platforms)` searches Pexels (`PEXELS_API_KEY`) and Pixabay (`PIXABAY_API_KEY`).
   - `imageGenerator.generateForScenes(scenes, options)` runs Fal.ai Flux Schnell/Dev with fallback to Pollinations.ai Flux.
   - `videoGenerator.generateAIVideo(request)` calls Kling (`KLING_API_KEY`), Luma (`LUMA_API_KEY`), or Fal, with fallback to royalty-free video clips in `DRY_RUN_SAMPLE_VIDEOS`.

5. **Database & Schema Contract (`schema.sql:30-41` & `lib/db.ts:1-7`)**:
   - `render_jobs` table columns: `id` (UUID PK), `video_id` (UUID FK nullable), `status` (TEXT), `progress` (INTEGER), `error_message` (TEXT), `logs` (TEXT), `started_at` (TIMESTAMP), `completed_at` (TIMESTAMP), `created_at` (TIMESTAMP).
   - In environments where Supabase is unreachable or in mock mode, operations throw or return errors if not wrapped with in-memory store fallbacks.

6. **Remotion Composition Schema (`remotion/Composition.tsx:1-28`)**:
   - `MainCompositionProps` expects `{ beats: BeatProp[], burnSubtitles: boolean, subtitleStyle: {...}, bgmUrl?: string, watermarkUrl?: string }`.
   - `BeatProp` has `{ id: string, text: string, duration: number, clipUrl?: string, audioUrl?: string }`.

7. **Zustand Wizard Store (`components/wizard/wizard-store.ts:37-176`)**:
   - `useWizardStore` accepts `{ workflowType, subject, narration, aspectRatio, voice, beats, step, furthestStep, burnSubtitles, subtitleColor, subtitleSize, subtitleY, ... }`.
   - Allows hydrating mission output directly into the interactive creation wizard for manual adjustments.

---

## 2. Logic Chain

From the observations above, the end-to-end Automatic Mission Mode requires a resilient, self-contained server-side orchestrator (`lib/engine/mission-orchestrator.ts`) paired with Next.js App Router API route handlers (`app/api/workflows/mission/route.ts`):

```
User Prompt ("Ancient Roman Engineering")
       │
       ▼
POST /api/workflows/mission
       │
       ├──► 1. Generate UUID Job ID
       ├──► 2. Initialize in Supabase render_jobs + In-Memory Store Map
       ├──► 3. Return 200 OK immediately { jobId, status: 'processing', progressUrl }
       │
       ▼ (Background Async Task: missionOrchestrator.executeMission)
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 5-Stage Execution Pipeline                                             │
 │                                                                        │
 │ [Stage 1: Script Generation (0% -> 20%)]                               │
 │ Gemini / OpenAI / Pollinations / Rule-based 4-act script generator     │
 │                                                                        │
 │ [Stage 2: Scene Analysis (20% -> 40%)]                                 │
 │ Partition script into 3-6 beats with visual prompts & keywords         │
 │                                                                        │
 │ [Stage 3: Asset Sourcing & Generation (40% -> 60%)]                    │
 │ Match Pexels HD / Pixabay / Fal Flux / Pollinations / Royalty-Free CDN │
 │                                                                        │
 │ [Stage 4: Neural Voice Synthesis (60% -> 80%)]                         │
 │ ElevenLabs / Google TTS / Keyless TTS / Deterministic PCM WAV Buffer   │
 │ Sync scene durations to spoken audio waveform                          │
 │                                                                        │
 │ [Stage 5: Remotion Storyboard Composition (80% -> 100%)]               │
 │ Assemble Remotion MainCompositionProps beats, subtitles, BGM & URLs   │
 └────────────────────────────────────────────────────────────────────────┘
       │
       ▼
Update Job State (Supabase render_jobs + In-Memory Map)
Status: 'completed', Progress: 100
       │
       ▼
GET /api/workflows/mission?id=[jobId]  <── Polled every 1s by /create/mission/[id]
Returns full 5-stage progress, streaming logs, and Remotion composition
       │
       ▼
"Manual / Edit in Wizard" button hydrates useWizardStore and redirects to /create/footage
```

### Detailed Pipeline Stage Design

#### Stage 1: Script Generation (`script_generation`)
- **Stage ID**: `script_generation` (Label: `"Script Generation"`, Weight: 0% → 20%)
- **Inputs**: `prompt: string`, `style?: string`, `targetDuration?: number` (default 30-45s), `aspectRatio?: AspectRatio`.
- **Multi-Tier Cascade**:
  1. *Tier 1 (Gemini)*: Call Google Gemini REST/SDK using `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
  2. *Tier 2 (OpenAI)*: Call OpenAI `gpt-4o-mini` with `OPENAI_API_KEY` using `SYSTEM_PROMPTS.SCRIPT_GENERATOR`.
  3. *Tier 3 (Keyless LLM)*: Fetch from `https://text.pollinations.ai/`.
  4. *Tier 4 (Algorithmic Fallback)*: Deterministic 4-sentence structured narrative based on the subject prompt.
- **Output**: `{ title: string, script: string, keywords: string[], summary: string }`.

#### Stage 2: Scene Analysis & Beat Breakdown (`scene_planning`)
- **Stage ID**: `scene_planning` (Label: `"Scene Analysis"`, Weight: 20% → 40%)
- **Inputs**: `script: string`, `style: string`, `aspectRatio: AspectRatio`.
- **Multi-Tier Cascade**:
  1. *Tier 1 (LLM Breakdown)*: Parse script into 3 to 6 consecutive scenes with `text`, `description`, `visualPrompt`, `cameraMotion`, `keywords`, and `duration`.
  2. *Tier 2 (Rule-Based Chunking)*: Split sentences on punctuation (`.`, `!`, `?`), assign ~4-5s per sentence, generate visual keywords from noun phrases.
- **Output**: `scenes: Scene[]`.

#### Stage 3: Visual Asset Sourcing & Generation (`asset_sourcing`)
- **Stage ID**: `asset_sourcing` (Label: `"Asset Sourcing"`, Weight: 40% → 60%)
- **Inputs**: `scenes: Scene[]`, `aspectRatio: AspectRatio`.
- **Multi-Tier Cascade (Per Scene)**:
  1. *Tier 1 (Pexels / Pixabay HD)*: Search stock footage via `videoSourcer.searchForKeywords()`.
  2. *Tier 2 (Fal Flux AI Images)*: Generate images via `imageGenerator.generateForScenes()`.
  3. *Tier 3 (Keyless Pollinations Flux)*: Generate keyless image URL `https://image.pollinations.ai/prompt/...`.
  4. *Tier 4 (Royalty-Free CDN)*: Select from `DRY_RUN_SAMPLE_VIDEOS` (portrait/landscape/square).
- **Output**: Populated `scene.selectedVideo`, `scene.imageUrl`, and `scene.videoUrl`.

#### Stage 4: Voice Synthesis & Audio Synchronization (`voice_synthesis`)
- **Stage ID**: `voice_synthesis` (Label: `"Voice Synthesis"`, Weight: 60% → 80%)
- **Inputs**: `scenes: Scene[]`, `voice?: string` (default `'onyx'`), `language?: string` (default `'en-US'`).
- **Multi-Tier Cascade**:
  1. Call `ttsEngine.synthesize({ text: scene.text, voice, language, speed: 1.0 })`.
  2. ElevenLabs -> Google Cloud TTS -> Keyless Google Translate TTS -> In-Memory Synthetic RIFF/WAVE PCM buffer.
  3. Set `scene.audioUrl = ttsRes.audioUrl` and synchronize duration: `scene.duration = Math.max(3.0, Math.round(ttsRes.duration * 10) / 10)`.
- **Output**: Audio URLs and updated `duration` per scene.

#### Stage 5: Remotion Storyboard Composition (`video_composition`)
- **Stage ID**: `video_composition` (Label: `"Storyboard Composition"`, Weight: 80% → 100%)
- **Inputs**: `scenes: Scene[]`, `aspectRatio: AspectRatio`, `burnSubtitles: boolean` (default `true`).
- **Execution**:
  - Assemble `remotionProps: MainCompositionProps`:
    ```typescript
    const beats: BeatProp[] = scenes.map((scene, idx) => ({
      id: scene.id || `beat-${idx}`,
      text: scene.text,
      duration: scene.duration,
      clipUrl: scene.selectedVideo?.url || scene.videoUrl || scene.imageUrl || '',
      audioUrl: scene.audioUrl || '',
    }));
    ```
  - Attach subtitle styling (`y: 78`, `color: '#ffffff'`, `size: 5.2`, `outlineWidth: 2.5`, `outlineColor: '#000000'`, `isBox: false`, `uppercase: false`, `maxWidth: 82`).
  - Calculate total duration: `totalDuration = beats.reduce((sum, b) => sum + b.duration, 0)`.
  - Set `videoUrl` to the first scene video or sample video URL.
  - Finalize job state: `status = 'completed'`, `overallProgress = 100`.

---

## 3. Detailed Component Specifications

### 3.1 `lib/engine/mission-orchestrator.ts`

```typescript
/**
 * MissionOrchestrator: Autonomous Server-Side Video Generation Pipeline
 * Chaining: Prompt -> Script -> Scene Breakdown -> Asset Sourcing -> TTS Audio -> Remotion Storyboard.
 */

import {
  MissionJobState,
  MissionStage,
  MissionStepStatus,
  Scene,
  AspectRatio,
  Video,
} from './types';
import { supabase } from '@/lib/db';
import { ttsEngine } from './tts';
import { videoSourcer } from './video-sourcer';
import { imageGenerator } from './image-generator';
import { videoGenerator } from './video-generator';
import { parseJson } from '@/lib/ai/llm';

export interface MissionOptions {
  prompt: string;
  aspectRatio?: AspectRatio | string;
  style?: string;
  voice?: string;
  mock?: boolean;
}

export class MissionOrchestrator {
  // In-memory fallback and fast-read cache (survives Supabase downtime)
  private memoryStore: Map<string, MissionJobState> = new Map();

  /**
   * Initializes a pending mission job record
   */
  async createJob(jobId: string, options: MissionOptions): Promise<MissionJobState> {
    const aspectRatio: AspectRatio = (options.aspectRatio as AspectRatio) || '9:16';
    const style = options.style || 'cinematic';
    const voice = options.voice || 'onyx';

    const initialSteps: MissionStepStatus[] = [
      { stage: 'script_generation', label: 'Script Generation', status: 'pending', progress: 0 },
      { stage: 'scene_planning', label: 'Scene Analysis', status: 'pending', progress: 0 },
      { stage: 'asset_sourcing', label: 'Asset Generation', status: 'pending', progress: 0 },
      { stage: 'voice_synthesis', label: 'Voice Synthesis', status: 'pending', progress: 0 },
      { stage: 'video_composition', label: 'Storyboard Composition', status: 'pending', progress: 0 },
    ];

    const state: MissionJobState = {
      jobId,
      prompt: options.prompt,
      aspectRatio,
      style,
      voice,
      currentStage: 'script_generation',
      overallProgress: 0,
      steps: initialSteps,
    };

    // Store in memory
    this.memoryStore.set(jobId, state);

    // Persist to Supabase
    try {
      await supabase.from('render_jobs').insert({
        id: jobId,
        status: 'pending',
        progress: 0,
        logs: JSON.stringify(state),
        started_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`[MissionOrchestrator] Supabase insert notice (using in-memory cache):`, err);
    }

    return state;
  }

  /**
   * Retrieves current job state (Memory store first, Supabase fallback)
   */
  async getJob(jobId: string): Promise<MissionJobState | null> {
    if (this.memoryStore.has(jobId)) {
      return this.memoryStore.get(jobId)!;
    }

    try {
      const { data, error } = await supabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!error && data) {
        let parsedLogs: any = {};
        try {
          parsedLogs = typeof data.logs === 'string' ? JSON.parse(data.logs) : data.logs;
        } catch {}

        const state: MissionJobState = {
          jobId: data.id,
          prompt: parsedLogs.prompt || 'Generated Video',
          aspectRatio: parsedLogs.aspectRatio || '9:16',
          style: parsedLogs.style || 'cinematic',
          voice: parsedLogs.voice || 'onyx',
          currentStage: parsedLogs.currentStage || 'ready',
          overallProgress: data.progress || (data.status === 'completed' ? 100 : 0),
          steps: parsedLogs.steps || [],
          script: parsedLogs.script,
          scenes: parsedLogs.scenes,
          audioUrl: parsedLogs.audioUrl,
          videoUrl: parsedLogs.videoUrl,
          error: data.error_message || undefined,
        };

        this.memoryStore.set(jobId, state);
        return state;
      }
    } catch (dbErr) {
      console.warn(`[MissionOrchestrator] Supabase fetch error for job ${jobId}:`, dbErr);
    }

    return null;
  }

  /**
   * Executes the full 5-stage automated pipeline
   */
  async executeMission(jobId: string, options: MissionOptions): Promise<MissionJobState> {
    let state = await this.getJob(jobId);
    if (!state) {
      state = await this.createJob(jobId, options);
    }

    try {
      // ----------------------------------------------------
      // STAGE 1: Script Generation (0% -> 20%)
      // ----------------------------------------------------
      await this.updateStep(jobId, 'script_generation', 'in_progress', 5, 'Synthesizing script from topic...');
      const scriptResult = await this.generateScript(options.prompt, state.style);
      state.script = scriptResult.script;
      await this.updateStep(jobId, 'script_generation', 'completed', 20, `Script generated: ${scriptResult.words} words, topic: "${scriptResult.title}"`);

      // ----------------------------------------------------
      // STAGE 2: Scene Analysis & Beat Breakdown (20% -> 40%)
      // ----------------------------------------------------
      await this.updateStep(jobId, 'scene_planning', 'in_progress', 25, 'Breaking script into visual scene beats...');
      const scenes = await this.breakdownScenes(state.script, state.style, state.aspectRatio);
      state.scenes = scenes;
      await this.updateStep(jobId, 'scene_planning', 'completed', 40, `Partitioned into ${scenes.length} visual scene beats`);

      // ----------------------------------------------------
      // STAGE 3: Asset Generation & Sourcing (40% -> 60%)
      // ----------------------------------------------------
      await this.updateStep(jobId, 'asset_sourcing', 'in_progress', 45, `Sourcing visual assets for ${scenes.length} scenes...`);
      const enrichedScenes = await this.sourceAssetsForScenes(scenes, state.aspectRatio, state.style, options.mock);
      state.scenes = enrichedScenes;
      await this.updateStep(jobId, 'asset_sourcing', 'completed', 60, `Matched visual media for all ${enrichedScenes.length} scenes`);

      // ----------------------------------------------------
      // STAGE 4: Voice Synthesis & Audio (60% -> 80%)
      // ----------------------------------------------------
      await this.updateStep(jobId, 'voice_synthesis', 'in_progress', 65, `Synthesizing neural narration (${state.voice})...`);
      const audioScenes = await this.synthesizeAudioForScenes(enrichedScenes, state.voice, options.mock);
      state.scenes = audioScenes;
      state.audioUrl = audioScenes[0]?.audioUrl;
      const totalDuration = audioScenes.reduce((sum, s) => sum + s.duration, 0);
      await this.updateStep(jobId, 'voice_synthesis', 'completed', 80, `Voice synthesis complete (${totalDuration.toFixed(1)}s narration)`);

      // ----------------------------------------------------
      // STAGE 5: Storyboard Composition (80% -> 100%)
      // ----------------------------------------------------
      await this.updateStep(jobId, 'video_composition', 'in_progress', 85, 'Composing Remotion storyboard beats and subtitle track...');
      const remotionPackage = this.composeRemotionStoryboard(audioScenes, state.aspectRatio);
      state.videoUrl = remotionPackage.videoUrl;
      state.currentStage = 'ready';
      state.overallProgress = 100;
      await this.updateStep(jobId, 'video_composition', 'completed', 100, 'Remotion storyboard assembled and ready for playback');

      // Finalize DB state
      await this.finalizeJobSuccess(jobId, state, remotionPackage);
      return state;

    } catch (error: any) {
      console.error(`[MissionOrchestrator] Mission ${jobId} failed:`, error);
      state.error = error?.message || 'Unknown error during mission orchestration';
      state.currentStage = 'ready';
      this.memoryStore.set(jobId, state);

      try {
        await supabase.from('render_jobs').update({
          status: 'failed',
          error_message: state.error,
          completed_at: new Date().toISOString(),
          logs: JSON.stringify(state),
        }).eq('id', jobId);
      } catch (dbErr) {
        console.warn(`[MissionOrchestrator] Failed to update error in DB:`, dbErr);
      }

      return state;
    }
  }

  // Internal helper methods for stage execution, step updating, and fallbacks...
}

export const missionOrchestrator = new MissionOrchestrator();
```

---

### 3.2 `app/api/workflows/mission/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { missionOrchestrator } from '@/lib/engine/mission-orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, aspectRatio = '9:16', style = 'cinematic', voice = 'onyx', mock = false } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const cleanPrompt = prompt.trim();
    const jobId = crypto.randomUUID();

    // 1. Initialize Job State
    await missionOrchestrator.createJob(jobId, {
      prompt: cleanPrompt,
      aspectRatio,
      style,
      voice,
      mock: Boolean(mock),
    });

    // 2. Fire Background Orchestration Task
    setTimeout(async () => {
      try {
        await missionOrchestrator.executeMission(jobId, {
          prompt: cleanPrompt,
          aspectRatio,
          style,
          voice,
          mock: Boolean(mock),
        });
      } catch (err) {
        console.error(`[API /api/workflows/mission] Background mission error for ${jobId}:`, err);
      }
    }, 0);

    // 3. Return immediate response
    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      progressUrl: `/create/mission/${jobId}`,
      message: 'Automatic mission initiated successfully',
    });

  } catch (error: any) {
    console.error('[API /api/workflows/mission POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate mission' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('jobId');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Mission jobId is required' },
        { status: 400 }
      );
    }

    const job = await missionOrchestrator.getJob(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Mission job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: job.error ? 'failed' : job.overallProgress === 100 ? 'completed' : 'processing',
      overallProgress: job.overallProgress,
      currentStage: job.currentStage,
      steps: job.steps,
      error: job.error,
      data: {
        prompt: job.prompt,
        aspectRatio: job.aspectRatio,
        style: job.style,
        voice: job.voice,
        script: job.script,
        scenes: job.scenes,
        audioUrl: job.audioUrl,
        videoUrl: job.videoUrl,
      },
    });

  } catch (error: any) {
    console.error('[API /api/workflows/mission GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch mission status' },
      { status: 500 }
    );
  }
}
```

---

## 4. Caveats

1. **Next.js Serverless Execution Timeout**:
   - In standard serverless functions (e.g. Vercel), un-awaited background `setTimeout(..., 0)` operations can be terminated once the response finishes. For local Node.js and Docker environments, `setTimeout` runs reliably. For enterprise serverless, long-running pipelines should ideally be backed by background queues (Inngest / BullMQ).
2. **In-Memory Cache Single-Process Scope**:
   - The in-memory fallback store operates per Node process. In multi-instance load-balanced environments, Supabase PostgreSQL acts as the shared single source of truth.
3. **TTS Duration Synchronization**:
   - Spoken audio duration differs between synthetic waveform simulation (~2.5 words/sec) and live ElevenLabs audio. The pipeline dynamically sets `scene.duration` to the returned audio file's actual length, preventing subtitle/audio desynchronization.

---

## 5. Conclusion

The technical specification provides a complete, robust, and cost-safe architecture for Automatic Mission Mode (Milestone 2):
1. **5-Stage Pipeline**: Modular execution with clear progress intervals and detailed step logging.
2. **Multi-Tier Fallbacks**: Every stage seamlessly degrades to deterministic mock/keyless providers without throwing unhandled exceptions.
3. **Dual-Layer Persistence**: Supabase `render_jobs` table backed by a thread-safe in-memory cache for 100% reliability in offline or test environments.
4. **Clean API Layer**: `POST` initiation and `GET` polling routes adhering to the project interface contracts.
5. **State Hydration Ready**: Emits data structures matching Remotion `MainCompositionProps` and Zustand `useWizardStore`.

---

## 6. Verification Method

To independently verify the implementation once built:

1. **Standalone Test Suite Runner**:
   - Run `node tests/e2e/test-mission-mode.js` (or `node tests/e2e/standalone-runner.js`).
   - Must execute Tier 1, Tier 2, Tier 3, Tier 4 test cases with exit code 0.
2. **API Endpoint Contract Tests**:
   - Send `POST /api/workflows/mission` with `{ prompt: "The Colosseum of Rome" }`.
   - Verify HTTP 200 with `{ success: true, jobId, progressUrl }`.
   - Poll `GET /api/workflows/mission?id=[jobId]` until `overallProgress === 100` and `status === 'completed'`.
3. **Offline / Missing Keys Resilience Test**:
   - Clear all environment variables (`OPENAI_API_KEY=""`, `GEMINI_API_KEY=""`, `ELEVENLABS_API_KEY=""`, `PEXELS_API_KEY=""`).
   - Run the mission flow and verify that all 5 stages complete with status `'completed'` using deterministic fallbacks.
4. **Remotion Composition Schema Test**:
   - Verify `remotionProps.beats` contains valid `clipUrl`, `audioUrl`, `duration > 0`, and `burnSubtitles: true`.
