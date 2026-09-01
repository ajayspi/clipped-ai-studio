# Milestone 3 QA & Testing Handoff Report: Whiteboard & Avatar Pipelines

**Author**: Milestone 3 QA & Testing Explorer (Gen 3)  
**Date**: 2026-09-01  
**Project**: Clipped AI Studio  
**Target Path**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m3_qa_gen3\handoff.md`  

---

## 1. Observation

### 1.1 Requirements & Context Inspection
- **Authoritative User Request (`ORIGINAL_REQUEST.md` lines 57-69)**:
  - Requirement R3: "Research and integrate two new workflows: 'Avatar to Video' and 'Whiteboard Animation'. The team is free to research and decide the best external models/APIs to use for generating Avatars and Whiteboards. However, the whiteboard pipeline must use Google Gemini to generate consistent character reference sheets (e.g., stickman, saint, old man, etc.) that drive the video generation."
  - Acceptance Criteria: "New UI cards for 'Avatar' and 'Whiteboard' are added to the create section. Backend orchestrators for Whiteboard animation successfully use Gemini to generate character references before rendering."
- **Scope Document (`PROJECT.md` lines 41-45, 57, 104-158)**:
  - Milestone M3: "Avatar & Whiteboard Pipelines with Gemini Character References".
  - Scope: Gemini 9-pose character reference generator, `whiteboard-orchestrator.ts`, `avatar-orchestrator.ts`, UI pages and APIs (`/api/workflows/whiteboard/character-sheet`, `/api/workflows/whiteboard`, `/api/workflows/avatar`).
- **Test Infrastructure (`TEST_INFRA.md` lines 18-23, 30-38, 40-44)**:
  - Feature 9: Google Gemini Character Reference Sheet Generation (`/api/workflows/whiteboard/character-sheet`).
  - Feature 10: Whiteboard Animation Orchestration & Storyboard Assembly (`/api/workflows/whiteboard`).
  - Feature 11: Whiteboard Studio UI & API Endpoint.
  - Feature 12: Avatar to Video Orchestration & Compositing (`/api/workflows/avatar`).
  - Feature 13: Avatar Studio UI & API Endpoint.
  - Feature 14: Cost-Safe Multi-Tier Dry-Run/Mock Fallbacks across all new routes.
  - Test runner architecture: Node.js zero-dependency standalone runner (`test-whiteboard-avatar-pipelines.js` & `standalone-runner.js`).

### 1.2 Codebase & Existing Test Architecture Inspection
1. **Types Contract (`lib/engine/types.ts` lines 354-473)**:
   - Contains definitions for `AvatarProvider`, `AvatarLayout`, `AvatarVoice`, `AvatarPreset`, `AvatarConfig`, `AvatarGenerationRequest`, `AvatarGenerationResponse`.
   - Contains definitions for `WhiteboardArchetype`, `WhiteboardStyle`, `CharacterPose`, `CharacterReferenceSheet`, `WhiteboardStoryboardBeat`, `WhiteboardGenerationRequest`, `WhiteboardGenerationResponse`.
2. **Existing E2E Test Suites (`tests/e2e/`)**:
   - `test-api-status.js`: 612 lines verifying all 10 workflow definitions, status resolution (🟢 Ready, 🟡 Fallback, 🔴 Error), key masking, and settings navigation.
   - `test-mission-mode.js`: 871 lines verifying 30 test cases across 6 suites for Automatic Mission Mode, 5-stage lifecycle, streaming step logs, manual wizard hydration, zero-key fallbacks, and high-concurrency dispatches.
   - `standalone-runner.js`: 2,746 lines executing unit, integration, and stress tests for M1, M2, and core subsystems.
3. **Missing Deliverable Identified**:
   - `tests/e2e/test-whiteboard-avatar-pipelines.js` is not yet created. A dedicated, self-contained executable test script covering all M3 requirements across Tiers 1-5 must be formulated and built.

---

## 2. Logic Chain

The verification strategy for Milestone 3 is structured around four primary pillars, mapped directly from requirements to concrete test assertions:

### 2.1 Pillar 1: Gemini 9-Pose Character Reference Sheet Verification
- **Archetype Handling**:
  - Built-in archetypes (`stickman`, `saint`, `old man`, `founder`, `doctor`, `teacher`, `scientist`) and open-ended `custom` descriptions must produce valid, structured character reference sheets.
  - Gemini prompt engineering must enforce:
    - 3x3 uniform orthographic grid with exactly 9 distinct poses (`pose_1` through `pose_9`).
    - Standardized bounding boxes normalized to `[0, 0, 1000, 1000]` canvas (each cell `333x333`).
    - Monoline marker line-art style with zero fills, zero shading, high-contrast black on pure white `#FFFFFF`.
- **Contract Schema Validation**:
  - Endpoint `POST /api/workflows/whiteboard/character-sheet` must return:
    ```typescript
    {
      characterId: string;
      archetype: string;
      sheetImageUrl: string;
      poses: Record<string, { name: string; description: string; bbox: [number, number, number, number]; svgPath?: string }>;
      style: string;
    }
    ```

### 2.2 Pillar 2: Whiteboard Animation Pipeline & Storyboard Assembly Verification
- **Two-Stage Execution**:
  - *Stage 1*: Character Reference Generation/Selection (calls Gemini or loads preset sheet).
  - *Stage 2*: Script Segmentation into 3–8 timed visual storyboard beats.
- **Beat Data Integrity**:
  - Each beat must contain: `id`, `text`, `narration`, `duration` (≥3.0s), `assignedPose` (matching one of the 9 reference poses), `drawingPrompt`, `drawingSvgPath`, `markerColor`, and `handOverlay: true`.
- **Remotion Manifest Assembly**:
  - Composes canvas dimensions (`1920x1080` for 16:9, `1080x1920` for 9:16, `1080x1080` for 1:1), total duration in frames (`durationInFrames = totalDuration * 30`), marker stroke-dashoffset interpolation curves, moving hand cursor coordinate tracking, and handwritten subtitle styling.

### 2.3 Pillar 3: Avatar Talking-Head Video Pipeline Verification
- **Dual Mode Support**:
  - Preset avatars (`sarah_presenter`, `ethan_business`, `alex_tech`, `maya_casual`).
  - Custom photo avatar (`avatarType: 'custom_photo'` with `customImageUrl`).
- **Layout & Compositing Matrix**:
  - `fullscreen`: Presenter fills entire screen.
  - `pip_bottom_right` / `pip_bottom_left`: Circular/rounded webcam badge in corner over dynamic B-roll footage.
  - `side_by_side`: Split screen layout (50/50).
  - `circular_bubble`: Floating glowing circular avatar overlay.
- **Lip-Sync & Audio Synchronization**:
  - TTS speech synthesis aligned with video beat duration.
  - Fallback deterministic mouth-sync oscillator (`Math.sin(frame * 0.5)`) and eye blinks for zero-cost offline preview.

### 2.4 Pillar 4: Multi-Tier Dry-Run / Zero-Key Resilience Verification
- **Zero-Crash Guarantee**:
  - When `GEMINI_API_KEY`, `HEYGEN_API_KEY`, `DID_API_KEY`, `FAL_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY` are all missing, requests to all 3 endpoints MUST return HTTP 200 with valid data structures and complete mock video/image assets.
- **Explicit Mock Flag**:
  - Passing `{ "mock": true }` executes deterministic in-memory generation in <100ms.

---

## 3. Comprehensive Test Formulation: 40 Concrete Test Cases (Tiers 1–5)

Below is the complete catalog of formulated test cases to be implemented in `tests/e2e/test-whiteboard-avatar-pipelines.js`:

### Suite 1: Gemini Character Reference Sheet Generation (Tier 1 — 6 Tests)
| Test ID | Title | Description | Expected Outcome |
|---|---|---|---|
| `T1-WB-CHAR-01` | Stickman Archetype 9-Pose Sheet | Generates stickman reference sheet with 9 poses | Returns `characterId`, `archetype: 'stickman'`, 9 pose keys (`pose_1`..`pose_9`) |
| `T1-WB-CHAR-02` | Saint / Historical Archetype | Generates robed saint character with scrolls/halo | Returns `archetype: 'saint'`, appropriate pose descriptions |
| `T1-WB-CHAR-03` | Old Man / Elder Archetype | Generates wise old man with beard/glasses/cane | Returns `archetype: 'old man'`, valid 9-pose structure |
| `T1-WB-CHAR-04` | Professional Archetypes | Generates founder, doctor, teacher, scientist | Returns corresponding archetypes and tailored pose accessories |
| `T1-WB-CHAR-05` | Custom Character Description | Ingests `customDescription` for bespoke persona | Returns `archetype: 'custom'`, preserves custom prompt in metadata |
| `T1-WB-CHAR-06` | 3x3 Bounding Box Grid Geometry | Validates normalized `bbox` coords for all 9 poses | Each pose has `bbox: [x1, y1, x2, y2]` within `[0, 0, 1000, 1000]` |

### Suite 2: Whiteboard Animation Generation (Tier 1 — 7 Tests)
| Test ID | Title | Description | Expected Outcome |
|---|---|---|---|
| `T1-WB-ANIM-01` | Default Whiteboard Animation | Generates 16:9 whiteboard animation for standard prompt | Returns `success: true`, `jobId`, valid `characterSheet`, `storyboard` |
| `T1-WB-ANIM-02` | Storyboard Beat Breakdown | Segments script into 3–8 timed visual sketch beats | Storyboard length 3–8; each beat has `id`, `narration`, `duration >= 3.0` |
| `T1-WB-ANIM-03` | Character Pose Consistency Mapping | Checks each beat assigns a valid pose from the sheet | Every `assignedPose` in storyboard exists in `characterSheet.poses` |
| `T1-WB-ANIM-04` | Aspect Ratio Adaptations | Generates `16:9`, `9:16`, `1:1` whiteboard layouts | Remotion manifest dimensions match aspect ratio (1920x1080, 1080x1920, 1080x1080) |
| `T1-WB-ANIM-05` | Marker Color & Style Customization | Custom hex marker color (`#2563EB`, `#DC2626`) | Propagates `markerColor` across beats and composition manifest |
| `T1-WB-ANIM-06` | Progressive SVG Sketch Paths | Generates valid vector path data for drawing | Each beat has non-empty `drawingSvgPath` or vector drawing descriptor |
| `T1-WB-ANIM-07` | Hand Tracking & Subtitle Styling | Validates hand cursor and handwritten typography | Remotion manifest contains `handOverlay: true` and handwritten font config |

### Suite 3: Avatar to Video Generation (Tier 1 — 7 Tests)
| Test ID | Title | Description | Expected Outcome |
|---|---|---|---|
| `T1-AV-ANIM-01` | Preset Avatar Fullscreen Layout | Generates video with `sarah_presenter` in fullscreen | Returns `success: true`, `layout: 'fullscreen'`, `avatarId: 'sarah_presenter'` |
| `T1-AV-ANIM-02` | PiP Bottom-Right Layout | Generates circular PiP webcam overlay in bottom-right | Returns `layout: 'pip_bottom_right'`, background B-roll URL populated |
| `T1-AV-ANIM-03` | PiP Bottom-Left Layout | Generates circular PiP webcam overlay in bottom-left | Returns `layout: 'pip_bottom_left'`, background video layered |
| `T1-AV-ANIM-04` | Custom Photo Avatar Ingestion | Ingests `customImageUrl` for photo avatar | Returns `providerUsed: 'liveportrait'` or mock fallback, `avatarType: 'custom_photo'` |
| `T1-AV-ANIM-05` | Voice & Speed Rate Selection | Configures neural voice (`nova`, `onyx`) & speed (1.2) | Manifest reflects selected voice and modulated speech duration |
| `T1-AV-ANIM-06` | Aspect Ratio Variations | Tests `9:16` vertical Reel/TikTok vs `16:9` widescreen | Video dimensions and PiP scaling match target aspect ratio |
| `T1-AV-ANIM-07` | Remotion Multi-Track Compositing | Verifies 5-layer composition manifest | Layers: Background, Avatar, TTS Audio, Hormozi Subtitles, BGM ducking |

### Suite 4: Boundary, Corner & Edge Cases (Tier 2 — 8 Tests)
| Test ID | Title | Description | Expected Outcome |
|---|---|---|---|
| `T2-WB-EDGE-01` | Empty / Whitespace Whiteboard Prompt | Submits empty prompt to whiteboard API | Returns HTTP 400 Bad Request `{ success: false, error: '...' }` |
| `T2-WB-EDGE-02` | Ultra-Long Prompt Clamping | Submits >4000 character prompt | Clamps storyboard to maximum 10 beats without memory exhaustion |
| `T2-WB-EDGE-03` | Unknown Archetype Fallback | Submits unsupported archetype string | Gracefully falls back to default `stickman` archetype |
| `T2-WB-EDGE-04` | Invalid Marker Color Sanitization | Submits malformed color string (`xyz`, `#1234567`) | Sanitizes to default dark slate `#1E293B` |
| `T2-AV-EDGE-01` | Empty / Whitespace Avatar Script | Submits empty script to avatar API | Returns HTTP 400 Bad Request `{ success: false, error: '...' }` |
| `T2-AV-EDGE-02` | Unknown Avatar ID Fallback | Submits non-existent `avatarId` | Gracefully falls back to default preset (`sarah_presenter`) |
| `T2-AV-EDGE-03` | Missing Image URL in Custom Photo | `avatarType: 'custom_photo'` with null `customImageUrl` | Gracefully falls back to standard presenter preset |
| `T2-AV-EDGE-04` | Extreme Speech Speed Clamping | Submits extreme speed (0.1x or 5.0x) | Clamps speed into valid range `[0.5, 2.0]` |

### Suite 5: Pairwise Combinatorial & Cross-Workflow Interactions (Tier 3 — 4 Tests)
| Test ID | Title | Description | Expected Outcome |
|---|---|---|---|
| `T3-WB-PAIR-01` | Whiteboard Combinatorial Matrix | Tests orthogonal combos (archetype x style x ratio x color) | All permutations generate valid isolated storyboard packages |
| `T3-AV-PAIR-01` | Avatar Combinatorial Matrix | Tests orthogonal combos (avatar x layout x ratio x voice) | All permutations generate valid multi-track Remotion manifests |
| `T3-CROSS-01` | Character Sheet -> Whiteboard Chaining | Sheet generated in endpoint 1 feeds directly to endpoint 2 | Preserves exact character consistency across storyboard scenes |
| `T3-CROSS-02` | Avatar + Whiteboard Hybrid Pipeline | Avatar intro beat transitions into whiteboard explainer | Produces unified multi-scene timeline with seamless audio sync |

### Suite 6: Real-World Application Scenarios (Tier 4 — 4 Tests)
| Test ID | Title | Description | Expected Outcome |
|---|---|---|---|
| `T4-SCENARIO-01` | Scientific Explainer: "Quantum Superposition" | Full whiteboard video with `scientist` 9-pose sheet | 5-beat storyboard with blackboard chalk style, equation doodles |
| `T4-SCENARIO-02` | SaaS Product Pitch: "Introducing Clipped AI" | Avatar video with `sarah_presenter` in PiP Bottom-Right | 4-beat video with SaaS B-roll, pop subtitles, and background audio |
| `T4-SCENARIO-03` | Historical Philosophy: "Marcus Aurelius Meditations" | Whiteboard video with `saint` archetype, parchment visual anchors | 4-beat monologue with robed philosopher sketches and warm voice |
| `T4-SCENARIO-04` | Executive Announcement Video | Custom photo avatar in circular bubble layout | High-retention talking head overlay with animated audio wave ring |

### Suite 7: Adversarial Hardening, Zero-Key Resilience & Concurrency (Tier 5 — 4 Tests)
| Test ID | Title | Description | Expected Outcome |
|---|---|---|---|
| `T5-RESILIENCE-01` | Zero-Key Environment Execution | Strips all API keys from env and DB; runs all 3 routes | 100% routes succeed (HTTP 200) with complete deterministic mock data |
| `T5-RESILIENCE-02` | Explicit Mock Execution Latency | Runs all 3 routes with `{ mock: true }` | Complete execution in <100ms with zero external network traffic |
| `T5-CONCUR-01` | 30 Rapid Concurrent Whiteboard Dispatches | Dispatches 30 parallel whiteboard generation requests | 30 distinct job IDs generated without state collision or race conditions |
| `T5-CONCUR-02` | 30 Rapid Concurrent Avatar Dispatches | Dispatches 30 parallel avatar generation requests | 30 distinct job IDs generated with isolated audio/video track bindings |

---

## 4. Caveats

1. **External API Network Dependencies**:
   - In production environments, live character reference generation utilizes Google Gemini (`@google/genai` or Gemini REST API) and live avatar generation uses HeyGen / D-ID / Fal.ai LivePortrait.
   - For opaque-box test suites, zero network dependency is strictly enforced: test execution must rely on deterministic mock engines and in-memory generators.
2. **Video Transcoding Performance**:
   - Headless Remotion rendering (`@remotion/renderer`) to generate full binary MP4 files requires Chromium/FFmpeg. In fast E2E test runs, verifying the Remotion composition bundle schema, frame math, and audio-video beat alignments is preferred over full binary rendering to prevent test runner timeouts.
3. **Database Availability**:
   - Supabase connectivity may be offline during local testing. Orchestrators must maintain an in-memory fallback cache so that state polling (`getJob`) operates seamlessly offline.

---

## 5. Conclusion

- **Readiness**: All requirements for Milestone 3 (Gemini 9-pose character reference sheets, whiteboard animation orchestration, avatar talking heads with PiP/fullscreen compositing, and zero-key resilience) have been thoroughly investigated and codified.
- **Specification Complete**: 40 concrete test cases across 7 suites (Tiers 1–5) are formulated and ready for execution.
- **Next Step**: The Implementer / Sub-Orchestrator can construct `tests/e2e/test-whiteboard-avatar-pipelines.js` and verify against the newly created backend routes and orchestrators.

---

## 6. Verification Method

### 6.1 Executable Verification Commands
1. Run the dedicated Milestone 3 E2E test suite:
   ```powershell
   node tests/e2e/test-whiteboard-avatar-pipelines.js
   ```
   *Expected Outcome*: 40 / 40 tests passing (0 failures), exit code 0.

2. Run the full unified standalone runner (Tiers 1–7):
   ```powershell
   node tests/e2e/standalone-runner.js
   ```

3. Run API route status and mission mode regression suites:
   ```powershell
   node tests/e2e/test-api-status.js
   node tests/e2e/test-mission-mode.js
   ```

### 6.2 Source Files to Inspect
- `lib/engine/types.ts`: Extended type contracts for Whiteboard and Avatar workflows.
- `lib/ai/gemini-character-generator.ts`: Gemini 9-pose character reference generator.
- `lib/engine/whiteboard-orchestrator.ts`: Whiteboard animation storyboard assembly engine.
- `lib/engine/avatar-orchestrator.ts`: Avatar talking head and PiP compositor engine.
- `app/api/workflows/whiteboard/route.ts`: Whiteboard generation API route.
- `app/api/workflows/whiteboard/character-sheet/route.ts`: Character reference sheet API route.
- `app/api/workflows/avatar/route.ts`: Avatar generation API route.
- `tests/e2e/test-whiteboard-avatar-pipelines.js`: Dedicated M3 test suite.
