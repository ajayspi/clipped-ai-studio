# Task Assignment: Forensic Auditor (Milestone 3 Integrity Audit)

## Working Directory
`C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\auditor_m3_gen3`

## Mandatory Reading
- `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md`
- `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md`
- Worker M3 Handoff: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_gen3\handoff.md`

## Objectives
1. Perform an exhaustive forensic integrity audit on all changes made by Worker M3 across:
   - `app/(app)/create/whiteboard/page.tsx`
   - `app/(app)/create/avatar/page.tsx`
   - `app/(app)/create/auto/page.tsx`
   - `app/(app)/create/drama/page.tsx`
   - `app/(app)/create/shorts/page.tsx`
   - `app/(app)/create/mission/[id]/page.tsx`
   - `components/wizard/wizard-store.ts`
   - `test/pages/create/interactive.test.tsx`
   - `test/pages/create/wizards.test.tsx`
   - `test/pages/create/generators.test.tsx`
   - `test/pages/create/mission.test.tsx`
   - `test/adversarial-query-builder.test.ts`
2. Audit for integrity violations:
   - Are any tests skipped (`.skip`, `xit`, `xdescribe`, `test.todo`)?
   - Are there any tautological assertions (`expect(true).toBe(true)`)?
   - Are there dummy mocks or facades replacing genuine page logic?
   - Are test results hardcoded?
   - Is all implementation genuine and robust?
3. Execute `cmd /c npx vitest run` to verify the tests independently.
4. Issue your verdict:
   - **CLEAN** (if zero integrity violations)
   - **INTEGRITY VIOLATION** (if cheating, dummy facades, or shortcuts are found)
5. Write your forensic report to `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\auditor_m3_gen3\handoff.md`.
6. Send a completion message to parent.

## 2026-09-18T17:57:28Z
Working Directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\auditor_m3_gen3
Read ORIGINAL_REQUEST.md at C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md, PROJECT.md at C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md, and Worker M3 Handoff at C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_gen3\handoff.md.

Task:
1. Conduct exhaustive integrity checks on all changes made by Worker M3.
2. Audit for: skipped tests (.skip, xit), tautological assertions, dummy/facade implementations, hardcoded test results.
3. Run `cmd /c npx vitest run` to verify 100% genuine pass rate.
4. Issue your verdict in `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\auditor_m3_gen3\handoff.md`: CLEAN or INTEGRITY VIOLATION.
5. Send completion message to parent.
