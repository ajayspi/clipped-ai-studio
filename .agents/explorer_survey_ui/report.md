# Comprehensive Frontend UI & Settings Survey Report

**Project**: Clipped AI Studio  
**Explorer**: Explorer 1 (UI & Settings Focus)  
**Date**: 2026-09-01  
**Status**: Investigation Complete  

---

## 1. Executive Summary

This report delivers a thorough survey of the frontend architecture of Clipped AI Studio, focusing on:
1. **The Create Hub (`app/(app)/create/page.tsx`) and sub-routes**: Component hierarchy, layout patterns, and existing workflow definitions.
2. **Workflow Card Models & Execution Lifecycles**: How workflows are represented, parameterized, and initiated across both the multi-step `CreationWizard` and dedicated workflow forms.
3. **API Keys & Settings Architecture (`/api/settings/keys`, `/api/settings/test`, `/api/settings/keys/check`, `lib/keys.ts`)**: Key storage in Supabase `settings` table, masking conventions, environment variable overrides, and testing/diagnostic mechanisms.
4. **Visual Indicator Mapping & Dynamic Status Engine**: Mathematical and logical mapping of workflow cards to required API provider keys, status dot coloring (`green`, `orange`, `red`), cost tiers (`$`, `$$`, `$$$`), and settings navigation.
5. **UI Component System & Design Tokens**: Tailwind CSS v4 setup, Radix primitives, Lucide icons, Framer Motion animations, glassmorphism style rules, and color palette tokens.

---

## 2. 'Create' Section & Page Structure

### 2.1 Directory Layout & Routes

The `/create` section is structured under the Next.js App Router inside `app/(app)/create/`:

| Path | File | Type | Primary Purpose |
|------|------|------|-----------------|
| `/create` | `app/(app)/create/page.tsx` | Server Component | Workflow selection hub displaying cards in a responsive grid. |
| `/create/footage` | `app/(app)/create/footage/page.tsx` | Client Component | Launches `CreationWizard` with `workflowType="footage"`. |
| `/create/images` | `app/(app)/create/images/page.tsx` | Client Component | Launches `CreationWizard` with `workflowType="images"`. |
| `/create/ai-videos` | `app/(app)/create/ai-videos/page.tsx` | Client Component | Launches `CreationWizard` with `workflowType="ai-videos"`. |
| `/create/stories` | `app/(app)/create/stories/page.tsx` | Client Component | Launches `CreationWizard` with `workflowType="stories"`. |
| `/create/bulk` | `app/(app)/create/bulk/page.tsx` | Client Component | Dedicated batch generator (7–30 day editorial content calendar). |
| `/create/drama` | `app/(app)/create/drama/page.tsx` | Client Component | Dedicated serialized drama builder with persistent character roster. |
| `/create/shorts` | `app/(app)/create/shorts/page.tsx` | Client Component | Dedicated long-form to vertical short viral extractor. |
| `/create/auto` | `app/(app)/create/auto/page.tsx` | Client Component | Dedicated 24/7 autonomous video curation and omnichannel publisher. |
| `/create/url` | `app/(app)/create/url/page.tsx` | Client Component | Webpage/article scraper injecting script into `wizard-store`. |

### 2.2 Creation Hub Current Implementation (`app/(app)/create/page.tsx`)

In `app/(app)/create/page.tsx` (lines 4–77), workflows are hardcoded as an array of 8 items:

```typescript
const workflows = [
  { id: "footage", title: "Footage Video", description: "Generate video using premium stock footage matched to your script.", icon: Video, color: "text-blue-500", bg: "bg-blue-500/10", href: "/create/footage" },
  { id: "images", title: "AI Images Video", description: "Generate consistent AI images and animate them into a video.", icon: ImageIcon, color: "text-purple-500", bg: "bg-purple-500/10", href: "/create/images" },
  { id: "ai-videos", title: "AI Videos", description: "Use Kling or Veo to generate 100% synthetic video scenes.", icon: Film, color: "text-pink-500", bg: "bg-pink-500/10", href: "/create/ai-videos" },
  { id: "stories", title: "Stories Generator", description: "Turn a topic into a multi-part shorts series automatically.", icon: Layout, color: "text-orange-500", bg: "bg-orange-500/10", href: "/create/stories" },
  { id: "bulk", title: "Bulk Planner", description: "Generate 30 days of content in a specific niche at once.", icon: ListTodo, color: "text-green-500", bg: "bg-green-500/10", href: "/create/bulk" },
  { id: "shorts", title: "Extract Shorts", description: "Find viral hooks in long-form video and extract them into shorts.", icon: Scissors, color: "text-yellow-500", bg: "bg-yellow-500/10", href: "/create/shorts" },
  { id: "drama", title: "Micro-Drama", description: "Generate a cinematic mini-series with consistent characters.", icon: Drama, color: "text-red-500", bg: "bg-red-500/10", href: "/create/drama" },
  { id: "auto", title: "Auto Pilot", description: "Fully hands-off generation and scheduling pipeline.", icon: Sparkles, color: "text-indigo-500", bg: "bg-indigo-500/10", href: "/create/auto" },
]
```

---

## 3. Workflow Definitions, Execution Lifecycles, and Wizard Store

### 3.1 Two Architectural Execution Patterns

The system currently runs two distinct execution patterns:

1. **Step-by-Step Interactive Wizard (`CreationWizard.tsx` + `useWizardStore`)**:
   - Used for `footage`, `images`, `ai-videos`, and `stories`.
   - **Step 0: Script** (`ScriptStep.tsx`): Subject, tone, language, target duration, paragraph count, system prompt, AI script generation (`POST /api/v1/script`).
   - **Step 1: Scenes** (`ScenesStep.tsx`): Shot-by-shot beat breakdown (`POST /api/v1/analyze`), stock/image asset sourcing per beat (`POST /api/v1/source`).
   - **Step 2: Voice** (`VoiceStep.tsx`): Voiceover provider (`OpenAI TTS`, `ElevenLabs`), voice selection (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`), background music selection.
   - **Step 3: Subtitles** (`SubtitlesStep.tsx`): Burn-in styling, position, font, font size, colors, stroke, uppercase.
   - **Step 4: Render** (`RenderStep.tsx`): Final verification & dispatching to render queue via `POST /api/workflows/generate`.
   - **Live Preview (`LivePlayer.tsx`)**: Real-time Remotion composition player reflecting beats, assets, audio, and subtitle configurations.
   - **Built-in Auto-Pilot mode (`runAutoMode`)**: Executes script generation -> scene analysis -> asset sourcing in rapid succession and jumps directly to Render step.

2. **Direct Asynchronous Workflow Forms**:
   - Used for `bulk` (`/create/bulk`), `drama` (`/create/drama`), `shorts` (`/create/shorts`), and `auto` (`/create/auto`).
   - Submit parameters directly to specialized endpoints:
     - `POST /api/workflows/bulk-plan` -> `lib/engine/bulk-planner.ts`
     - `POST /api/workflows/micro-drama` -> `lib/engine/drama-orchestrator.ts`
     - `POST /api/workflows/extract-shorts` -> `lib/engine/shorts-extractor.ts`
     - `POST /api/workflows/auto` -> `lib/engine/auto-pilot.ts`
   - Each endpoint generates a UUID `jobId`, inserts a `render_jobs` record with status `pending`, triggers background asynchronous processing, and responds immediately with `{ success: true, jobId }`, redirecting the client to `/dashboard?job=<jobId>`.

---

## 4. API Keys & Settings Architecture

### 4.1 Storage & Schema

API keys are stored in Supabase in the `settings` table:
- Schema columns:
  - `id`: UUID (Primary Key)
  - `provider`: text (e.g. `api_openai`, `api_gemini`, `api_anthropic`, `api_openrouter`, `api_pexels`, `api_pixabay`, `api_kling`, `api_luma`, `api_huggingface`, `api_deepgram`, `elevenlabs`, `fal`, `runway`, `heygen`, etc.)
  - `api_key`: text (raw secret key)
  - `is_active`: boolean (default `true`)
  - `user_id`: UUID / text (nullable or `default_user`)
  - `created_at` / `updated_at`: timestamptz

### 4.2 Endpoints Breakdown

1. **`GET /api/settings/keys`** (`app/api/settings/keys/route.ts:4-31`):
   - Queries `settings` table.
   - Returns sanitized and masked dictionary:
     ```json
     {
       "keys": {
         "api_openai": {
           "isConfigured": true,
           "maskedValue": "••••••••••••3f8a",
           "isActive": true,
           "updatedAt": "2026-09-01T12:00:00.000Z"
         },
         "api_gemini": {
           "isConfigured": false,
           "maskedValue": "",
           "isActive": false,
           "updatedAt": null
         }
       }
     }
     ```
2. **`POST /api/settings/keys`** (`app/api/settings/keys/route.ts:33-85`):
   - Accepts `{ provider: string, apiKey: string, isActive?: boolean }`.
   - Upserts record in `settings` table.
3. **`POST /api/settings/keys/check`** (`app/api/settings/keys/check/route.ts:4-60`):
   - Accepts `{ provider: string }`.
   - Queries database for the key and performs validation (e.g., calling `https://api.openai.com/v1/models` or `https://api.pexels.com/v1/search` or validating key format).
   - Returns `{ success: boolean, message: string }`.
4. **`GET / POST /api/settings/test`** (`app/api/settings/test/route.ts:5-80`):
   - Diagnostic route checking `process.env` across 26 providers (OpenRouter, Gemini, Groq, Anthropic, OpenAI, DeepSeek, ElevenLabs, Pexels, Pixabay, Kling, Luma, Fal, Runway, YouTube, TikTok, Instagram, etc.).
   - Returns summary counts (`working`, `notSet`, `total`) and provider dictionary `{ [provider]: { status: "ready" | "not set", maskedKey: string | null } }`.
5. **`lib/keys.ts` (`getApiKey`)**:
   - Checks `process.env[envVarName]` first, then queries Supabase `settings` table.

---

## 5. Visual Indicators & Required Keys Mapping

To meet the requirement:
> *"Add visual indicators (green, orange, red, $) to each workflow card in the create section, reflecting the configuration status of required APIs. Add a settings icon linking to the configuration page."*

### 5.1 Provider Requirement Matrix per Workflow

| Workflow ID | Workflow Title | Required Keys (DB Provider ID / Env) | Fallback Mechanisms | Cost Tier | Default Status If No Keys |
|---|---|---|---|---|---|
| `footage` | Footage Video | `api_openai` / `api_gemini` / `api_openrouter` + `api_pexels` / `api_pixabay` | Pollinations text API + Pixabay/Pexels free public queries | `$` | 🟢 (Has zero-config free fallback) |
| `images` | AI Images Video | `api_openai` / `api_gemini` + `fal` / `api_huggingface` | Pollinations image API fallback (`https://image.pollinations.ai`) | `$$` | 🟢 (Free fallback available) |
| `ai-videos` | AI Videos | `api_kling` / `api_luma` / `fal` / `runway` | Local sample clip dry-run | `$$$` | 🟡 (Orange if relying on mock, Green if Kling/Luma set) |
| `stories` | Stories Generator | `api_openai` / `api_gemini` + `api_pexels` / `api_pixabay` | Pollinations fallback | `$` | 🟢 |
| `bulk` | Bulk Planner | `api_openai` / `api_gemini` + `youtube`/`tiktok` (optional) | Pollinations + Mock plan mode | `$` | 🟢 |
| `shorts` | Extract Shorts | `api_openai` / `api_gemini` / Whisper | Built-in regex virality heuristics | `$` | 🟢 |
| `drama` | Micro-Drama | `api_openai` / `api_gemini` + `api_kling` / `fal` | Character visual anchor prompt lock + image fallback | `$$$` | 🟡 (Green if image/video generator configured) |
| `auto` | Auto Pilot | `api_openai` / `api_gemini` + `api_pexels` + Social APIs | Autonomous dry run mode | `$$` | 🟢 |
| `avatar` *(New)* | Avatar to Video | `api_heygen` / `api_sadtalker` / `api_did` / `api_liveportrait` | Mock talking avatar video clip | `$$$` | 🔴 / 🟡 (Red if no API key set, Green when key active) |
| `whiteboard` *(New)* | Whiteboard Animation | `api_gemini` (Gemini 2.0 / 1.5 Flash/Pro for reference sheets) | Gemini Free tier / SVG animation canvas | `$` | 🟢 / 🟡 (Green when Gemini configured) |

### 5.2 Status Dot Evaluation Rules

```typescript
export type WorkflowStatus = 'ready' | 'fallback' | 'unconfigured';

export function evaluateWorkflowStatus(
  workflowId: string, 
  keys: Record<string, { isConfigured: boolean }>
): { status: WorkflowStatus; label: string; color: string; badge: string; cost: '$' | '$$' | '$$$' } {
  // Logic maps keys to status:
  // - ready (green): Primary paid/high-fidelity API is configured
  // - fallback (orange): Primary key not set, but free/mock fallback is active
  // - unconfigured (red): Missing essential key with no functional fallback
}
```

- **Green Dot (`bg-emerald-500`, ring `ring-emerald-500/30`)**: All primary high-performance APIs configured.
- **Orange Dot (`bg-amber-500`, ring `ring-amber-500/30`)**: Functional with automatic free fallback or dry-run mock mode.
- **Red Dot (`bg-red-500`, ring `ring-red-500/30`)**: Requires external API key configuration before execution.
- **Cost Badge (`text-xs font-mono font-bold`)**:
  - `$` (Green/Emerald badge): Low/negligible cost (Stock footage, Pollinations, Gemini Flash).
  - `$$` (Purple/Indigo badge): Medium cost (Flux image generation, social publishing).
  - `$$$` (Rose/Pink badge): High GPU cost (Kling/Luma synthetic video, HeyGen avatars).

### 5.3 Settings Icon & Navigation Wiring

Each card will render:
1. A top-right header with the **Status Dot + Cost Badge + Settings Link Button**.
2. Settings button links to `/settings?tab=<Category>` (or triggers a settings modal), e.g. clicking settings on `ai-videos` directs to `/settings?category=Stock+Media` or opens a quick key configuration drawer.

---

## 6. Automatic Mission Mode Architecture

To satisfy:
> *"Implement a 'one-click' generation flow where typing a subject and hitting enter automatically initiates the full video generation pipeline. The user should immediately navigate to a dedicated 'Mission Progress' view that shows the steps completing automatically, while still allowing a 'manual/edit' toggle for granular control."*

### 6.1 Recommended Create Hub UI Layout

1. **Top Section — Quick Mission Command Bar**:
   - Prominent search-like input with animated ambient border and glassmorphism styling:
     `[ ✨ "Enter any topic or prompt to auto-generate video (e.g., 'Ancient Rome Colosseum Secrets')..." ]`
   - "Launch Mission" button (or hitting `Enter`).
   - Mode Toggle: `[ ⚡ Automatic Mission Mode | 🛠️ Manual Step-by-Step Wizard ]`.

2. **Execution & Navigation Flow**:
   - When submitted in **Automatic Mission Mode**:
     1. Calls `/api/workflows/generate` or `/api/workflows/auto` with `{ subject, mode: 'auto', workflow: 'footage' }`.
     2. Generates Supabase `render_jobs` record.
     3. Immediately navigates to `/create/mission/[jobId]` (or `/create/auto?job=[jobId]` or `/dashboard?job=[jobId]`).
     4. The **Mission Progress View** renders real-time animated stage trackers:
        - 🟢 Stage 1: Topic Ingestion & AI Script Formulation
        - 🟢 Stage 2: Scene Segmentation & Keyword Extraction
        - 🟡 Stage 3: Neural Voice Synthesis & Audio Mastering
        - ⚪ Stage 4: Generative Visual Asset Matching & Remotion Composition
        - ⚪ Stage 5: High-Definition MP4 Encoding & Distribution
     5. Includes a **"Switch to Manual Editor"** button that hydrates `useWizardStore` with the generated data and opens `/create/footage` for fine-tuning beats, timing, voice, and subtitles.

---

## 7. Whiteboard & Avatar Workflows Specification

### 7.1 New Workflow Cards for `/create`

1. **Avatar to Video (`id: "avatar"`, `href: "/create/avatar"`)**:
   - **Title**: Avatar to Video
   - **Description**: Generate photorealistic or stylized talking avatars synced to neural voiceovers.
   - **Icon**: `UserCheck` or `Smile` or `Bot` (Lucide)
   - **Color**: `text-cyan-500`, `bg-cyan-500/10`
   - **Cost Tier**: `$$$`
   - **Key Requirement**: HeyGen / SadTalker / D-ID / LivePortrait API.

2. **Whiteboard Animation (`id: "whiteboard"`, `href: "/create/whiteboard"`)**:
   - **Title**: Whiteboard Animation
   - **Description**: Educational hand-drawn animations with Gemini-powered consistent character reference sheets.
   - **Icon**: `PenTool` or `Presentation` (Lucide)
   - **Color**: `text-amber-500`, `bg-amber-500/10`
   - **Cost Tier**: `$`
   - **Key Requirement**: Google Gemini (`api_gemini` / `GEMINI_API_KEY`).
   - **Gemini Character Reference Sheet Pipeline**: Uses Gemini (via `@google/genai` or OpenAI-compatible endpoint) to prompt consistent character sheets (e.g. stickman, ancient saint, professor, cartoon robot) with standard orthogonal turnaround poses and line-art styling.

---

## 8. Dashboard Styling, Component Libraries & Design Patterns

### 8.1 Dependencies & Libraries

- **Framework**: Next.js 16.3.3 (App Router with Turbopack support), React 19.2.8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`, `@theme inline` in `app/globals.css`)
- **Icons**: `lucide-react` (100+ icons used across dashboard)
- **Animation**: `framer-motion` v13.1.1 (`motion.div`, `AnimatePresence`, spring layouts)
- **UI Primitives**: Radix UI (`@radix-ui/*`, `radix-ui`)
- **State Management**: `zustand` v5.0.15 (`useWizardStore`)
- **Theme**: `next-themes` (Dark/Light mode support with system detection)
- **Video Engine**: Remotion v4.0.518 (`@remotion/player`, `@remotion/bundler`, `@remotion/renderer`)

### 8.2 Glassmorphism & Visual Aesthetics Tokens

1. **Sidebar Glassmorphism**:
   - `bg-card/70 dark:bg-zinc-950/60 backdrop-blur-xl border-r border-border/40 shadow-xl shadow-black/5 dark:shadow-black/40`
   - Expand/collapse spring transition (`stiffness: 350, damping: 30`, width 72px to 256px).
2. **Ambient Glowing Mesh Gradients** (`app/(app)/layout.tsx:12-19`):
   - Top-left: `w-96 h-96 bg-gradient-to-br from-violet-600/20 via-indigo-500/15 to-transparent blur-[140px]`
   - Mid-right: `w-96 h-96 bg-gradient-to-bl from-fuchsia-500/15 via-pink-500/10 to-transparent blur-[140px]`
   - Bottom-center: `w-96 h-96 bg-gradient-to-tr from-cyan-500/15 via-teal-500/10 to-transparent blur-[140px]`
3. **Card Glassmorphism** (`components/dashboard/DashboardCard.tsx`):
   - `rounded-2xl border border-border/40 bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm hover:shadow-xl hover:border-violet-500/30`
4. **Vibrant Palette**:
   - Violet (`#7c3aed`), Indigo (`#6366f1`), Fuchsia (`#d946ef`), Cyan (`#06b6d4`), Emerald (`#10b981`), Amber (`#f59e0b`).

---

## 9. Next Steps & Recommendations for Implementation

1. **Refactor `app/(app)/create/page.tsx`**:
   - Transform into a Client Component (or client sub-components) fetching `/api/settings/keys` on mount.
   - Insert the **Automatic Mission Input Bar** at the top.
   - Add the two new workflows (`avatar` and `whiteboard`) to make 10 total workflow cards.
   - Attach dynamic status dots (`green`, `orange`, `red`), cost badges (`$`, `$$`, `$$$`), and settings gear buttons linking to `/settings`.
2. **Build Mission Progress Component / View**:
   - Create `components/create/MissionProgress.tsx` or `app/(app)/create/mission/page.tsx` showing real-time automated stage completion with a "Manual Edit" fallback.
3. **Integrate Gemini Reference Character Generator**:
   - Implement backend service in `lib/engine/whiteboard-orchestrator.ts` querying Gemini API for character reference sheets.
