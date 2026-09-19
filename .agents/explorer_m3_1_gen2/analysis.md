# Milestone 3 Explorer Report: Create Hub & Wizard Routes Investigation

## Executive Summary
This report presents an architectural investigation of the Create Workflow routes in Clipped AI Studio, focusing on:
1. **Create Hub Route (`app/(app)/create/page.tsx`)**: Workflow catalog, 10 generation pipelines, dynamic API configuration status integration via `useApiKeys`, category filtering, search, and one-click Automatic Mission prompt bar.
2. **Four Creation Wizard Routes**:
   - `app/(app)/create/ai-videos/page.tsx`
   - `app/(app)/create/footage/page.tsx`
   - `app/(app)/create/images/page.tsx`
   - `app/(app)/create/stories/page.tsx`
   All four routes are client components utilizing the shared `CreationWizard` component and the central Zustand store (`useWizardStore`).
3. **Test Architecture Recommendations**:
   - Comprehensive test design for `test/pages/create/create-hub.test.tsx` (hub catalog, filters, API key indicators, prompt bar).
   - Comprehensive test design for `test/pages/create/wizards.test.tsx` (all 4 wizard routes, multi-step navigation, voice preview playback, subtitles configuration, auto-pilot mode, and queue submission).

---

## 1. Create Hub Route Analysis (`app/(app)/create/page.tsx`)

### Component Architecture & Directive
- **File**: `app/(app)/create/page.tsx`
- **Directive**: `"use client"`
- **Component**: `CreateHubPage`
- **Dependencies**:
  - `components/create/useApiKeys.ts`
  - `components/create/workflow-definitions.ts`
  - `components/create/MissionPromptBar.tsx`
  - `components/create/WorkflowGrid.tsx`
  - `components/create/WorkflowCard.tsx`

### UI Structure & Integrations

#### 1. Header & Quick Actions
- **Heading**: `<h1 className="text-3xl font-bold tracking-tight text-foreground">Create Studio</h1>`
- **Badge**: `<span ...>10 Workflows</span>` (with `Sparkles` icon)
- **Subtitle**: `"Choose an AI generation workflow or use 1-click Auto Pilot to produce viral videos in seconds."`
- **Refresh Keys Button**:
  - Label: `"Refresh Keys"` with `RefreshCw` icon (`loading ? "animate-spin" : ""`)
  - Tooltip/title: `"Refresh API Key status"`
  - Disabled state: `disabled={loading}`
  - Action: Invokes `refresh()` from `useApiKeys()`
- **API Settings Navigation Link**:
  - Target: `<Link href="/settings">`
  - Icon: `Key`
  - Label: `"API Settings"`

#### 2. Hero One-Click Automatic Mission Prompt Bar (`MissionPromptBar`)
- **Title**: `"One-Click Automatic Mission"` with `"Auto-Pilot"` pill badge
- **Input**:
  - Placeholder: `"Type any video topic & hit Enter (e.g., 'How black holes warp spacetime')..."`
  - State: Controlled `prompt` state
- **Launch Button**:
  - Label: `"Auto Generate"` (or `"Starting..."` with `Loader2` when submitting)
  - Disabled state: `!prompt.trim() || isSubmitting`
- **Suggestions**:
  - `Ancient Roman Engineering & Aqueducts`
  - `5 Psychology Tricks That Actually Work`
  - `Quantum Computing in 60 Seconds`
  - `Cyberpunk AI News & Future Tech`
  - `How Black Holes Warp Spacetime`
  - Clicking any chip populates the input field.
- **Submission Flow**:
  - Dispatches POST request to `/api/workflows/mission` with body `{ prompt, aspectRatio: "9:16", style: "cinematic", voice: "alloy" }`.
  - On success with `data.jobId`: `router.push('/create/mission/' + data.jobId)`.
  - On failure / fallback: navigates to `/create/mission/${fallbackJobId}?prompt=...&autoStart=true`.

#### 3. Workflow Grid & Filtering (`WorkflowGrid`)
- **Category Tabs** (5 tabs):
  - `all`: "All Workflows"
  - `avatar-wb`: "Avatars & Whiteboards"
  - `ai-video`: "AI Generative"
  - `stock`: "Stock Footage"
  - `automation`: "Automation & Series"
- **Status Filter Pills**:
  - Ready Filter: `{stats.readyCount} Ready` (with `CheckCircle2` icon)
  - Fallback Filter: `{stats.fallbackCount} Fallback` (with `AlertCircle` icon)
  - Unset Filter: `{stats.errorCount} Unset` (with `XCircle` icon, conditionally shown if `stats.errorCount > 0`)
  - Clicking any pill toggles filter by `evaluation.status` (`'ready' | 'warning' | 'error'`).
- **Search Input**:
  - Placeholder: `"Search workflows & models..."`
  - Matches across workflow `title`, `description`, and `primaryProviders`.
- **Empty State**:
  - When no workflows match search or category filter: renders `"No workflows match your filter"` and a `"Clear Filters"` button that resets category, status, and search query.

#### 4. Workflow Cards (`WorkflowCard`)
All 10 workflows defined in `components/create/workflow-definitions.ts`:

| # | ID | Title | Route (`href`) | Cost Tier | Category | Primary Providers | Has Fallback | Badge |
|---|----|-------|----------------|-----------|----------|-------------------|--------------|-------|
| 1 | `footage` | Stock Footage Video | `/create/footage` | `$` | `stock` | `pexels`, `pixabay`, `gemini` | Yes | - |
| 2 | `images` | AI Images Video | `/create/images` | `$$` | `ai-video` | `fal`, `openai`, `gemini` | Yes | - |
| 3 | `ai-videos` | AI Videos | `/create/ai-videos` | `$$$` | `ai-video` | `kling`, `luma`, `fal` | Yes | - |
| 4 | `stories` | Stories Generator | `/create/stories` | `$$` | `automation` | `gemini`, `openai` | Yes | - |
| 5 | `bulk` | Bulk Planner | `/create/bulk` | `$$` | `automation` | `gemini`, `openai` | Yes | - |
| 6 | `shorts` | Extract Shorts | `/create/shorts` | `$` | `automation` | `gemini`, `openai` | Yes | - |
| 7 | `drama` | Micro-Drama | `/create/drama` | `$$$` | `ai-video` | `fal`, `kling`, `gemini` | Yes | - |
| 8 | `auto` | Auto Pilot | `/create/auto` | `$$` | `automation` | `gemini`, `openai`, `pexels` | Yes | - |
| 9 | `avatar` | Avatar to Video | `/create/avatar` | `$$$` | `avatar-wb` | `heygen`, `did` | Yes | `NEW` |
| 10 | `whiteboard` | Whiteboard Animation | `/create/whiteboard` | `$` | `avatar-wb` | `gemini` | Yes | `NEW` |

- **Status Dot & Evaluation Logic** (`evaluateWorkflowStatus`):
  - **Ready (`ready`)**: At least one `primaryProvider` is configured in `keyStatusMap` (green dot, label `"Ready"`).
  - **Warning (`warning`)**: No primary providers configured, but `hasFallback: true` (amber dot, label `"Fallback"`, lists active fallback engine). Note: All 10 workflows define `hasFallback: true`.
  - **Error (`error`)**: No primary providers configured and `hasFallback: false` (rose dot, label `"Keys Needed"`).
- **Settings Gear Shortcut**:
  - Each card includes a button with `Settings` icon and `aria-label={`Open settings for ${workflow.title}`}` (title: `"Manage API Keys for this workflow"`).
  - Clicking this navigates to `workflow.settingsUrl` without triggering card link navigation.
- **Glassmorphic Hover Popover**:
  - Hovering on the status pill displays a popover breakdown of each primary provider (e.g. `pexels`, `pixabay`, `gemini`) showing `Configured` (with masked key) or `Missing`, fallback message, and link to `"Configure in Settings"`.

---

## 2. Wizard Routes Analysis

All 4 target wizard routes share an identical, elegant composition:
- `app/(app)/create/ai-videos/page.tsx` -> renders `<CreationWizard workflowType="ai-videos" />`
- `app/(app)/create/footage/page.tsx` -> renders `<CreationWizard workflowType="footage" />`
- `app/(app)/create/images/page.tsx` -> renders `<CreationWizard workflowType="images" />`
- `app/(app)/create/stories/page.tsx` -> renders `<CreationWizard workflowType="stories" />`

All are `"use client"` routes.

### Centralized Wizard Store (`components/wizard/wizard-store.ts`)
The wizard state is driven by a singleton Zustand store `useWizardStore`:
- **State Properties**:
  - `workflowType`: string (`'footage' | 'images' | 'ai-videos' | 'stories' | ...`)
  - `step`: number (0 to 4)
  - `furthestStep`: number
  - `aspectRatio`: `'9:16' | '16:9' | '1:1'` (default: `'9:16'`)
  - `subject`: string
  - `tone`: string (default: `'Documentary'`)
  - `targetDuration`: number (default: `30`)
  - `narration`: string
  - `keywords`: string[]
  - `beats`: `Beat[]` (id, text, keywords, duration, candidates, selectedId)
  - `voiceService`: string (default: `'OpenAI TTS'`)
  - `voice`: string (default: `'alloy'`)
  - `voiceSpeed`: number (default: `1.0`)
  - `musicSource`: string (default: `'Random Background Music'`)
  - `burnSubtitles`: boolean (default: `true`)
  - `subtitlePreset`: string (default: `'Hormozi Pop'`)
  - `subtitleColor`, `subtitleHighlightColor`, `subtitleOutline`, `subtitleGlow`, etc.
  - `subtitleY`: number (default: `78`)
  - `autoPublish`: boolean (default: `false`)
  - `autoMode`: boolean (default: `false`)
  - `busy`: string | null
  - `error`: string | null
- **Key Store Methods**:
  - `goToStep(step)`: Navigates to a specific step.
  - `next()`: Increments `step`, updates `furthestStep`.
  - `back()`: Decrements `step`.
  - `reset()`: Resets store to initial state.
  - `applySubtitlePreset(presetId)`: Updates subtitle configuration according to one of 6 presets (`Hormozi Pop`, `Cyber Neon`, `Minimalist Clean`, `Cinematic Boxed`, `Bold Impact`, `Retro Karaoke`).
  - `set(key, value)`: Generic property setter.

### Step-by-Step Breakdown (`CreationWizard.tsx`)

#### Top Navigation Bar & Global Actions
- Navigation buttons for all 5 steps:
  1. `1. Script` (Icon: `Layout`)
  2. `2. Scenes` (Icon: `Sparkles`)
  3. `3. Voice` (Icon: `Mic`)
  4. `4. Subtitles` (Icon: `Type`)
  5. `5. Render` (Icon: `FileVideo`)
- Steps completed (`index <= furthestStep`) can be clicked to jump directly.
- **Auto-Pilot Button**:
  - Header button with `Sparkles` icon.
  - Executes `runAutoMode()`:
    1. If `narration` empty: POSTs to `/api/v1/script` with subject & tone.
    2. POSTs to `/api/v1/analyze` to break narration into scenes/beats.
    3. Loops beats and POSTs to `/api/v1/source` to fetch candidate clips.
    4. Navigates to Step 4 (Render) with `furthestStep = 4`.

#### Step 0: Script (`ScriptStep.tsx`)
- **Inputs**:
  - `Subject / Topic` input (placeholder: `"e.g. 5 hidden features of iOS 18"`).
  - `Tone` dropdown (`Documentary`, `Energetic`, `Educational`, `Humorous`, `Dramatic`).
  - `Target Duration (seconds)` input (default: `30`).
  - `Generate with AI` button (triggers `/api/v1/script` and populates narration & keywords).
  - `Narration Script` textarea (placeholder: `"Write or paste your narration here..."`).
  - Dynamic word counter (`{n} words`).

#### Step 1: Scenes (`ScenesStep.tsx`)
- **Empty State**: When `w.beats.length === 0`:
  - Renders dashed container with:
    - `"No scenes generated yet."`
    - `"Go back to step 1 and break down the script, or use Auto-pilot."`
- **Populated State**:
  - Uses `@dnd-kit/core` (`DndContext`) and `@dnd-kit/sortable` (`SortableContext`) with vertical list sorting.
  - Each `SortableBeat` card renders:
    - Drag handle (`GripVertical`)
    - Scene number index
    - Beat narration text
    - Duration (`{beat.duration}s`) and keywords pills
    - Video/Image candidate preview with "Change Asset" overlay button
- **CreationWizard Secondary Action**:
  - When on Step 1, top/bottom bar displays `"Re-break with AI"` button calling `runBreakdown()`.

#### Step 2: Voice (`VoiceStep.tsx`)
- **Provider Selector**:
  - 5 provider buttons: `OpenAI TTS`, `Azure Speech (Neural)`, `ElevenLabs`, `Google Cloud`, `Free & Keyless`.
- **Voice Catalog Grid**:
  - For each voice: Name, provider badge, language tag (e.g. `en-US`, `en-IN`, `hi-IN`), gender (`male`, `female`, `neutral`).
  - Selection: Clicking card sets `w.voice`.
  - Audio Preview: Play/Pause button triggers POST to `/api/tts/preview` and plays returned `audioUrl` via `new Audio(url)`.
- **Speech Speed Slider**:
  - Range: `0.75x` to `1.5x` with real-time numeric display.
- **Background Soundtrack Selector**:
  - Dropdown options: `Random Background Music`, `Epic / Cinematic`, `Lo-Fi / Chill`, `Upbeat / Energy`, `Ambient / Subtle`, `None`.

#### Step 3: Subtitles (`SubtitlesStep.tsx`)
- **Master Burn-in Switch**:
  - Toggle switch with `role="switch"` and `aria-checked={w.burnSubtitles}`.
- **Live Sandbox Banner**:
  - Real-time animated word-by-word preview (`DEMO_WORDS`) cycling every 750ms with spring physics, neon glow, and outlines.
  - 4 backdrop themes: `cinema`, `cyber`, `sunset`, `studio`.
- **3 Configuration Tabs**:
  1. `6 Visual Presets` (`presets` tab):
     - Grid of 6 presets: `Hormozi Pop`, `Cyber Neon`, `Minimalist Clean`, `Cinematic Boxed`, `Bold Impact`, `Retro Karaoke`.
     - Each card contains title, tag badge, mini animated preview (`PresetMiniPreview`), description, and color swatches.
     - Clicking applies the preset configuration via `w.applySubtitlePreset(preset.id)`.
  2. `Position Selector` (`position` tab):
     - Interactive smartphone mockup displaying Top (15%), Center (50%), and Bottom (78%) clickable regions.
     - Vertical height fine-tuning range slider (5% to 95%).
  3. `Custom Styling` (`custom` tab):
     - Primary text color picker & 8 swatches.
     - Active word highlight color picker & 8 swatches.
     - Radiant Neon Glow toggle & glow color picker.
     - Outline / stroke width slider & outline color swatches.
     - Frosted Translucent Box toggle, box color, opacity, and radius.

#### Step 4: Render (`RenderStep.tsx`)
- **Aspect Ratio Selector**:
  - Options: `Portrait (9:16)`, `Landscape (16:9)`, `Square (1:1)`.
- **Auto Publish Checkbox**:
  - Checkbox: `"Publish to connected accounts"`.
- **Final Review Card**:
  - Workflow Type display (formatted capitalized).
  - Scenes / Beats count.
  - Target Duration calculation (sum of beat durations).
  - Selected Voiceover voice.
  - Subtitles status (Enabled/Disabled).
- **Readiness State**:
  - `ready` definition: `w.beats.length > 0 && w.narration.trim().length > 0 && w.beats.every(b => b.candidates?.length)`.
  - When incomplete: displays `"Incomplete"` badge in review card.
  - When ready: displays green confirmation banner `"Ready to generate"`.
- **Submission ("Send to Queue")**:
  - CreationWizard footer button shows `"Send to Queue"` with `Play` icon.
  - Disabled when not `ready`, `submitting`, or `autoMode`.
  - POSTs complete payload to `/api/workflows/generate`.
  - On success: `router.push('/dashboard?job=' + data.jobId)`.

#### Live Preview Rail (`LivePlayer.tsx`)
- Fixed sidebar / top preview container displaying aspect ratio frame (`aspect-[9/16]`, `aspect-video`, or `aspect-square`).
- When `w.beats.length === 0`: displays `"Add scenes to see live preview"`.
- When scenes exist: displays live preview with beat count and total duration in seconds.
- On step 3 (Subtitles), displays interactive draggable subtitle positioning box overlay.

---

## 3. Test Architecture Recommendations

### A. Test Suite 1: `test/pages/create/create-hub.test.tsx`

#### Responsibilities & Target Scope
Tests `app/(app)/create/page.tsx` as a headless client component within JSDOM and React Testing Library.

#### Mock Requirements
1. **Routing**: Handled by `test/setup.ts` (`next/navigation` mock for `useRouter`, `useSearchParams`, `usePathname`).
2. **Fetch API Mocking**:
   - `GET /api/settings/keys`: Needs default mock returning `{ success: true, keys: {} }` (already in `test/setup.ts`), with ability in specific tests to spy and return configured keys.
   - `POST /api/workflows/mission`: Returns `{ success: true, jobId: 'mock-mission-job-123' }`.
3. **Local Storage / Cache**: `localStorage.clear()` in `beforeEach` to prevent cached API keys from leaking between tests.

#### Recommended Test Cases
```tsx
describe('Create Hub Route Headless Test (app/(app)/create/page.tsx)', () => {
  // 1. Mount & Header Layout
  it('renders Create Studio heading, 10 Workflows badge, and navigation actions', async () => { ... });

  // 2. Mission Prompt Bar Interactions
  it('renders One-Click Automatic Mission prompt bar and suggestion chips', async () => { ... });
  it('populates prompt input when a suggestion chip is clicked', async () => { ... });
  it('submits mission prompt and navigates to mission progress view', async () => { ... });

  // 3. Workflow Grid & Catalog
  it('renders all 10 video generation workflow cards', async () => { ... });
  it('renders NEW badges on Avatar and Whiteboard cards', async () => { ... });
  it('displays cost tier badges ($, $$, $$$) for all workflows', async () => { ... });
  it('provides direct links to each workflow wizard route', async () => { ... });

  // 4. Category & Search Filtering
  it('filters workflow cards by category tabs (e.g. Stock Footage, AI Generative)', async () => { ... });
  it('filters workflow cards by search query in real-time', async () => { ... });
  it('shows empty state with Clear Filters button when no workflows match search', async () => { ... });

  // 5. API Configuration Status & Settings Shortcuts
  it('evaluates status indicators correctly with fallback mode when keys are missing', async () => { ... });
  it('evaluates status indicators to Ready when required providers are configured', async () => { ... });
  it('navigates to settings tab when card settings gear icon is clicked', async () => { ... });
  it('refreshes API keys when Refresh Keys button is clicked', async () => { ... });
});
```

### B. Test Suite 2: `test/pages/create/wizards.test.tsx`

#### Responsibilities & Target Scope
Tests the four Creation Wizard routes:
- `app/(app)/create/ai-videos/page.tsx`
- `app/(app)/create/footage/page.tsx`
- `app/(app)/create/images/page.tsx`
- `app/(app)/create/stories/page.tsx`

#### Critical Isolation Requirement: Zustand Store Reset
Because `useWizardStore` is a singleton Zustand store, **every test MUST call `useWizardStore.getState().reset()` inside `beforeEach`** to prevent state bleeding (e.g., leftover narration, beats, or steps) across test cases.

#### Mock Requirements
1. **Routing**: `useRouter` mock from `test/setup.ts`.
2. **Fetch Endpoints**:
   - `POST /api/v1/script`: Returns `{ success: true, narration: 'Mock AI script narration', keywords: ['ai', 'tech'] }`.
   - `POST /api/v1/analyze`: Returns `{ success: true, scenes: [{ id: 'beat-0', text: 'Scene 1', keywords: ['city'], duration: 5 }] }`.
   - `POST /api/v1/source`: Returns `{ success: true, candidates: [{ id: 'c1', url: 'https://example.com/clip.mp4', platform: 'pexels' }] }`.
   - `POST /api/tts/preview`: Returns `{ success: true, audioUrl: 'mock-audio.mp3' }` (already in `test/setup.ts`).
   - `POST /api/workflows/generate`: Returns `{ success: true, jobId: 'job-generate-789' }`.
3. **Media Elements**: `window.Audio` and `HTMLMediaElement.prototype.play/pause` (already mocked in `test/setup.ts`).
4. **DOM Polyfills**: `ResizeObserver` and `IntersectionObserver` (already mocked in `test/setup.ts`).

#### Recommended Test Cases
```tsx
describe('Creation Wizard Routes Headless Test (ai-videos, footage, images, stories)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useWizardStore.getState().reset();
  });

  // Route 1: AI Videos
  it('mounts AI Videos workflow route and initializes store with ai-videos type', async () => { ... });

  // Route 2: Stock Footage
  it('mounts Stock Footage workflow route and renders initial Script step', async () => { ... });

  // Route 3: AI Images
  it('mounts AI Images workflow route and verifies tone selector and word counter', async () => { ... });

  // Route 4: Stories Generator
  it('mounts Stories workflow route and renders live preview rail empty state', async () => { ... });

  // Multi-step Navigation & Components
  it('navigates from Script step to Scenes step and renders empty scenes state', async () => { ... });
  it('renders populated scenes list with candidate assets when beats exist', async () => { ... });
  it('renders Voice step with synthesis providers, speech speed slider, and music selector', async () => { ... });
  it('triggers voice audio preview playback without errors', async () => { ... });
  it('renders Subtitles step with master burn-in toggle and 6 visual presets', async () => { ... });
  it('switches between Subtitle tabs (Presets, Position, Custom Styling)', async () => { ... });
  it('renders Render step with review summary and aspect ratio selector', async () => { ... });
  it('submits generation job to queue when all steps are completed', async () => { ... });
  it('executes Auto-Pilot mode to automatically advance wizard through pipeline', async () => { ... });
});
```

---

## 4. Potential Pitfalls & Defensive Considerations

1. **Zustand State Bleed**:
   - `CreationWizard` synchronizes `workflowType` via `useEffect`. If a test changes the active step to `4` or populates `beats`, subsequent tests rendering another wizard route will start with step 4 or pre-existing beats if `reset()` is not explicitly called.
   - **Resolution**: Call `useWizardStore.getState().reset()` in `beforeEach()`.

2. **Async React State Transitions**:
   - `ScriptStep`, `ScenesStep`, `VoiceStep`, and `CreationWizard` contain asynchronous fetch calls and framer-motion transitions.
   - **Resolution**: Always wrap assertions verifying post-action state in RTL's `waitFor(() => { ... })`.

3. **Audio Object Stubs**:
   - `VoiceStep` calls `new Audio(data.audioUrl)` and attaches `onended` and `onerror` handlers before calling `.play()`.
   - **Resolution**: Verified that `test/setup.ts` already has a comprehensive `MockAudio` class providing `play()`, `pause()`, `addEventListener()`, and event handlers.

4. **@dnd-kit Sensoring in JSDOM**:
   - `ScenesStep` utilizes `useSensors(useSensor(PointerSensor), ...)`. In JSDOM, dragging does not occur natively, but mounting and rendering `DndContext` and `SortableContext` succeeds without throwing when standard DOM elements and mocks are present.

5. **Framer Motion Animations**:
   - `LivePlayer`, `SubtitlesStep`, and `CreationWizard` use `motion.div`, `motion.span`, and `AnimatePresence`.
   - In JSDOM, framer-motion renders markup cleanly. No additional mock is required.

---

## 5. Summary & Hand-off Checklist for Implementer
- [x] Examined `app/(app)/create/page.tsx` and all child components (`WorkflowGrid`, `WorkflowCard`, `MissionPromptBar`, `useApiKeys`, `workflow-definitions`).
- [x] Examined all 4 wizard routes (`ai-videos`, `footage`, `images`, `stories`) and their step components (`ScriptStep`, `ScenesStep`, `VoiceStep`, `SubtitlesStep`, `RenderStep`, `LivePlayer`).
- [x] Verified Zustand store structure (`wizard-store.ts`) and reset pattern.
- [x] Designed clear, robust test specs for `test/pages/create/create-hub.test.tsx` and `test/pages/create/wizards.test.tsx`.
- [x] Identified all mock requirements and potential pitfalls for the implementation phase.
