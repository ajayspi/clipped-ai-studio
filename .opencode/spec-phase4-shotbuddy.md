# Phase 4: Shotbuddy Asset Manager (Shot Versioning & SceneFlow)

## Goal
Transform the flat `app/(app)/assets/page.tsx` gallery into a professional Shot Manager inspired by `albozes/shotbuddy`. Implement strict version stacking for shots, ensuring that every generated video is bound to its prompt and reference metadata.

## Requirements
1. **Asset Board UI Upgrade:**
   - Modify `app/(app)/assets/page.tsx` (or build a new `app/(app)/editor/shot-manager/page.tsx`).
   - Group assets by their `job_id` or a new metadata tag (e.g., `Shot ID`). 
   - Display a "Version Stack" (V1, V2, V3) for clips that are regenerated from the same shot.
   - For every clip, display the **Exact Prompt**, **Video Model**, and **Seed** (pulled from the `render_jobs` table or the job logs).

2. **Regenerate / Versioning Flow:**
   - Add a "Regenerate (V2)" button to existing shots in the Asset UI.
   - When clicked, it should call an API route (`/api/jobs/[id]/regenerate/route.ts`) which clones the `render_job`, increments a `version` counter in its metadata/logs, and enqueues it again with `orchestration_state: 'queued'`.

3. **SceneFlow / Quality Gate:**
   - Create `scripts/quality-gate-worker.ts` (if it doesn't exist) or `lib/engine/sceneflow-eval.ts`.
   - Write a helper that takes a generated video URL and the original script prompt, sends them to a Vision-Language Model (e.g., GPT-4o), and asks it to score the "Script-to-Screen Fidelity" (1-10) and flag continuity errors. Save this score to the job's logs.

4. **Verify Types & Tests:**
   - Ensure `pnpm typecheck` passes.
