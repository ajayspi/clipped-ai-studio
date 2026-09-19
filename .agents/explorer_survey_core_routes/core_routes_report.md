# Core Routes Survey Report: Automated Headless Unit Testing

**Explorer**: Explorer 2 (Core Routes Explorer)  
**Date**: 2026-09-17  
**Scope**: Core Next.js App Router `page.tsx` routes in Clipped AI Studio  
**Target Output**: Headless unit test harness design, component classification, dependency matrix, and failure mitigation for Vitest / React Testing Library.

---

## 1. Executive Summary & Route Matrix

A thorough examination of the core routes requested in the authoritative specification revealed crucial architectural differences:
- Two routes (`dashboard`, `planner`) are **Async Server Components (RSC)** querying Supabase directly via the server database client (`@/lib/db`). In React Testing Library (React 19), async Server Components cannot be mounted as `<Page />` JSX elements directly; they must be evaluated with `const Page = await PageComponent(); render(Page)`.
- Three routes (`settings`, `library`, and the auth routes) are **Client Components** (`'use client'`).
- One requested route (`app/(app)/queue/page.tsx`) **does not exist as a separate file**. Its full functionality is implemented directly within `app/(app)/library/page.tsx` as an integrated Live Queue Status Panel (`QueueCard` subcomponent) polling `/api/jobs`.
- The two authentication routes are located inside the route group `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx` (not `app/login/page.tsx`).
- One significant runtime hazard was identified in `app/(app)/planner/page.tsx`: unhandled `Date` parsing passed to `date-fns` (`isSameDay` / `format`) will throw an uncaught `RangeError: Invalid time value` if `scheduled_for` is null or invalid.

### Summary Matrix

| Route URL | Actual File Path | Type | Navigation Hooks | Data Fetching / Context Required | Browser APIs Used | Mock Harness Needs |
|---|---|---|---|---|---|---|
| `/dashboard` | `app/(app)/dashboard/page.tsx` | **Async RSC** | None (uses `<a>`) | `@/lib/db` (`supabase.from`) | Subcomponents: HTMLVideoElement, `navigator.clipboard`, `framer-motion` | `await DashboardPage()`, mock `@/lib/db` |
| `/settings` | `app/(app)/settings/page.tsx` | **Client** | None directly | `useSupabase()` context, `fetch('/api/settings/*')` | HTMLAudioElement (`new Audio()`), `navigator.clipboard`, `framer-motion` | `<SupabaseProvider>` or mock `useSupabase()`, mock `fetch`, mock `window.Audio` |
| `/queue` | *None* (In `library/page.tsx`) | **N/A** | N/A | N/A | Embedded in `/library` | Document absence; test `QueueCard` in `/library` |
| `/library` | `app/(app)/library/page.tsx` | **Client** | None directly | `fetch('/api/workspaces')`, `fetch('/api/jobs')` | `setInterval`, `framer-motion`, HTMLVideoElement (via `DashboardCard`) | Mock `global.fetch` |
| `/planner` | `app/(app)/planner/page.tsx` | **Async RSC** | None directly | `@/lib/db` (`supabase.from`), `ScheduleModal` client DB queries | `window.location.reload()` (in `ScheduleModal`), `framer-motion` | `await PlannerPage()`, mock `@/lib/db`, date guard |
| `/login` | `app/(auth)/login/page.tsx` | **Client** | `useRouter` | `@/lib/supabase/client` (`createClient().auth.signInWithPassword`) | `localStorage`, `document.cookie` (in client) | Mock `next/navigation` (`useRouter`), mock `@/lib/supabase/client` |
| `/register` | `app/(auth)/register/page.tsx` | **Client** | `useRouter` | `@/lib/supabase/client` (`createClient().auth.signUp`) | `setTimeout`, `localStorage`, `document.cookie` | Mock `next/navigation` (`useRouter`), mock `@/lib/supabase/client` |

---

## 2. Route-by-Route Deep Dive

### 2.1. `app/(app)/dashboard/page.tsx`

#### Architectural Classification
- **Component Type**: Async Server Component (`export default async function DashboardPage()`).
- **Route Segment Config**:
  ```ts
  export const dynamic = 'force-dynamic'
  export const revalidate = 0
  ```
- **Execution Lifecycle**: Executes entirely on the server during normal Next.js requests. In headless test runners, it must be invoked as an asynchronous function returning a JSX tree prior to `render()`.

#### Navigation Hooks
- **None**: Does not import or invoke `useRouter`, `useSearchParams`, `usePathname`, or `useParams`.
- Navigation is handled through static anchor tags (`<a href="/library">`, `<a href="/create/footage">`).

#### Data Fetching & Context Requirements
- Imports `supabase` from `@/lib/db.ts`:
  ```ts
  const { data: jobs } = await supabase
    .from('render_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: dbWorkspaces } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })
  ```
- If `@/lib/db` is not mocked, rendering `<DashboardPage />` triggers live network calls to the Supabase URL defined in `.env.local` or defaults to `'https://agafustlankeieewtvck.supabase.co'`.

#### Subcomponents & Browser APIs
- **Subcomponents**:
  - `DashboardCard` (`@/components/dashboard/DashboardCard.tsx`)
  - `PublishModal` (`@/components/dashboard/PublishModal.tsx` rendered inside `DashboardCard`)
- **Browser APIs**:
  - `HTMLVideoElement`: When a card video is played (`isPlaying && video.output_url`), it renders `<video src={...} autoPlay controls onEnded=... />`.
  - `framer-motion`: `motion.div` and `AnimatePresence` are used in `DashboardCard` for hover effects and modal transitions.
  - `navigator.clipboard`: Used in `PublishModal` (`navigator.clipboard.writeText`).
  - DOM APIs: `PublishModal` programmatically creates and removes anchor elements for file downloads (`document.createElement("a"); link.click(); document.body.removeChild(link)`).
  - Network: `fetch('/api/workspaces/move')` in `DashboardCard`, `fetch('/api/publish')` and `fetch('/api/export')` in `PublishModal`.

#### Headless Test Mocking Requirements
1. **Async evaluation**:
   ```tsx
   const Page = await DashboardPage();
   render(Page);
   ```
2. **Mock `@/lib/db`**:
   ```ts
   vi.mock('@/lib/db', () => ({
     supabase: {
       from: vi.fn().mockReturnValue({
         select: vi.fn().mockReturnThis(),
         order: vi.fn().mockReturnThis(),
         limit: vi.fn().mockResolvedValue({ data: [] }),
       }),
     },
   }));
   ```

#### Code Health & Bug Analysis
- **Missing Null Check**: Line 42 has `title: parsed?.subject || \`Job ${job.id.slice(0, 8)}\``. If `job.id` is undefined or not a string, `job.id.slice(0, 8)` throws a `TypeError: Cannot read properties of undefined (reading 'slice')`. Recommended guard: `job.id?.slice?.(0, 8) ?? 'Unknown Job'`.
- Safe JSON parsing: Uses `try ... catch` around `JSON.parse(job.logs)`.

---

### 2.2. `app/(app)/settings/page.tsx`

#### Architectural Classification
- **Component Type**: Client Component (`"use client"` at line 1).
- **Execution Lifecycle**: Mounts and executes client-side state hooks (`useState`, `useEffect`, `useRef`, `useCallback`).

#### Navigation Hooks
- **None directly in page**: Does not invoke `useRouter`, `useSearchParams`, or `usePathname`.

#### Data Fetching & Context Requirements
- **Crucial Dependency**: `useSupabase()` from `@/lib/supabase/context.tsx`:
  ```ts
  const {
    url: activeSupabaseUrl,
    anonKey: activeSupabaseAnonKey,
    isCustom,
    status: supabaseStatus,
    latencyMs,
    schemaStatus,
    setCustomConfig,
    resetToDefault,
    testConnection,
  } = useSupabase();
  ```
  **Failure Risk**: If `SettingsPage` is mounted without `<SupabaseProvider>` or without mocking `useSupabase()`, it **immediately throws an uncaught error**:
  `Error: useSupabase must be used within a SupabaseProvider`
- **Network Requests (`fetch`)**:
  - Initial mount: `fetch('/api/settings/keys', { cache: 'no-store' })`
  - Diagnostics: `fetch('/api/settings/keys/check', { method: 'POST', ... })`
  - Audio preview: `fetch('/api/tts/preview', { method: 'POST', ... })`
  - Custom provider: `fetch('/api/settings/keys', { method: 'POST', ... })`

#### Subcomponents & Browser APIs
- **Subcomponents**:
  - `ApiProviderHub` (`@/components/settings/ApiProviderHub.tsx`)
- **Browser APIs**:
  - `HTMLAudioElement` / `window.Audio`: Line 508 instantiates `new Audio(data.audioUrl)`. Line 344 in `useEffect` cleanup calls `audioRef.current.pause()`. JSDOM does not implement HTMLAudioElement playback methods; calling `audio.play()` or `new Audio()` throws unless mocked in `setupFiles`.
  - `navigator.clipboard`: Lines 629 and 636 invoke `navigator.clipboard.writeText(...)`.
  - `localStorage` & `document.cookie`: Used inside `SupabaseProvider` and `@/lib/supabase/client`.
  - `framer-motion`: Extensively used with `layoutId="active-tab"`, `motion.aside`, `AnimatePresence`.
  - Timers: `ApiProviderHub` runs `setInterval(load, 2 * 60 * 1000)`.

#### Headless Test Mocking Requirements
1. **Mock `useSupabase()`**:
   ```ts
   vi.mock('@/lib/supabase/context', () => ({
     useSupabase: () => ({
       url: 'https://agafustlankeieewtvck.supabase.co',
       anonKey: 'mock-anon-key',
       isCustom: false,
       status: 'default',
       latencyMs: 32,
       schemaStatus: { isHealthy: true, tables: {}, missingTables: [] },
       setCustomConfig: vi.fn().mockResolvedValue({ success: true, reachable: true }),
       resetToDefault: vi.fn(),
       testConnection: vi.fn().mockResolvedValue({ success: true, reachable: true }),
       refreshStatus: vi.fn().mockResolvedValue(undefined),
     }),
   }));
   ```
2. **Mock `global.fetch`**:
   ```ts
   global.fetch = vi.fn().mockImplementation((url: string) => {
     if (url.includes('/api/settings/keys')) {
       return Promise.resolve({
         ok: true,
         json: () => Promise.resolve({ keys: {}, customProviders: [] }),
       });
     }
     if (url.includes('/api/settings/health')) {
       return Promise.resolve({
         ok: true,
         json: () => Promise.resolve({ success: true, providers: [], summary: null }),
       });
     }
     return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
   });
   ```
3. **Mock `window.Audio`**:
   ```ts
   global.Audio = vi.fn().mockImplementation(() => ({
     play: vi.fn().mockResolvedValue(undefined),
     pause: vi.fn(),
     addEventListener: vi.fn(),
     removeEventListener: vi.fn(),
   }));
   ```

#### Code Health & Bug Analysis
- Clean null handling. `audioRef.current` has checks before calling `.pause()`.
- Clipboard access is safely guarded with `typeof navigator !== 'undefined' && navigator.clipboard`.

---

### 2.3. `app/(app)/queue/page.tsx`

#### Architectural Classification
- **FILE DOES NOT EXIST IN THE REPOSITORY**.
- Search results:
  - `find_by_name` on `*queue*` found no `page.tsx` in `app/`.
  - Ripgrep search across `app/` confirms no `queue` route folder exists.

#### Functional Relocation Analysis
- Queue tracking and active rendering job monitoring in Clipped AI Studio is integrated directly into **`app/(app)/library/page.tsx`**.
- Specifically, `LibraryPage`:
  - Renders the `{/* Live Queue Status Panel */}` (`library/page.tsx:236–262`).
  - Implements the `QueueCard` subcomponent (`library/page.tsx:36–80`) which shows active rendering animations, progress bars, and status pills (`Queued`, `Generating Plan`, `Rendering`, `Completed`, `Failed`).
  - Polls `/api/jobs` every 8 seconds when active jobs are queued.
  - The main application navigation (`components/sidebar.tsx:31–37`) defines only:
    - `/dashboard`
    - `/create`
    - `/library`
    - `/planner`
    - `/settings`
  - There is no `/queue` link in the sidebar or mobile navigation.

#### Headless Test Suite Recommendation
- **Option A (Preserve Strict Route Mapping)**: Create `app/(app)/queue/page.tsx` as a redirect or dedicated view exporting `LibraryPage` (or a focused view of `QueueCard` and queued jobs).
- **Option B (Test Suite Configuration)**: Map queue rendering unit tests directly against `QueueCard` and the queue section in `app/(app)/library/page.tsx`.

---

### 2.4. `app/(app)/library/page.tsx`

#### Architectural Classification
- **Component Type**: Client Component (`"use client"` at line 1).
- **Execution Lifecycle**: Mounts and initiates parallel data fetching in `useEffect`.

#### Navigation Hooks
- **None**: Does not use Next.js navigation hooks directly. Uses standard link `<a href="/create/footage">`.

#### Data Fetching & Context Requirements
- Does **not** require `useSupabase()` or `<SupabaseProvider>`.
- Fetches data purely via standard HTTP `fetch`:
  - `fetch('/api/workspaces')`
  - `fetch('/api/jobs')`
  - `fetch('/api/workspaces', { method: 'POST', ... })`
- **Auto-polling**: If `data.queued` has items, `setInterval` polls `/api/jobs` every 8000ms.

#### Subcomponents & Browser APIs
- **Subcomponents**:
  - `QueueCard` (in-file subcomponent)
  - `DashboardCard` (`@/components/dashboard/DashboardCard.tsx`)
- **Browser APIs**:
  - `setInterval` / `clearInterval` via `pollRef`.
  - `framer-motion`: `motion.div`, `AnimatePresence`.
  - `<img src={job.thumbnail} ...>` and down-tree HTML video elements via `DashboardCard`.

#### Headless Test Mocking Requirements
1. **Mock `global.fetch`**:
   ```ts
   global.fetch = vi.fn().mockImplementation((url: string) => {
     if (url.includes('/api/workspaces')) {
       return Promise.resolve({
         ok: true,
         json: () => Promise.resolve({ workspaces: [] }),
       });
     }
     if (url.includes('/api/jobs')) {
       return Promise.resolve({
         ok: true,
         json: () => Promise.resolve({ success: true, completed: [], queued: [], failed: [] }),
       });
     }
     return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
   });
   ```

#### Code Health & Bug Analysis
- In `QueueCard` (`line 45`): `<img src={job.thumbnail} alt={job.title} />`. If `job.title` is undefined, `alt={undefined}` is rendered. If `job.thumbnail` is undefined, `src={undefined}` is rendered. Recommend adding fallback: `alt={job.title || "Video thumbnail"}`.
- In `loadLibraryData` (`line 106`): `const wsData = await wsRes.json()`. If the server returns a 500 error or non-JSON body, calling `.json()` without checking `wsRes.ok` will throw. Recommend `if (wsRes.ok) { const wsData = await wsRes.json(); ... }`.

---

### 2.5. `app/(app)/planner/page.tsx`

#### Architectural Classification
- **Component Type**: Async Server Component (`export default async function PlannerPage()`).
- **Route Segment Config**:
  ```ts
  export const dynamic = "force-dynamic";
  export const revalidate = 0;
  ```

#### Navigation Hooks
- **None**: Does not use Next.js navigation hooks directly.

#### Data Fetching & Context Requirements
- Imports `supabase` from `@/lib/db.ts`:
  ```ts
  const { data: scheduled } = await supabase
    .from('scheduled_posts')
    .select('*, render_jobs(logs)')
    .order('scheduled_for', { ascending: true });
  ```
- Must mock `@/lib/db` in test suite.

#### Subcomponents & Browser APIs
- **Subcomponents**:
  - `ScheduleModal` (`@/components/planner/ScheduleModal.tsx`), a Client Component (`"use client"`).
- **Browser APIs**:
  - `ScheduleModal` calls `window.location.reload()` on form submission (`line 61`). In JSDOM, `window.location.reload` is unconfigured and throws unless mocked.
  - `new Date().toISOString().split('T')[0]` used for date initialization.
  - `framer-motion` (`motion.div`, `AnimatePresence`).
  - `ScheduleModal` also makes direct Supabase queries:
    `supabase.from('render_jobs').select('*').eq('status', 'completed')`
    `supabase.from('scheduled_posts').insert(...)`

#### Code Health & Bug Analysis (CRITICAL BUG IDENTIFIED)
- **Potential Uncaught Exception (`date-fns` `RangeError`)**:
  - In `PlannerPage.tsx`:
    ```ts
    // Line 36
    const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_for), day));
    ...
    // Line 64
    {format(new Date(post.scheduled_for), 'h:mm a')}
    ```
  - In `date-fns` v4 (`package.json` specifies `"date-fns": "^4.4.0"`), passing an invalid date object (`new Date(null)`, `new Date(undefined)`, or `new Date("invalid-date")`) to `isSameDay()` or `format()` **throws a fatal exception**:
    `RangeError: Invalid time value`
  - If any row in `scheduled_posts` has a null or malformed `scheduled_for` timestamp, the entire `PlannerPage` server render crashes with a 500 error!
  - **Recommended Patch**:
    ```ts
    const dayPosts = posts.filter(p => {
      if (!p.scheduled_for) return false;
      const d = new Date(p.scheduled_for);
      return !isNaN(d.getTime()) && isSameDay(d, day);
    });
    ```
    and for formatting:
    ```ts
    {post.scheduled_for && !isNaN(new Date(post.scheduled_for).getTime())
      ? format(new Date(post.scheduled_for), 'h:mm a')
      : 'Scheduled'}
    ```

#### Headless Test Mocking Requirements
1. **Async evaluation**:
   ```tsx
   const Page = await PlannerPage();
   render(Page);
   ```
2. **Mock `@/lib/db`**:
   ```ts
   vi.mock('@/lib/db', () => ({
     supabase: {
       from: vi.fn().mockReturnValue({
         select: vi.fn().mockReturnThis(),
         order: vi.fn().mockResolvedValue({ data: [] }),
         eq: vi.fn().mockReturnThis(),
         insert: vi.fn().mockResolvedValue({ error: null }),
       }),
     },
   }));
   ```

---

### 2.6. `app/login/page.tsx` (`app/(auth)/login/page.tsx`)

#### Architectural Classification
- **Component Type**: Client Component (`"use client"` at line 1).
- **Physical Path**: Located at `app/(auth)/login/page.tsx` (Next.js route group `(auth)` maps to `/login`).

#### Navigation Hooks
- **`useRouter`** from `next/navigation`:
  ```ts
  const router = useRouter()
  ...
  router.push("/dashboard")
  router.refresh()
  ```
  **Failure Risk**: If `next/navigation`'s `useRouter` is not mocked, mounting `<LoginPage />` will throw:
  `Error: NextRouter was not mounted.`

#### Data Fetching & Context Requirements
- Imports `createClient` from `@/lib/supabase/client`:
  ```ts
  const supabase = createClient()
  ```
  When submitted, calls:
  `supabase.auth.signInWithPassword({ email, password })`
- If `@/lib/supabase/client` is not mocked, `createClient()` calls `createBrowserClient` from `@supabase/ssr`. While `process.env.NEXT_PUBLIC_SUPABASE_URL` exists in `.env.local`, in headless tests without dotenv it might throw: `supabaseUrl is required`.

#### Subcomponents & Browser APIs
- Lucide icons (`Video`, `Loader2`).
- Next.js `<Link>` component.
- Browser APIs: `localStorage` and `document.cookie` accessed by Supabase SSR client.

#### Headless Test Mocking Requirements
1. **Mock `next/navigation`**:
   ```ts
   vi.mock('next/navigation', () => ({
     useRouter: () => ({
       push: vi.fn(),
       refresh: vi.fn(),
       replace: vi.fn(),
       prefetch: vi.fn(),
       back: vi.fn(),
     }),
     usePathname: () => '/login',
   }));
   ```
2. **Mock `@/lib/supabase/client`**:
   ```ts
   vi.mock('@/lib/supabase/client', () => ({
     createClient: () => ({
       auth: {
         signInWithPassword: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
       },
     }),
   }));
   ```

#### Code Health & Bug Analysis
- Clean implementation. Proper form validation (`required` on inputs), handles error display gracefully.

---

### 2.7. `app/register/page.tsx` (`app/(auth)/register/page.tsx`)

#### Architectural Classification
- **Component Type**: Client Component (`"use client"` at line 1).
- **Physical Path**: Located at `app/(auth)/register/page.tsx` (Next.js route group `(auth)` maps to `/register`).

#### Navigation Hooks
- **`useRouter`** from `next/navigation`:
  ```ts
  const router = useRouter()
  ...
  setTimeout(() => router.push("/login"), 3000)
  ```
  **Failure Risk**: Requires `useRouter` mock.

#### Data Fetching & Context Requirements
- Imports `createClient` from `@/lib/supabase/client`.
- When submitted, calls:
  `supabase.auth.signUp({ email, password })`

#### Subcomponents & Browser APIs
- Lucide icons (`Video`, `Loader2`).
- Next.js `<Link>` component.
- Browser APIs: `setTimeout`, `localStorage`, `document.cookie`.

#### Headless Test Mocking Requirements
1. Same `next/navigation` mock as `/login`.
2. Mock `@/lib/supabase/client`:
   ```ts
   vi.mock('@/lib/supabase/client', () => ({
     createClient: () => ({
       auth: {
         signUp: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
       },
     }),
   }));
   ```

#### Code Health & Bug Analysis
- Clean implementation. No syntax errors or broken imports.

---

## 3. Universal Test Harness Design for Headless Execution

To ensure 100% of these routes mount cleanly without runtime boundary crashes, the headless test runner must provide the following standard test harness:

### 3.1. Global Environment & JSDOM Polyfills (`vitest.setup.ts`)

```ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 1. Next.js Navigation Polyfill
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// 2. Window & Browser API Polyfills
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

// 3. Audio & Video API Polyfills
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

// 4. Clipboard API Polyfill
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});
```

### 3.2. Common Supabase Mock Provider Pattern

For Client Components that consume `useSupabase()`:
```tsx
import React from 'react';
import { SupabaseProvider } from '@/lib/supabase/context';

export function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      {children}
    </SupabaseProvider>
  );
}
```
Or prefer component-level `vi.mock('@/lib/supabase/context')` for isolated deterministic testing.

### 3.3. Async Server Component Testing Helper

For `DashboardPage` and `PlannerPage`:
```tsx
export async function renderAsyncComponent(AsyncComponent: () => Promise<React.JSX.Element>) {
  const jsx = await AsyncComponent();
  return render(jsx);
}
```

---

## 4. Specific Recommendations & Action Items

1. **Address `/queue` Route**:
   - In documentation and test runner configs, note that `/queue` does not exist as a separate route; its tests should target `app/(app)/library/page.tsx` (`QueueCard` and queue panel) or a newly added route alias.
2. **Apply Date Null-Check Guard to `PlannerPage`**:
   - Wrap `new Date(p.scheduled_for)` in `!isNaN(...)` before calling `isSameDay` to prevent `RangeError: Invalid time value` in `date-fns` v4.
3. **Route Path Normalization**:
   - Ensure test suite references `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx` when importing page components.
4. **Mock Global `fetch`**:
   - Mock endpoints `/api/workspaces`, `/api/jobs`, `/api/settings/keys`, `/api/settings/health` in `beforeEach` hooks so tests do not hang or fail on network timeouts.
