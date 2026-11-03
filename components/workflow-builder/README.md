# workflow-builder

## Overview
Visual node-based workflow editor canvas utilizing React Flow (@xyflow/react) for assembling, connecting, and compiling video generation pipelines.

## Interface
- [WorkflowBuilder.tsx:WorkflowBuilder] - Canvas component managing nodes, edges, controls, minimap, background grid, and top-right toolbar panel.
- [nodes](./nodes/README.md) - Subdirectory containing specialized React Flow graph nodes.

## Invariants
- [WorkflowBuilder.tsx:nodeTypes] - Memoizes custom node mappings (screenplay, character, storyboard) via useMemo to prevent React Flow rerendering cycles.
- [WorkflowBuilder.tsx:onConnect] - Configures all newly added connection edges with animated: true.

## Side Effects
- [WorkflowBuilder.tsx:handleCompile] - Dispatches POST request to /api/workflows/canvas-export with serialized { nodes, edges } JSON payload.
- [WorkflowBuilder.tsx:alert] - Displays browser alert dialogs upon compilation completion or failure.

## Verification
- Run: `pnpm test`
