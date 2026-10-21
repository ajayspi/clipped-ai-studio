---
trigger: always_on
description: Core architectural and environmental guidelines for the Clipped AI codebase.
---

# Clipped AI Development Guidelines

## 1. Development Environment (Local-First)
- **Constraint**: ALWAYS develop, port features, and edit code in the local Windows workspace (`C:\Users\vigilare\.gemini\antigravity\scratch\clipped`).
- **Restriction**: DO NOT develop or edit code directly on the Oracle VM over SSH. The VM is reserved exclusively for production testing and final deployment. Develop and test offline first.

## 2. LLM JSON Parsing
- **Constraint**: NEVER use standard `JSON.parse()` for parsing LLM (Claude, OpenAI, Gemini) responses.
- **Requirement**: Always use the robust `parseJson` helper utility (located at `lib/ai/llm.ts`) to safely handle markdown fences (```json), unescaped newlines, and trailing conversational text inherent to LLM outputs.

## 3. UI/UX Generation Patterns
- **Constraint**: When building new generation workflows in the `/create` section, strictly maintain the Shadcn UI and Tailwind design system established in the codebase.
- **Auto-Pilot Requirement**: Generation flows must support a hybrid "Auto-Pilot mode." Auto mode should orchestrate the steps automatically without blocking, BUT the UI must remain accessible so the user can inspect or intervene at any time (e.g., pausing to swap out AI-selected clips or modifying the script) during the process.

## 4. Local PM2 Worker Execution (Windows)
- **Constraint**: The `ecosystem.config.js` uses `bun` to run workers natively. If `bun` is not installed globally on the Windows host, `pnpm workers` will fail with an interpreter error.
- **Requirement**: Either install `bun` globally via npm (`npm i -g bun`) if compatible, or modify `ecosystem.config.js` locally to use Node with tsx instead:
  ```javascript
  interpreter: 'node',
  interpreter_args: '--import tsx',
  ```

## 5. Supabase claim_render_job Locking
**Trigger:** When writing background sweepers or recovery workers that revert stuck jobs.
**Behavior to Learn:** Never just set status: 'queued'. The claim_render_job RPC strictly locks based on orchestration_state. You MUST set orchestration_state: 'retryable' or 'queued', otherwise the job becomes permanently unclaimable by the render worker.

## 6. FFmpeg hstack Pixel Format Crashes
**Trigger:** When using hstack or stack to combine multiple video streams (e.g., side-by-side volumetric exports).
**Behavior to Learn:** FFmpeg's hstack strictly requires all inputs to share the exact same pixel format. If combining an RGB video with a grayscale depth map, you MUST explicitly normalize the formats (e.g., ,format=yuv420p) on both streams immediately before the hstack filter, or FFmpeg will crash.

## 7. Zustand + Zundo Timeline Initialization
**Trigger:** When initializing a Timeline or NLE editor state that uses zundo for Undo/Redo time travel.
**Behavior to Learn:** Ensure the initial data load from the database is NOT recorded in the zundo history stack. If the initial hydration is pushed to the stack, the user's first Cmd+Z will revert the timeline to an empty array []. Also, custom Cmd+Z keyboard handlers MUST call e.preventDefault() to stop native browser input collisions.
