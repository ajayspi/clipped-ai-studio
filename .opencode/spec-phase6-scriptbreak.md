# Phase 6: ScriptBreak & Emotional Analytics

## Goal
Implement a workflow that breaks down a full script into strict `SH001` shots and generates an Emotional Tension Curve for the film.

## Requirements
1. **The ScriptBreak UI:**
   - Create `app/(app)/create/scriptbreak/page.tsx` with a textarea for pasting a long script.
   - Include a "Breakdown Script" button.
2. **The Orchestrator:**
   - Create `lib/engine/scriptbreak-orchestrator.ts`.
   - Write a prompt for the LLM (`complete`, `parseJson` from `lib/ai/llm.ts`) that takes the long script and returns an array of scenes. 
   - Each scene should have an `id` (e.g., `SC01`), a `tensionScore` (1-100, representing emotional intensity), and an array of `shots` (e.g. `SH001`, `SH002`) with visual descriptions.
3. **The API Route:**
   - Create `app/api/workflows/scriptbreak/route.ts` which takes the script, synchronously inserts a `render_job` as `planning`, and triggers the orchestrator asynchronously in a `setTimeout`.
   - The orchestrator should then update the job with the `beats` (shots) and `logs.tensionCurve` (the array of tension scores), setting `orchestration_state` to `queued`.
4. **Emotional Curve Chart (UI):**
   - In `app/(app)/editor/[jobId]/page.tsx` (the Timeline Editor created in Epic 1), read the `job.logs.tensionCurve`. 
   - If it exists, render a simple SVG line chart or a `Recharts` LineChart at the top of the timeline to visualize the emotional peaks and valleys of the film.
5. **Verify:** Ensure `pnpm typecheck` passes.
