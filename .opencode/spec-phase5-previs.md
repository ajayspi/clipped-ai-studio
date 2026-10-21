# Phase 5: The 3D Previs Engine (ControlNet Director)

## Goal
Implement a WebGL "Grey-Box Stage" where users can set up basic 3D blocks and a camera, and export it as a motion reference for AI video models.

## Requirements
1. **Dependencies:** Install `@react-three/fiber` and `three` in the root (`pnpm add three @react-three/fiber`).
2. **The Previs Editor UI:**
   - Create `app/(app)/create/previs/page.tsx`.
   - Build a basic React Three Fiber `Canvas`.
   - Include a simple floor plane and a few primitive cubes that act as stand-ins for actors.
   - Include a simple camera animation (e.g., a slow push-in or pan across the scene) that loops.
3. **The Workflow Submission:**
   - Add a form to this page (Script/Prompt, Aspect Ratio).
   - Add a "Send to Queue" button that POSTs to `app/api/workflows/previs/route.ts`.
4. **The Backend Route:**
   - Create `app/api/workflows/previs/route.ts` that safely enqueues a `render_job` with `workflowType: 'previs'` and `orchestration_state: 'queued'`.

5. **Verify:** Ensure `pnpm typecheck` passes.
