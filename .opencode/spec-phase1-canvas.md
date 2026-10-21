# Phase 1: Infinite Master Canvas

## Goal
Transform the basic React Flow builder (`components/workflow-builder/WorkflowBuilder.tsx`) into an "Infinite Master Canvas" that directors can use for pre-production. It should support specialized nodes for Screenplays, Characters, and Storyboards.

## Requirements
1. **New Custom Nodes:**
   - Create `components/workflow-builder/nodes/ScreenplayNode.tsx`: A node with a textarea for the user to paste a screenplay snippet.
   - Create `components/workflow-builder/nodes/CharacterNode.tsx`: A node with an image upload/input for an IP-Adapter reference image.
   - Create `components/workflow-builder/nodes/StoryboardNode.tsx`: A node representing a specific shot, containing a prompt input, a generated image display, and handles to connect to Screenplays and Characters.

2. **Update WorkflowBuilder:**
   - Register the custom node types in `components/workflow-builder/WorkflowBuilder.tsx`.
   - Add a Sidebar / Toolbar (`Panel` from `@xyflow/react`) allowing users to drag-and-drop or click to add these new nodes (Screenplay, Character, Storyboard) to the canvas.

3. **Canvas Compiler API:**
   - Add a "Compile to Job" button in the Toolbar.
   - Create `lib/engine/canvas-compiler.ts` which takes the React Flow `nodes` and `edges`, parses them (e.g. finding which Storyboard nodes are connected to which Character nodes), and constructs a `render_jobs` insert object.
   - Create `app/api/workflows/canvas-export/route.ts` to receive the canvas state, run the compiler, and enqueue the job.

4. **Verify Types & Tests:**
   - Ensure the new node components are strictly typed.
   - Run `pnpm typecheck` to verify.
