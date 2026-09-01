# Handoff Report — Milestone 2: UI & Frontend Architecture for Automatic Mission Mode

## 1. Observation

### 1.1 Existing Create Hub & Prompt Submission Flow
- **`components/create/MissionPromptBar.tsx` (lines 20–35)**:
  ```tsx
  export function MissionPromptBar({ onStartMission }: MissionPromptBarProps) {
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt) return;

      setIsSubmitting(true);
      if (onStartMission) {
        onStartMission(cleanPrompt);
      } else {
        router.push(`/create/auto?prompt=${encodeURIComponent(cleanPrompt)}&autoStart=true`);
      }
    };
  ```
  - **Observation**: Currently, `handleSubmit` routes to `/create/auto?prompt=...&autoStart=true` as a placeholder. In Milestone 2, submitting a prompt must trigger `POST /api/workflows/mission` or generate a mission session and immediately navigate to `/create/mission/[id]`.

- **`app/(app)/create/page.tsx` (lines 54–56)**:
  ```tsx
  {/* Hero 1-Click Automatic Mission Prompt Bar */}
  <MissionPromptBar />
  ```
  - **Observation**: `MissionPromptBar` is prominently rendered at the top of the Create Hub with suggestions and direct keyboard Enter trigger.

### 1.2 Wizard Store & Component Structure
- **`components/wizard/wizard-store.ts` (lines 37–99, 146–176)**:
  - Defines `useWizardStore` Zustand store managing:
    - `workflowType`: `'footage' | 'images' | 'ai-videos' | 'stories' | 'bulk-plan' | 'extract-shorts' | 'micro-drama' | 'auto'`
    - `step`: `0` (Script), `1` (Scenes), `2` (Voice), `3` (Subtitles), `4` (Render)
    - `furthestStep`: number tracking allowed navigation steps
    - `subject`, `narration`, `keywords`: string / string[]
    - `aspectRatio`: `'9:16' | '16:9' | '1:1'`
    - `voice`, `voiceService`, `voiceoverMode`, `musicSource`: string
    - `beats`: `Beat[]` where each `Beat` has `{ id, text, keywords, duration, candidates?: Footage[], selectedId?: string }`
    - `burnSubtitles`, `subtitlePreset`, `subtitleColor`, `subtitleSize`, `subtitleY`, `subtitleOutlineWidth`
    - Store actions: `set(key, value)`, `goToStep(step)`, `next()`, `back()`, `reset()`.
- **`components/wizard/CreationWizard.tsx` (lines 33–39)**:
  ```tsx
  // Initialize the workflow type in the store
  useEffect(() => {
    if (w.workflowType !== workflowType) {
      w.reset()
      w.set('workflowType', workflowType)
    }
  }, [workflowType])
  ```
  - **Observation**: When `CreationWizard` mounts with `workflowType="footage"`, it checks `if (w.workflowType !== workflowType)`. If `useWizardStore` already has `workflowType === 'footage'`, it skips `w.reset()`, keeping all hydrated data intact.

### 1.3 Remotion Player & Composition Architecture
- **`components/wizard/LivePlayer.tsx` (lines 34–67)**:
  - Embeds `@remotion/player` rendering `MainComposition` with props: `beats`, `burnSubtitles`, `subtitleStyle`, `aspectRatio`.
- **`remotion/Composition.tsx` (lines 111–153)**:
  - `MainComposition` accepts `beats: BeatProp[]` (`id`, `text`, `duration`, `clipUrl`, `audioUrl`), `burnSubtitles: boolean`, `subtitleStyle`, `bgmUrl`, and renders dynamic `<Sequence>` blocks with `<RemotionVideo>`, `<img>`, and `<SubtitleOverlay>` pop animations.

### 1.4 Type Contracts in `lib/engine/types.ts` (lines 475–512)
- Type definitions already exist:
  ```ts
  export type MissionStage =
    | 'prompt_analysis'
    | 'script_generation'
    | 'scene_planning'
    | 'asset_sourcing'
    | 'voice_synthesis'
    | 'video_composition'
    | 'ready';

  export interface MissionStepStatus {
    stage: MissionStage;
    label: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    startedAt?: string;
    completedAt?: string;
    log?: string;
  }

  export interface MissionJobState {
    jobId: string;
    prompt: string;
    aspectRatio: AspectRatio;
    style: string;
    voice: string;
    currentStage: MissionStage;
    overallProgress: number;
    steps: MissionStepStatus[];
    script?: string;
    scenes?: Scene[];
    audioUrl?: string;
    videoUrl?: string;
    error?: string;
  }
  ```

---

## 2. Logic Chain

1. **Prompt Submission Flow**:
   - In `MissionPromptBar.tsx`, when the user inputs a topic and hits Enter or clicks "Auto Generate", the component executes a `POST /api/workflows/mission` request with `{ prompt, aspectRatio: '9:16', style: 'cinematic', voice: 'onyx' }`.
   - The API immediately creates a pending `render_jobs` record in Supabase (or in-memory registry) and returns `{ success: true, jobId, status: 'processing', progressUrl: '/create/mission/[jobId]' }`.
   - `MissionPromptBar.tsx` pushes the route to `/create/mission/${jobId}`. If a network hiccup occurs before the POST resolves, it falls back gracefully by generating a local `jobId = crypto.randomUUID()` and navigating to `/create/mission/${jobId}?prompt=${encodeURIComponent(cleanPrompt)}&autoStart=true`.

2. **Mission Progress Page Architecture (`/create/mission/[id]`)**:
   - On page mount, `useMissionProgress(id)` polls `GET /api/workflows/mission?id=${id}` (every 1000ms) or connects to an SSE event stream `/api/workflows/mission/stream?id=${id}`.
   - The UI divides into a 2-column glassmorphism layout:
     - **Left Column**:
       - **Mission Hero Info Card**: Prompt title, aspect ratio badge (9:16), voice model, elapsed timer, and overall progress bar (0–100%).
       - **5-Stage Stepper Visualizer**:
         1. *Script Generation* (LLM narrative & hook)
         2. *Scene Planning* (Breakdown into shot-length beats & keywords)
         3. *Asset Sourcing* (Pexels / Pixabay / AI visuals matched per scene)
         4. *Neural Audio* (TTS voiceover generation)
         5. *Video Composition* (Remotion sequencing, subtitles, final composite)
         - Each step features animated state icons (pulsing spinner for in-progress, green checkmark for completed, clock for pending, red exclamation for failed).
       - **Real-Time Log Console**: Terminal-style live stream displaying timestamped event logs with colored log-level badges (`INFO`, `SUCCESS`, `WARN`, `ERROR`), auto-scroll, and copy log actions.
     - **Right Column**:
       - **Live Video Preview / Remotion Player**:
         - While in progress: Interactive storyboard preview showing scene cards and thumbnails as they get sourced.
         - Once Stage 5 is ready / completed: Full `@remotion/player` embedding `MainComposition` with playback controls, subtitle styling, and audio sync.
       - **Mission Details & Metrics Panel**: Word count, duration, number of scenes/beats, cost tier badge.
       - **"Manual / Edit in Wizard" CTA**: Prominent action card allowing the user to take manual control.

3. **State Transfer Mechanism ("Manual / Edit in Wizard")**:
   - When the user clicks "Manual / Edit in Wizard":
     a. The handler takes the current `MissionJobState` (prompt, script, scenes, audioUrl, aspectRatio, voice).
     b. It transforms `scenes` into `Beat[]` format accepted by `useWizardStore`:
        ```ts
        const beats: Beat[] = (jobState.scenes || []).map((scene, idx) => ({
          id: scene.id || `beat-${idx}`,
          text: scene.text,
          keywords: scene.keywords || [],
          duration: scene.duration || 3,
          selectedId: `cand-${idx}`,
          candidates: [{
            id: `cand-${idx}`,
            url: scene.videoUrl || scene.imageUrl || scene.selectedVideo?.url || '',
            title: scene.description || `Scene ${idx + 1}`,
            platform: scene.selectedVideo?.platform || 'pexels',
            thumbnail: scene.selectedVideo?.thumbnail || scene.imageUrl || '',
            duration: scene.duration || 3,
            score: 1.0,
            reason: 'Mission Mode Sourced',
          }],
        }));
        ```
     c. It invokes `useWizardStore.setState` or store setters:
        - `workflowType`: `'footage'`
        - `subject`: `jobState.prompt`
        - `narration`: `jobState.script || ''`
        - `beats`: `beats`
        - `voice`: `jobState.voice || 'onyx'`
        - `aspectRatio`: `jobState.aspectRatio || '9:16'`
        - `step`: `jobState.scenes?.length ? 1 : 0` (or step 4 for direct render review)
        - `furthestStep`: `4` (unlocking all 5 wizard steps for instant user navigation)
        - `autoMode`: `false`
     d. It navigates the router to `/create/footage`.
     e. In `CreationWizard.tsx`, because `w.workflowType === 'footage'`, the `useEffect` initialization check `w.workflowType !== workflowType` evaluates to `false`, preventing `w.reset()`, and leaving all transferred state fully hydrated!

---

## 3. Caveats

- **No Caveats on Core Architecture**: The existing codebase already contains all necessary primitives (`useWizardStore`, `MainComposition`, `LivePlayer`, `types.ts`, and `/create/footage`).
- **Network Mode Resilience**: When Supabase or external AI APIs (OpenAI/ElevenLabs/Pexels) are unconfigured or offline, the backend falls back to deterministic mock generators. The UI handles both live and mock data identically through standard contracts.
- **Remotion Bundle Size**: The `@remotion/player` is dynamically imported or wrapped as a client component to avoid SSR hydration mismatches in Next.js App Router.

---

## 4. Conclusion & Technical UI Specification

### 4.1 Specification for `components/create/MissionPromptBar.tsx` Enhancement

```tsx
// Key update in MissionPromptBar.tsx handleSubmit:
const handleSubmit = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return;

  setIsSubmitting(true);
  try {
    const res = await fetch("/api/workflows/mission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: cleanPrompt,
        aspectRatio: "9:16",
        style: "cinematic",
        voice: "onyx",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/create/mission/${data.jobId}`);
      return;
    }
  } catch (err) {
    console.warn("Direct mission API dispatch error, using fallback navigation:", err);
  }

  // Resilient fallback navigation
  const fallbackJobId = crypto.randomUUID();
  router.push(`/create/mission/${fallbackJobId}?prompt=${encodeURIComponent(cleanPrompt)}&autoStart=true`);
};
```

### 4.2 Specification for `app/(app)/create/mission/[id]/page.tsx`

#### Component Structure
```
app/(app)/create/mission/[id]/
  ├── page.tsx                     (Main Mission Progress Page)
  ├── components/
  │    ├── MissionHeader.tsx       (Title, Status Badge, Edit in Wizard CTA, Retry)
  │    ├── MissionStepper.tsx      (5-Stage Progress Stepper & Overall Bar)
  │    ├── MissionLogConsole.tsx   (Live Console Stream with Log Levels & Timestamps)
  │    ├── MissionLivePreview.tsx  (Remotion Player & Storyboard Preview)
  │    └── MissionStateHandoff.ts  (State transfer function to useWizardStore)
```

#### 5-Stage Visualizer Stage Mapping
| Step # | Stage Key | Title | Description | Sub-Action / Indicators |
|---|---|---|---|---|
| 1 | `script_generation` | Script Generation | Narrative hook & dialogue synthesis | Word counter badge, tone pill |
| 2 | `scene_planning` | Scene Breakdown | Storyboard beat analysis & pacing | Scene count (e.g., 4 beats) |
| 3 | `asset_sourcing` | Asset Sourcing | HD Stock footage & image matching | Thumbnails grid, platform badges |
| 4 | `voice_synthesis` | Neural Audio & TTS | OpenAI / ElevenLabs narration sync | Audio duration (e.g., 28.5s) |
| 5 | `video_composition` | Video Composition | Remotion storyboard & subtitle burn-in | Remotion Player unlocked |

#### State Transfer Method (`hydrateWizardFromMission`)
```ts
import { useWizardStore, Beat } from "@/components/wizard/wizard-store";
import { MissionJobState } from "@/lib/engine/types";

export function transferMissionToWizard(mission: MissionJobState, router: any) {
  const store = useWizardStore.getState();

  const beats: Beat[] = (mission.scenes || []).map((scene, idx) => {
    const clipUrl = scene.videoUrl || scene.imageUrl || scene.selectedVideo?.url || '';
    return {
      id: scene.id || `beat-${idx}`,
      text: scene.text || '',
      keywords: scene.keywords || [],
      duration: scene.duration || 3,
      selectedId: `cand-${idx}-0`,
      candidates: clipUrl ? [{
        id: `cand-${idx}-0`,
        url: clipUrl,
        title: scene.description || `Scene ${idx + 1}`,
        platform: scene.selectedVideo?.platform || 'pexels',
        thumbnail: scene.selectedVideo?.thumbnail || clipUrl,
        duration: scene.duration || 3,
        score: 1.0,
        reason: 'Mission Mode Sourced Asset',
      }] : [],
    };
  });

  // Hydrate store
  useWizardStore.setState({
    workflowType: 'footage',
    subject: mission.prompt || '',
    narration: mission.script || '',
    aspectRatio: mission.aspectRatio || '9:16',
    voice: mission.voice || 'onyx',
    beats: beats,
    step: beats.length > 0 ? 1 : 0,
    furthestStep: 4,
    autoMode: false,
    error: null,
    busy: null,
  });

  // Navigate to wizard
  router.push('/create/footage');
}
```

---

## 5. Verification Method

To independently verify the UI architecture and state transfer:

1. **Verify Prompt Submission Navigation**:
   - Inspect `components/create/MissionPromptBar.tsx` and verify `router.push('/create/mission/' + jobId)`.
2. **Verify Route Loading & Real-Time Polling**:
   - Inspect `app/(app)/create/mission/[id]/page.tsx` with test ID `c8f2a100-34b2-4889-bb02-c9a184128f11`.
   - Verify all 5 stages render appropriate badges (`Completed`, `In Progress`, `Pending`, `Failed`).
   - Verify log stream displays timestamped messages.
3. **Verify Remotion Player Composition**:
   - When composition stage is completed, check that `LivePlayer` / `MainComposition` mounts without console warnings.
4. **Verify State Transfer to `useWizardStore`**:
   - Trigger `transferMissionToWizard(mockMissionState, router)`.
   - Read `useWizardStore.getState()`.
   - Assert:
     - `useWizardStore.getState().subject === mockMissionState.prompt`
     - `useWizardStore.getState().narration === mockMissionState.script`
     - `useWizardStore.getState().beats.length === mockMissionState.scenes.length`
     - `useWizardStore.getState().furthestStep === 4`
     - `useWizardStore.getState().workflowType === 'footage'`
5. **Run Existing Test Harness**:
   - `node tests/e2e/test-api-status.js` (Must return exit code 0)
