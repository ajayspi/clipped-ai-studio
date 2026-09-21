# Milestone 3 Adversarial Challenge Report

**Challenger**: `challenger_m3_2_gen3` (Empirical Challenger)  
**Parent Agent**: `037a6fc7-a6eb-46c1-b85d-68e7a4aa8c74`  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Test Execution Command & Outcome
- **Command**: `cmd /c npx vitest run`
- **Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`
- **Exit Code**: `1` (FAILED)
- **Duration**: `42.30s`
- **Test Files**: `2 failed | 16 passed (18)`
- **Total Tests**: `8 failed | 182 passed (190)`
- **Unhandled Errors**: `2 uncaught runtime exceptions`

### Verbatim Failures in Vitest Runner

#### Finding 1: Avatar Studio Whitespace Custom Image URL Renders Broken Thumbnail
From `test/adversarial-boundary-m3.test.tsx:369`:
```
 FAIL  test/adversarial-boundary-m3.test.tsx > Adversarial Boundary Condition Tests — Milestone 3 > Boundary Condition 3: Avatar Studio Custom Photo Image URL Inputs > safely falls back to default preset image when custom photo URL is whitespace only
Error: expect(element).not.toBeInTheDocument()

expected document not to contain element, found <img
  alt="Custom Preview"
  class="w-full h-full object-cover"
  src="   	  
  "
/> instead
 ❯ test/adversarial-boundary-m3.test.tsx:369:59
    367|       fireEvent.change(urlInput, { target: { value: '   \t  \n  ' } });
    368| 
    369|       expect(screen.queryByAltText('Custom Preview')).not.toBeInTheDocument();
       |                                                           ^
    370|       const presenterImgs = screen.getAllByAltText('Presenter');
    371|       expect(presenterImgs[0]).toHaveAttribute('src', AVATAR_PRESETS[0].previewUrl);
```

#### Finding 2: Whiteboard Studio Uncaught TypeError on Missing/Null `bbox`
From `app/(app)/create/whiteboard/page.tsx:438:78`:
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
```
And:
```
⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
TypeError: Cannot read properties of null (reading 'join')
 ❯ WhiteboardCreatePage app/(app)/create/whiteboard/page.tsx:438:78
```

#### Finding 3: Wizard Sub-Component Crashes on Corrupted Inputs
From `test/adversarial-whiteboard-wizard.test.tsx`:
- `ScenesStep` with undefined/null beat keywords:
  `TypeError: Cannot read properties of undefined (reading 'map')` at line 399
- `ScenesStep` with candidate lacking URL:
  `TypeError: Cannot read properties of undefined (reading 'endsWith')` at line 431
- `RenderStep` with corrupted workflowType:
  `TypeError: Cannot read properties of undefined (reading 'replace')` at line 459
- `CreationWizard` out-of-bounds step value (`step=99`):
  `TypeError: Cannot read properties of undefined (reading 'name')` at line 325

---

## 2. Logic Chain

### 1. Assessment of Assigned Boundary Conditions
1. **Empty & Whitespace Transcripts in Shorts (`app/(app)/create/shorts/page.tsx`)**:
   - Lines 55–58 in `handleExtract`:
     ```tsx
     if (sourceType === "transcript" && !transcript.trim()) {
       setError("Please paste a transcript to extract clips from")
       return
     }
     ```
   - **Empirical Observation**: Correctly rejects empty strings, whitespace-only strings (`"   \n\t   "`), prevents network dispatch, and recovers gracefully upon entering valid text.
   - **Status**: **PASS** (all 5 adversarial tests passed).

2. **Failed Mission APIs (`app/(app)/create/mission/[id]/page.tsx`)**:
   - Lines 48–78 in `pollJobStatus`:
     - 404 responses trigger fallback placeholder state without throwing.
     - 500 responses return cleanly without triggering uncaught errors.
     - Network rejections in `fetch` are caught in `catch (err: any) { console.warn("Polling error:", err); }`.
     - Fatal errors (`job.error`) properly activate `isFailed` in `MissionHeader`, show `Failed` badge, display `Retry Mission` button, turn progress bar rose-500, and render fatal log entry in `MissionLogConsole`.
     - Failed retry attempts cleanly trigger `fetchError` alert banner.
   - **Status**: **PASS** (all 5 adversarial tests passed).

3. **Custom Photo Image URL Inputs in Avatar Studio (`app/(app)/create/avatar/page.tsx`)**:
   - In lines 122–125:
     ```tsx
     const previewAvatarUrl =
       avatarType === "custom_photo" && customImageUrl.trim().length > 0
         ? customImageUrl
         : selectedPreset.previewUrl;
     ```
     The canvas preview correctly uses `.trim().length > 0`.
   - **The Flaw**: On line 242:
     ```tsx
     {customImageUrl && (
       <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
         <img src={customImageUrl} alt="Custom Preview" className="w-full h-full object-cover" />
       </div>
     )}
     ```
     In JavaScript, any non-empty whitespace string (`"   \t  \n  "`) is truthy. Line 242 evaluates to `true`, causing the DOM to render a broken `<img src="   \t  \n  " alt="Custom Preview" />` element.
   - Furthermore, in `handleGenerate` (line 100):
     ```tsx
     customImageUrl: avatarType === "custom_photo" ? customImageUrl : undefined,
     ```
     The untrimmed whitespace string is dispatched across the network payload to `/api/workflows/avatar`.
   - **Status**: **FAIL** (Reproduced in `test/adversarial-boundary-m3.test.tsx:369`).

### 2. Assessment of Vitest Suite Health
Running `cmd /c npx vitest run` reveals that while 16 core/creation route test files pass, the suite as a whole exits with code 1 due to 8 failing tests and 2 uncaught runtime exceptions across `test/adversarial-boundary-m3.test.tsx` and `test/adversarial-whiteboard-wizard.test.tsx`. Under PROJECT.md and ORIGINAL_REQUEST.md acceptance criteria:
- "100% of tested pages mount and render their critical UI elements without throwing unhandled exceptions or error boundary triggers."
- Vitest suite must exit with 0.

Therefore, changes are mandatory before Milestone 3 can be approved.

---

## 3. Caveats
- The core routing, layout toggles, preset voice previews, and state handoffs between Mission and Wizard (`useWizardStore`) are robust.
- The 16 core and creation page test files authored by Worker M3 run cleanly in isolation; the failures emerge specifically under adversarial edge payloads (malformed character sheets, whitespace image inputs, and invalid beat shapes).

---

## 4. Conclusion
**Verdict**: **REQUEST_CHANGES**

### Actionable Remediation Checklist for Worker:

1. **Fix Avatar Studio Whitespace URL Guard (`app/(app)/create/avatar/page.tsx`)**:
   - Line 242: Change `{customImageUrl && (` to:
     ```tsx
     {customImageUrl.trim().length > 0 && (
     ```
   - Line 100: Ensure payload trims or passes undefined for whitespace:
     ```tsx
     customImageUrl: avatarType === "custom_photo" && customImageUrl.trim() ? customImageUrl.trim() : undefined,
     ```

2. **Fix Whiteboard Studio Missing/Null `bbox` Crash (`app/(app)/create/whiteboard/page.tsx`)**:
   - Line 438: Replace direct `.join()` with array guard:
     ```tsx
     BBox: [{Array.isArray(characterSheet.poses[activePosePreview]?.bbox) ? characterSheet.poses[activePosePreview].bbox.join(", ") : "N/A"}]
     ```

3. **Fix Wizard Sub-Component Null Checks**:
   - `components/wizard/ScenesStep.tsx`: Guard `(beat.keywords || []).map(...)` and `candidate?.url?.endsWith(...)`.
   - `components/wizard/RenderStep.tsx`: Guard `(w.workflowType || 'footage').replace(...)`.
   - `components/wizard/CreationWizard.tsx`: Guard step bounds or default to step 1 if out of range.

---

## 5. Verification Method

To verify the remediations, run:
```powershell
cmd /c npx vitest run
```

### Invalidation Criteria:
- Exit code must be `0`.
- All 18 test files must pass (`18 passed (18)`).
- `0 unhandled errors / uncaught exceptions`.
