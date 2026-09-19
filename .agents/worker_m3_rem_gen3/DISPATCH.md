# Task Assignment: Worker M3 Remediation (Edge Case Fixes)

## Working Directory
`C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_rem_gen3`

## Mandatory Reading
- `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md`
- `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md`
- Challenger 2 Handoff: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\challenger_m3_2_gen3\handoff.md`
- Reviewer 1 Handoff: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\reviewer_m3_1_gen3\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Apply the exact edge-case fixes identified by Challenger 2 and Reviewer 1:
1. In `app/(app)/create/whiteboard/page.tsx`:
   - Line 438: Safely access `bbox?.join`:
     Change:
     `[{characterSheet.poses[activePosePreview].bbox.join(", ")}]`
     To:
     `[{characterSheet?.poses?.[activePosePreview]?.bbox?.join ? characterSheet.poses[activePosePreview].bbox.join(", ") : "0, 0, 100, 100"}]`
     (or check that `characterSheet?.poses?.[activePosePreview]?.bbox` is an array before calling `.join`).
2. In `app/(app)/create/avatar/page.tsx`:
   - Line 241: Use `.trim()` check so whitespace-only URLs don't render broken `<img>` previews:
     Change:
     `{customImageUrl && (`
     To:
     `{customImageUrl?.trim() && (`
   - Line 100: Ensure `customImageUrl: customImageUrl?.trim() || undefined` is sent to the API.
3. In `test/adversarial-boundary-m3.test.tsx` (and any other test files):
   - Run `cmd /c npx vitest run test/adversarial-boundary-m3.test.tsx` and make sure all tests pass cleanly.
4. Run the entire test suite:
   `cmd /c npx vitest run`
   Verify that 100% of all test files pass (including `test/adversarial-boundary-m3.test.tsx`).
5. Write your handoff report to `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_rem_gen3\handoff.md` and notify parent.

## 2026-09-18T18:03:35Z
Your role is Milestone 3 Remediation Worker (Iteration 2 Edge Cases).
Working Directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_rem_gen3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mandatory Reading before starting:
- C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md
- C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md
- C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_rem_gen3\DISPATCH.md
- Challenger 2 Report: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\challenger_m3_2_gen3\handoff.md
- Reviewer 1 Report: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\reviewer_m3_1_gen3\handoff.md

Exclusive Write Ownership:
1. `app/(app)/create/whiteboard/page.tsx`
2. `app/(app)/create/avatar/page.tsx`
3. `test/adversarial-boundary-m3.test.tsx` (if any adjustments needed for test setup/mocks)

Specific Fixes:
1. In `app/(app)/create/whiteboard/page.tsx`:
   - Line 438: Defensively access `bbox.join`:
     Change:
     `[{characterSheet.poses[activePosePreview].bbox.join(", ")}]`
     To:
     `[{Array.isArray(characterSheet?.poses?.[activePosePreview]?.bbox) ? characterSheet.poses[activePosePreview].bbox.join(", ") : "0, 0, 100, 100"}]`
     Also ensure line 432 has optional chaining if needed:
     `{characterSheet?.poses?.[activePosePreview]?.name || activePosePreview}`
2. In `app/(app)/create/avatar/page.tsx`:
   - Line 241: Trim check so whitespace-only strings do not render broken image:
     Change:
     `{customImageUrl && (`
     To:
     `{Boolean(customImageUrl && customImageUrl.trim()) && (`
   - Line 100:
     `customImageUrl: customImageUrl?.trim() || undefined,`
3. Verify test suite:
   - Run `cmd /c npx vitest run test/adversarial-boundary-m3.test.tsx`
   - Run `cmd /c npx vitest run` across the entire suite
   - Ensure all tests pass 100% with exit code 0.
4. Write your handoff report to `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_rem_gen3\handoff.md` and send a message to parent.
