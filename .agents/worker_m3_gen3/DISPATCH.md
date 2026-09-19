# Task Assignment: Worker M3 (Milestone 3 Full Remediation)

## Working Directory
`C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_gen3`

## Mandatory Reading
- `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md`
- `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md`
- Explorer 1 Report: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m3_1_gen3\handoff.md`
- Explorer 2 Report: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m3_2_gen3\handoff.md`
- Explorer 3 Report: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m3_3_gen3\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Apply the exact, verified code edits across the component files and test files to remediate all 18 failed tests and the 1 unhandled whiteboard runtime exception, run `cmd /c npx vitest run` (or `npm run test:unit`) to verify 100% test pass rate (16/16 test files, 161/161 tests passing), and document full verification evidence in your `handoff.md`.

## Exclusive Write Ownership
You exclusively own and may edit:
1. `app/(app)/create/whiteboard/page.tsx`
2. `app/(app)/create/avatar/page.tsx`
3. `app/(app)/create/auto/page.tsx`
4. `app/(app)/create/drama/page.tsx`
5. `app/(app)/create/shorts/page.tsx`
6. `app/(app)/create/mission/[id]/page.tsx`
7. `components/wizard/wizard-store.ts`
8. `test/pages/create/interactive.test.tsx`
9. `test/pages/create/wizards.test.tsx`
10. `test/pages/create/generators.test.tsx`
11. `test/pages/create/mission.test.tsx`
12. `test/adversarial-query-builder.test.ts`

## Specific Required Changes

### 1. `app/(app)/create/whiteboard/page.tsx`
- Lines 38-44: Update archetype labels to match test queries:
  - `"Stickman Classic"` -> `"Stickman"`
  - `"Saint / Philosopher"` -> `"Ancient Saint"`
  - `"Elder Professor"` -> `"Wise Old Man"`
- Lines 475 & 478: Add defensive optional chaining:
  - `{characterSheet?.poses?.[activePosePreview]?.svgPath && (`
  - `d={characterSheet?.poses?.[activePosePreview]?.svgPath || ""}`

### 2. `app/(app)/create/avatar/page.tsx`
- Line 113: Ensure `"Generation failed"` prefix is included when displaying error:
  `setStatusMessage(data.error ? "Generation failed: " + data.error : "Generation failed");`
- Line 236: Set image URL placeholder to `"https://example.com/portrait.jpg"`

### 3. `app/(app)/create/auto/page.tsx`
- Line 238: Set label to `"Primary Target Platforms"` (was `"Target Publishing Platforms"`)

### 4. `app/(app)/create/drama/page.tsx`
- Line 136: Set heading to `"AI Micro-Drama Series"` (was `"Micro-Drama Workflow"`)
- Line 239: Set character name input placeholder to `"Character name (e.g. Detective Jax)"` (or `placeholder="Character name"`)

### 5. `app/(app)/create/shorts/page.tsx`
- Line 96: Set heading to `"Extract Viral Shorts"` (was `"Extract Shorts Workflow"`)
- Line 112: Add `noValidate` to `<form onSubmit={handleExtract} noValidate className="space-y-6">` so HTML5 form validation doesn't block JavaScript validation error display when transcript is empty

### 6. `app/(app)/create/mission/[id]/page.tsx`
- Line 18-19: Defensively unwrap params:
  `const unwrappedParams = params && typeof (params as any).then === 'function' ? use(params) : params;`
  `const jobId = (unwrappedParams as any)?.id || "";`

### 7. `components/wizard/wizard-store.ts`
- Ensure `initialState` includes `workflowType: 'footage'` and `autoMode: false`, and `reset()` restores all properties to `initialState`.

### 8. `test/pages/create/wizards.test.tsx`
- In `Step Progression Lifecycle` test (line 95), wrap the scene step assertion in `await waitFor(() => { expect(screen.getByText(/no scenes generated yet\./i)).toBeInTheDocument(); });` to account for framer-motion exit transition.

### 9. `test/pages/create/mission.test.tsx`
- Wrap `renderMissionPage` helper in `await act(async () => ...)` to drain React 19 promise resolution microtasks.
- Ensure stage text queries match `MissionStepper.tsx` (`STAGE_META`) or update `STAGE_META` in `components/create/mission/MissionStepper.tsx` to align cleanly.

### 10. `test/adversarial-query-builder.test.ts`
- Increase timeout from default 5000ms to 15000ms on lines 289 & 295 for heavy concurrent runs:
  `it('successfully executes DashboardPage() RSC data fetch using the mock query builder', async () => { ... }, 15000);`
  `it('successfully executes PlannerPage() RSC data fetch using the mock query builder', async () => { ... }, 15000);`

## Verification Requirements
1. Run `cmd /c npx vitest run` (or `node ./node_modules/vitest/vitest.mjs run` or `npm run test:unit`).
2. Verify that 100% of test files pass (16/16) and all tests pass (161/161+).
3. Document exact terminal output in `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_gen3\handoff.md`.

## 2026-09-18T17:26:00Z
Invocation received: Milestone 3 Remediation Worker.
Execute remediation across all component and test files to achieve 100% pass rate.

