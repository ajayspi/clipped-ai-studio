# workflow

## Overview
Visual pipeline builder interface using a node-based architecture for designing custom LLM, TTS, and video rendering pipelines.

## Interface
- [page.tsx:default] WorkflowEditorPage React component rendering the interactive WorkflowBuilder canvas

## Invariants
- [page.tsx:WorkflowBuilder] Container wrapped in full-width dark canvas with responsive styling

## Side Effects
- [page.tsx:WorkflowBuilder] Client-side interactive DAG editing and pipeline node connection manipulation

## Verification
- Run: `pnpm test`
