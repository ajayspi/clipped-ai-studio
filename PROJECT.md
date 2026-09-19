# Project: Clipped AI Studio — Frontend Automated Headless Unit Test Suite

## Architecture
Comprehensive automated headless unit and component render test suite (Vitest + React Testing Library + JSDOM) across 100% of frontend `page.tsx` routes in Clipped.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TEST INFRASTRUCTURE LAYER                              │
│  - Vitest Runner (vitest.config.mts, vite-tsconfig-paths, @vitejs/plugin-react)        │
│  - JSDOM Environment & DOM polyfills (ResizeObserver, IntersectionObserver, Media)     │
│  - Centralized Mock Harness (test/setup.ts)                                            │
│    * next/navigation (useRouter, useSearchParams, usePathname, useParams)              │
│    * next/font stubs                                                                   │
│    * Supabase client & context providers (mock user, session, testConnection)          │
│    * Database mocks for Server Components (@/lib/db)                                   │
│    * Global fetch mock router for client-mount endpoints                               │
│    * HTMLMediaElement & window.Audio stubs                                             │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                     TEST SUITES                                        │
│  - Core Page Tests: dashboard, settings, queue, library, planner, login, register       │
│  - Creation Workflow Tests: create hub, auto, ai-videos, avatar, bulk, drama,          │
│    footage, images, shorts, stories, url, whiteboard, mission/[id]                     │
│  - RSC Test Harness: Async server component resolution (await PageComponent())         │
│  - React 19 Dynamic Route Harness: Suspense + Promise params for mission/[id]          │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                              DEFENSIVE STABILITY & BUILD                               │
│  - Guard app/(app)/planner/page.tsx against date-fns v4 Invalid time value crashes      │
│  - Provide app/(app)/queue/page.tsx standalone route re-exporting QueueCard / view     │
│  - Clean npm run build verification with zero regressions                              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Vitest & RTL Infrastructure | Dependencies in package.json and vitest.config.mts with JSDOM and @/* aliasing | M1 | Survey / R1 |
| 2 | Global Mock Harness | test/setup.ts mocking next/navigation, Supabase, Media, Observers, Fetch | M1 | Survey / R2 |
| 3 | Package Test Scripts | Configure "test:unit": "vitest run" in package.json | M1 | Survey / R1 |
| 4 | Dashboard Route Test | Headless render test for app/(app)/dashboard/page.tsx with RSC async harness | M2 | Survey / R1 |
| 5 | Settings Route Test | Headless render test for app/(app)/settings/page.tsx with SupabaseProvider & Audio mocks | M2 | Survey / R1 |
| 6 | Library Route Test | Headless render test for app/(app)/library/page.tsx with workspace/job mocks | M2 | Survey / R1 |
| 7 | Queue Route Standalone & Test | Standalone app/(app)/queue/page.tsx route and dedicated headless unit test | M2 | Survey / R1 |
| 8 | Planner Route Test | Headless render test for app/(app)/planner/page.tsx with RSC async harness | M2 | Survey / R1 |
| 9 | Login Route Test | Headless render test for app/(auth)/login/page.tsx and app/login/page.tsx | M2 | Survey / R1 |
| 10 | Register Route Test | Headless render test for app/(auth)/register/page.tsx and app/register/page.tsx | M2 | Survey / R1 |
| 11 | Create Hub Test | Headless render test for app/(app)/create/page.tsx | M3 | Survey / R1 |
| 12 | Auto Workflow Test | Headless render test for app/(app)/create/auto/page.tsx | M3 | Survey / R1 |
| 13 | AI-Videos Workflow Test | Headless render test for app/(app)/create/ai-videos/page.tsx | M3 | Survey / R1 |
| 14 | Avatar Workflow Test | Headless render test for app/(app)/create/avatar/page.tsx with canvas preview | M3 | Survey / R1 |
| 15 | Bulk Workflow Test | Headless render test for app/(app)/create/bulk/page.tsx | M3 | Survey / R1 |
| 16 | Drama Workflow Test | Headless render test for app/(app)/create/drama/page.tsx | M3 | Survey / R1 |
| 17 | Footage Workflow Test | Headless render test for app/(app)/create/footage/page.tsx | M3 | Survey / R1 |
| 18 | Images Workflow Test | Headless render test for app/(app)/create/images/page.tsx | M3 | Survey / R1 |
| 19 | Shorts Workflow Test | Headless render test for app/(app)/create/shorts/page.tsx | M3 | Survey / R1 |
| 20 | Stories Workflow Test | Headless render test for app/(app)/create/stories/page.tsx | M3 | Survey / R1 |
| 21 | URL Workflow Test | Headless render test for app/(app)/create/url/page.tsx | M3 | Survey / R1 |
| 22 | Whiteboard Workflow Test | Headless render test for app/(app)/create/whiteboard/page.tsx | M3 | Survey / R1 |
| 23 | Mission Dynamic Route Test | Headless render test for app/(app)/create/mission/[id]/page.tsx with Suspense & Promise params | M3 | Survey / R1 |
| 24 | Defensive Planner Fix | Fix date-fns v4 parsing in app/(app)/planner/page.tsx to avoid Invalid time value crash | M4 | Survey / R3 |
| 25 | Full Test Suite Execution | Execute vitest run across all 20+ tests ensuring 100% pass | M4 | Acceptance Criteria |
| 26 | Production Build Verification | Verify npm run build succeeds without regressions | M4 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Infrastructure & Mock Harness | Vitest, JSDOM, RTL dependencies, vitest.config.mts, test/setup.ts | none | PLANNED |
| 2 | Core Routes Headless Tests | Unit tests for dashboard, settings, library, queue, planner, login, register + queue route | M1 | PLANNED |
| 3 | Create Workflow Routes Tests | Unit tests for all 13 creation routes under app/(app)/create/** | M1 | PLANNED |
| 4 | Defensive Fixes, Suite Run & Build Verification | Planner date-fns guard, full suite execution (100% pass), npm run build verification | M2, M3 | PLANNED |

## Interface Contracts

### 1. Vitest Configuration (`vitest.config.mts`)
- Environment: `jsdom`
- Setup file: `./test/setup.ts`
- Plugins: `@vitejs/plugin-react`, `vite-tsconfig-paths`
- Globals: `true`

### 2. Global Test Harness (`test/setup.ts`)
- `next/navigation`:
  - `useRouter`: returns `{ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn() }`
  - `usePathname`: returns `'/'`
  - `useSearchParams`: returns `new URLSearchParams()`
  - `useParams`: returns `{}`
- `next/font`:
  - stubs `localFont` and `next/font/google`
- `window.Audio`:
  - mocked with `{ play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }`
- `HTMLMediaElement.prototype.play` / `pause`:
  - mocked as resolved promises
- `ResizeObserver` & `IntersectionObserver`:
  - polyfilled with mock classes
- `window.matchMedia`:
  - polyfilled returning `{ matches: false, addListener: vi.fn(), removeListener: vi.fn() }`
- `navigator.clipboard`:
  - polyfilled with `{ writeText: vi.fn().mockResolvedValue(undefined) }`

### 3. Server Component Test Pattern (RSC)
For `dashboard/page.tsx` and `planner/page.tsx`:
```tsx
const ResolvedPage = await DashboardPage();
render(ResolvedPage);
```

### 4. React 19 Dynamic Route Test Pattern
For `create/mission/[id]/page.tsx`:
```tsx
render(
  <React.Suspense fallback={<div>Loading...</div>}>
    <MissionProgressPage params={Promise.resolve({ id: 'test-mission-123' })} />
  </React.Suspense>
);
```

## Code Layout
- `vitest.config.mts` — Vitest configuration
- `test/setup.ts` — Global mock harness & JSDOM environment polyfills
- `test/pages/core/dashboard.test.tsx` — Dashboard route render test
- `test/pages/core/settings.test.tsx` — Settings route render test
- `test/pages/core/library.test.tsx` — Library route render test
- `test/pages/core/queue.test.tsx` — Queue route render test
- `test/pages/core/planner.test.tsx` — Planner route render test
- `test/pages/core/auth.test.tsx` — Login & Register route render tests
- `test/pages/create/create-hub.test.tsx` — Create Hub test
- `test/pages/create/wizards.test.tsx` — AI Videos, Footage, Images, Stories wizard tests
- `test/pages/create/generators.test.tsx` — Auto, Bulk, Drama, Shorts, URL generator tests
- `test/pages/create/interactive.test.tsx` — Avatar & Whiteboard studio tests
- `test/pages/create/mission.test.tsx` — Mission [id] dynamic route test
- `app/(app)/queue/page.tsx` — Standalone Queue route
- `app/(app)/planner/page.tsx` — Defensive date validation
