# nodes

## Overview
Custom React Flow visual pipeline nodes for screenplay text input, character image references, and storyboard shot prompt definitions.

## Interface
- [ScreenplayNode.tsx:ScreenplayNode] - React Flow custom node component for screenplay text input with right-side source handle.
- [CharacterNode.tsx:CharacterNode] - React Flow custom node component for character image references and preview with right-side source handle.
- [StoryboardNode.tsx:StoryboardNode] - React Flow custom node component for storyboard shot descriptions with left-side target and right-side source handles.

## Invariants
- [ScreenplayNode.tsx:nodrag] - Textarea elements must maintain the nodrag class to prevent dragging the React Flow canvas while editing text.
- [CharacterNode.tsx:nodrag] - Text input element must maintain the nodrag class to allow text cursor placement without triggering node movement.
- [StoryboardNode.tsx:nodrag] - Prompt textarea must maintain the nodrag class to allow multiline editing without moving the node.
- [StoryboardNode.tsx:Handle] - StoryboardNode connects inputs on Position.Left (id='target') and outputs on Position.Right (id='source').

## Side Effects
- [ScreenplayNode.tsx:onChange] - Dispatches text modifications upstream to node data state via data.onChange.
- [CharacterNode.tsx:onChange] - Dispatches image URL/description updates to node data state via data.onChange.
- [StoryboardNode.tsx:onChange] - Dispatches shot prompt updates to node data state via data.onChange.

## Verification
- Run: `pnpm test`
