# Handoff Report: Milestone 3 Create Workflow Routes Tests Review

**Agent**: Reviewer M3-2 (`reviewer_m3_2_gen2`)  
**Timestamp**: 2026-09-17T01:00:00Z  
**Roles**: reviewer, critic  
**Verdict**: **REQUEST_CHANGES**  

---

## Review Summary

**Verdict**: **REQUEST_CHANGES**  
**Integrity Mode**: Development (per `ORIGINAL_REQUEST.md:117`)  
**Overall Risk Assessment**: **HIGH**  

During independent adversarial review and forensic code inspection of the 6 target files:
- `app/(app)/create/whiteboard/page.tsx`
- `test/pages/create/create-hub.test.tsx`
- `test/pages/create/wizards.test.tsx`
- `test/pages/create/generators.test.tsx`
- `test/pages/create/interactive.test.tsx`
- `test/pages/create/mission.test.tsx`

Reviewer M3-2 identified **1 Critical runtime defect** in production code (`whiteboard/page.tsx`), **1 shallow/facade test** masking that defect in `interactive.test.tsx`, and **6 broken DOM queries/assertions** across `test/pages/create/interactive.test.tsx` and `test/pages/create/generators.test.tsx` that will cause immediate test suite failure in Vitest.

---

## 1. Observation

### Observation 1: Uncaught `TypeError` in `app/(app)/create/whiteboard/page.tsx:475`
- **Location**: `app/(app)/create/whiteboard/page.tsx:475` and line 478.
- **Verbatim Code**:
  ```tsx
  474:               <div className="flex-1 flex items-center justify-center relative">
  475:                 {characterSheet?.poses[activePosePreview]?.svgPath && (
  476:                   <svg viewBox="0 0 100 100" className="w-24 h-24 sm:w-28 sm:h-28">
  477:                     <path
  478:                       d={characterSheet.poses[activePosePreview].svgPath}
  ```
- **Context**:
  Worker M3 applied defensive optional chaining at lines 390 (`const poseData = characterSheet?.poses?.[pose.id];`) and 427 (`{characterSheet?.poses?.[activePosePreview] && (`), but completely missed line 475 (`characterSheet?.poses[activePosePreview]?.svgPath`).
- **Defect**:
  When `/api/workflows/whiteboard/character-sheet` returns an API payload without `poses` (or with missing/undefined `poses`, e.g. `{ success: true, archetype: 'stickman', style: 'monoline_marker' }`), `characterSheet` is an object (truthy).
  At line 475:
  `characterSheet?.poses` evaluates to `undefined`.
  Then `undefined[activePosePreview]` executes.
  Because there is no optional chaining operator (`?.`) between `poses` and `[activePosePreview]`, JavaScript throws an uncaught:
  ```
  TypeError: Cannot read properties of undefined (reading 'pose_1')
  ```
  This crashes the React component tree on any render where `characterSheet` lacks `poses`.

### Observation 2: Shallow / Facade Test in `test/pages/create/interactive.test.tsx:200-228`
- **Location**: `test/pages/create/interactive.test.tsx:200-228`
- **Verbatim Code**:
  ```tsx
  200:     it('safeguards against missing poses in character sheet API response (defensive check)', async () => {
  201:       const originalFetch = global.fetch;
  202:       const fetchSpy = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
  203:         if (url.includes('/api/workflows/whiteboard/character-sheet')) {
  204:           // Returns character sheet without poses property
  205:           return Promise.resolve(
  206:             new Response(
  207:               JSON.stringify({
  208:                 success: true,
  209:                 archetype: 'stickman',
  210:                 style: 'monoline_marker',
  211:               }),
  212:               { status: 200, headers: { 'Content-Type': 'application/json' } }
  213:             )
  214:           );
  215:         }
  216:         return originalFetch(url, init);
  217:       });
  218:       global.fetch = fetchSpy;
  219: 
  220:       // Must mount without throwing TypeError: Cannot read properties of undefined (reading 'pose_1')
  221:       expect(() => render(<WhiteboardCreatePage />)).not.toThrow();
  222: 
  223:       await waitFor(() => {
  224:         expect(screen.getByText('Stickman')).toBeInTheDocument();
  225:       });
  226: 
  227:       global.fetch = originalFetch;
  228:     });
  ```
- **Analysis**:
  The test claims to verify that the page safeguards against missing `poses` in the API response.
  However, `'Stickman'` is an archetype chip rendered synchronously from constant `ARCHETYPES` on initial mount (when `characterSheet` is still `null`).
  The assertion `expect(screen.getByText('Stickman')).toBeInTheDocument()` resolves immediately on initial render before `fetch` microtasks resolve. The test immediately exits and restores `global.fetch = originalFetch`.
  Because it never waits for `setCharacterSheet(data)` to execute, it never exercised the asynchronous state update. If the test had actually waited for `fetchCharacterSheet` to resolve, it would have immediately crashed at line 475.

### Observation 3: Broken Selector in `test/pages/create/interactive.test.tsx:79, 81` (Avatar Studio)
- **Verbatim Code in Test**:
  ```tsx
  79:       expect(screen.getByPlaceholderText(/https:\/\/example\.com\/portrait\.jpg/i)).toBeInTheDocument();
  80: 
  81:       const urlInput = screen.getByPlaceholderText(/https:\/\/example\.com\/portrait\.jpg/i);
  ```
- **Verbatim Code in Component** (`app/(app)/create/avatar/page.tsx:236`):
  ```tsx
  236:                       placeholder="https://images.unsplash.com/photo-..."
  ```
- **Failure**:
  `"https://images.unsplash.com/photo-..."` does not match the regex `/https:\/\/example\.com\/portrait\.jpg/i`.
  `getByPlaceholderText` will throw `TestingLibraryElementError: Unable to find an element with the placeholder text of: /https:\/\/example\.com\/portrait\.jpg/i`.

### Observation 4: Broken Error Message Assertion in `test/pages/create/interactive.test.tsx:141`
- **Verbatim Code in Test**:
  ```tsx
  140:       await waitFor(() => {
  141:         expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
  142:       });
  ```
- **Verbatim Code in Component** (`app/(app)/create/avatar/page.tsx:112-114, 392`):
  ```tsx
  112:       } else {
  113:         setStatusMessage(data.error || "Generation failed");
  114:         setGenerating(false);
  115:       }
  ...
  392:               <p className="text-center text-xs text-violet-400 mt-3 font-medium">{statusMessage}</p>
  ```
- **Failure**:
  In line 125 of `interactive.test.tsx`, the mock returns `{ success: false, error: 'Avatar model service unavailable' }`.
  Because `data.error` is defined, `setStatusMessage` receives `"Avatar model service unavailable"`.
  The string `"generation failed"` is never rendered into the DOM.
  `expect(screen.getByText(/generation failed/i))` times out and fails.

### Observation 5: Broken 9-Pose Label & Button Selector in `test/pages/create/interactive.test.tsx:184-189`
- **Verbatim Code in Test**:
  ```tsx
  183:       // Verify character sheet 9-pose grid loads
  184:       await waitFor(() => {
  185:         expect(screen.getByText('Neutral Stand')).toBeInTheDocument();
  186:         expect(screen.getByText('Pointing Right')).toBeInTheDocument();
  187:       });
  188: 
  189:       // Click pose 2 to preview
  190:       const pose2Btn = screen.getByRole('button', { name: /pointing right/i });
  191:       fireEvent.click(pose2Btn);
  ```
- **Verbatim Code in Component** (`app/(app)/create/whiteboard/page.tsx:66-76, 419-420`):
  ```tsx
  66: const POSE_NAMES = [
  67:   { id: "pose_1", label: "Neutral", desc: "Standing balanced" },
  68:   { id: "pose_2", label: "Pointing", desc: "Pointing to concept" },
  ...
  419:                         <div className="text-[10px] font-semibold truncate w-full">{pose.label}</div>
  420:                         <div className="text-[8px] font-mono text-slate-500">{pose.id}</div>
  ```
- **Failure**:
  1. The grid buttons render `pose.label` from `POSE_NAMES` (`"Neutral"`, `"Pointing"`, `"Eureka"`), NOT `characterSheet.poses[pose.id].name`.
  2. The only place `characterSheet.poses[activePosePreview].name` is rendered is in the active pose detail box (line 432). On initial mount, `activePosePreview` is `"pose_1"` (`"Neutral Stand"`).
  3. `"Pointing Right"` is NOT in the DOM on mount. `expect(screen.getByText('Pointing Right')).toBeInTheDocument()` fails immediately.
  4. The accessible name of the button for pose 2 is `"Pointing pose_2"`. `getByRole('button', { name: /pointing right/i })` fails to find any button.

### Observation 6: Broken Heading Selector in `test/pages/create/generators.test.tsx:312` (Extract Shorts)
- **Verbatim Code in Test**:
  ```tsx
  312:       expect(screen.getByRole('heading', { level: 1, name: /extract viral shorts/i })).toBeInTheDocument();
  ```
- **Verbatim Code in Component** (`app/(app)/create/shorts/page.tsx:94-97`):
  ```tsx
  94:         <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
  95:           <Scissors className="h-6 w-6 text-amber-500" />
  96:           Extract Shorts Workflow
  97:         </h1>
  ```
- **Failure**:
  The `h1` accessible name is `"Extract Shorts Workflow"`. It does not contain `"viral"`.
  `getByRole('heading', { level: 1, name: /extract viral shorts/i })` fails.

### Observation 7: Broken Heading Selector in `test/pages/create/generators.test.tsx:225` (Micro-Drama)
- **Verbatim Code in Test**:
  ```tsx
  225:       expect(screen.getByRole('heading', { level: 1, name: /ai micro-drama series/i })).toBeInTheDocument();
  ```
- **Verbatim Code in Component** (`app/(app)/create/drama/page.tsx:134-137`):
  ```tsx
  134:         <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
  135:           <Film className="h-6 w-6 text-purple-500" />
  136:           Micro-Drama Workflow
  137:         </h1>
  ```
- **Failure**:
  The `h1` accessible name is `"Micro-Drama Workflow"`. It does not contain `"AI"` or `"series"`.
  `getByRole('heading', { level: 1, name: /ai micro-drama series/i })` fails.

---

## 2. Logic Chain

1. **Production Code Defect (Observation 1)**:
   - When a component evaluates `characterSheet?.poses[activePosePreview]`, if `characterSheet` is `{ success: true, archetype: 'stickman' }`, `characterSheet` is non-null.
   - Therefore `characterSheet?.poses` evaluates to `undefined`.
   - Accessing `undefined[activePosePreview]` triggers an uncaught `TypeError: Cannot read properties of undefined (reading 'pose_1')`.
   - In `app/(app)/create/whiteboard/page.tsx:475`, this uncaught exception causes the entire Whiteboard Animation Studio page to unmount and crash the React tree.

2. **Test Masking / Shallow Verification (Observation 2)**:
   - Worker M3 added a test in `interactive.test.tsx:200` to safeguard against this exact scenario.
   - However, the test asserted only on `screen.getByText('Stickman')`, which is rendered synchronously by `ARCHETYPES.map()` before any network request resolves.
   - The test passed synchronously without waiting for `fetchCharacterSheet` to resolve, creating a false impression that the component was defended against missing `poses`, when in reality line 475 was never safeguarded.

3. **Selector Mismatches (Observations 3, 4, 5, 6, 7)**:
   - Because terminal execution timed out in the subagent environment, Worker M3 and Auditor M3 relied on assumptions about element text rather than verifying exact JSX strings.
   - 6 test cases in `interactive.test.tsx` and `generators.test.tsx` use regular expressions and selectors that diverge from the actual component JSX:
     - Placeholder mismatch (`example.com/portrait.jpg` vs `images.unsplash.com/photo-...`)
     - Error message mismatch (`generation failed` vs `Avatar model service unavailable`)
     - Button name mismatch (`pointing right` vs `Pointing pose_2`)
     - Header mismatch (`extract viral shorts` vs `Extract Shorts Workflow`)
     - Header mismatch (`ai micro-drama series` vs `Micro-Drama Workflow`)
   - If `vitest run` is executed, these 6 tests will fail.

4. **Conclusion**:
   - The Milestone 3 deliverables cannot be approved until:
     1. Line 475 in `app/(app)/create/whiteboard/page.tsx` is fixed.
     2. The 6 failing selectors and assertions in `interactive.test.tsx` and `generators.test.tsx` are aligned with the actual component JSX.
     3. The defensive test in `interactive.test.tsx:200` is updated to wait for the character-sheet state update.

---

## 3. Caveats

- `test/pages/create/create-hub.test.tsx`, `test/pages/create/wizards.test.tsx`, and `test/pages/create/mission.test.tsx` were reviewed line-by-line and verified to be structurally sound, with accurate DOM queries, correct Zustand store isolation, proper React 19 Suspense unwrapping, and realistic mock flows.
- Subagent environment timed out on interactive `run_command` approval prompts. All findings in this report were verified by exact static syntax and AST analysis against actual component implementations.

---

## 4. Conclusion & Required Changes

The verdict is **REQUEST_CHANGES**.

The following changes MUST be implemented by Worker M3:

### Required Change 1: Fix `app/(app)/create/whiteboard/page.tsx:475` & 478
In `app/(app)/create/whiteboard/page.tsx`:
Replace line 475:
```tsx
{characterSheet?.poses[activePosePreview]?.svgPath && (
```
with:
```tsx
{characterSheet?.poses?.[activePosePreview]?.svgPath && (
```
And replace line 478:
```tsx
d={characterSheet.poses[activePosePreview].svgPath}
```
with:
```tsx
d={characterSheet?.poses?.[activePosePreview]?.svgPath || ""}
```

### Required Change 2: Fix `test/pages/create/interactive.test.tsx`
1. **Line 79 & 81**: Update placeholder regex from `/https:\/\/example\.com\/portrait\.jpg/i` to:
   ```tsx
   expect(screen.getByPlaceholderText(/https:\/\/images\.unsplash\.com\/photo/i)).toBeInTheDocument();
   const urlInput = screen.getByPlaceholderText(/https:\/\/images\.unsplash\.com\/photo/i);
   ```
2. **Line 141**: Update error assertion from `getByText(/generation failed/i)` to:
   ```tsx
   expect(screen.getByText(/avatar model service unavailable/i)).toBeInTheDocument();
   ```
3. **Lines 184–191**: Update pose assertions to reflect `POSE_NAMES` and the button name:
   ```tsx
   await waitFor(() => {
     expect(screen.getByText('Neutral Stand')).toBeInTheDocument();
     expect(screen.getByText('Neutral')).toBeInTheDocument();
     expect(screen.getByText('Pointing')).toBeInTheDocument();
   });

   // Click pose 2 to preview (accessible name is "Pointing pose_2")
   const pose2Btn = screen.getByRole('button', { name: /pointing/i });
   fireEvent.click(pose2Btn);
   ```
4. **Lines 223–226**: Update the defensive check to genuinely wait for character-sheet loading to settle:
   ```tsx
   await waitFor(() => {
     expect(screen.queryByText(/generating 9-pose reference sheet/i)).not.toBeInTheDocument();
   });
   ```

### Required Change 3: Fix `test/pages/create/generators.test.tsx`
1. **Line 225**: Update Micro-Drama heading regex from `/ai micro-drama series/i` to:
   ```tsx
   expect(screen.getByRole('heading', { level: 1, name: /micro-drama workflow/i })).toBeInTheDocument();
   ```
2. **Line 312**: Update Extract Shorts heading regex from `/extract viral shorts/i` to:
   ```tsx
   expect(screen.getByRole('heading', { level: 1, name: /extract shorts workflow/i })).toBeInTheDocument();
   ```

---

## 5. Verification Method

To independently verify once changes are applied:

1. **Inspect Code Changes**:
   - `app/(app)/create/whiteboard/page.tsx`: Confirm line 475 has `characterSheet?.poses?.[activePosePreview]?.svgPath`.
   - `test/pages/create/interactive.test.tsx`: Confirm updated placeholder, error message, pose label, and defensive wait.
   - `test/pages/create/generators.test.tsx`: Confirm updated heading regexes.

2. **Execute Test Suite**:
   ```bash
   npx vitest run test/pages/create/interactive.test.tsx
   npx vitest run test/pages/create/generators.test.tsx
   npx vitest run test/pages/create/
   ```

3. **Invalidation Conditions**:
   - Any test case in `test/pages/create/` fails or throws an unhandled exception.
   - Whiteboard Studio crashes with `TypeError` when `/api/workflows/whiteboard/character-sheet` returns an empty object or payload without `poses`.
