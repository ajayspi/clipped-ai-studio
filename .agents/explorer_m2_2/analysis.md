# Investigation Report: Settings & Library Page Route Testing

**Agent**: Explorer M2-2  
**Milestone**: Milestone 2 (Core Routes Headless Tests: Settings & Library)  
**Target Files**:
- `app/(app)/settings/page.tsx`
- `app/(app)/library/page.tsx`  
**Test Targets**:
- `test/pages/core/settings.test.tsx`
- `test/pages/core/library.test.tsx`  
**Workspace**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`  
**Date**: 2026-09-17  

---

## 1. Executive Summary

Milestone 2 requires implementing automated headless unit and component render tests for all core page routes in Clipped AI Studio. This investigation assesses the technical requirements, internal dependencies, external endpoint contracts, and test harness strategies for two crucial client routes:
1. `app/(app)/settings/page.tsx`: The primary configuration portal for AI engines, voice synthesis credentials and voice auditions, custom LLM integrations, cloud database routing, and API health monitoring.
2. `app/(app)/library/page.tsx`: The asset management dashboard displaying generated AI videos, active background rendering queues, workspace/campaign folders, and export/publishing modal workflows.

Both pages are `"use client"` React components utilizing client-side state hooks, `framer-motion` layout animations, asynchronous `fetch` requests on mount, and browser DOM APIs (`window.Audio`, `navigator.clipboard`). Both pages can be cleanly rendered and exercised in Vitest + React Testing Library (JSDOM) using the existing global harness in `test/setup.ts`, provided specific fetch endpoints and interval timers are appropriately handled.

---

## 2. Technical Investigation: `app/(app)/settings/page.tsx`

### 2.1 Component Architecture & Directive
- **Directive**: `"use client"` declared on line 1.
- **Export**: Default export `SettingsPage()`.
- **Styling & Animation**: Uses Tailwind CSS classes and `framer-motion` (`motion.div`, `AnimatePresence`, `layoutId="active-tab"`).
- **Core View Hierarchy**:
  - **Header**: Main title, descriptive subtitle, and header buttons ("Add Custom API" and "Run System Diagnostics").
  - **Sidebar Tabs Navigation**: Vertical tab bar with 7 category buttons:
    1. `AI Models` (Default active tab)
    2. `Voice & Audio`
    3. `Stock Media`
    4. `Brand Kits`
    5. `Usage & Quotas`
    6. `Database & Supabase`
    7. `API Health Hub`
  - **Main Content Container**: AnimatePresence tab-switched view container rendering cards corresponding to the active category.
  - **Modals**:
    - `Add Custom API Integration` modal (controlled by `showCustomModal`).
    - `Supabase PostgreSQL Schema (DDL)` modal (controlled by `showDdlModal`).

### 2.2 State Management & Hooks
- **Tab State**: `const [activeTab, setActiveTab] = useState("AI Models");`
- **Key Store**: `keys` (`Record<string, ApiKeyData>`), `customProviders` (`CustomProviderData[]`), `inputs` (`Record<string, string>`), `showKeyIds` (`Record<string, boolean>`).
- **Loading / Diagnostics**:
  - `loading`: initialized to `true`. Renders `<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />` until `fetchKeys()` completes.
  - `saving`, `testing`, `testingAll`, `testResults`: tracking status and feedback for key verification.
- **Voice Model Catalog State**:
  - `voiceFilter`: filter pill selection (`"All"`, `"Azure"`, `"OpenAI"`, `"ElevenLabs"`, `"Google"`, `"Free/Keyless"`).
  - `voiceSearch`: text filter query for voice name, language, or description.
  - `loadingVoiceId`, `playingVoiceId`, `voicePreviewError`: voice audition states.
  - `audioRef`: `useRef<HTMLAudioElement | null>(null)` for controlling the active `HTMLAudioElement` instance.
- **Custom Provider Modal State**:
  - `showCustomModal`, `customName`, `customKey`, `customBaseUrl`, `customCategory`, `savingCustom`, `customModalError`.
- **Database & Supabase State**:
  - `dbUrlInput`, `dbKeyInput`, `showAnonKey`, `testingDb`, `savingDb`, `dbTestResult`, `showDdlModal`, `ddlCopied`, `urlCopied`, `dbFeedback`.
- **Context Integration**:
  - `useSupabase()` from `@/lib/supabase/context`:
    - Provides: `activeSupabaseUrl`, `activeSupabaseAnonKey`, `isCustom`, `status` (`supabaseStatus`), `latencyMs`, `schemaStatus`, `setCustomConfig`, `resetToDefault`, `testConnection`.
    - Synced with local input state via `useEffect([activeSupabaseUrl, activeSupabaseAnonKey])`.

### 2.3 External Endpoints & Fetch Contracts
1. **`GET /api/settings/keys`**:
   - Called on mount in `fetchKeys()`.
   - Response contract:
     ```json
     {
       "success": true,
       "keys": {
         "api_openai": { "isConfigured": true, "maskedValue": "sk-...1234", "isActive": true, "updatedAt": "..." }
       },
       "customProviders": []
     }
     ```
   - Current `test/setup.ts` returns `{ success: true, keys: {} }`.
2. **`POST /api/settings/keys`**:
   - Called when saving an individual provider key or adding a custom provider.
   - Body: `{ provider: string, apiKey: string }` or `{ provider, name, apiKey, category, baseUrl, isActive: true }`.
3. **`POST /api/settings/keys/check`**:
   - Called during `testKey(providerId)` or `testAll()`.
   - Body: `{ provider: providerId }`.
   - Response: `{ success: boolean, message?: string, error?: string }`.
4. **`POST /api/tts/preview`**:
   - Called when clicking Play on a voice card in `handleToggleVoicePreview()`.
   - Body: `{ text: string, voiceId: string, provider: string, language: string, speed: 1.0 }`.
   - Response: `{ success: boolean, audioUrl?: string, error?: string }`.
   - **Crucial note**: If `data.audioUrl` is not returned, the handler throws `"Failed to synthesize sample audio"`.
5. **`GET /api/settings/health` & `POST /api/settings/health`**:
   - Triggered when switching to `"API Health Hub"` tab via `<ApiProviderHub />`.
   - Response contract:
     ```json
     {
       "success": true,
       "providers": [],
       "summary": { "total": 0, "healthy": 0, "offline": 0, "byCategory": {} }
     }
     ```
   - **Crucial finding**: In `ApiProviderHub.tsx` line 248, `setProviders(data.providers)` directly assigns `data.providers`. If the fetch mock returns undefined for `providers`, re-rendering crashes with `TypeError: Cannot read properties of undefined (reading 'filter')`.

### 2.4 Browser API Dependencies
- **`window.Audio` / `HTMLMediaElement`**:
  - Instantiated via `new Audio(data.audioUrl)` in `handleToggleVoicePreview()`.
  - Properties manipulated: `onended`, `onerror`, `audio.play()`, `audio.pause()`.
  - Stubs provided in `test/setup.ts` via `MockAudio` and `window.HTMLMediaElement.prototype.play`.
- **`navigator.clipboard.writeText`**:
  - Used in `handleCopyDdl()` and `handleCopyUrl()`.
  - Guarded by `if (typeof navigator !== "undefined" && navigator.clipboard)`.
  - Polyfilled in `test/setup.ts`.
- **`window.matchMedia`**:
  - Polyfilled in `test/setup.ts`.

---

## 3. Technical Investigation: `app/(app)/library/page.tsx`

### 3.1 Component Architecture & Directive
- **Directive**: `"use client"` declared on line 1.
- **Export**: Default export `LibraryPage()`.
- **Styling & Animation**: Uses Tailwind CSS classes and `framer-motion` (`motion.div`, `AnimatePresence`).
- **Internal Helper Components**:
  - `QueueCard({ job })`: Renders active rendering or failed background jobs with progress bar animations and status badges.
- **Imported Components**:
  - `DashboardCard` from `@/components/dashboard/DashboardCard`: Renders vertical 9:16 video cards with poster images, workflow badges, video hover preview, workspace reassignment menu, and export/publish triggers.
  - `PublishModal` from `@/components/dashboard/PublishModal`: Modal for social export (YouTube Shorts, TikTok, Reels) and video resolution downloads (1080p, 720p, 4K, MP3).

### 3.2 State Management & Hooks
- **Data State**:
  - `videos`: Array of completed videos (`data.completed || []`).
  - `queuedJobs`: Array of pending/processing render jobs (`data.queued || []`).
  - `failedJobs`: Array of failed render jobs (`data.failed || []`).
  - `workspaces`: Array of workspace items (`data.workspaces || []`).
  - `activeWorkspace`: Active workspace filter ID (defaults to `"all"`).
- **Loading & Refresh**:
  - `loading`: Initialized to `true`. Displays `<Loader2 className="w-8 h-8 animate-spin text-primary" />` until data is loaded.
  - `lastRefreshed`: Date timestamp of last jobs refresh.
  - `pollRef`: `useRef<NodeJS.Timeout | null>(null)` for managing the 8-second polling interval when active jobs are present.
- **Workspace Modal State**:
  - `showNewFolderModal`, `newFolderName`, `newFolderColor`, `creatingFolder`.

### 3.3 UI States in `LibraryPage`
1. **Loading State**:
   - Rendered while `loading === true`:
     ```tsx
     <div className="flex h-64 items-center justify-center">
       <Loader2 className="w-8 h-8 animate-spin text-primary" />
     </div>
     ```
2. **Empty State**:
   - Rendered when `loading === false` and `filteredVideos.length === 0`:
     - Displays folder icon.
     - Heading: "No videos in this workspace".
     - Subheading: "Move existing videos into this folder or generate a new AI video for this campaign."
     - Action button linking to `/create/footage`: "Generate Video".
3. **Populated State (Masonry Video Cards)**:
   - Rendered when `filteredVideos.length > 0`:
     - Container: `<div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">`
     - Each card rendered by `<DashboardCard key={video.id} video={video} workspaces={workspaces} onMoveWorkspace={handleMoveVideo} />`.
4. **Rendering Queue Panel**:
   - Rendered conditionally when `queuedJobs.length > 0 || failedJobs.length > 0`:
     - Banner with "Rendering Queue", active count badge, failed count badge, and auto-refresh note.
     - Grid of `<QueueCard>` components showing progress bars and status labels ("Queued", "Generating Plan", "Rendering", "Failed").
5. **Workspace Filter Bar Chips**:
   - Chip for "All Videos" with count: `{videos.length}`.
   - Dynamic chips for each workspace in `workspaces` with color circle, name, and filtered count.
   - Button for `+ New Workspace` triggering `showNewFolderModal`.
6. **New Workspace Modal**:
   - Rendered when `showNewFolderModal === true`.
   - Name input, 6-color accent selector buttons, Cancel button, and "Create Folder" submit button.

### 3.4 External Endpoints & Fetch Contracts
1. **`GET /api/workspaces`**:
   - Called in `loadLibraryData()`.
   - Response contract:
     ```json
     {
       "success": true,
       "workspaces": [
         { "id": "ws_1", "name": "Marketing Ads", "color": "#8b5cf6", "videoCount": 3 }
       ],
       "totalVideos": 3
     }
     ```
   - Current `test/setup.ts` returns `{ success: true, workspaces: [] }`.
2. **`GET /api/jobs`**:
   - Called in `refreshJobs()`.
   - Response contract:
     ```json
     {
       "success": true,
       "jobs": [],
       "queued": [],
       "completed": [
         {
           "id": "job_1",
           "video_id": "job_1",
           "title": "Top 5 AI Tools",
           "status": "completed",
           "thumbnail": "/images/workflows/auto_cover.jpg",
           "workspace_id": "ws_1",
           "workflow_type": "auto",
           "output_url": "https://example.com/video.mp4"
         }
       ],
       "failed": []
     }
     ```
   - Current `test/setup.ts` returns `{ success: true, completed: [], queued: [], failed: [] }`.
3. **`POST /api/workspaces`**:
   - Called in `handleCreateFolder()` with `{ name: string, color: string }`.
   - Response contract: `{ success: true, workspace: { id: "ws_new", name: "...", color: "..." } }`.
4. **Auto-Polling Interval Guard**:
   - When `data.queued.length > 0`, `LibraryPage` starts `setInterval(refreshJobs, 8000)`.
   - **Test hazard**: In headless tests, background intervals can cause memory leaks or test worker timeouts if not cleaned up.
   - **Remedy**: Default mock tests should keep `queued: []` or use `vi.useFakeTimers()` / `vi.clearAllTimers()` / cleanup after each test.

---

## 4. Test Suite Strategy & Design

### 4.1 Test Target 1: `test/pages/core/settings.test.tsx`

#### Recommended Test Cases:
1. **Initial Mount & Page Header**:
   - Wrap in `<SupabaseProvider>`.
   - Wait for loading spinner to resolve.
   - Assert page title `Settings` is in document.
   - Assert "Run System Diagnostics" and "Add Custom API" buttons are visible.
2. **Navigation Tabs Rendering**:
   - Assert all 7 category tabs are rendered:
     - `AI Models`, `Voice & Audio`, `Stock Media`, `Brand Kits`, `Usage & Quotas`, `Database & Supabase`, `API Health Hub`.
3. **AI Models Tab (Default Active)**:
   - Assert "AI Models Integrations" card is present.
   - Verify presence of provider labels (e.g. "OpenAI (GPT-4o & TTS)", "Google Gemini").
   - Verify presence of API key inputs and "Save" / "Test API" buttons.
4. **Tab Switching: Voice & Audio**:
   - Click "Voice & Audio" tab.
   - Assert "Voice Synthesis Credentials" and "Voice Model Catalog" cards are rendered.
   - Assert voice filter pills are present ("All", "Azure", "OpenAI", "ElevenLabs", "Google", "Free/Keyless").
   - Assert search input placeholder "Search voices or language..." is present.
   - Assert static voice catalog entries appear (e.g., "Alloy", "Jenny (Neural)").
   - Verify play button exists for voices.
5. **Tab Switching: Database & Supabase**:
   - Click "Database & Supabase" tab.
   - Assert "Supabase Project Routing" section renders.
   - Assert Project URL input and Anon Key input render with mock context values.
   - Assert "Core Schema Table Health Checklist" renders all 6 tables (`users`, `videos`, `render_jobs`, `api_credits`, `settings`, `scheduled_posts`).
   - Verify action buttons: "Test Connection", "Save & Apply Connection", "Reset to Default", "View Schema DDL".
6. **Schema DDL Modal Interaction**:
   - Click "View Schema DDL".
   - Assert modal with "Supabase PostgreSQL Schema (DDL)" opens.
   - Click "Close" and assert modal dismisses.
7. **Custom API Integration Modal Interaction**:
   - Click "Add Custom API" in the header.
   - Assert modal with "Add Custom API Integration" opens.
   - Verify form inputs (Provider Name, Category select, API Key, Base URL) exist.
   - Click "Cancel" and assert modal dismisses.

### 4.2 Test Target 2: `test/pages/core/library.test.tsx`

#### Recommended Test Cases:
1. **Initial Mount & Empty State**:
   - Mount `<LibraryPage />`.
   - Wait for loading spinner to resolve.
   - Assert header "Library" and paragraph "Organize, filter, and manage your AI video assets." are present.
   - Assert "All Videos" chip has count 0.
   - Assert Empty State is rendered: "No videos in this workspace" and "Generate Video" button linking to `/create/footage`.
2. **Populated State with Video Cards**:
   - Mock `/api/jobs` returning 2 completed videos and `/api/workspaces` returning 1 workspace.
   - Mount `<LibraryPage />`.
   - Wait for loading spinner to resolve.
   - Assert video titles appear in document.
   - Assert `<DashboardCard>` controls ("Export", "Publish") render.
   - Assert workspace chip displays the workspace name and video count.
3. **Rendering Queue Panel State**:
   - Mock `/api/jobs` returning 1 queued job (`status: "processing"`) and 1 failed job (`status: "failed"`).
   - Mount `<LibraryPage />`.
   - Wait for loading spinner to resolve.
   - Assert "Rendering Queue" banner appears.
   - Assert active count and failed count badges appear.
   - Assert `<QueueCard>` elements render with status badges.
4. **Workspace Filtering**:
   - Mock multiple workspaces and videos assigned to different `workspace_id`s.
   - Click a workspace chip.
   - Verify filtered video list updates accordingly.
5. **New Workspace Modal Interaction**:
   - Click "New Folder" button in header.
   - Assert "Create New Workspace" modal opens.
   - Assert workspace name input and color pickers exist.
   - Click "Cancel" and assert modal dismisses.

---

## 5. Potential Pitfalls & Defensive Recommendations

1. **Missing `/api/settings/health` in `test/setup.ts`**:
   - **Risk**: If any test switches to or mounts the `"API Health Hub"` tab, `ApiProviderHub` fetches `/api/settings/health`. The global fallback in `test/setup.ts` currently returns `{ success: true, data: [] }`. Because `data.providers` is undefined, `setProviders(data.providers)` in `ApiProviderHub.tsx:248` will set state to `undefined` and throw `TypeError: Cannot read properties of undefined (reading 'filter')` on line 320.
   - **Recommendation**: Add a specific handler in `test/setup.ts` for `/api/settings/health` returning:
     ```ts
     if (url.includes('/api/settings/health')) {
       return new Response(JSON.stringify({
         success: true,
         providers: [],
         summary: { total: 0, healthy: 0, offline: 0, byCategory: {} }
       }), { status: 200, headers: { 'Content-Type': 'application/json' } });
     }
     ```
2. **Missing `/api/tts/preview` in `test/setup.ts`**:
   - **Risk**: If a test exercises the voice audition play button, `/api/tts/preview` is called. The fallback lacks `audioUrl`, triggering an error state.
   - **Recommendation**: In tests asserting voice preview playback, mock `/api/tts/preview` with `{ success: true, audioUrl: "https://example.com/mock-preview.mp3" }` or add it to `test/setup.ts`.
3. **Auto-Polling Interval in `LibraryPage`**:
   - **Risk**: If `queuedJobs` is non-empty, `setInterval(refreshJobs, 8000)` runs indefinitely.
   - **Recommendation**: Ensure tests either test queued state with fake timers (`vi.useFakeTimers()`) or unmount cleanly after assertions so `pollRef.current` cleanup runs.
4. **Framer Motion Animations in JSDOM**:
   - `framer-motion` version 13 is installed. In JSDOM, `motion.div` renders regular HTML elements. When asserting visibility of elements rendered inside `AnimatePresence`, use `findBy*` or `waitFor` to allow asynchronous presence transitions to settle.

---

## 6. Conclusion

Both `app/(app)/settings/page.tsx` and `app/(app)/library/page.tsx` have been thoroughly inspected and are fully ready for headless unit test creation. The existing test harness in `test/setup.ts` already provides ~90% of required mocks (Next.js routing, Supabase context, Media/Audio stubs, ResizeObserver/matchMedia). Addressing the minor mock endpoint gaps (`/api/settings/health`, `/api/tts/preview`) will enable 100% headless test coverage and reliability across both pages.
