# Handoff Report: Create Workflow Routes Tests (Generators)

## 1. Observation
- **Inspected Files**:
  1. `app/(app)/create/auto/page.tsx`: Lines 1-415. Declares `"use client"`. Uses `useState`, `useRouter`, `AspectRatioSelector`. Submits to `POST /api/workflows/auto`, navigates to `/dashboard?job=${data.jobId}` on success, sets `error` on failure.
  2. `app/(app)/create/bulk/page.tsx`: Lines 1-233. Declares `"use client"`. Uses `useState`, `useRouter`, UI helper components (`WorkflowHeader`, `VoiceSelector`, `AspectRatioSelector`, `MockModeToggle`, `GenerateButton`, `ErrorAlert`, `SettingsCard`). Submits to `POST /api/workflows/bulk-plan`, navigates to `/dashboard?job=${data.jobId}` on success, sets `error` on failure.
  3. `app/(app)/create/drama/page.tsx`: Lines 1-471. Declares `"use client"`. Uses `useState`, `useRouter`, multi-character state array (`characters`), genre buttons, episode selector, aspect ratio toggle. Submits to `POST /api/workflows/micro-drama`, navigates to `/dashboard?job=${data.jobId}` on success, sets `error` on failure.
  4. `app/(app)/create/shorts/page.tsx`: Lines 1-388. Declares `"use client"`. Uses `useState`, `useRouter`, source tabs (`url`, `transcript`, `file`), prefilled default `videoUrl = "https://storage.clipped.ai/raw/tech-keynote-2026.mp4"`. Submits to `POST /api/workflows/extract-shorts`, navigates to `/dashboard?job=${data.jobId}` on success, sets `error` on failure.
  5. `app/(app)/create/url/page.tsx`: Lines 1-123. Declares `"use client"`. Uses `useState`, `useRouter`, `useWizardStore` from `@/components/wizard/wizard-store`. Submits to `POST /api/workflows/scrape`, mutates `useWizardStore` (`workflowType`, `narration`, `subject`, `autoMode`), navigates to `/create/footage`.
  6. `test/setup.ts`: Lines 1-471. Configures `@testing-library/jest-dom/vitest`, mocks `next/navigation` (`useRouter`, `useSearchParams`, `usePathname`, `useParams`), stubs `Audio` and `HTMLMediaElement`, polyfills `ResizeObserver` and `IntersectionObserver`, provides Supabase mocks, and establishes global `fetch` fallback.
  7. `components/wizard/wizard-store.ts`: Lines 1-386. Zustand store created with `create()`. Provides `reset()`, `set()`, `get()`.

- **Component Types**: All 5 routes are Client Components (`"use client"`). None are Server Components (`RSC`).
- **Dependencies & Context**: None of the 5 routes call `useSupabase()` or require React context wrappers to render without crashing.
- **Error Boundaries & Safety**: All 5 routes handle API errors gracefully in local state and render accessible error feedback.

## 2. Logic Chain
1. From Observation 1-5, each page starts with `"use client"`, meaning they are all React Client Components executed on the client.
2. From Observation 6, `test/setup.ts` supplies global mocks for `next/navigation` (`useRouter`) and polyfills for browser APIs (`matchMedia`, `ResizeObserver`, `IntersectionObserver`).
3. Since none of the routes access unguarded window objects or server-only headers on mount, each component can be mounted using standard React Testing Library `render(<Page />)` without throwing uncaught client boundary errors.
4. From Observation 1-4, `auto`, `bulk`, `drama`, and `shorts` submit jobs to their respective `/api/workflows/*` endpoints and navigate to `/dashboard?job=${data.jobId}`. Mocking `fetch` to return `{ success: true, jobId: 'mock-id' }` allows testing full submission and navigation.
5. From Observation 5 and 7, `url` submits to `/api/workflows/scrape`, updates Zustand's `useWizardStore`, and navigates to `/create/footage`. Testing requires verifying both `useWizardStore.getState()` mutations and `router.push('/create/footage')`.
6. Therefore, a single consolidated test file `test/pages/create/generators.test.tsx` containing test suites for each of the 5 generator routes can be implemented cleanly and deterministically.

## 3. Caveats
- `new URL(url).hostname` in `app/(app)/create/url/page.tsx:39` assumes `url` is a valid URL. If an invalid URL string is entered, `new URL()` throws a `TypeError`. In the component, this call is wrapped in a `try...catch` block, so it gracefully falls into `setError(err.message)` rather than crashing the page.
- Test execution should reset the `useWizardStore` before and after test runs (`useWizardStore.getState().reset()`) to avoid state leakage between test cases.
- No source code edits were performed as this is a read-only investigation.

## 4. Conclusion
The five generator routes under `app/(app)/create/**` (`auto`, `bulk`, `drama`, `shorts`, `url`) are fully analyzed, structurally sound, and ready for headless unit testing. Complete test specifications and implementation code have been synthesized and documented in `analysis.md`. The implementer can directly create `test/pages/create/generators.test.tsx` using the provided blueprint.

## 5. Verification Method
- **Inspection**:
  - Verify `analysis.md` in `.agents/explorer_m3_2_gen2/analysis.md` for test blueprint and route breakdowns.
  - Inspect test specifications in `analysis.md` against `app/(app)/create/**` pages.
- **Independent Test Verification** (to be executed by implementer/orchestrator in Milestone 3/4):
  - Command: `npx vitest run test/pages/create/generators.test.tsx`
  - Invalidation conditions: Any test failure due to unmatched text, unhandled promise rejections, or missing mock responses.
