# Test Infrastructure & Setup Survey Report

**Project**: Clipped AI Studio (`c:\Users\vigilare\.gemini\antigravity\scratch\clipped`)  
**Investigator**: Explorer 1 (Test Infrastructure & Setup Explorer)  
**Date**: 2026-09-17  
**Scope**: Headless React unit and component render test suite infrastructure for all `page.tsx` routes.

---

## Executive Summary

1. **Current State**: The repository has **zero** React component or page render tests. The 13 existing test files (175 test cases) in `tests/` and `tests/e2e/` are Node.js-only backend/API/mock tests executed via a custom script (`tests/e2e/standalone-runner.js`).
2. **Missing Dependencies**: Vitest, React Testing Library, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, and `jsdom` (or `happy-dom`) are completely absent from `package.json` and `node_modules`.
3. **Target Routes**: Exactly 20 `page.tsx` route files exist across `app/`. Note that `app/(app)/queue/page.tsx` mentioned in the original prompt does not exist; queue management is currently embedded in `app/(app)/library/page.tsx`.
4. **Architecture & React 19 Considerations**: The project runs React 19.2.8 and Next.js 16.3.3. Two pages (`dashboard/page.tsx` and `planner/page.tsx`) are asynchronous Server Components querying `@/lib/db`, while `mission/[id]/page.tsx` consumes dynamic route params via React 19's `use(params)` hook.
5. **Platform Constraints**: On Windows host PowerShell, script execution policies block npm/pnpm `.ps1` wrappers; commands must invoke `.cmd` binaries (e.g. `pnpm.cmd` or `npm.cmd`).

---

## 1. `package.json` & Dependency Analysis

### Existing Dependencies & Scripts
*File*: `package.json` (lines 5–54)
- **Runtime**:
  - `next`: `16.3.3`
  - `react`: `19.2.8`
  - `react-dom`: `19.2.8`
  - `@supabase/ssr`: `^0.12.5`
  - `@supabase/supabase-js`: `^2.112.4`
  - `framer-motion`: `^13.1.1`
  - `lucide-react`: `^1.0.0` (installed `1.34.0`)
  - `zustand`: `^5.0.15`
  - `radix-ui`: `^1.6.7`
  - `next-themes`: `^0.4.6`
  - `@dnd-kit/core`: `^6.3.1`
  - `date-fns`: `^4.4.0`
- **DevDependencies**:
  - `@tailwindcss/postcss`: `^4`
  - `@types/node`: `^20`
  - `@types/react`: `^19`
  - `@types/react-dom`: `^19`
  - `eslint`: `^9`
  - `eslint-config-next`: `16.3.3`
  - `tailwindcss`: `^4`
  - `tsx`: `^4.23.13`
  - `typescript`: `^5` (installed `5.9.3`)
- **Scripts**:
  - `"test": "node tests/e2e/standalone-runner.js"`
  - `"test:e2e": "node tests/e2e/standalone-runner.js"`
  - *(No unit test or component test script exists)*
- **Package Manager**: `pnpm@11.24.0`

### Missing Required Testing Packages
To run headless component tests using Vitest + React Testing Library according to official Next.js guidelines (`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`), the following packages are needed:
1. `vitest` (Test runner & assertion library)
2. `@testing-library/react` (Component render & query utilities for React 19)
3. `@testing-library/dom` (Underlying DOM query engine)
4. `@testing-library/jest-dom` (Custom DOM matchers like `toBeInTheDocument()`)
5. `jsdom` (or `happy-dom`) (Headless DOM environment)
6. `@vitejs/plugin-react` (JSX/TSX transformer for React 19)
7. `vite-tsconfig-paths` (Automatic resolution of `@/*` path aliases from `tsconfig.json`)

---

## 2. Test Configuration & Path Aliasing Survey

### Existing Configuration
- **Root directory**:
  - NO `vitest.config.ts`, `vitest.config.mts`, `vite.config.ts`, or `jest.config.*`.
  - Only `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, and `ecosystem.config.js` exist at root.
  - *(Note: `omniroute-server/` contains its own isolated Playwright/tsup configs, unrelated to Clipped)*.
- **Path Aliasing**:
  - Configured in `tsconfig.json` (lines 21–23):
    ```json
    "paths": {
      "@/*": ["./*"]
    }
    ```
  - In Vite/Vitest, this alias is automatically resolved by adding `vite-tsconfig-paths` to `plugins: [tsconfigPaths(), react()]`, or manually via:
    ```ts
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './')
      }
    }
    ```

### Official Next.js Recommendation
From Next.js official internal documentation (`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`):
```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
})
```

---

## 3. Route Inventory & Component Survey

There are **20 `page.tsx` routes** in `app/`. Below is the complete classification:

| # | Route File | Type | Key Dependencies / Hooks |
|---|---|---|---|
| 1 | `app/page.tsx` | Client | Framer Motion, Particles, `Link` |
| 2 | `app/(auth)/login/page.tsx` | Client | `useRouter`, `@/lib/supabase/client` (`supabase.auth.signInWithPassword`) |
| 3 | `app/(auth)/register/page.tsx` | Client | `useRouter`, `@/lib/supabase/client` (`supabase.auth.signUp`) |
| 4 | `app/(app)/dashboard/page.tsx` | **Async Server** | `supabase` from `@/lib/db`, `DashboardCard`, Lucide icons |
| 5 | `app/(app)/settings/page.tsx` | Client | `useSupabase()`, `useRef<HTMLAudioElement>`, `new Audio()`, Framer Motion |
| 6 | `app/(app)/library/page.tsx` | Client | `fetch('/api/workspaces')`, `fetch('/api/jobs')`, `QueueCard`, `DashboardCard` |
| 7 | `app/(app)/planner/page.tsx` | **Async Server** | `supabase` from `@/lib/db`, `ScheduleModal`, `date-fns` |
| 8 | `app/(app)/create/page.tsx` | Client | `useApiKeys()`, `MissionPromptBar`, `WorkflowGrid` |
| 9 | `app/(app)/create/auto/page.tsx` | Client | `useRouter`, `WorkflowHeader`, `VoiceSelector`, `AspectRatioSelector` |
| 10 | `app/(app)/create/ai-videos/page.tsx` | Client | `<CreationWizard workflowType="ai-videos" />` |
| 11 | `app/(app)/create/avatar/page.tsx` | Client | `useRouter`, `AVATAR_PRESETS`, `VOICES`, `LAYOUTS` |
| 12 | `app/(app)/create/bulk/page.tsx` | Client | `useRouter`, `WorkflowHeader`, `SettingsCard` |
| 13 | `app/(app)/create/drama/page.tsx` | Client | `useRouter`, `GENRE_PRESETS`, character cards |
| 14 | `app/(app)/create/footage/page.tsx` | Client | `<CreationWizard workflowType="footage" />` |
| 15 | `app/(app)/create/images/page.tsx` | Client | `<CreationWizard workflowType="images" />` |
| 16 | `app/(app)/create/shorts/page.tsx` | Client | `useRouter`, `STRATEGIES`, `CAPTION_STYLES` |
| 17 | `app/(app)/create/stories/page.tsx` | Client | `<CreationWizard workflowType="stories" />` |
| 18 | `app/(app)/create/url/page.tsx` | Client | `useRouter`, `useWizardStore`, `fetch('/api/workflows/scrape')` |
| 19 | `app/(app)/create/whiteboard/page.tsx` | Client | `useRouter`, `ARCHETYPES`, `STYLES`, `MARKER_COLORS` |
| 20 | `app/(app)/create/mission/[id]/page.tsx` | Client | React 19 `use(params)`, `useSearchParams`, `MissionLivePreview` |

### Special Route Caveat: `queue/page.tsx`
The prompt requests testing `app/(app)/queue/page.tsx`. However:
- There is **no** `queue/page.tsx` file in the repo.
- The queue functionality (status badges, auto-polling `/api/jobs`, `QueueCard`, progress bars) is implemented inside `app/(app)/library/page.tsx`.
- Recommendation: The test suite should test `library/page.tsx` thoroughly for queue behavior, and optionally add a simple `app/(app)/queue/page.tsx` (e.g. exporting or redirecting to the queue view) if strict URL parity is required by downstream tasks.

---

## 4. Existing Mocks & Required Mocks for Headless Testing

### Existing Mock Infrastructure
- `tests/e2e/test-harness.ts` contains:
  - `MockSupabaseStore` (in-memory mock store for `render_jobs`, `videos`, `settings`, `users`, `api_credits`, `published_videos`).
  - `createMockRequest()` for Next.js API route simulation.
  - Custom assertion library (`expect()`) for Node.js scripts.
- *Limitation*: None of these existing mocks integrate with React DOM rendering or Vitest.

### Required Mocks for Headless Testing (`vitest.setup.ts`)

#### 1. Next.js Routing (`next/navigation`)
All client pages use Next.js 15/16 navigation hooks. Must mock:
```ts
vi.mock('next/navigation', () => {
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  };
  return {
    useRouter: () => router,
    usePathname: () => '/dashboard',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({ id: 'mock-id-123' }),
  };
});
```

#### 2. Next.js Fonts (`next/font/google`)
`app/layout.tsx` uses `Geist` and `Geist_Mono`:
```ts
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}));
```

#### 3. Supabase Client & Context
1. **Context Hook**: `app/(app)/settings/page.tsx` calls `useSupabase()`. If not wrapped in `SupabaseProvider`, it throws:
   `"useSupabase must be used within a SupabaseProvider"` (`lib/supabase/context.tsx:265`).
   - Need a global wrapper with `SupabaseProvider` or mock `useSupabase`.
2. **Database Client**: `app/(app)/dashboard/page.tsx` and `app/(app)/planner/page.tsx` import `supabase` from `@/lib/db`.
   - Need mock returning `{ from: () => ({ select: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) }) }`.
3. **Auth Client**: `LoginPage` and `RegisterPage` call `createClient()` from `@/lib/supabase/client`.
   - Need mock for `supabase.auth.signInWithPassword` and `supabase.auth.signUp`.

#### 4. Browser & DOM APIs (Missing in jsdom / happy-dom)
1. **`ResizeObserver`**:
   Required by Framer Motion, Radix UI, and `@dnd-kit`:
   ```ts
   global.ResizeObserver = class {
     observe() {}
     unobserve() {}
     disconnect() {}
   };
   ```
2. **`IntersectionObserver`**:
   ```ts
   global.IntersectionObserver = class {
     observe() {}
     unobserve() {}
     disconnect() {}
   };
   ```
3. **`window.matchMedia`**:
   Required by `next-themes` (`ThemeProvider` in `app/layout.tsx`):
   ```ts
   Object.defineProperty(window, 'matchMedia', {
     writable: true,
     value: vi.fn().mockImplementation((query) => ({
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
   ```
4. **Media Elements (`<audio>`, `<video>`)**:
   - `app/(app)/settings/page.tsx` calls `new Audio(...)` and `audio.play()` / `audio.pause()`.
   - `DashboardCard`, `ScenesStep`, `MissionLivePreview` render `<video>`.
   ```ts
   window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
   window.HTMLMediaElement.prototype.pause = vi.fn();
   window.HTMLMediaElement.prototype.load = vi.fn();
   global.Audio = class {
     play = vi.fn().mockResolvedValue(undefined);
     pause = vi.fn();
     addEventListener = vi.fn();
     removeEventListener = vi.fn();
   } as any;
   ```
5. **Global `fetch`**:
   - `library/page.tsx` calls `fetch('/api/workspaces')` and `fetch('/api/jobs')`.
   - `useApiKeys` calls `fetch('/api/settings/keys')`.
   - `mission/[id]/page.tsx` calls `fetch('/api/workflows/mission')`.
   - A mock fetch handler returning `{ success: true, workspaces: [], completed: [], queued: [], failed: [], keys: {} }` ensures pages mount without network failures.

#### 5. React 19 Async Server Component Testing Pattern
In React 19, async Server Components (`DashboardPage`, `PlannerPage`) cannot simply be passed as `<DashboardPage />` in standard synchronous React Testing Library renders.
Instead, test them via:
```tsx
const Component = await DashboardPage();
render(Component);
expect(screen.getByText(/Studio Dashboard/i)).toBeInTheDocument();
```
Or wrapping in a Suspense boundary:
```tsx
render(
  <Suspense fallback={<div>Loading...</div>}>
    <DashboardPage />
  </Suspense>
);
```

#### 6. Dynamic Route Parameters in React 19 (`use(params)`)
In `app/(app)/create/mission/[id]/page.tsx`:
```tsx
const unwrappedParams = use(params);
```
In Next.js 15/16, `params` is a `Promise<{ id: string }>`.
The test for `MissionProgressPage` must pass:
```tsx
render(<MissionProgressPage params={Promise.resolve({ id: 'test-mission-123' })} />);
```

---

## 5. Recommended Test Setup & Execution Protocol

### Step 1: Package Installation
Using `pnpm.cmd add -D` (or `npm.cmd install -D`):
```bash
pnpm.cmd add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom vite-tsconfig-paths
```

### Step 2: Configuration Files
1. `vitest.config.mts`:
   ```ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   import tsconfigPaths from 'vite-tsconfig-paths';

   export default defineConfig({
     plugins: [tsconfigPaths(), react()],
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./vitest.setup.ts'],
       include: ['**/*.test.tsx', '**/*.spec.tsx'],
     },
   });
   ```

2. `vitest.setup.ts`:
   Implement the DOM, Supabase, Navigation, and Media mocks detailed in Section 4.

3. `package.json` script:
   Add:
   ```json
   "test:unit": "vitest run"
   ```

### Step 3: Test Execution
To execute all page render tests headlessly in CI/CLI:
```bash
npx.cmd vitest run
# or
pnpm.cmd test:unit
```

---

## Conclusion
The path to achieving 100% headless unit test coverage for all Clipped frontend pages is well-defined. The core requirements are:
1. Install the Vitest/RTL dependency bundle via `pnpm.cmd`.
2. Provide `vitest.config.mts` and a comprehensive `vitest.setup.ts` mock harness.
3. Handle React 19-specific patterns (`await AsyncPage()`, `use(Promise)` for dynamic route params).
4. Verify all 20 existing route pages mount cleanly without throwing uncaught exceptions.
