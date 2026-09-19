# Handoff Report: Test Infrastructure & Setup Survey

**Author**: Explorer 1 (Test Infrastructure & Setup Explorer)  
**Recipient**: Project Orchestrator (`de90b75e-287e-4f81-a191-d921b36d9d9c`)  
**Date**: 2026-09-17  
**Artifact Path**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_infra\infra_report.md`  

---

## 1. Observation

1. **Missing Unit Test Dependencies in `package.json`**:
   - In `package.json` (lines 5–54), the only test scripts are:
     ```json
     "test": "node tests/e2e/standalone-runner.js",
     "test:e2e": "node tests/e2e/standalone-runner.js"
     ```
   - No unit testing dependencies (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `jsdom`, `happy-dom`, `vite-tsconfig-paths`) are declared.
   - Verification check with `Test-Path node_modules/vitest` returned `False`.

2. **Existing Tests in Repository**:
   - `tests/` contains 13 test files (`tests/e2e/*.ts`, `tests/adversarial-db-voice.test.js`) executed via `node tests/e2e/standalone-runner.js`.
   - Running `node tests/e2e/standalone-runner.js` ran 175 backend/API integration tests (174 passed, 1 failed on Dockerfile standalone check).
   - Zero React component render tests exist in the entire codebase.

3. **Existing Test Configurations & Aliasing**:
   - No `vitest.config.ts`, `vite.config.ts`, or `jest.config.*` exists at repository root.
   - `tsconfig.json` (lines 21–23) defines path aliasing:
     ```json
     "paths": {
       "@/*": ["./*"]
     }
     ```
   - Next.js internal documentation (`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`, lines 63–76) specifies standard setup using `vitest.config.mts` with `tsconfigPaths()` and `@vitejs/plugin-react`.

4. **Frontend Route Page Inventory**:
   - Found exactly 20 `page.tsx` files under `app/`:
     - 1 Root landing page: `app/page.tsx`
     - 2 Auth pages: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`
     - 5 App pages: `app/(app)/dashboard/page.tsx`, `app/(app)/settings/page.tsx`, `app/(app)/library/page.tsx`, `app/(app)/planner/page.tsx`, `app/(app)/create/page.tsx`
     - 12 Creation workflow pages: `auto`, `ai-videos`, `avatar`, `bulk`, `drama`, `footage`, `images`, `shorts`, `stories`, `url`, `whiteboard`, `mission/[id]`
   - `app/(app)/queue/page.tsx` does NOT exist; queue status and polling are embedded within `app/(app)/library/page.tsx`.

5. **Component Execution Realities & Mock Requirements**:
   - `app/(app)/dashboard/page.tsx` (line 8) and `app/(app)/planner/page.tsx` (line 9) are `async` Server Components querying `supabase` from `@/lib/db`.
   - `app/(app)/settings/page.tsx` (line 38) uses `useSupabase()` from `@/lib/supabase/context` which throws if unprovided (`lib/supabase/context.tsx:265`), and line 508 uses `new Audio(data.audioUrl)` and `audio.play()`.
   - `app/(app)/create/mission/[id]/page.tsx` (line 18) uses React 19 `use(params)` where `params: Promise<{ id: string }>`.
   - Multiple components render `<video>` (`DashboardCard.tsx:77`, `ScenesStep.tsx:74`, `MissionLivePreview.tsx:65`).
   - Framer Motion and Radix UI require `ResizeObserver`, `IntersectionObserver`, and `window.matchMedia`.

6. **Windows Host Shell Execution**:
   - Running bare `pnpm` or `npm` in PowerShell fails with `SecurityError ... running scripts is disabled on this system` (`pnpm.ps1` blocked). Running `pnpm.cmd` or `npm.cmd` succeeds.

---

## 2. Logic Chain

1. From **Observation 1 & 2**, because no testing runner or DOM libraries exist in `node_modules`, attempting to execute `vitest` or render React components currently fails immediately.
2. From **Observation 3**, path alias `@/*` maps directly to root `./*`. To prevent module resolution failures in Vitest, `vite-tsconfig-paths` must be supplied to Vitest's plugin pipeline.
3. From **Observation 4**, there are 20 distinct page routes to cover. The mention of `queue/page.tsx` in user requirements is fulfilled by testing `library/page.tsx` (which contains the queue), or creating a lightweight route re-export for `/queue`.
4. From **Observation 5**, rendering pages headlessly in jsdom without mocks will fail due to:
   - Missing Next.js navigation hooks (`useRouter`, `useSearchParams`, `usePathname`).
   - Unhandled `useSupabase()` context boundary crash in `settings/page.tsx`.
   - Unhandled database calls in async Server Components (`dashboard`, `planner`).
   - Missing DOM globals (`ResizeObserver`, `IntersectionObserver`, `matchMedia`, `HTMLMediaElement.prototype.play`).
   - Network errors from component-mount `fetch` calls.
5. Therefore, a centralized `vitest.setup.ts` providing global mocks for Navigation, Media, Supabase, Observers, and Fetch is strictly required for 100% clean headless mounting.
6. For async Server Components (`dashboard`, `planner`), React 19 component testing requires awaiting the component (`await DashboardPage()`) or wrapping in `<Suspense>`. For `mission/[id]`, `params` must be passed as a resolved Promise (`Promise.resolve({ id: '...' })`).

---

## 3. Caveats

1. **`app/(app)/queue/page.tsx`**: The requirement prompt explicitly lists `app/(app)/queue/page.tsx`. However, the repository implements the queue inside `app/(app)/library/page.tsx`. The implementation team should decide whether to add a re-export route `app/(app)/queue/page.tsx` -> `library` or keep tests directed at `library`.
2. **`pnpm-workspace.yaml`**: Contains `allowBuilds: esbuild: set this to true or false`, which may trigger build approval warnings during `pnpm install`.
3. **PowerShell execution**: Developers or agents running commands on this Windows machine must always invoke `pnpm.cmd` / `npm.cmd` rather than `.ps1`.

---

## 4. Conclusion

The repository is primed for automated headless unit testing but requires the installation of the Vitest testing stack and the establishment of two key configuration files:
1. **Dependencies to install**: `pnpm.cmd add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom vite-tsconfig-paths`.
2. **Configuration to create**: `vitest.config.mts` configured with `jsdom`, `tsconfigPaths()`, and `react()`.
3. **Global harness to create**: `vitest.setup.ts` stubbing `next/navigation`, `next/font`, Supabase client/context, `fetch`, `Audio`/`Video` elements, and DOM observers.
4. **Target Scope**: 20 `page.tsx` test files verifying error-free mounting under headless jsdom.

---

## 5. Verification Method

To independently verify these findings:
1. **Verify dependencies absent**:
   ```powershell
   powershell -ExecutionPolicy Bypass -Command "pnpm.cmd list --depth=0"
   ```
   Observe that `vitest` and `@testing-library/react` are absent.
2. **Verify existing backend tests**:
   ```powershell
   node tests/e2e/standalone-runner.js
   ```
   Observe 175 backend tests run and that no DOM/React tests exist.
3. **Verify route count**:
   ```powershell
   Get-ChildItem -Path app -Filter "page.tsx" -Recurse | Measure-Object
   ```
   Count will be 20.
4. **Verify detailed survey report**:
   Inspect `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_survey_infra\infra_report.md`.
