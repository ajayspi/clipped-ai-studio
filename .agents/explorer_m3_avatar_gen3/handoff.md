# Milestone 3 Avatar-to-Video Workflow Investigation Report

**Author**: Avatar Pipeline Explorer (Gen 3)  
**Date**: 2026-09-01  
**Target Milestone**: Milestone 3 — Avatar-to-Video Workflow  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m3_avatar_gen3`

---

## 1. Observation

A detailed static inspection across the `clipped` repository revealed the following state:

### A. Existing Type Definitions & Contracts
- In `lib/engine/types.ts` (lines 356–399), the core Avatar domain models and interfaces are already fully defined:
  - `AvatarProvider`: `'heygen' | 'did' | 'liveportrait' | 'remotion-pip' | 'mock'` (line 358)
  - `AvatarLayout`: `'pip_bottom_right' | 'pip_bottom_left' | 'fullscreen' | 'side_by_side' | 'circular_bubble'` (line 359)
  - `AvatarVoice`: `'nova' | 'onyx' | 'rachel' | 'josh' | 'alloy' | 'shimmer' | string` (line 360)
  - `AvatarPreset` interface: `id, name, previewUrl, gender, style, supportedProviders` (lines 362–369)
  - `AvatarConfig` interface: `avatarType, avatarId, customImageUrl, layout, voice, speed, aspectRatio, backgroundVideoUrl, backgroundMusicUrl` (lines 371–381)
  - `AvatarGenerationRequest`: extends `AvatarConfig` with `script: string, mock?: boolean` (lines 383–386)
  - `AvatarGenerationResponse`: `{ success, jobId, videoUrl, avatarId, duration, layout, providerUsed, metadata, error }` (lines 388–398)

### B. Existing Engine Modules & Reusable Services
- `lib/engine/tts.ts` (883 lines): Multi-provider neural speech synthesis engine implementing:
  - ElevenLabs API (`eleven_multilingual_v2`), Google Cloud TTS (Neural2/Wavenet), Coqui TTS (with 2.5s fast timeout guard), Free Keyless Google Translate TTS API fallback, and deterministic in-memory RIFF/WAVE PCM buffer generator (`generateSyntheticWavBuffer`).
  - Duration calculation helper `calculateEstimatedDuration(text, language, speed)`.
- `lib/engine/audio-mixer.ts` (414 lines): FFmpeg-based audio mixer supporting sidechain speech ducking, volume normalization, background music looping, and missing FFmpeg dry-run fallback.
- `lib/engine/video-sourcer.ts` & `lib/engine/image-generator.ts`: Stock media matching and Fal.ai Flux / Pollinations AI image generation.
- `lib/engine/mission-orchestrator.ts` (714 lines): Reference implementation of background orchestration chaining, in-memory Map state cache, and Supabase `render_jobs` synchronization.
- `app/api/settings/keys/route.ts` (lines 15–16): Maps `heygen` (`HEYGEN_API_KEY`) and `did` (`DID_API_KEY`, `D_ID_API_KEY`) under category `'Avatar'`, and `fal` under `'AI Models'`.

### C. Missing Backend Engine & API Route
- `lib/engine/avatar-orchestrator.ts`: Currently does not exist. Must be created as a singleton `AvatarOrchestrator` export conforming to `lib/engine/types.ts`.
- `app/api/workflows/avatar/route.ts`: Currently does not exist. Must be created with `POST` (triggering generation) and `GET` (polling job status) handlers conforming to `PROJECT.md` §Interface Contract 5.

### D. Existing Remotion Compositions
- `remotion/Root.tsx` (lines 40–86): Registers `MainRender-9x16`, `MainRender-16x9`, `MainRender-1x1`, and `MainRender` using `MainComposition`.
- `remotion/Composition.tsx` (lines 111–153): Implements sequential beats rendering with `RemotionVideo`, `Audio`, background music, and word-by-word animated Hormozi `SubtitleOverlay`. Does not yet contain a dedicated Avatar layer overlay for PiP / Fullscreen / Circular Bubble framing.

### E. Existing Frontend UI Page
- `app/(app)/create/avatar/page.tsx` (lines 1–12): Contains only a 12-line placeholder delegating to `CreationWizard workflowType="avatar"`. Does not yet provide the dedicated, visual 2-column studio experience with avatar roster cards, layout pickers, and live framing canvas mockup seen in `app/(app)/create/drama/page.tsx`.

---

## 2. Logic Chain

```
[Observation 1: Missing avatar-orchestrator.ts]
   ↓
[Logic Step 1.1]: Design AvatarOrchestrator class following the proven pattern in mission-orchestrator.ts and drama-orchestrator.ts.
   ↓
[Logic Step 1.2]: Establish built-in Avatar Preset Catalog (Sarah, Marcus, Alex, Emma, David, Elena) + Custom Photo upload support.
   ↓
[Logic Step 1.3]: Implement multi-provider synthesis cascade (HeyGen -> D-ID -> Fal.ai LivePortrait -> Deterministic Remotion Fallback).
   ↓
[Observation 2: Existing tts.ts engine & calculateEstimatedDuration]
   ↓
[Logic Step 2.1]: Leverage ttsEngine.synthesize for neural speech generation and extract exact audio duration and buffer/URL.
   ↓
[Logic Step 2.2]: Pair audio duration to Remotion frame count: durationInFrames = Math.max(1, Math.floor(duration * 30)).
   ↓
[Observation 3: Remotion Composition & Layout Matrix]
   ↓
[Logic Step 3.1]: Implement compositing package for PiP Bottom-Right, PiP Bottom-Left, Fullscreen, Circular Bubble, and Side-by-Side.
   ↓
[Logic Step 3.2]: Ensure zero-cost, 100% reliable fallback where B-roll video, portrait visualizer, synced audio, and Hormozi subtitles render flawlessly when external APIs are absent.
   ↓
[Observation 4: API Route Contracts in PROJECT.md §5]
   ↓
[Logic Step 4.1]: Implement app/api/workflows/avatar/route.ts with synchronous Supabase insert into render_jobs (status: 'pending') and immediate HTTP 200 response with jobId.
   ↓
[Logic Step 4.2]: Add background job execution with in-memory map + Supabase state update, plus GET route for live progress polling.
   ↓
[Observation 5: Minimal page.tsx in create/avatar]
   ↓
[Logic Step 5.1]: Replace placeholder with interactive Avatar Studio UI featuring avatar preset selection, photo uploader, voice selector with audio test, layout preview framing, and real-time generation feedback.
```

### Detailed Architectural Specifications

#### 1. `lib/engine/avatar-orchestrator.ts` Blueprint
```typescript
import {
  AvatarConfig,
  AvatarGenerationRequest,
  AvatarGenerationResponse,
  AvatarPreset,
  AvatarProvider,
  AvatarLayout,
  AspectRatio,
} from './types';
import { supabase } from '@/lib/db';
import { ttsEngine } from './tts';
import { videoSourcer } from './video-sourcer';

export interface AvatarJobState {
  jobId: string;
  script: string;
  avatarId: string;
  avatarType: 'preset' | 'custom_photo';
  customImageUrl?: string | null;
  layout: AvatarLayout;
  voice: string;
  aspectRatio: AspectRatio;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  audioUrl?: string;
  duration?: number;
  providerUsed?: AvatarProvider | string;
  error?: string;
  logs: string[];
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'sarah_presenter',
    name: 'Sarah (Presenter)',
    previewUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    gender: 'female',
    style: 'photorealistic',
    supportedProviders: ['heygen', 'did', 'liveportrait', 'remotion-pip'],
  },
  {
    id: 'marcus_tech',
    name: 'Marcus (Tech Anchor)',
    previewUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    gender: 'male',
    style: 'photorealistic',
    supportedProviders: ['heygen', 'did', 'liveportrait', 'remotion-pip'],
  },
  {
    id: 'alex_casual',
    name: 'Alex (Creator)',
    previewUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
    gender: 'neutral',
    style: 'photorealistic',
    supportedProviders: ['heygen', 'did', 'liveportrait', 'remotion-pip'],
  },
  {
    id: 'emma_anime',
    name: 'Emma (Anime Style)',
    previewUrl: 'https://image.pollinations.ai/prompt/cute%20anime%20girl%20presenter%20vtuber%20colorful%20hair%20studio%20lighting?width=512&height=512&nologo=true',
    gender: 'female',
    style: 'anime',
    supportedProviders: ['liveportrait', 'remotion-pip'],
  },
  {
    id: 'david_3d',
    name: 'David (3D Animated)',
    previewUrl: 'https://image.pollinations.ai/prompt/pixar%20style%203d%20male%20character%20host%20friendly%20smile%20render?width=512&height=512&nologo=true',
    gender: 'male',
    style: '3d_animated',
    supportedProviders: ['liveportrait', 'remotion-pip'],
  },
  {
    id: 'elena_executive',
    name: 'Elena (Executive)',
    previewUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80',
    gender: 'female',
    style: 'photorealistic',
    supportedProviders: ['heygen', 'did', 'liveportrait', 'remotion-pip'],
  },
];
```

##### Fallback Execution Strategy in `AvatarOrchestrator`:
1. Synthesize neural speech via `ttsEngine.synthesize({ text: request.script, voice: request.voice, mock: request.mock })`.
2. Determine speech duration (e.g. `ttsRes.duration` or computed via `calculateEstimatedDuration`).
3. Select background b-roll from stock pool (`landscape`, `portrait`, `square`) based on `request.aspectRatio`.
4. Resolve avatar image URL: if `custom_photo`, use `customImageUrl`; else lookup `AVATAR_PRESETS`.
5. Assemble Remotion package with chosen layout (`pip_bottom_right`, `pip_bottom_left`, `fullscreen`, `side_by_side`, `circular_bubble`).
6. Update Supabase `render_jobs` to `status: 'completed'`, `progress: 100`.

#### 2. `app/api/workflows/avatar/route.ts` Blueprint
- **POST Handler**:
  - Validates `script` presence and string length > 0.
  - Generates `jobId = crypto.randomUUID()`.
  - Performs synchronous insert into Supabase `render_jobs` (`status: 'pending'`, `progress: 0`).
  - Launches async task `avatarOrchestrator.generateAvatarVideo({ ...body, jobId })`.
  - Returns HTTP 200 `{ success: true, jobId, status: 'processing', progressUrl: `/create/mission/${jobId}` }`.
- **GET Handler**:
  - Queries `avatarOrchestrator.getJob(id)` and Supabase `render_jobs`.
  - Returns `{ success: true, jobId, status, progress, videoUrl, duration, layout, providerUsed, metadata, error }`.

#### 3. `app/(app)/create/avatar/page.tsx` UI Studio Blueprint
- **Left Column: Configuration Controls**:
  - Avatar Roster Grid with preset cards, active selection border, and gender filter chips (`All`, `Female`, `Male`, `Anime/3D`).
  - "Custom Photo" toggle mode with URL input / instant image preview.
  - Script Input textarea with live word count and speech length estimator.
  - Voice Selector dropdown (Nova, Onyx, Rachel, Josh, Alloy, Shimmer) with instant audio test button.
  - Layout Selector with visual radio buttons:
    - ↘ `PiP Bottom-Right`
    - ↙ `PiP Bottom-Left`
    - 🔲 `Fullscreen`
    - 🫧 `Circular Bubble`
    - ◫ `Side-by-Side`
  - B-Roll & Style Selector (Modern Tech, Cinematic Nature, Studio Minimal, Abstract Neon).
  - Aspect Ratio Selector (`9:16`, `16:9`, `1:1`).
- **Right Column: Interactive Live Framing Canvas**:
  - Live preview canvas showing selected aspect ratio frame.
  - Real-time simulation of background footage with the selected Avatar card placed precisely in the designated PiP / Fullscreen / Bubble position.
  - Sample Hormozi subtitle overlay.
  - "Generate Avatar Video" action button with pulsing gradient, spinner state, and direct navigation/status modal.

#### 4. Remotion Layout Compositing Blueprint (`remotion/Composition.tsx` & `remotion/Root.tsx`)
- Add `AvatarComposition` or `avatarLayer` prop to `MainCompositionProps`:
  ```tsx
  export interface AvatarOverlayProps {
    avatarUrl: string;
    layout: 'pip_bottom_right' | 'pip_bottom_left' | 'fullscreen' | 'side_by_side' | 'circular_bubble';
    aspectRatio?: '9:16' | '16:9' | '1:1';
  }
  ```
- Precise CSS styling for each layout variant:
  - `pip_bottom_right`: `position: absolute; bottom: 5%; right: 4%; width: 32%; aspect-ratio: 9/16; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); border: 2.5px solid rgba(255,255,255,0.25);`
  - `pip_bottom_left`: `position: absolute; bottom: 5%; left: 4%; width: 32%; aspect-ratio: 9/16; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); border: 2.5px solid rgba(255,255,255,0.25);`
  - `circular_bubble`: `position: absolute; bottom: 6%; right: 5%; width: 180px; height: 180px; border-radius: 50%; border: 3px solid #06b6d4; box-shadow: 0 10px 40px rgba(0,0,0,0.7);`
  - `fullscreen`: `AbsoluteFill` with `objectFit: cover`.

---

## 3. Caveats

1. **External AI Avatar API Quotas & Keys**: Live HeyGen and D-ID APIs require active paid API keys. When keys are not supplied, the pipeline will transparently fall back to the deterministic Remotion PiP synthesis engine, producing valid videos with 0 external network dependencies.
2. **Audio Sync Timing**: Speech durations vary slightly between TTS providers (ElevenLabs vs Google vs Mock PCM). The orchestrator must always measure the synthesized audio buffer's exact duration and derive `durationInFrames = Math.max(1, Math.floor(duration * 30))` before passing to Remotion.
3. **Custom Photo Validation**: When users provide custom URLs for photos, the system should validate URL format and gracefully fall back to a default preset avatar if the image fails to load.

---

## 4. Conclusion

The Milestone 3 Avatar-to-Video Workflow investigation is complete and ready for implementation.
- All interface contracts and types in `lib/engine/types.ts` are verified and consistent.
- Reusable neural voice (`tts.ts`), audio mixing (`audio-mixer.ts`), and media sourcing engines are ready for integration.
- The 4 core components to build are:
  1. `lib/engine/avatar-orchestrator.ts`: Singleton engine with HeyGen/D-ID/LivePortrait dispatch, preset avatar bank, audio duration pairing, and deterministic Remotion PiP fallback.
  2. `app/api/workflows/avatar/route.ts`: API route with input validation, synchronous Supabase `render_jobs` pending insert, async execution, and status polling.
  3. `app/(app)/create/avatar/page.tsx`: Dedicated 2-column Avatar Studio UI with preset roster, layout framing picker, script duration estimator, and live mockup canvas.
  4. Remotion compositing extension in `remotion/Composition.tsx` supporting PiP positioning and subtitle synchronization.

---

## 5. Verification Method

To verify the implementation once coded:

1. **Unit & Engine Contract Verification**:
   - Verify `avatarOrchestrator.generateAvatarVideo({...})` returns `{ success: true, jobId, videoUrl, duration, layout, providerUsed }`.
   - Verify missing API key triggers `'remotion-pip'` fallback without throwing uncaught exceptions.
   - Verify invalid/empty script returns an explicit error.

2. **API Route Verification**:
   - `POST /api/workflows/avatar` with `{ script: "Welcome to Clipped AI", layout: "pip_bottom_right", voice: "nova" }` returns HTTP 200 `{ success: true, jobId: "...", status: "processing" }`.
   - `GET /api/workflows/avatar?id=<jobId>` returns HTTP 200 with job progress and completed status.

3. **Remotion Composition Layout Verification**:
   - Verify `pip_bottom_right` and `pip_bottom_left` position the avatar in the expected viewport coordinates.
   - Verify subtitles and audio sync align with video frame duration.

4. **UI Studio Verification**:
   - Navigate to `/create/avatar` and confirm preset avatar selection, custom photo input toggle, layout radio cards, script estimator, and live canvas mockup respond interactively.
