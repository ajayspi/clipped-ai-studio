# Handoff Report: Core Routes Survey for Headless Unit Test Suite

**Agent**: Explorer 2 (Core Routes Explorer)  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_core_routes`  
**Handoff Type**: Hard (Task Complete)  
**Reference Report**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_core_routes\core_routes_report.md`

---

## 1. Observation

Direct observations from inspecting the codebase:

1. **Dashboard Route (`app/(app)/dashboard/page.tsx`)**:
   - Lines 5-8:
     ```ts
     export const dynamic = 'force-dynamic'
     export const revalidate = 0
     export default async function DashboardPage() { ... }
     ```
     An **Async Server Component** (RSC). No `'use client'` directive.
   - Lines 9-13: Queries `supabase.from('render_jobs').select('*').order('created_at', { ascending: false }).limit(20)`. Direct server import `from '@/lib/db'`.
   - Line 42: `title: parsed?.subject || \`Job ${job.id.slice(0, 8)}\`` assumes `job.id` is non-null.
   - Subcomponent `DashboardCard.tsx` renders `<video>` tag (line 77) and uses `framer-motion` (`motion.div`, `AnimatePresence`). `PublishModal.tsx` uses `navigator.clipboard.writeText` and `document.createElement("a")`.

2. **Settings Route (`app/(app)/settings/page.tsx`)**:
   - Line 1: `"use client";` — **Client Component**.
   - Line 38: `import { useSupabase, TestConnectionResult } from "@/lib/supabase/context";`
   - Lines 318-328: Invokes `useSupabase()`. If not rendered inside `<SupabaseProvider>`, `lib/supabase/context.tsx:265` throws:
     `Error: useSupabase must be used within a SupabaseProvider`.
   - Line 508: `const audio = new Audio(data.audioUrl); audioRef.current = audio;` — relies on `HTMLAudioElement` / `window.Audio`.
   - Lines 629, 637: `navigator.clipboard.writeText(...)`.
   - Line 1642: Renders `<ApiProviderHub />`, which polls `/api/settings/health` on an interval (`setInterval(load, 2 * 60 * 1000)`).

3. **Queue Route (`app/(app)/queue/page.tsx`)**:
   - Tool `find_by_name` with `Pattern: "*queue*"` and `grep_search` with Query `"(app)/queue"` confirmed: **`app/(app)/queue/page.tsx` DOES NOT EXIST**.
   - In `app/(app)/library/page.tsx:236-262`, there is an integrated `{/* Live Queue Status Panel */}` rendering active jobs via `QueueCard` (`library/page.tsx:36-80`), which polls `/api/jobs` every 8s.
   - In `components/sidebar.tsx:31-37`, the registered navigation links are only `/dashboard`, `/create`, `/library`, `/planner`, and `/settings`.

4. **Library Route (`app/(app)/library/page.tsx`)**:
   - Line 1: `"use client";` — **Client Component**.
   - Lines 105, 120: Fetches `/api/workspaces` and `/api/jobs` via `fetch()`.
   - Lines 130-135: Sets up auto-polling interval (`setInterval(refreshJobs, 8000)`) if `queuedJobs.length > 0`.
   - Lines 40-79: Defines `QueueCard` which renders `<motion.div>` and `<img src={job.thumbnail} ...>`.

5. **Planner Route (`app/(app)/planner/page.tsx`)**:
   - Lines 6-9:
     ```ts
     export const dynamic = "force-dynamic";
     export const revalidate = 0;
     export default async function PlannerPage() { ... }
     ```
     An **Async Server Component** (RSC).
   - Lines 11-14: Queries `supabase.from('scheduled_posts').select('*, render_jobs(logs)').order('scheduled_for', { ascending: true })`.
   - Lines 36-37: `const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_for), day));`
   - Line 64: `{format(new Date(post.scheduled_for), 'h:mm a')}`
   - In `package.json:29`, `"date-fns": "^4.4.0"` is installed. Passing an invalid date (e.g. `new Date(undefined)`) to `isSameDay` or `format` throws `RangeError: Invalid time value`.
   - Subcomponent `ScheduleModal.tsx:61` calls `window.location.reload()`.

6. **Login Route (`app/login/page.tsx` vs `app/(auth)/login/page.tsx`)**:
   - Physical location is `app/(auth)/login/page.tsx` (Route Group `(auth)` maps to `/login`).
   - Line 1: `"use client"` — **Client Component**.
   - Line 10: `const router = useRouter()` from `next/navigation`.
   - Line 11: `const supabase = createClient()` from `@/lib/supabase/client`.
   - Requires `next/navigation` (`useRouter`) and `@/lib/supabase/client` mocking.

7. **Register Route (`app/register/page.tsx` vs `app/(auth)/register/page.tsx`)**:
   - Physical location is `app/(auth)/register/page.tsx`.
   - Line 1: `"use client"` — **Client Component**.
   - Line 10: `const router = useRouter()`.
   - Line 11: `const supabase = createClient()`.
   - Line 33: `setTimeout(() => router.push("/login"), 3000)`.

---

## 2. Logic Chain

1. **RSC vs Client Component Divergence**:
   - `dashboard` and `planner` are `async` functions with top-level `await supabase...`.
   - In React 19 / RTL, mounting an async function `<DashboardPage />` directly as JSX in a synchronous test environment will fail. Therefore, the test runner must evaluate `const Page = await DashboardPage(); render(Page)` and mock `@/lib/db`.
   - Conversely, `settings`, `library`, `login`, and `register` are standard client components mountable with `<Page />`.

2. **Context & Provider Failure Points**:
   - `SettingsPage` consumes `useSupabase()`. Calling `useSupabase()` without `<SupabaseProvider>` throws an explicit runtime error. Hence, `useSupabase()` must be mocked or wrapped in `<SupabaseProvider>`.
   - `LoginPage` and `RegisterPage` invoke `useRouter()`. Next.js App Router client components throw `NextRouter was not mounted` if `next/navigation` is unmocked.
   - `SettingsPage` calls `new Audio(...)`. Headless JSDOM lacks native HTMLAudioElement audio playback methods, throwing on `.play()` unless polyfilled.

3. **Missing `/queue` Route**:
   - Because `app/(app)/queue/page.tsx` does not exist on disk, any test importing from `@/app/(app)/queue/page` will fail at compile/import time with `Module not found`.
   - Since the UI and polling logic for queues are contained in `app/(app)/library/page.tsx`, queue tests must target `LibraryPage` and its `QueueCard` subcomponent.

4. **Runtime Crash Risk in Planner**:
   - `date-fns` v4 throws `RangeError: Invalid time value` when an invalid date object is passed.
   - If `scheduled_posts` data contains any null or unparsable timestamp, `PlannerPage` crashes. A null-check guard is strongly recommended.

---

## 3. Caveats

- Workflow creation pages (`app/(app)/create/**/page.tsx`) were intentionally excluded from this specific core route report as they fall under Explorer 1's domain.
- The root `app/page.tsx` (marketing landing page) was observed in `find_by_name` but was not part of the 7 core dashboard/auth routes requested.
- If the project introduces a separate `/queue` route in the future, it should simply expose the `QueueCard` view currently housed in `library/page.tsx`.

---

## 4. Conclusion

- The 7 requested core routes were fully analyzed and decomposed into 2 Server Components (`dashboard`, `planner`), 4 Client Components (`settings`, `library`, `login`, `register`), and 1 Non-Existent Route (`queue`, embedded in `library`).
- A clean headless render across all core routes requires:
  1. An `async` Server Component test wrapper for `DashboardPage` and `PlannerPage`.
  2. Polyfills in `vitest.setup.ts` for `next/navigation` (`useRouter`, `usePathname`), `window.matchMedia`, `ResizeObserver`, `window.Audio`, and `navigator.clipboard`.
  3. Mocks for `@/lib/db`, `@/lib/supabase/context` (`useSupabase`), `@/lib/supabase/client` (`createClient`), and `global.fetch`.
  4. Path aliasing / awareness that login and register are under `app/(auth)/`.
  5. A defensive date validation guard in `app/(app)/planner/page.tsx`.

---

## 5. Verification Method

To verify these observations:
1. **File paths and line numbers**:
   - Run `view_file` on `app/(app)/dashboard/page.tsx`, `app/(app)/settings/page.tsx`, `app/(app)/library/page.tsx`, `app/(app)/planner/page.tsx`, `app/(auth)/login/page.tsx`, and `app/(auth)/register/page.tsx`.
2. **Missing queue route verification**:
   - Search for `app/(app)/queue/page.tsx`:
     `find_by_name` with `Pattern: "*queue*"` in `app/`. Output will show zero matches in `app/`.
3. **Invalidation condition**:
   - If `app/(app)/queue/page.tsx` is created, or if `DashboardPage`/`PlannerPage` are converted to client components (`'use client'`), this report should be updated.
