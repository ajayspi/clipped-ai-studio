# Phase 8: The 7-Slice Zustand NLE Architecture (Milimo Video Port)

## Goal
Refactor the Timeline Editor (`app/(app)/editor/[jobId]/page.tsx` and `components/timeline/TimelineEditor.tsx`) to use a robust Zustand state management architecture with Undo/Redo support, mirroring the frontend execution of `milimovideo`.

## Requirements
1. **Dependencies:**
   - Install `zustand` and `zundo` (for Undo/Redo middleware).
   - `pnpm add zustand zundo`

2. **Zustand Store:**
   - Create `lib/store/timeline-store.ts`.
   - Define a Zustand store that holds the `beats` array, `playheadPosition`, and `selectedBeatId`.
   - Apply the `zundo` temporal middleware so users can undo/redo beat deletions or reorderings.

3. **Refactor Timeline Editor:**
   - Modify `components/timeline/TimelineEditor.tsx` to read from and write to `useTimelineStore` instead of using local React `useState`.
   - Add keyboard event listeners for `Cmd/Ctrl+Z` (Undo) and `Cmd/Ctrl+Shift+Z` (Redo) that call the `zundo` undo/redo functions.

4. **SSE Integration:**
   - In the Timeline Editor or Job Viewer, use the native `EventSource` API to connect to the new `/api/jobs/[id]/stream` route.
   - Display a live progress bar based on the incoming SSE messages instead of relying on a static spinner.

5. **Verify:**
   - Ensure `pnpm typecheck` passes.
