# Spec: Epic 5 - Multi-Language AI Dubbing & Translation

## Overview
Users want to take a successfully generated video and automatically translate it into multiple languages for global reach.

## Requirements

### 1. Translation Endpoint
- Create `app/api/jobs/[id]/dub/route.ts` (POST).
- It should accept `{ languages: string[] }` (e.g., `['es', 'fr', 'de']`).
- It must fetch the original job by `id` from the `render_jobs` table.
- For each requested language:
  - Call the LLM (`complete`, `parseJson` from `lib/ai/llm.ts`) with a system prompt to translate the `script`, the `title` (if any), and the `text` inside the `beats` array.
  - Insert a NEW row into `render_jobs` with the translated payload.
  - Set `orchestration_state: 'queued'` so the worker picks it up immediately.
  - Retain all other settings (like `visualStyle`, `musicSource`, etc.).
  - (Optional) Change the `voice` to a localized voice if the TTS provider supports it, or just use the same voice.

### 2. UI: Dub & Translate Button
- In `app/(app)/queue/page.tsx` (and/or `/library`), for jobs that are `status === 'completed'` or `orchestration_state === 'completed'`, show a "Translate" button (e.g., using `lucide-react`'s `Languages` or `Globe` icon).
- When clicked, it should open a small modal or dropdown to select languages (e.g. Spanish, French, German).
- Upon submission, it sends the POST request to the `/dub` endpoint and shows a success toast, adding the new jobs to the queue.

### 3. Testing
- Add a tier to `tests/e2e/standalone-runner.js` to mock and verify the `/api/jobs/[id]/dub` route.

## Acceptance Criteria
- [ ] Users can click "Translate", pick languages, and see new translated jobs appear in the queue.
- [ ] Tests pass cleanly with `pnpm test`.
