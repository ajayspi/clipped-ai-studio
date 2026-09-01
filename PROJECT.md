# Project: Clipped AI Studio — 'Create' Section & Video Workflows Enhancement

## Architecture

Clipped AI Studio is a Next.js (App Router), React 19, Tailwind CSS v4, Zustand, Supabase, Remotion, and multi-provider AI video generation platform.

The system is organized into modular tiers:
1. **Frontend Create Hub**:
   - `app/(app)/create/page.tsx`: Dynamic workflow selection hub with real-time API configuration status indicators (🟢 Ready, 🟡 Fallback/Mock, 🔴 Unconfigured), cost tier badges ($, $$, $$$), settings direct links, and a top "One-Click Automatic Mission" prompt submission bar.
   - `app/(app)/create/mission/[id]/page.tsx`: Dedicated Mission Progress view featuring 5-stage live step visualizer, streaming logs, live Remotion player preview, and a seamless "Manual / Edit in Wizard" toggle.
   - `app/(app)/create/avatar/page.tsx`: Interactive avatar-to-video workflow studio (photo-driven avatars via LivePortrait / HeyGen / D-ID, voice selection, PiP / fullscreen layout).
   - `app/(app)/create/whiteboard/page.tsx`: Whiteboard animation workflow studio (preset character archetypes: stickman, saint, old man, founder, doctor, custom Gemini character prompts, doodle style selection).
2. **Backend Workflow Orchestration Engine**:
   - `lib/engine/mission-orchestrator.ts`: Server-side auto-pilot engine chaining prompt -> script generation -> scene analysis -> asset generation -> TTS audio -> Remotion composition -> `render_jobs` persistence.
   - `lib/engine/avatar-orchestrator.ts`: Talking-head video generation with portrait synthesis, audio synchronization, and fallback deterministic Remotion compositing.
   - `lib/engine/whiteboard-orchestrator.ts`: Two-stage whiteboard generator:
     - Stage 1: Google Gemini (`@google/genai` / REST) generates consistent 9-pose character reference sheets and monoline doodle line-art.
     - Stage 2: Scene-by-scene storyboard assembly assigning specific character poses, progressive SVG sketch animations, and hand-drawn marker overlays.
   - `lib/engine/types.ts`: Extended type definitions for all workflows, character reference sheets, whiteboard storyboard beats, and avatar configurations.
3. **API & Settings Layer**:
   - `app/api/settings/keys/route.ts`: Evaluates configured API keys across providers (`gemini`, `openai`, `fal`, `kling`, `luma`, `elevenlabs`, `pexels`, `pixabay`, `heygen`, `did`).
   - `app/api/workflows/mission/route.ts`: Initiates one-click automatic video mission.
   - `app/api/workflows/avatar/route.ts`: Initiates avatar talking-head video generation.
   - `app/api/workflows/whiteboard/route.ts`: Initiates whiteboard animation generation with Gemini character reference generation.
   - `app/api/workflows/whiteboard/character-sheet/route.ts`: Generates / previews Gemini 9-pose character reference sheets.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | API Status Badges | Dynamic status dots (green, orange, red) per workflow card based on `/api/settings/keys` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Cost Tier Indicators | Badges ($ for free/fallback, $$ for standard, $$$ for video models) per card | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Settings Modal & Direct Links | Gear icon on cards linking to `/settings` or opening provider settings modal | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Workflow Card Grid Expansion | Render 10 total workflow cards including Avatar to Video and Whiteboard Animation | M1 | ORIGINAL_REQUEST §R1, §R3 |
| 5 | Automatic Mission Prompt Bar | Single-input prompt bar on `/create` page with instant Enter key submission | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Mission Orchestration API | `POST /api/workflows/mission` background pipeline chaining all steps automatically | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Dedicated Mission Progress View | `/create/mission/[id]` page with 5-stage progress visualizer and live logs | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Manual / Edit in Wizard Toggle | Button on Mission Progress to transfer state to `useWizardStore` and open wizard | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Gemini Character Reference Sheets | Gemini API prompt engine generating consistent 9-pose character reference sheets | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Whiteboard Animation Orchestrator | Backend pipeline linking Gemini character sheets to progressive sketch video rendering | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Whiteboard Studio UI & API | Dedicated `/create/whiteboard` page and `POST /api/workflows/whiteboard` endpoint | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Avatar to Video Orchestrator | Backend pipeline for photo/presenter talking heads with PiP & fullscreen compositing | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Avatar Studio UI & API | Dedicated `/create/avatar` page and `POST /api/workflows/avatar` endpoint | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Resilient Mock/Dry-Run Fallbacks | Multi-tier fallback cascades for all APIs when live keys are not configured | M1, M2, M3 | ORIGINAL_REQUEST |
| 15 | Comprehensive E2E Testing Suite | 4-Tier requirement-driven test suite validating API status, mission mode & pipelines | M4 | ORIGINAL_REQUEST |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | API Status Indicators & Settings Links | Dynamic status dots, cost tier badges, settings links, 10 workflow cards in `/create` | none | PLANNED |
| M2 | Automatic Mission Mode & Progress View | One-click prompt submission, `mission-orchestrator.ts`, `/create/mission/[id]` view, manual edit toggle | M1 | PLANNED |
| M3 | Avatar & Whiteboard Pipelines with Gemini Character References | Gemini 9-pose character reference generator, `whiteboard-orchestrator.ts`, `avatar-orchestrator.ts`, UI pages and APIs | M1 | PLANNED |
| M4 | E2E Verification & Adversarial Hardening | Full requirement test suite (Tiers 1-4) passing 100%, adversarial edge cases (Tier 5) | M1, M2, M3 | PLANNED |

---

## Interface Contracts

### 1. `/api/settings/keys` ↔ Frontend Workflow Cards
- **Request**: `GET /api/settings/keys`
- **Response**:
```json
{
  "keys": {
    "gemini": { "isConfigured": true, "isActive": true, "maskedValue": "AIza...1234", "updatedAt": "..." },
    "openai": { "isConfigured": false, "isActive": false, "maskedValue": "", "updatedAt": null },
    "elevenlabs": { "isConfigured": false, "isActive": false, "maskedValue": "", "updatedAt": null },
    "pexels": { "isConfigured": true, "isActive": true, "maskedValue": "pk_...99", "updatedAt": "..." },
    "fal": { "isConfigured": false, "isActive": false, "maskedValue": "", "updatedAt": null },
    "heygen": { "isConfigured": false, "isActive": false, "maskedValue": "", "updatedAt": null }
  }
}
```
- **Workflow Status Evaluation**:
  - `ready` (🟢): All primary required provider keys are configured and active.
  - `warning` (🟡): Some primary keys missing but built-in zero-cost fallback/mock provider is available.
  - `error` (🔴): Critical keys unconfigured and no fallback available.

### 2. Automatic Mission Mode: `/api/workflows/mission`
- **Request**: `POST /api/workflows/mission`
```json
{
  "prompt": "The history of ancient Roman engineering",
  "aspectRatio": "9:16",
  "style": "cinematic",
  "voice": "onyx"
}
```
- **Response**:
```json
{
  "success": true,
  "jobId": "c8f2a100-34b2-4889-bb02-c9a184128f11",
  "status": "processing",
  "progressUrl": "/create/mission/c8f2a100-34b2-4889-bb02-c9a184128f11"
}
```

### 3. Gemini Character Reference Sheet Generation: `/api/workflows/whiteboard/character-sheet`
- **Request**: `POST /api/workflows/whiteboard/character-sheet`
```json
{
  "archetype": "stickman" | "saint" | "old man" | "founder" | "doctor" | "custom",
  "customDescription": "A wise elder philosopher in flowing robes with a scroll",
  "style": "monoline_marker"
}
```
- **Response**:
```json
{
  "characterId": "char_saint_9pose",
  "archetype": "saint",
  "sheetImageUrl": "/assets/character-sheets/saint_9pose.png",
  "poses": {
    "pose_1": { "name": "neutral", "description": "Standing calmly holding scroll", "bbox": [0, 0, 333, 333] },
    "pose_2": { "name": "pointing", "description": "Pointing skyward with index finger", "bbox": [333, 0, 666, 333] },
    "pose_3": { "name": "eureka", "description": "Holding a glowing concept", "bbox": [666, 0, 1000, 333] },
    "pose_4": { "name": "explaining", "description": "Hands open in discourse", "bbox": [0, 333, 333, 666] },
    "pose_5": { "name": "reading", "description": "Unfurling ancient parchment", "bbox": [333, 333, 666, 666] },
    "pose_6": { "name": "confused", "description": "Pondering with hand on chin", "bbox": [666, 333, 1000, 666] },
    "pose_7": { "name": "sitting", "description": "Sitting cross-legged meditating", "bbox": [0, 666, 333, 1000] },
    "pose_8": { "name": "writing", "description": "Inscribing on tablet", "bbox": [333, 666, 666, 1000] },
    "pose_9": { "name": "blessing", "description": "Raised hand of wisdom", "bbox": [666, 666, 1000, 1000] }
  }
}
```

### 4. Whiteboard Animation Workflow: `/api/workflows/whiteboard`
- **Request**: `POST /api/workflows/whiteboard`
```json
{
  "prompt": "3 laws of motion explained simply",
  "characterArchetype": "stickman",
  "markerColor": "#1E293B",
  "aspectRatio": "16:9"
}
```
- **Response**: `{ "success": true, "jobId": "...", "characterSheet": { ... }, "storyboard": [ ... ] }`

### 5. Avatar to Video Workflow: `/api/workflows/avatar`
- **Request**: `POST /api/workflows/avatar`
```json
{
  "script": "Welcome to Clipped AI. Here is your weekly update.",
  "avatarType": "preset" | "custom_photo",
  "avatarId": "sarah_presenter",
  "customImageUrl": null,
  "layout": "pip_bottom_right" | "fullscreen",
  "voice": "nova"
}
```
- **Response**: `{ "success": true, "jobId": "...", "status": "processing" }`

---

## Code Layout

- `app/(app)/create/page.tsx`: Create Hub with prompt bar, 10 workflow cards, status indicators, and settings shortcuts.
- `app/(app)/create/components/WorkflowCard.tsx`: Individual workflow card with status pill, cost tier, settings icon, and dynamic key tooltips.
- `app/(app)/create/components/MissionPromptBar.tsx`: One-click prompt input bar with fast auto-pilot submission.
- `app/(app)/create/mission/[id]/page.tsx`: Mission Progress view with stepper visualizer, live logs, Remotion preview, and manual edit button.
- `app/(app)/create/avatar/page.tsx`: Avatar to Video creation studio.
- `app/(app)/create/whiteboard/page.tsx`: Whiteboard Animation creation studio with character reference selector.
- `lib/engine/mission-orchestrator.ts`: Background job orchestrator for Automatic Mission Mode.
- `lib/engine/avatar-orchestrator.ts`: Background job orchestrator for Avatar Talking Head videos.
- `lib/engine/whiteboard-orchestrator.ts`: Background job orchestrator for Whiteboard Animation with Gemini character references.
- `lib/ai/gemini-character-generator.ts`: Gemini character reference sheet generator & pose mapper.
- `app/api/workflows/mission/route.ts`: Mission generation route.
- `app/api/workflows/avatar/route.ts`: Avatar generation route.
- `app/api/workflows/whiteboard/route.ts`: Whiteboard generation route.
- `app/api/workflows/whiteboard/character-sheet/route.ts`: Gemini character reference generation route.
- `tests/e2e/test-api-status.js`: Verification test for API status indicators and key resolution.
- `tests/e2e/test-mission-mode.js`: Verification test for automatic mission mode execution and manual state handoff.
- `tests/e2e/test-whiteboard-avatar-pipelines.js`: Verification test for Avatar and Whiteboard pipelines with Gemini character consistency.
