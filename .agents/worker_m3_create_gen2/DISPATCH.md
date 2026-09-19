## 2026-09-17T00:37:10Z

You are Worker M3 (Create Workflow Routes Tests Implementation) for the Clipped project.
Working directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\worker_m3_create_gen2
Workspace directory: C:\Users\vigilare\.gemini\antigravity\scratch\clipped

MANDATORY FIRST STEP:
1. Read C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\ORIGINAL_REQUEST.md (section "## Follow-up — 2026-09-16T21:22:28Z")
2. Read C:\Users\vigilare\.gemini\antigravity\scratch\clipped\PROJECT.md
3. Read Explorer Reports:
   - C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m3_1_gen2\handoff.md
   - C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m3_2_gen2\handoff.md
   - C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m3_3_gen2\handoff.md

Your exclusive write ownership covers:
- `app/(app)/create/whiteboard/page.tsx`
- `test/pages/create/create-hub.test.tsx`
- `test/pages/create/wizards.test.tsx`
- `test/pages/create/generators.test.tsx`
- `test/pages/create/interactive.test.tsx`
- `test/pages/create/mission.test.tsx`

Implementation Tasks:
1. In `app/(app)/create/whiteboard/page.tsx` lines 390 and 427, apply defensive optional chaining: `characterSheet?.poses?.pose_1` to safeguard against missing/null poses in character sheet API responses.
2. Implement `test/pages/create/create-hub.test.tsx`:
   - Headless test for `app/(app)/create/page.tsx`.
   - Verify header, 10 workflow cards, prompt bar input and submission, category filtering, search filtering, and status pills.
3. Implement `test/pages/create/wizards.test.tsx`:
   - Headless tests for `app/(app)/create/{ai-videos,footage,images,stories}/page.tsx`.
   - Test step progression (Script -> Scenes -> Voice -> Subtitles -> Render).
   - Test Auto-Pilot mode.
   - Reset store in `beforeEach` (`useWizardStore.getState().reset()`).
4. Implement `test/pages/create/generators.test.tsx`:
   - Headless tests for `app/(app)/create/{auto,bulk,drama,shorts,url}/page.tsx`.
   - Verify inputs, parameter selectors, mock mode toggles, submit actions, and error handling.
5. Implement `test/pages/create/interactive.test.tsx`:
   - Headless tests for `app/(app)/create/avatar/page.tsx` and `app/(app)/create/whiteboard/page.tsx`.
   - Verify avatar preview framing and controls.
   - Verify whiteboard character sheet selection, poses, and generation controls.
6. Implement `test/pages/create/mission.test.tsx`:
   - Headless test for dynamic route `app/(app)/create/mission/[id]/page.tsx`.
   - Wrap in `<React.Suspense fallback={<div>Loading...</div>}>` with `params={Promise.resolve({ id: 'test-mission-123' })}`.
   - Test polling against `/api/workflows/mission?id=...`, progress steps, logs, and "Edit in Wizard" navigation.
