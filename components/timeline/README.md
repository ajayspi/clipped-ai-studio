# timeline

## Overview
Non-linear editor (NLE) drag-and-drop timeline component with undo/redo history support and live Server-Sent Events (SSE) rendering progress.

## Interface
- [TimelineEditor.tsx:TimelineEditor] - Interactive timeline editor component accepting initialBeats and jobId, allowing scene reordering, undo/redo, and progress monitoring.
- [TimelineEditor.tsx:SortableBeat] - Internal sortable item wrapper managing @dnd-kit/sortable transform attributes and beat card rendering.

## Invariants
- [TimelineEditor.tsx:EventSource] - SSE listener must attach to named events ('init' and 'update') via addEventListener because default onmessage drops named events.
- [TimelineEditor.tsx:Cmd+Z] - Keyboard event listener must invoke e.preventDefault() on Cmd/Ctrl+Z to prevent browser native input history collision.
- [TimelineEditor.tsx:DndContext] - Pointer sensor requires activationConstraint: { distance: 5 } to prevent accidental drag initiation on clicks.

## Side Effects
- [TimelineEditor.tsx:EventSource] - Establishes persistent EventSource connection to /api/jobs/${jobId}/stream.
- [TimelineEditor.tsx:handleSave] - Dispatches PATCH request to /api/jobs/${jobId}/beats with reordered beat sequences.

## Verification
- Run: `pnpm test`
