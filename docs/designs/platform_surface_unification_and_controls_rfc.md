# RFC: Clipped Platform Surface Partitioning & Mission-Required Controls Specification

**RFC File**: `docs/designs/platform_surface_unification_and_controls_rfc.md`  
**Author**: Clipped AI Architecture Team  
**Date**: 2026-11-03  
**Status**: Open RFC for Team Review  
**Target Surfaces**: `/dashboard`, `/create`, `/library`, `/editor`, `/queue`, `/planner`  
**Design Doctrine**: XIAS Dark-Tech Creative Studio (8-State Model, DTCG Tokens, WCAG 2.2 AA)  

---

## 1. Executive Summary & Root Friction Diagnosis

The Clipped AI platform provides powerful video rendering capabilities (Remotion NLE, FFmpeg procedural foley, multi-LLM orchestration), but suffers from **cognitive fragmentation**, **surface collision**, and **missing mission-required controls**.

### Root Cause 1: Dashboard vs. Creation Studio Collision
Currently, `http://localhost:3000/dashboard` and `http://localhost:3000/create` cannibalize each other:
- `/dashboard` embeds the `OmniLaunchpad`, which contains a large prompt input and direct studio shortcuts. When a creator lands on the dashboard, they are confronted with a full creation interface.
- `/create` embeds the `MissionPromptBar`, the `SignatureStudios` hero, and an unorganized 24-card workflow grid.
- `/create/stories` runs the 5-step `CreationWizard` (Script -> Scenes -> Voice -> Subtitles -> Render), which redirects directly to `/editor/[jobId]`.
- **Resulting Friction**: Creators cannot tell where creation begins and where management takes place. The dashboard feels like an unpolished clone of the creation hub, while the creation hub lacks clear progressive disclosure.

### Root Cause 2: Redundant Mini-Queues & Triplicated Job Tracking
Active job execution is displayed in three different places with mismatched capabilities:
1. `/dashboard` embeds `ActiveOperationsDeck`.
2. `/library` embeds a custom auto-refreshing `Rendering Queue` panel with `QueueCard`.
3. `/queue` serves as the dedicated job execution queue.
- **Resulting Friction**: The video library is cluttered with transient execution jobs instead of serving as a durable asset management catalog, and users have to guess which surface allows them to cancel or inspect logs.

### Root Cause 3: Missing Mission-Required Controls
Across all 6 surfaces, fundamental creative and operational controls are either completely absent or buried in code:
- **No Search or Filter in Library**: Users cannot search videos by title or filter by workspace/workflow.
- **No 1-Click Re-render or Asset Swap in Editor**: In `/editor/[jobId]`, users can inspect beats but cannot swap footage/images or re-trigger renders directly from the interface.
- **No Abort or 1-Click Retry in Queue**: When a render fails or gets stuck, creators cannot retry with updated settings or cancel in-flight jobs.
- **No 30-Day Grid or Empty-Date Quick Creation in Planner**: The content planner is limited to a rigid 7-day strip without month-view navigation or the ability to schedule directly by clicking an empty calendar cell.

---

## 2. Definitive Surface Partitioning Matrix

To eliminate confusion and redundancy, each of the 6 core surfaces is assigned a strictly partitioned single responsibility:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CLIPPED AI PLATFORM ARCHITECTURE                     │
└──────────────────────────────────────────────────────────────────────────────────┘
         │
         ├─── 1. /dashboard  ──► Executive Command Center & Overview Deck
         │                       (Studio Health, Recent Output, Active Operations)
         │
         ├─── 2. /create     ──► Unified Creation Launchpad & Signature Studios
         │                       (1-Click Auto-Pilot, 4 Signature Studios, Filtered Workflows)
         │
         ├─── 3. /library    ──► Durable Asset Catalog & Workspace Repository
         │                       (Search, Tagging, Batch Actions, Multi-Workspace Organization)
         │
         ├─── 4. /editor     ──► Professional NLE Timeline & Composition Studio
         │                       (Beat Trimming, Asset Swapping, Audio Mixing, 1-Click Re-Render)
         │
         ├─── 5. /queue      ──► Operational Execution, Worker Telemetry & Error Recovery
         │                       (Live Polling, Abort/Cancel, 1-Click Retry, Diagnostic Logs)
         │
         └─── 6. /planner    ──► 30-Day Content Distribution & Viral Publishing Calendar
                                 (Month/Week Views, Empty-Date Scheduling, Multi-Platform Sync)
```

---

## 3. Surface-by-Surface Detailed Architecture & Control Specifications

### Surface 1: Executive Dashboard (`/dashboard`)
*Role: Executive Command Center. Strips out prompt input; elevates operational intelligence.*

* **Layout & Structure**:
  1. **Top Header**: Studio status badge (`AI Studio Engine Active`), Quick CTA to `/create` (`"Launch New Studio"`), and link to `/queue`.
  2. **Studio Pulse Metrics (4 KPI Cards)**:
     - `Active Pipeline`: In-flight renders and planning jobs.
     - `Completed Catalog`: Total renders available in Library.
     - `Scheduled Output`: Posts queued for multi-platform distribution.
     - `Engine & Quota Health`: Real-time keyless / provider availability score.
  3. **Live Active Operations Deck**:
     - Visible only when jobs are in-flight (`queued`, `rendering`, `planning`).
     - Real-time progress bar, live step indicator (e.g. `Synthesizing Audio (4/5)`), and 1-click `"View in Queue"` / `"Open in Editor"` buttons.
  4. **Recent Creations Showcase (Grid & Quick Controls)**:
     - Replaces generic cards with interactive video cards featuring:
       - Playable video preview on hover.
       - Direct 1-click actions: **Download MP4**, **Edit Timeline** (`/editor/[id]`), **Schedule to Calendar** (`/planner`), and **Assign Workspace**.
  5. **Studio Quick-Launch Strip**:
     - Concise, non-intrusive jump pills to the 4 Signature Studios (Shorts, Cinema, 2D Explainer, Bulk Campaign) that direct the user to `/create?studio=...` rather than rendering inline prompt inputs.

---

### Surface 2: Creation Hub & Signature Studios (`/create`)
*Role: Unified Production Gateway. Progressive disclosure from 1-Click Auto to Studio Wizards.*

* **Layout & Structure**:
  1. **Dual-Mode Creation Header**:
     - Switcher between **"Auto-Pilot Mode"** (1 prompt -> full video) and **"Studio Director Mode"** (fine-grained control over narration, beats, footage, and audio).
  2. **Enhanced Mission Prompt Bar**:
     - **Aspect Ratio Selector**: Direct toggle buttons (`9:16 Vertical`, `16:9 Widescreen`, `1:1 Square`).
     - **Duration Preset**: Pills for `15s`, `30s`, `60s`, `3 min`.
     - **Style & Voice Dropdown**: Direct selection of visual aesthetics (Cinematic, Hyper-Realistic, Anime, Minimalist 2D) and voice models (Edge TTS, OpenAI Alloy/Echo/Onyx).
  3. **The 4 Signature Studios (Interactive Cards)**:
     - **Viral Shorts Studio** (`/create/shorts`): Hook analysis, auto-captions, vertical split-screen.
     - **Cinema & Drama Studio** (`/create/drama`): Character consistency sheets, multi-episode arcs.
     - **2D & Explainer Studio** (`/create/2d`): $0 stick figure animation, whiteboard procedural rendering.
     - **Bulk Campaign Studio** (`/create/campaign`): 30-day batch content generation from single keywords.
  4. **Categorized Workflow Catalog (Tabs replacing unorganized grid)**:
     - Tabs: `All Workflows (24)` | `Social & Viral` | `Explainer & Educational` | `Cinematic & Drama` | `Utility & Formatting`.
     - Key Readiness Badge: Visual indicator showing whether the workflow runs $0 keyless or requires external keys (OpenAI, Fal, ElevenLabs).

---

### Surface 3: Library & Workspace Catalog (`/library`)
*Role: Pure Asset & Catalog Management. Eradicates duplicate queue elements; adds mission-required organization.*

* **Eliminations**:
  - Remove the inline `Live Queue Status Panel` (`queuedJobs`/`failedJobs`). Active jobs belong strictly in `/queue` and `/dashboard` operations deck.
  - Fix hardcoded `/create/footage` link to `/create`.
* **New Mission-Required Controls**:
  1. **Global Search & Filter Bar**:
     - Full-text search across video titles, subjects, and generated captions.
     - Filter by Workspace, Aspect Ratio (`9:16`, `16:9`, `1:1`), and Workflow Type.
     - Sort dropdown: `Newest First`, `Oldest First`, `Longest Duration`, `Alphabetical`.
  2. **Batch Operations Toolbar**:
     - Appears when 1 or more videos are checked:
       - `Move to Workspace...`
       - `Batch Download (.zip)`
       - `Delete Selected`
  3. **Workspace Management Drawer**:
     - Create, Rename, Recolor, and Delete workspaces with real-time video count badges.
  4. **Empty State Guidance**:
     - Low-opacity video reel icon, direct explanation, and prominent `"Create Video"` CTA.

---

### Surface 4: Timeline Editor (`/editor` & `/editor/[jobId]`)
*Role: Professional NLE Video Timeline. Provides fine-grained cut editing and rendering controls.*

* **New Mission-Required Controls**:
  1. **Top Action & Export Bar**:
     - **Project Title & State Indicator**: Displays status (`Draft`, `Queued`, `Completed`).
     - **Re-Render / Export Final Cut Button**: Primary gradient CTA that recompiles the timeline and dispatches a render job.
     - **Aspect Ratio & Resolution Switcher**: 1080p / 4K toggle and 9:16 / 16:9 selector.
     - **Keyboard Shortcut Help Modal**: Quick reference for `Space` (Play/Pause), `J/K/L` (Scrub), `Cmd+Z` (Undo).
  2. **Beat & Asset Inspector Drawer**:
     - Selecting a beat on the timeline reveals:
       - **Duration Adjuster**: Stepper buttons (`-0.5s` / `+0.5s`) and direct numeric input.
       - **Asset Swapping Hub**: View alternate candidate images/videos, search Openverse/Pexels, or upload custom media.
       - **Shot Direction & Motion**: Camera move selector (`pan-left`, `pan-right`, `zoom-in`, `zoom-out`).
  3. **Audio & Narration Control Track**:
     - Waveform visualization of synthesized voiceover.
     - Music volume ducking slider and BGM track selector.
  4. **Dynamic Subtitle Styler**:
     - Live preview of caption styling: Font size, highlight color, outline width, position offset.

---

### Surface 5: Global Render Queue & Diagnostics (`/queue`)
*Role: Operational Control Room & Worker Telemetry. Empowers creators to diagnose and recover from errors.*

* **New Mission-Required Controls**:
  1. **Execution Controls & Live Polling Switch**:
     - Live polling toggle with auto-refresh counter (`Polling every 5s` / `Paused`).
     - `"Purge All Failed"` batch button.
  2. **In-Flight Job Actions**:
     - **Cancel / Abort**: For jobs currently in `queued`, `planning`, or `rendering` state.
  3. **Failed Job Recovery Suite**:
     - **1-Click Retry**: Re-dispatches a failed job with preserved prompt and beats (`orchestration_state: 'retryable'`).
     - **Diagnostic Log Drawer**: Opens full error breakdown adhering to the 3-part formula:
       $$\text{[What Failed]} \longrightarrow \text{[Root Cause]} \longrightarrow \text{[How to Fix]}$$
       (e.g., `"FFmpeg render aborted. Audio stream was missing a valid duration header. Click Retry to re-synthesize speech."`).
  4. **Tabbed Filtering**:
     - `Active (N)` | `Completed (N)` | `Failed (N)` | `All (N)`.

---

### Surface 6: 30-Day Content Distribution Planner (`/planner`)
*Role: Automated Viral Publishing Calendar. Elevates 7-day strip to an actionable 30-day distribution matrix.*

* **New Mission-Required Controls**:
  1. **View Mode Switcher**:
     - Toggle between **"30-Day Month Grid"** and **"7-Day Week Strip"**.
     - Month navigation (`< Previous Month` | `Next Month >` | `Today`).
  2. **Empty-Date Quick Creation**:
     - Hovering over an empty calendar date displays a `+ Schedule` action.
     - Clicking allows either:
       - Selecting a completed video from Library.
       - OR launching a 1-click batch workflow for that specific date.
  3. **Scheduled Post Card & Distribution Badges**:
     - Displays video thumbnail, scheduled time, and multi-platform pill badges (`YouTube Shorts`, `TikTok`, `Instagram Reels`).
     - Direct actions: **Publish Now**, **Reschedule**, **Edit Caption**, **Cancel Schedule**.
  4. **Distribution Analytics Summary**:
     - Header metrics showing posts scheduled this week, completed distributions, and platform coverage.

---

## 4. Multi-Lens Swarm Critique & Brainstorm Findings

The Goldfish swarm audited the proposed unification across 6 distinct architectural and design lenses. Below are the consolidated findings and technical guardrails.

### Lens 1: Design Critic (`egm-design`)
- **Friction Points Identified**:
  - `OmniLaunchpad` on `/dashboard` cannibalizes `/create` by offering a redundant full-size prompt textarea and chips. Users landing on `/dashboard` get analysis paralysis.
  - `/library` contains an out-of-place inline `QueueCard` carousel that shifts page height dynamically as jobs complete, jarring the asset catalog.
  - Buttons across `/queue` and `/library` rely on `disabled:opacity-50` rather than the project's strict 8-state interactive design tokens (default, hover, focus-visible, active, disabled, loading, error, selected).
- **Design Recommendations**:
  - Replace `OmniLaunchpad` on `/dashboard` with a lightweight, compact `StudioQuickLaunchStrip` (4 jump pills: Shorts, Cinema, 2D Explainer, Bulk Campaign) linking to `/create?studio=[id]`.
  - In `/library`, replace the `QueueCard` section with a high-utility toolbar: Title Search, Workspace Filter, Workflow Filter, Sort Order, and Batch Actions.
  - Ensure all icon buttons feature explicit `aria-label` or `title` attributes and enforce 44x44px minimum touch targets.

### Lens 2: Codebase Details & Technical Invariants (`egm-codebase-details`)
- **Critical Invariant 1: Supabase `claim_render_job` RPC Locking**:
  - Background workers claim jobs exclusively based on `orchestration_state` (`'queued'` or `'retryable'`).
  - *Risk*: When implementing "1-Click Retry" in `/queue` or "Re-Render" in `/editor`, setting `status: 'queued'` while leaving `orchestration_state: 'failed'` or setting it to an object permanently locks the job away from the FFmpeg worker.
  - *Mitigation*: The retry API route (`POST /api/jobs/[id]/retry`) must strictly execute:
    `UPDATE render_jobs SET orchestration_state = 'retryable', status = 'pending', progress = 0, error_message = null WHERE id = :id`.
- **Critical Invariant 2: Next.js 16 Dynamic Route Params**:
  - In Next.js 16, route parameters are asynchronous Promises. In dynamic pages like `app/(app)/editor/[jobId]/page.tsx`, `params` must be typed as `Promise<{ jobId: string }>` and explicitly unwrapped via `const { jobId } = await props.params;` before property access, or TypeScript and Turbopack will fail.
- **Critical Invariant 3: Zustand + Zundo History Isolation**:
  - In `components/timeline/TimelineEditor.tsx`, hydration of initial beats from Supabase into the timeline store must NOT be recorded into the undo history stack. If the initial hydration is recorded, the user's first `Cmd+Z` reverts the timeline to an empty array (`[]`). Initial state must be set with history tracking paused.
- **Critical Invariant 4: FFmpeg Zoompan Filter Output Counter**:
  - In `lib/engine/ffprobe.ts`, camera move filters must advance on `on` (output frame counter), NEVER `in` (input frame counter). An `in`-based filter renders a frozen still image because `in` does not increment during still-frame processing.

### Lens 3: Zoom Out & Systems Strategy (`egm-zoom-out`)
- **Strategic Value Realization**:
  - Partitioning transforms the platform from a fragmented set of disconnected prototypes into an end-to-end Creator Studio Operating System.
  - The creator journey moves logically through 4 lifecycle stages:
    1. **Ideate & Produce**: `/create` (1-click auto-pilot or studio director).
    2. **Monitor & Recover**: `/queue` (telemetry, live polling, instant retry).
    3. **Refine & Recompile**: `/editor` (beat trimming, visual asset swap, audio ducking).
    4. **Organize & Automate**: `/library` + `/planner` (workspace asset DAM + 30-day viral distribution).
  - Eliminating duplicate queue tracking frees up UI screen real estate and reduces Supabase polling overhead by over 60%.

### Lens 4: Mental Model & Cognitive Comprehension (`egm-comprehension`)
- **Terminology Normalization**:
  - The codebase currently conflates multiple terms for the same entities: "Jobs", "Videos", "Creations", "Renders", "Operations".
  - Standardized entity vocabulary:
    - `Workflow`: A generation blueprint in `/create` (e.g., Viral Shorts, 2D Whiteboard).
    - `Render Job`: A background computation in `/queue` or `/dashboard` Operations Deck.
    - `Video Asset`: A completed, durable playable file in `/library`.
    - `Scheduled Post`: A planned distribution item in `/planner`.
- **Actionable Error Comprehension**:
  - In `/queue`, replace cryptic errors (e.g., `Exit code 1`) with the 3-part diagnostic formula:
    `[What Failed] -> [Root Cause] -> [Actionable Fix]`.

### Lens 5: Implementation Readiness & Blast Radius (`egm-implementation-readiness`)
- **Blast Radius Analysis**:
  - `/dashboard`: Low risk. Replacing `OmniLaunchpad` with `StudioQuickLaunchStrip` touches only client markup; does not alter DB schemas.
  - `/library`: Low risk. Removing `QueueCard` removes local polling state and simplifies the query to durable completed assets.
  - `/queue`: Medium risk. Requires adding `/api/jobs/[id]/retry` and `/api/jobs/[id]/abort` endpoints. Must adhere to Supabase lease locking rules.
  - `/editor`: Medium risk. Adding asset swapping requires an API to query asset candidates (Openverse/Pexels) and re-render mutation.
  - `/planner`: Low-Medium risk. Expanding to a 30-day month grid requires client calendar math; data model already supports `scheduled_posts`.
- **Test Suite Safeguard**:
  - All additions must maintain green status across the 201+ standalone test runner (`tests/e2e/standalone-runner.js`). Any newly added routes must have corresponding tier assertions added to `standalone-runner.js` with tier registration in `const tiers = [...]`.

### Lens 6: Structural Architecture & Data Flow (`egm-structural`)
- **Data Boundaries**:
  - `/dashboard`: Server Component fetching high-level stats (`render_jobs`, `workspaces`, `scheduled_posts`) with `force-dynamic`.
  - `/create`: Client Component managing generation parameters, dynamic API key validation, and studio redirection.
  - `/library`: Client Component with local state for search query, active workspace filter, and batch-selected video IDs.
  - `/editor/[jobId]`: Server Component loading initial job data and presentation, rendering `DynamicTimelineEditor` via client dynamic boundary (`ssr: false`).
  - `/queue`: Client Component managing auto-refresh interval (5s) and optimistic deletions/retries.
  - `/planner`: Server Component fetching scheduled posts for the active month window, passing down to a responsive client calendar grid.

---

## 5. Prioritized Findings Matrix (Blockers -> Majors -> Nits)

### 🔴 Blockers (Must resolve before shipping implementation)
1. **Unclaimable Job State on Retry/Re-render (`/queue` & `/editor`)**:
   - *Reviewer Lens*: `egm-codebase-details`
   - *Scope*: `/api/jobs/[id]/retry` and `/editor` Re-Render handler.
   - *Discrepancy*: If retry sets `status: 'queued'` without explicitly setting `orchestration_state: 'retryable'`, the worker's `claim_render_job` RPC will skip the job indefinitely.
   - *Recommendation*: Enforce `orchestration_state: 'retryable'` on all retries. Guard with an E2E standalone runner assertion.
2. **Next.js 16 Async Route Params Crash (`/editor/[jobId]`)**:
   - *Reviewer Lens*: `egm-codebase-details`
   - *Scope*: `app/(app)/editor/[jobId]/page.tsx`
   - *Discrepancy*: Direct property access on `params.jobId` causes runtime failure under Next.js 16.
   - *Recommendation*: Always `await props.params` before reading `jobId`.

### 🟡 Majors (High architectural and usability impact)
1. **Surface Collision between `/dashboard` and `/create`**:
   - *Reviewer Lens*: `egm-design` & `egm-zoom-out`
   - *Scope*: `components/dashboard/OmniLaunchpad.tsx` vs `app/(app)/create/page.tsx`
   - *Discrepancy*: Full prompt input on `/dashboard` makes `/create` feel redundant and adds cognitive load.
   - *Recommendation*: Remove prompt textarea from `/dashboard`; replace with `StudioQuickLaunchStrip` routing to `/create?studio=...`.
2. **Redundant Queue Rendering in `/library`**:
   - *Reviewer Lens*: `egm-comprehension` & `egm-structural`
   - *Scope*: `app/(app)/library/page.tsx` lines 59-105
   - *Discrepancy*: `QueueCard` in `/library` duplicates `/queue` and clutters the asset catalog.
   - *Recommendation*: Strip `QueueCard` from `/library`; make `/library` a pure catalog with search, filter, and batch actions.
3. **Hardcoded `/create/footage` Link in `/library`**:
   - *Reviewer Lens*: `egm-design` & `egm-structural`
   - *Scope*: `app/(app)/library/page.tsx` line 254
   - *Discrepancy*: "Create Video" button in Library routes directly to `/create/footage` rather than the unified `/create` hub.
   - *Recommendation*: Update link to `/create`.
4. **Zundo Undo Stack Hydration Pollution (`/editor`)**:
   - *Reviewer Lens*: `egm-codebase-details`
   - *Scope*: `lib/store/timeline-store.ts` & `components/timeline/TimelineEditor.tsx`
   - *Discrepancy*: Hydrating beats into timeline store records a state change, causing `Cmd+Z` to clear all beats.
   - *Recommendation*: Hydrate with zundo tracking temporarily disabled.

### 🟢 Nits (Polish and ergonomics)
1. **Empty States Lacking Actionable Guidance**:
   - *Reviewer Lens*: `egm-design`
   - *Scope*: `/library`, `/queue`, `/planner`
   - *Discrepancy*: Bare text empty states without clear visual hierarchy or CTAs.
   - *Recommendation*: Adopt the standardized 3-part empty state (25% opacity icon + title + value prop + primary CTA).
2. **Planner Lacking Month View Navigation**:
   - *Reviewer Lens*: `egm-design` & `egm-zoom-out`
   - *Scope*: `app/(app)/planner/page.tsx`
   - *Discrepancy*: 7-day strip only shows immediate week; creators cannot plan 30-day content drops.
   - *Recommendation*: Add a toggle between 30-Day Month Grid and 7-Day Week Strip with previous/next month controls.

---

## 6. UI/UX Design Doctrine & Media Engine Framework Stack

All 6 surfaces will strictly adhere to the project's established design tokens, headless architecture, and accessibility gates:

### The 4-Tier Studio Framework Stack
1. **The Core UI Foundation (shadcn/ui + Tailwind CSS)**:
   - Built on repo-owned Radix UI primitives.
   - Provides deep customization for border radiuses, dark mode color tokens, and hover states matching high-end pro video suites (DaVinci Resolve, Premiere Pro).
   - *Scope*: Property panels, settings modals, dropdowns, contextual menus, and forms.
2. **NLE Timeline & Precision Scrubbers (React Aria Components by Adobe)**:
   - Headless, accessible primitives designed for complex multi-thumb scrubbers, timeline tracks, and sub-pixel drag interactions.
   - Handles math, keyboard navigation, and touch/mouse normalization without forcing CSS.
   - *Scope*: 7-slice Zustand-powered NLE timeline tracks (`/editor`), multi-select batch asset selection (`/library`), and keyboard-navigated calendar grids (`/planner`).
3. **High-Density Data & Analytics (Tremor / ScriptBreak Visualizations)**:
   - Specialized dark-mode dashboard cards, sparklines, and area charts for charting emotional tension curves and viral retention drop-offs.
   - *Scope*: ScriptBreak emotional tension curves (`/editor`), Studio Pulse KPI metrics (`/dashboard`), and distribution analytics (`/planner`).
4. **The Spatial Workspace (Custom-Themed React Flow / `@xyflow/react`)**:
   - Strips out default React Flow stylesheets in favor of Tailwind classes on custom nodes.
   - Renders standard shadcn/ui Card components *inside* spatial nodes to maintain visual symmetry between linear panels and infinite canvas graphs.

### Pro Video Engine Visual Hierarchy & Tokens
1. **Semantic Luminance Depth**:
   - `Layer 0 (Canvas Base)`: `bg-background` (`#09090b` / `zinc-950`). Deep neutral true black ensures video previews and canvas nodes are the most saturated elements on screen.
   - `Layer 1 (Panels & Shell)`: `bg-card/80` (`#18181b` / `zinc-900/80`) with subtle luminous border `border-border/40`.
   - `Layer 2 (Floating Popovers & Menus)`: `bg-popover` (`#27272a` / `zinc-800`) with `shadow-xl border-white/5`.
   - `Layer 3 (Modals & Drawers)`: `bg-black/80 backdrop-blur-md`.
2. **Typography**:
   - High-legibility sans-serif (`Geist Sans` / `Inter`) for headings and body copy.
   - Clean monospaced font (`Geist Mono` / `JetBrains Mono`) for timecodes (`00:01:24.12`), durations, frame indices, and diagnostic logs.
3. **Icons & Density**:
   - Lucide React stroke-based icons with consistent stroke-width (1.5px / 2.0px) pairing cleanly with dense toolbars and 11px microcopy badges.
4. **Color Restraint (Anti-AI-Slop)**:
   - Primary violet/purple (`violet-600` / `violet-500`) is reserved exclusively for primary CTAs, active selections, and creation triggers. No full-card purple gradients.
5. **8-State Interactive Model**:
   - Every interactive element (buttons, cards, inputs, tabs) must explicitly support:
     (1) Default, (2) Hover, (3) Focus-visible, (4) Active, (5) Disabled, (6) Loading, (7) Error, (8) Selected.
6. **WCAG 2.2 Accessibility Gates**:
   - All text meets 4.5:1 contrast minimum.
   - Touch targets meet 44x44px minimum.
   - All icon buttons feature explicit `aria-label` or `title` attributes.

---

## 7. Phased Implementation Roadmap & Verification Plan

### Phase 1: Decouple Dashboard & Library (Immediate Cognitive Relief)
- [ ] Remove prompt textarea from `components/dashboard/OmniLaunchpad.tsx`; replace with `StudioQuickLaunchStrip`.
- [ ] Remove `QueueCard` from `app/(app)/library/page.tsx`.
- [ ] Fix hardcoded `/create/footage` link in `/library` to `/create`.
- [ ] Add Search input, Workspace filter, and Sort dropdown to `/library`.

### Phase 2: Centralize Creation in `/create`
- [ ] Add tabbed filtering (`All`, `Social & Viral`, `Explainer`, `Cinema`, `Utility`) to `components/create/WorkflowGrid.tsx`.
- [ ] Add Director vs. Auto-Pilot mode toggle to `components/create/MissionPromptBar.tsx`.
- [ ] Ensure key readiness badges accurately reflect keyless ($0) vs. key-required workflows.

### Phase 3: Upgrade Operational Queue (`/queue`)
- [ ] Implement `POST /api/jobs/[id]/retry` setting `orchestration_state: 'retryable'`, `status: 'pending'`.
- [ ] Implement `POST /api/jobs/[id]/abort` setting `orchestration_state: 'failed'`, `status: 'failed'`.
- [ ] Build 3-part diagnostic log drawer in `app/(app)/queue/page.tsx`.
- [ ] Add live polling toggle with 5s countdown indicator.

### Phase 4: Upgrade Timeline Editor (`/editor`)
- [ ] Add top Action & Export bar with Re-Render button (`orchestration_state: 'retryable'`).
- [ ] Add Beat & Asset Inspector drawer with duration stepper and Openverse/Pexels asset swap.
- [ ] Add BGM ducking and volume slider to audio track.
- [ ] Verify Zundo undo stack does not record initial hydration.

### Phase 5: Expand Content Planner (`/planner`)
- [ ] Implement 30-Day Month Grid view with month navigation (`< Previous`, `Next >`, `Today`).
- [ ] Add hover `+ Schedule` action on empty date cells that opens the scheduling modal with video picker.
- [ ] Display multi-platform distribution pills (YouTube, TikTok, Instagram) on scheduled cards.

### Verification Gate
- [ ] Run `pnpm lint:scoped` -> must report 0 errors.
- [ ] Run `pnpm typecheck` -> must exit 0.
- [ ] Run `pnpm test` (standalone runner: 201+ tests) -> must achieve 100% pass rate.
