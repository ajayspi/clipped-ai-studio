# QA & Testing Explorer (Gen 3) — Milestone 2 Handoff Report

**Milestone**: Milestone 2 — Automatic Mission Mode & Progress View  
**Workspace**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m2_qa_gen3`  
**Date & Time**: 2026-09-01T13:58:00Z  

---

## 1. Observation

### 1.1 Architecture & Codebase Review

Through systematic inspection of the codebase, the following files and structural mechanisms implementing Milestone 2 were observed:

1. **Mission Orchestration Engine (`lib/engine/mission-orchestrator.ts`)**:
   - `MissionOrchestrator` class maintains an in-memory map `memoryStore: Map<string, MissionJobState>` and persists asynchronously to the Supabase `render_jobs` table (`lib/engine/mission-orchestrator.ts:85, 122, 220, 367`).
   - `createJob(jobId, options)` initializes the 5-stage pipeline with all steps in `'pending'` state and `overallProgress: 0` (`lib/engine/mission-orchestrator.ts:98-115`).
   - `executeMission(jobId, options)` sequentially executes the 5 stages:
     - Stage 1: `script_generation` (0% -> 20%) via `generateScript()` (`lines 243-263`).
     - Stage 2: `scene_planning` (20% -> 40%) via `breakdownScenes()` (`lines 267-287`).
     - Stage 3: `asset_sourcing` (40% -> 60%) via `sourceAssetsForScenes()` (`lines 291-311`).
     - Stage 4: `voice_synthesis` (60% -> 80%) via `synthesizeAudioForScenes()` (`lines 315-337`).
     - Stage 5: `video_composition` (80% -> 100%) via `composeRemotionStoryboard()` (`lines 341-363`).
   - Resilient Fallback mechanisms:
     - Script fallback generates a structured 4-sentence narrative with word count (`lines 444-453`).
     - Scene decomposition fallback splits text using lookbehind regex `/(?<=[.?!])\s+/` into 3–6 timed scene objects with camera motions (`zoom_in`, `pan_left`, `orbit`, `tilt_up`, `pan_right`, `static`) (`lines 511-550`).
     - Asset sourcing fallback uses `DRY_RUN_SAMPLE_VIDEOS` (Mixkit royalty-free clips) and Pollinations.ai Flux URL generation (`lines 562-613`).
     - Voice synthesis fallback calculates duration via `wordCount / 2.5` and assigns a synthetic WAV audio URL (`lines 653-658`).
     - Remotion composition bundle formats `fps: 30`, `durationInFrames`, `beats` array, and `burnSubtitles: true` (`lines 666-709`).

2. **Mission API Route Handlers (`app/api/workflows/mission/route.ts`)**:
   - `POST /api/workflows/mission` validates `prompt` (`line 9`), generates a `jobId` via `crypto.randomUUID()` (`line 17`), initializes job state via `missionOrchestrator.createJob()` (`line 20`), queues background execution via `setTimeout(..., 0)` (`lines 29-41`), and immediately returns HTTP 200 with `{ success: true, jobId, status: 'processing', progressUrl: '/create/mission/' + jobId, message: 'Automatic mission initiated successfully' }` (`lines 44-50`).
   - `GET /api/workflows/mission` extracts `id` or `jobId` from URL search params (`line 63`), validates presence (returns 400 if missing, `line 66`), queries `missionOrchestrator.getJob(id)` (returns 404 if not found, `line 74`), and returns full schema with `status`, `overallProgress`, `currentStage`, `steps`, `error`, and `data` (`lines 86-104`).

3. **Frontend One-Click Prompt Bar (`components/create/MissionPromptBar.tsx`)**:
   - Renders animated prompt bar with 5 preset suggestion chips (`lines 11-17`).
   - `handleSubmit()` trims prompt, POSTs to `/api/workflows/mission`, and navigates user to `/create/mission/[jobId]` upon receipt (`lines 24-55`).
   - Implements fallback navigation to `/create/mission/[fallbackJobId]?prompt=...&autoStart=true` if direct fetch fails (`lines 61-63`).

4. **Frontend Mission Progress Page (`app/(app)/create/mission/[id]/page.tsx`)**:
   - Dynamic route extracting `id` using React 19 `use(params)` (`line 18`).
   - Contains an auto-start bootstrap `useEffect` for query-param triggered missions (`lines 28-44`).
   - Polling interval runs `pollJobStatus()` every 1000ms until `overallProgress === 100` or `job.error` is present (`lines 107-120`).
   - Displays 2-column layout: Left column with `MissionStepper` and `MissionLogConsole`; Right column with `MissionLivePreview` and Narration summary card (`lines 183-211`).

5. **Manual State Handoff (`app/(app)/create/mission/[id]/components/MissionStateHandoff.ts` & `MissionHeader.tsx`)**:
   - "Manual / Edit in Wizard" button in `MissionHeader.tsx:91` triggers `transferMissionToWizard(job, router)`.
   - Maps `mission.scenes` into `Beat[]` with `candidates` array and `selectedId` (`MissionStateHandoff.ts:5-28`).
   - Hydrates Zustand `useWizardStore` with `workflowType: 'footage'`, `subject`, `narration`, `aspectRatio`, `voice`, `beats`, `step: 1`, `furthestStep: 4`, `autoMode: false` (`lines 31-43`).
   - Navigates directly to `/create/footage` (`line 46`).

6. **Dedicated E2E Test Suite (`tests/e2e/test-mission-mode.js`)**:
   - 871 lines of test harness containing 30 test cases across 6 suites plus a file integrity check suite.
   - Self-contained, zero-external-dependency runner with custom `describe`, `test`, `expect` assertion library.

---

## 2. Logic Chain & Verification Strategy

```
[Observation: POST /api/workflows/mission creates job and responds immediately]
   ↓
[Verify: Request validation rejects empty/whitespace prompts with 400, returns jobId + progressUrl on valid prompt]
   ↓
[Observation: executeMission runs 5 distinct stages asynchronously with progress updates]
   ↓
[Verify: Polling GET /api/workflows/mission?id=... returns progressive progress snapshots (0% -> 20% -> 40% -> 60% -> 80% -> 100%) and valid step logs]
   ↓
[Observation: Orchestrator implements multi-tier zero-key fallbacks (Mixkit clips, Pollinations AI, synthetic WAV)]
   ↓
[Verify: Missing API keys never crash the pipeline; job terminates with status 'completed' and valid Remotion manifest]
   ↓
[Observation: MissionStateHandoff maps scenes to wizard beats and unlocks furthestStep: 4]
   ↓
[Verify: useWizardStore accurately receives all metadata, narration, and footage candidates, setting step: 1 for instant editing]
```

### 2.1 Verification of POST `/api/workflows/mission`
To verify job creation and response contract:
1. **Payload Schema & Types**: POST with JSON body `{ prompt: string, aspectRatio?: string, style?: string, voice?: string, mock?: boolean }`.
2. **Success Assertions**:
   - HTTP status code is `200`.
   - `res.json.success === true`.
   - `typeof res.json.jobId === 'string'` (UUID format or `mission-<timestamp>-<hash>`).
   - `res.json.status === 'processing'`.
   - `res.json.progressUrl === '/create/mission/' + res.json.jobId`.
3. **Database Insertion Assertions**:
   - Immediate query to `render_jobs` table returns a record with `id === res.json.jobId`, `status === 'processing'`, `progress === 0`, and non-empty `logs`.
4. **Negative Input Assertions**:
   - Missing prompt (`{}` or `{ prompt: "" }`) returns HTTP 400 with `{ success: false, error: 'Prompt is required' }`.
   - Whitespace prompt (`{ prompt: "   \t\n " }`) returns HTTP 400.

### 2.2 Verification of GET `/api/workflows/mission?id=...` & 5-Stage Lifecycle
To verify progressive status polling:
1. **Query Parameter Validation**:
   - GET without `?id=` returns HTTP 400 (`Job ID is required`).
   - GET with non-existent `?id=uuid-not-found` returns HTTP 404 (`Mission job not found`).
2. **Schema Integrity**:
   - Response includes `jobId`, `status`, `overallProgress` (0–100), `currentStage`, `steps` (array of 5 items), and `data` (object).
3. **Stage-by-Stage Monotonic Progression**:
   - **Stage 1 (`script_generation`)**: Progress reaches ≥20%. `steps[0].status === 'completed'`. `data.script` is a non-empty string (>50 chars). Step log starts with `[Stage 1: Script]`.
   - **Stage 2 (`scene_planning`)**: Progress reaches ≥40%. `steps[1].status === 'completed'`. `data.scenes` is an array with 3 to 8 elements. Each scene has `id`, `text`, `keywords`, `duration`, `cameraMotion`, `emotion`, and `visualPrompt`. Step log starts with `[Stage 2: Scenes]`.
   - **Stage 3 (`asset_sourcing`)**: Progress reaches ≥60%. `steps[2].status === 'completed'`. Each scene in `data.scenes` contains `selectedVideo` object with valid `url` (starting with `http`), `thumbnail`, `platform`, `width`, `height`. Step log starts with `[Stage 3: Assets]`.
   - **Stage 4 (`voice_synthesis`)**: Progress reaches ≥80%. `steps[3].status === 'completed'`. `data.audioUrl` is a valid URL. Sum of scene durations matches audio narration length. Step log starts with `[Stage 4: Audio]`.
   - **Stage 5 (`video_composition`)**: Progress reaches 100%. `steps[4].status === 'completed'`. `status === 'completed'`. `currentStage === 'ready'`. `data.videoUrl` is defined. Remotion composition manifest includes `fps: 30`, `durationInFrames > 0`, and `burnSubtitles: true`.
4. **Step Timestamp Validation**:
   - For all completed steps, `new Date(step.startedAt).getTime() <= new Date(step.completedAt).getTime()`.

### 2.3 Verification of Zero-Key Resilience & Error Fallbacks
To verify execution when external AI keys (OpenAI, Fal, ElevenLabs, Pexels) are missing:
1. **Deterministic Script Fallback**: When LLM is unconfigured, script template produces coherent 4-sentence copy mentioning the prompt subject.
2. **Procedural Scene Segmenter**: Script is tokenized into distinct sentence beats with camera movement assignments.
3. **Curated Footage & Keyless Flux Fallbacks**: Sourcing returns Mixkit preview videos or Pollinations.ai image endpoints without network timeouts or crashes.
4. **Synthetic WAV Generator**: Generates valid 44-byte RIFF/WAVE PCM audio header and tone waveform.
5. **Downstream Failure Isolation**: If a stage fails (e.g. rate limit error), the pipeline catches the error, sets `status: 'failed'`, logs `error_message`, and preserves upstream outputs (e.g. Stage 1 script).

### 2.4 Verification of Frontend State Handoff to `useWizardStore`
To verify the "Manual / Edit in Wizard" state transfer:
1. **Store Hydration**:
   - Calling `transferMissionToWizard(mission, router)` updates Zustand store with:
     - `workflowType`: `'footage'`
     - `subject`: matches `mission.prompt`
     - `narration`: matches `mission.script`
     - `aspectRatio`: matches `mission.aspectRatio`
     - `voice`: matches `mission.voice`
     - `autoMode`: `false`
     - `step`: `1` (takes user directly to Scenes Step for fine-tuning)
     - `furthestStep`: `4` (unlocks all wizard tabs: Script, Scenes, Voice, Subtitles, Render)
2. **Scene to Beat Mapping**:
   - Each `scene` transforms into a `Beat` where:
     - `beat.id === scene.id`
     - `beat.text === scene.text`
     - `beat.duration === scene.duration`
     - `beat.keywords === scene.keywords`
     - `beat.selectedId === 'cand-' + index + '-0'`
     - `beat.candidates[0].url === scene.videoUrl`
     - `beat.candidates[0].score === 1.0`
3. **Route Navigation**:
   - `router.push('/create/footage')` is called immediately.

---

## 3. Comprehensive QA Test Matrix (Tiers 1–5)

The following concrete test cases are formulated across all testing tiers for the Challenger and Auditor:

### Tier 1: Core Feature Coverage (Happy Path)

| Test ID | Feature / Component | Test Description | Expected Result |
|---|---|---|---|
| `T1-MIS-01` | Prompt Submission | Submit standard prompt `"History of Roman Aqueducts"` with defaults | 200 OK, `jobId` starts with `mission-` or is UUID, `status: 'processing'`, `progressUrl: '/create/mission/' + jobId` |
| `T1-MIS-02` | Aspect Ratio Mapping | Submit missions with `'9:16'`, `'16:9'`, `'1:1'` | Job created with exact requested aspect ratio |
| `T1-MIS-03` | Visual Style Mapping | Submit missions with `'cinematic'`, `'educational'`, `'photorealistic'`, `'anime'` | Job created with exact requested style |
| `T1-MIS-04` | Voice Selection Mapping | Submit missions with `'alloy'`, `'nova'`, `'onyx'`, `'echo'`, `'fable'`, `'shimmer'` | Job created with exact requested voice |
| `T1-MIS-05` | Suggestion Chips | Click and submit all 5 preset chips from `SUGGESTIONS` | Each chip prompt creates a valid job matching suggestion text |
| `T1-MIS-06` | Stage 1 Execution | Execute Stage 1 (Script Generation) | Script generated (>50 chars, contains prompt subject), `overallProgress: 20`, log contains `[Stage 1: Script]` |
| `T1-MIS-07` | Stage 2 Execution | Execute Stage 2 (Scene Planning) | Script decomposed into 3–8 scenes with `id`, `text`, `keywords`, `duration`, `cameraMotion`, `overallProgress: 40` |
| `T1-MIS-08` | Stage 3 Execution | Execute Stage 3 (Asset Sourcing) | Video assets resolved for every scene with valid CDN URL, `overallProgress: 60`, log contains `[Stage 3: Assets]` |
| `T1-MIS-09` | Stage 4 Execution | Execute Stage 4 (Voice Synthesis) | TTS audio generated, `audioUrl` defined, scene duration matches audio, `overallProgress: 80` |
| `T1-MIS-10` | Stage 5 Execution | Execute Stage 5 (Remotion Composition) | Manifest assembled with `fps: 30`, `burnSubtitles: true`, `overallProgress: 100`, `status: 'completed'`, `currentStage: 'ready'` |
| `T1-MIS-11` | Status Polling GET | Poll `GET /api/workflows/mission?id=<jobId>` | 200 OK, returns complete `MissionJobState` schema matching active job |
| `T1-MIS-12` | Streaming Log Accumulation | Inspect log entries in all 5 completed steps | Each step contains non-empty `log` prefixed with `[Stage <N>: <Name>]` |
| `T1-MIS-13` | State Transfer to Wizard | Invoke `transferMissionToWizard` with completed job | `useWizardStore` hydrated with `workflowType: 'footage'`, `step: 1`, `furthestStep: 4`, and `beats` populated |
| `T1-MIS-14` | Zero-Key Execution | Execute entire mission with 0 live API keys | Pipeline completes 100% via mock/fallback cascade with zero exceptions |

### Tier 2: Boundary & Corner Cases

| Test ID | Boundary / Corner Case | Input / Condition | Expected Result |
|---|---|---|---|
| `T2-MIS-01` | Empty Prompt | `POST /api/workflows/mission` with `{ prompt: "" }` | 400 Bad Request, `{ success: false, error: 'Prompt is required' }` |
| `T2-MIS-02` | Whitespace-Only Prompt | `POST /api/workflows/mission` with `{ prompt: "   \t\n  " }` | 400 Bad Request |
| `T2-MIS-03` | Null Body | `POST /api/workflows/mission` with null/empty request body | 400 Bad Request with error message |
| `T2-MIS-04` | Polling Missing ID | `GET /api/workflows/mission` without query param | 400 Bad Request, `{ success: false, error: 'Job ID is required' }` |
| `T2-MIS-05` | Polling Non-Existent ID | `GET /api/workflows/mission?id=non-existent-uuid` | 404 Not Found, `{ success: false, error: 'Mission job not found' }` |
| `T2-MIS-06` | Invalid Aspect Ratio | `POST` with `aspectRatio: "21:9"` | Defaults gracefully to `'9:16'` without error |
| `T2-MIS-07` | Invalid Voice Identifier | `POST` with `voice: "unknown_robot_99"` | Defaults gracefully to `'alloy'` or standard fallback |
| `T2-MIS-08` | Extremely Long Prompt | `POST` with 2000-character prompt string | Truncates/processes safely without buffer overflow or API crash |
| `T2-MIS-09` | Special Characters in Prompt | `POST` with `"<script>alert(1)</script> & %20 @ # ! $ ^ * ( )"` | Escapes/sanitizes safely into string, executes script stage |
| `T2-MIS-10` | Non-English Unicode Prompt | `POST` with `"古代ローマの水道橋の歴史"` (Japanese) | Correctly passes unicode prompt to script generation stage |

### Tier 3: Pairwise & Cross-Feature Interactions

| Test ID | Features Interacting | Test Description | Expected Result |
|---|---|---|---|
| `T3-MIS-01` | PromptBar ↔ Mission API | Enter prompt in `MissionPromptBar` and trigger form submission | API creates job, returns 200, router pushes to `/create/mission/[jobId]` |
| `T3-MIS-02` | Progress Page ↔ Polling API | Mount `/create/mission/[id]` with active job ID | Page triggers polling every 1000ms, updates `MissionStepper` and progress bar smoothly |
| `T3-MIS-03` | Progress Page ↔ Live Preview | Polling reaches Stage 3/5 with `videoUrl` and scenes | `MissionLivePreview` displays video/thumbnail preview and storyboard beat timeline |
| `T3-MIS-04` | Mid-Mission State Transfer | Click "Manual / Edit in Wizard" during Stage 2 (partial completion) | Transfers Stage 1 script and Stage 2 scenes to `useWizardStore`, navigates to `/create/footage` |
| `T3-MIS-05` | Completed Mission State Transfer | Click "Manual / Edit in Wizard" after 100% completion | Transfers full script, 4+ beats with video clips, audio settings, and unlocks all 5 wizard steps |
| `T3-MIS-06` | Mission Mode ↔ DB Persistence | Run mission to completion then query Supabase `render_jobs` | `render_jobs` record status is `'completed'`, `progress: 100`, `completed_at` is set, `logs` has full JSON |

### Tier 4: Real-World Workload Scenarios

| Test ID | Scenario Name | Workflow Steps | Expected Result |
|---|---|---|---|
| `T4-MIS-01` | End-to-End One-Click Auto Mission | 1. User inputs `"The Mystery of the Bermuda Triangle"` in prompt bar.<br>2. Navigates to `/create/mission/[id]`.<br>3. Pipeline auto-chains Script -> Scenes -> Assets -> Audio -> Composition.<br>4. Reaches 100% completed. | Complete video ready in under 15s in test environment, video preview rendered, all 5 steps green. |
| `T4-MIS-02` | Rapid Auto-to-Manual Iteration | 1. User submits `"Quantum Computing Explained"`.<br>2. Mission reaches Stage 2.<br>3. User clicks "Manual / Edit in Wizard".<br>4. Wizard opens with pre-populated script and 4 scene beats.<br>5. User edits Beat 2 text and proceeds to Render step. | Zero data loss, seamless handoff, `useWizardStore` state matches mission snapshot. |
| `T4-MIS-03` | Multi-Format Aspect Ratio Campaign | 1. Dispatch 3 parallel missions for same prompt across `'9:16'`, `'16:9'`, `'1:1'`.<br>2. Poll all 3 to completion. | 3 distinct jobs created, correct dimensions (1080x1920, 1920x1080, 1080x1080), assets matched to orientation. |
| `T4-MIS-04` | Complete Offline / Zero-Key Execution | 1. Clear all environment API keys.<br>2. Submit mission `"Autonomous Mars Colony 2050"`.<br>3. Run pipeline to completion. | Fallbacks activate seamlessly across all 5 stages; job succeeds with status `'completed'` and 100% valid Remotion composition. |

### Tier 5: Adversarial, Concurrency & Challenger Hardening

| Test ID | Adversarial Vector | Attack / Stress Methodology | Expected Defensive Behavior |
|---|---|---|---|
| `T5-MIS-01` | High-Concurrency Job Creation | Fire 20 rapid concurrent `POST /api/workflows/mission` requests within 100ms | 20 unique `jobId`s generated, no ID collision, all 20 jobs initialized in memory/DB |
| `T5-MIS-02` | Polling Thunder / Stampede | 50 concurrent client polling requests for same active `jobId` within 50ms | Zero deadlocks, zero uncaught exceptions, all 50 return valid HTTP 200 with current state |
| `T5-MIS-03` | Downstream Stage Failure Isolation | Force an exception in Stage 2 (e.g. simulated rate limit) | Job status marks `'failed'`, `error_message` is logged, Stage 1 script is preserved in `data.script`, GET returns 200 with `status: 'failed'` |
| `T5-MIS-04` | Polling Race Condition on Unstarted Job | Client polls `/api/workflows/mission?id=...` before background orchestrator has started | Initial placeholder state rendered (`Script Generation (in_progress 25%)`), no UI crash or blank screen |
| `T5-MIS-05` | Double-Submission Form Debounce | Fast double-click on "Auto Generate" button in `MissionPromptBar` | `isSubmitting` state disables button and prevents duplicate API dispatch |
| `T5-MIS-06` | Malformed JSON Body Injection | POST raw string or broken JSON to `/api/workflows/mission` | Handled via `req.json().catch(() => ({}))`, returns 400 Bad Request instead of 500 unhandled crash |
| `T5-MIS-07` | Synthetic Audio PCM Header Integrity | Generate synthetic WAV buffer in zero-key mode | Valid RIFF header (`bytes 0-3: 'RIFF'`, `bytes 8-11: 'WAVE'`, `bytes 12-15: 'fmt '`, 16-bit PCM mono 24kHz) |
| `T5-MIS-08` | Memory Leak Prevention | Dispatch and complete 100 successive mission jobs | Memory store retains job records without unbounded memory growth or process crash |

---

## 4. Caveats & Assumptions

1. **Test Environment Execution**:
   - In offline / mock test environments without external network keys (`OPENAI_API_KEY`, `PEXELS_API_KEY`, `ELEVENLABS_API_KEY`), the orchestrator is architected to utilize internal deterministic generators and CDN sample pools (`DRY_RUN_SAMPLE_VIDEOS`).
   - The test suite `tests/e2e/test-mission-mode.js` is designed to be fully self-contained and runnable via `node tests/e2e/test-mission-mode.js` with zero external network dependencies.
2. **Supabase Connectivity**:
   - `lib/engine/mission-orchestrator.ts` wraps all Supabase database calls in `try...catch` blocks to ensure seamless execution in memory when a live Supabase instance is unavailable.
3. **No Code Modifications**:
   - Per explorer rules, no source code was modified during this investigation.

---

## 5. Conclusion & Recommendations

1. **Architecture & Contract Compliance**:
   - Milestone 2 (Automatic Mission Mode) is fully specified and implemented across all layers: API route (`app/api/workflows/mission/route.ts`), Background Orchestrator (`lib/engine/mission-orchestrator.ts`), Frontend Prompt Bar (`components/create/MissionPromptBar.tsx`), Mission Progress View (`app/(app)/create/mission/[id]/page.tsx`), and State Handoff (`MissionStateHandoff.ts`).
2. **Test Readiness**:
   - `tests/e2e/test-mission-mode.js` provides comprehensive test coverage (30 test cases) verifying POST dispatch, GET polling, 5-stage pipeline chaining, zero-key fallbacks, state transfer to `useWizardStore`, concurrency, and file artifact integrity.
3. **Recommendations for Challenger & Auditor**:
   - Ensure the Challenger executes `T5-MIS-01` to `T5-MIS-08` to stress-test concurrency, polling race conditions, and zero-key synthetic audio buffer integrity.
   - Ensure the Auditor verifies that `furthestStep` is set to `4` during `transferMissionToWizard` so that users can seamlessly navigate between Script, Scenes, Voice, Subtitles, and Render steps in the footage wizard.

---

## 6. Verification Method

### 6.1 Independent Verification Commands

To independently verify Milestone 2 test execution:

```powershell
# 1. Run the dedicated Milestone 2 Mission Mode E2E Test Suite (Node.js native runner)
node tests/e2e/test-mission-mode.js

# 2. Run the full project standalone test runner
node tests/e2e/standalone-runner.js

# 3. Check TypeScript compilation for all Milestone 2 components
npx tsc --noEmit
```

### 6.2 Files to Inspect
- `tests/e2e/test-mission-mode.js`
- `lib/engine/mission-orchestrator.ts`
- `app/api/workflows/mission/route.ts`
- `components/create/MissionPromptBar.tsx`
- `app/(app)/create/mission/[id]/page.tsx`
- `app/(app)/create/mission/[id]/components/MissionHeader.tsx`
- `app/(app)/create/mission/[id]/components/MissionStepper.tsx`
- `app/(app)/create/mission/[id]/components/MissionLogConsole.tsx`
- `app/(app)/create/mission/[id]/components/MissionLivePreview.tsx`
- `app/(app)/create/mission/[id]/components/MissionStateHandoff.ts`
- `components/wizard/wizard-store.ts`

### 6.3 Invalidation Conditions
- Any test in `test-mission-mode.js` failing with exit code != 0.
- `POST /api/workflows/mission` returning 200 on empty prompt or missing `progressUrl`.
- `GET /api/workflows/mission` returning 200 without `steps` array or omitting `script` upon stage 1 completion.
- `transferMissionToWizard` failing to populate `useWizardStore.beats` with video URLs or leaving `step` unset.
