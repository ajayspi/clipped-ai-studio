# Milestone 3 Empirical Challenger Handoff Report

**Verdict**: **REQUEST_CHANGES**
**Overall Risk Assessment**: **HIGH**

---

## 1. Observation

### Verification Executions & Output
Ran `cmd /c npx vitest run` under repeated conditions in `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`:

#### Run 1 Result
- **Command**: `cmd /c npx vitest run`
- **Result**: `Test Files: 2 failed | 16 passed (18)`
- **Tests**: `8 failed | 182 passed (190)`
- **Errors**: `2 uncaught exceptions`
- **Duration**: `39.64s`

#### Run 2 Result (Repeat Stress Test)
- **Command**: `cmd /c npx vitest run`
- **Result**: `Test Files: 2 failed | 16 passed (18)`
- **Tests**: `8 failed | 182 passed (190)`
- **Errors**: `2 uncaught exceptions`
- **Duration**: `22.03s`

### Verbatim Failures & Stack Traces

#### Finding 1: Whiteboard Studio Uncaught Crash on Missing/Null Pose Bounding Box
- **File**: `app/(app)/create/whiteboard/page.tsx:438:78`
- **Verbatim Error**:
```
⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
TypeError: Cannot read properties of undefined (reading 'join')
 ❯ WhiteboardCreatePage app/(app)/create/whiteboard/page.tsx:438:78
    436|                       </p>
    437|                       <span className="text-[10px] font-mono text-slate-500 block mt-1">
    438|                         BBox: [{characterSheet.poses[activePosePreview].bbox.join(", ")}]
       |                                                                              ^
    439|                       </span>
    440|                     </div>

⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
TypeError: Cannot read properties of null (reading 'join')
 ❯ WhiteboardCreatePage app/(app)/create/whiteboard/page.tsx:438:78
    436|                       </p>
    437|                       <span className="text-[10px] font-mono text-slate-500 block mt-1">
    438|                         BBox: [{characterSheet.poses[activePosePreview].bbox.join(", ")}]
       |                                                                              ^
```

#### Finding 2: ScenesStep Uncaught Crash on Beat with Missing/Null Keywords
- **File**: `components/wizard/ScenesStep.tsx:61:25`
- **Verbatim Error**:
```
 FAIL  test/adversarial-whiteboard-wizard.test.tsx > CHALLENGE 3A: ScenesStep handles beats with undefined or null keywords without crashing
AssertionError: expected TypeError: Cannot read properties of undefined (reading 'map') to be null
 ❯ test/adversarial-whiteboard-wizard.test.tsx:399:27
```
Line 61 of `components/wizard/ScenesStep.tsx`:
```tsx
61: {beat.keywords.map((kw, i) => (
```

#### Finding 3: ScenesStep Uncaught Crash on Candidate with Missing URL
- **File**: `components/wizard/ScenesStep.tsx:73:33`
- **Verbatim Error**:
```
 FAIL  test/adversarial-whiteboard-wizard.test.tsx > CHALLENGE 3B: ScenesStep handles candidate with missing url without crashing
AssertionError: expected TypeError: Cannot read properties of undefined (reading 'endsWith') to be null
 ❯ test/adversarial-whiteboard-wizard.test.tsx:431:27
```
Line 73 of `components/wizard/ScenesStep.tsx`:
```tsx
73: beat.candidates[0].url.endsWith('.mp4') ? (
```

#### Finding 4: CreationWizard Uncaught Crash on Out-of-Bounds Step
- **File**: `components/wizard/CreationWizard.tsx:28` & `components/wizard/wizard-store.ts:335`
- **Verbatim Error**:
```
 FAIL  test/adversarial-whiteboard-wizard.test.tsx > CHALLENGE 2C: out-of-bounds step value (e.g. step=99 or step=-1) in store
AssertionError: expected TypeError: Cannot read properties of undefined (reading 'name') to be null
 ❯ test/adversarial-whiteboard-wizard.test.tsx:325:27
```
Lines 28-30 of `components/wizard/CreationWizard.tsx`:
```tsx
28: const step = STEPS[w.step]
29: const [submitting, setSubmitting] = useState(false)
30: const StepIcon = STEP_ICONS[w.step]
```

#### Finding 5: RenderStep Uncaught Crash on Undefined WorkflowType
- **File**: `components/wizard/RenderStep.tsx:52:53`
- **Verbatim Error**:
```
 FAIL  test/adversarial-whiteboard-wizard.test.tsx > CHALLENGE 3C: RenderStep handles corrupted workflowType and NaN beat durations
AssertionError: expected TypeError: Cannot read properties of undefined (reading 'replace') to be null
 ❯ test/adversarial-whiteboard-wizard.test.tsx:459:27
```
Line 52 of `components/wizard/RenderStep.tsx`:
```tsx
52: <span className="font-medium capitalize">{w.workflowType.replace('-', ' ')}</span>
```

---

## 2. Logic Chain

1. **Observation**: `app/(app)/create/whiteboard/page.tsx:438` accesses `.bbox.join(", ")` directly inside `{characterSheet?.poses?.[activePosePreview] && (...)`.
2. **Inference**: While worker M3 guarded `characterSheet?.poses?.[activePosePreview]?.svgPath`, line 438 assumed that any defined pose object always contains an array `bbox`.
3. **Observation**: When Gemini or an external pipeline returns a character sheet where a pose has no bounding box, or `bbox` is `null` or a string, the component evaluates line 438.
4. **Result**: React throws an unhandled `TypeError: Cannot read properties of undefined (reading 'join')` or `Cannot read properties of null (reading 'join')`, crashing the entire Whiteboard Animation Studio.
5. **Observation**: In `components/wizard/ScenesStep.tsx:61`, `beat.keywords.map` is called directly without checking if `beat.keywords` is defined or an array. In line 73, `beat.candidates[0].url.endsWith` is called directly without checking if `url` exists.
6. **Inference**: AI storyboard decomposition or candidate retrieval endpoints that return partial scene objects (e.g. omitted keywords or candidate without direct URL) cause immediate React component crashes during scene review.
7. **Observation**: In `components/wizard/wizard-store.ts:335`, `goToStep: (step) => set({ step })` does not clamp `step`, unlike `next()` and `back()`. When `step` is set out-of-bounds, `STEPS[w.step]` is `undefined` in `CreationWizard.tsx:28`, crashing on `step.name`.
8. **Observation**: In `components/wizard/RenderStep.tsx:52`, `{w.workflowType.replace('-', ' ')}` assumes `w.workflowType` is always a defined string. If `workflowType` is undefined, `.replace` crashes the render review step.

---

## 3. Stress Test Results Summary

| Challenge ID | Target Component | Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|---|
| **CHALLENGE 1A** | `WhiteboardCreatePage` | Active pose missing `bbox` | Renders pose details safely with fallback | Throws uncaught `TypeError: Cannot read properties of undefined (reading 'join')` | **FAIL** |
| **CHALLENGE 1B** | `WhiteboardCreatePage` | Active pose has `bbox: null` | Renders pose details safely with fallback | Throws uncaught `TypeError: Cannot read properties of null (reading 'join')` | **FAIL** |
| **CHALLENGE 1C** | `WhiteboardCreatePage` | `poses` is empty object `{}` | Default archetype labels render; pose clicks safe | Successfully rendered without crash | **PASS** |
| **CHALLENGE 1D** | `WhiteboardCreatePage` | Rapid switching across 4 archetypes | UI remains responsive, no crash | Successfully processed concurrent fetches | **PASS** |
| **CHALLENGE 1E** | `WhiteboardCreatePage` | Malformed SVG path string in pose | SVG renders with malformed path without crash | Successfully rendered `<path>` without exception | **PASS** |
| **CHALLENGE 2A** | `useWizardStore` | 100 rapid concurrent resets & mutations | Store state cleanly reinitializes to default | Clean reset to default state verified | **PASS** |
| **CHALLENGE 2B** | `CreationWizard` | Rapid store resets during active mount | Component cleanly resets to Step 0 | Component gracefully returned to Step 0 | **PASS** |
| **CHALLENGE 2C** | `CreationWizard` & store | Out-of-bounds `goToStep(99)` | Clamped to valid step or graceful fallback | Throws uncaught `TypeError: Cannot read properties of undefined (reading 'name')` | **FAIL** |
| **CHALLENGE 2D** | `CreationWizard` | Store reset while auto-pilot fetch in-flight | Auto mode cancels cleanly, resets to step 0 | Auto mode cleanly aborted, step reset to 0 | **PASS** |
| **CHALLENGE 3A** | `ScenesStep` | Beat with `keywords: undefined` or `null` | Renders beat without tags or with fallback | Throws uncaught `TypeError: Cannot read properties of undefined (reading 'map')` | **FAIL** |
| **CHALLENGE 3B** | `ScenesStep` | Candidate with missing `url` | Renders fallback thumbnail placeholder | Throws uncaught `TypeError: Cannot read properties of undefined (reading 'endsWith')` | **FAIL** |
| **CHALLENGE 3C** | `RenderStep` | `workflowType: undefined` | Renders default workflow name | Throws uncaught `TypeError: Cannot read properties of undefined (reading 'replace')` | **FAIL** |
| **CHALLENGE 3D** | `LivePlayer` & store | Subtitle positioning bounds & preset stress | Subtitle styles applied; drag box bounded | All 6 presets applied, custom presets handled | **PASS** |

---

## 4. Caveats
- Baseline test suite (16 test files, 161 tests) remains fully passing in isolation.
- The failures occur under boundary conditions, malformed AI responses, and out-of-bounds state mutations that real production users and external model APIs (Gemini, Claude) encounter.
- Challenger has strictly respected the Review-Only constraint and has NOT modified implementation files.

---

## 5. Conclusion & Required Changes

**Verdict**: **REQUEST_CHANGES**

To resolve these empirical failures, the following remediations must be applied by the worker:

1. **`app/(app)/create/whiteboard/page.tsx:438`**:
   Replace:
   ```tsx
   BBox: [{characterSheet.poses[activePosePreview].bbox.join(", ")}]
   ```
   With safe array checking:
   ```tsx
   BBox: [{Array.isArray(characterSheet.poses[activePosePreview].bbox) ? characterSheet.poses[activePosePreview].bbox.join(", ") : "N/A"}]
   ```

2. **`components/wizard/ScenesStep.tsx:61`**:
   Replace:
   ```tsx
   {beat.keywords.map((kw, i) => (
   ```
   With safe optional chaining / fallback:
   ```tsx
   {(beat.keywords || []).map((kw, i) => (
   ```

3. **`components/wizard/ScenesStep.tsx:73`**:
   Replace:
   ```tsx
   beat.candidates[0].url.endsWith('.mp4') ? (
   ```
   With safe URL check:
   ```tsx
   beat.candidates[0]?.url?.endsWith?.('.mp4') ? (
   ```

4. **`components/wizard/wizard-store.ts:335` & `components/wizard/CreationWizard.tsx:28`**:
   In `wizard-store.ts`:
   ```tsx
   goToStep: (step) => set({ step: Math.max(0, Math.min(step, STEPS.length - 1)) }),
   ```
   In `CreationWizard.tsx`:
   ```tsx
   const safeStepIndex = Math.max(0, Math.min(w.step, STEPS.length - 1));
   const step = STEPS[safeStepIndex] || STEPS[0];
   const StepIcon = STEP_ICONS[safeStepIndex] || STEP_ICONS[0];
   ```

5. **`components/wizard/RenderStep.tsx:52`**:
   Replace:
   ```tsx
   <span className="font-medium capitalize">{w.workflowType.replace('-', ' ')}</span>
   ```
   With safe fallback:
   ```tsx
   <span className="font-medium capitalize">{(w.workflowType || 'default').replace('-', ' ')}</span>
   ```

---

## 6. Verification Method

Run Vitest across the entire test suite including the adversarial harness:
```powershell
cmd /c npx vitest run
```
**Invalidation Condition**:
All 18 test files (including `test/adversarial-whiteboard-wizard.test.tsx`) pass with 100% success (0 failed tests, 0 uncaught exceptions).
