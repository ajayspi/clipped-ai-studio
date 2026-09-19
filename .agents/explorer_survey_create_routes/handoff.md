# Handoff Report — Explorer 3 (Create Workflow Routes Survey)

**Type**: Hard Handoff (Task Complete)  
**Agent**: Explorer 3 (Create Workflow Routes Explorer)  
**Parent**: Sentinel / Orchestrator (`de90b75e-287e-4f81-a191-d921b36d9d9c`)  
**Scope**: Video generation workflow routes under `app/(app)/create/**`

---

## 1. Observation

Direct code inspection of the 13 `page.tsx` routes under `app/(app)/create/**` yielded the following verified evidence:

1. **Client vs Server Components**:
   All 13 routes begin with verbatim `"use client";` at line 1:
   - `app/(app)/create/page.tsx:1`
   - `app/(app)/create/auto/page.tsx:1`
   - `app/(app)/create/ai-videos/page.tsx:1`
   - `app/(app)/create/avatar/page.tsx:1`
   - `app/(app)/create/bulk/page.tsx:1`
   - `app/(app)/create/drama/page.tsx:1`
   - `app/(app)/create/footage/page.tsx:1`
   - `app/(app)/create/images/page.tsx:1`
   - `app/(app)/create/shorts/page.tsx:1`
   - `app/(app)/create/stories/page.tsx:1`
   - `app/(app)/create/url/page.tsx:1`
   - `app/(app)/create/whiteboard/page.tsx:1`
   - `app/(app)/create/mission/[id]/page.tsx:1`
   There are zero Server Components among the create workflow routes.

2. **CreationWizard Shared Delegation**:
   Four routes delegate their entire UI to `CreationWizard`:
   - `app/(app)/create/ai-videos/page.tsx:8`: `<CreationWizard workflowType="ai-videos" />`
   - `app/(app)/create/footage/page.tsx:8`: `<CreationWizard workflowType="footage" />`
   - `app/(app)/create/images/page.tsx:8`: `<CreationWizard workflowType="images" />`
   - `app/(app)/create/stories/page.tsx:8`: `<CreationWizard workflowType="stories" />`
   `CreationWizard` initializes into step 0 (`<ScriptStep />`), consuming Zustand store `useWizardStore` (`components/wizard/wizard-store.ts`).

3. **React 19 & Next.js 16 Dynamic Route Signature**:
   `app/(app)/create/mission/[id]/page.tsx:13-20` observes:
   ```ts
   export default function MissionProgressPage({
     params,
   }: {
     params: Promise<{ id: string }>;
   }) {
     const unwrappedParams = use(params);
     const jobId = unwrappedParams.id;
     const searchParams = useSearchParams();
   ```
   In addition, line 106–119 sets up a 1000ms polling loop:
   ```ts
   const interval = setInterval(() => {
     if (job && (job.overallProgress === 100 || job.error)) {
       clearInterval(interval);
       return;
     }
     pollJobStatus();
   }, 1000);
   return () => clearInterval(interval);
   ```

4. **Mount-Time Asynchronous Fetching**:
   - `app/(app)/create/whiteboard/page.tsx:118-120` runs `useEffect(() => { fetchCharacterSheet(); }, [archetype, style]);`, triggering `fetch("/api/workflows/whiteboard/character-sheet", { method: "POST", ... })` on mount.
   - `app/(app)/create/page.tsx:11` calls `useApiKeys()` which invokes `fetch("/api/settings/keys")` and accesses `localStorage` on mount.

5. **Transitive Server / Supabase Imports in Avatar Page**:
   `app/(app)/create/avatar/page.tsx:20` imports `AVATAR_PRESETS` from `@/lib/engine/avatar-orchestrator`.
   `lib/engine/avatar-orchestrator.ts:11` executes `import { supabase } from '@/lib/db';`, which invokes `createClient(defaultSupabaseUrl, defaultSupabaseAnonKey)` on module load.

---

## 2. Logic Chain

1. **Client Boundary Execution**:
   Because all 13 routes are `"use client"` (Observation 1), every page mounts in a browser/DOM runtime rather than RSC stream. Therefore, React Testing Library (RTL) can mount all routes directly in a JSDOM environment without RSC server rendering harnesses.

2. **React 19 Suspense & Param Unwrapping**:
   In `mission/[id]`, `params` is typed as `Promise<{ id: string }>` and unwrapped via `use(params)` (Observation 3). In React 19, `use(promise)` suspends component rendering until the promise settles. If a test passes a raw object `{ id: '1' }` instead of a Promise, `use()` throws a TypeError. Furthermore, if `<MissionProgressPage>` is mounted without an enclosing `<React.Suspense>` boundary, React will throw an unhandled suspense boundary error. Therefore, tests for `mission/[id]` must supply `params={Promise.resolve({ id: "..." })}` and wrap the component in `<Suspense>`.

3. **Timer Leak Prevention**:
   Because `mission/[id]` activates an unmocked `setInterval(..., 1000)` polling loop on mount (Observation 3), tests that mount this page must cleanly unmount or employ Vitest fake timers (`vi.useFakeTimers()`) to prevent timer leakage and dangling async handle warnings across the test runner.

4. **Transitive Import Safety**:
   Because `avatar/page.tsx` imports from `avatar-orchestrator.ts` which loads `lib/db.ts` (Observation 5), the test environment must provide dummy values for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or Vitest must stub `@/lib/db`.

5. **State Isolation across Wizard Pages**:
   Because `ai-videos`, `footage`, `images`, `stories`, and `url` all read or mutate `useWizardStore` (Observation 2), test suites must execute `useWizardStore.getState().reset()` in `afterEach` hooks to guarantee test isolation.

---

## 3. Caveats

1. **Production Video Playback**: `<video>` elements in `MissionLivePreview` and `LivePlayer` cannot play actual media streams in headless JSDOM; standard `HTMLMediaElement.prototype.play` mocks must be provided to avoid uncaught Promise rejections.
2. **Submissions and Network Integration**: This survey focused on initial component mounting, parameter acceptance, and runtime hook dependencies. E2E pipeline execution of actual media generation via FFmpeg / Remotion is handled separately in integration test suites.

---

## 4. Conclusion

All 13 create workflow routes under `app/(app)/create/**` are structured cleanly as Client Components and are capable of mounting in headless RTL tests without uncaught client boundary crashes, provided that:
1. `next/navigation` hooks (`useRouter`, `useSearchParams`, `usePathname`) are mocked.
2. Dynamic route `app/(app)/create/mission/[id]/page.tsx` is rendered inside a `<React.Suspense>` wrapper with a resolved Promise for `params`.
3. Global `fetch` is intercepted for endpoints triggered on mount (`/api/settings/keys`, `/api/workflows/whiteboard/character-sheet`, `/api/workflows/mission?id=...`).
4. `useWizardStore` is reset between test executions.

Full route-by-route specifications and mock harness code are documented in:
`C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_create_routes\create_routes_report.md`.

---

## 5. Verification Method

To independently verify these findings:
1. **File Inventory & Route Structure**:
   Inspect `app/(app)/create/**/page.tsx` routes:
   - Hub: `app/(app)/create/page.tsx`
   - Wizard routes: `ai-videos`, `footage`, `images`, `stories`
   - Form routes: `auto`, `bulk`, `drama`, `shorts`, `url`
   - Interactive studios: `avatar`, `whiteboard`
   - Dynamic route: `mission/[id]`
2. **Dynamic Route Signature Verification**:
   Inspect `app/(app)/create/mission/[id]/page.tsx` lines 13–20 to verify `params: Promise<{ id: string }>`, `use(params)`, and `useSearchParams()`.
3. **Mount Effect Triggers**:
   Inspect `app/(app)/create/whiteboard/page.tsx` lines 118–120 (`useEffect` calling `fetchCharacterSheet`) and `components/create/useApiKeys.ts` lines 88–90 (`useEffect` calling `refresh`).
4. **Transitive Database Import**:
   Inspect `app/(app)/create/avatar/page.tsx` line 20 (`AVATAR_PRESETS` import from `@/lib/engine/avatar-orchestrator`) and `lib/engine/avatar-orchestrator.ts` line 11 (`import { supabase } from '@/lib/db'`).
