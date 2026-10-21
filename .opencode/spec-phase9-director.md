# Phase 9: The Director's Intelligence (Framewright & VideoClaw)

## Goal
Integrate autonomous asset hunting (VideoClaw) and intelligent shot framing (Framewright) to completely automate the B-roll and cinematography process.

## Requirements

### 1. Framewright (Cinematography Agent)
**Target:** `lib/engine/framewright.ts`
- Create a new helper module `framewright.ts`.
- It should export a function `enhanceFraming(basePrompt: string): Promise<string>`.
- Using `complete()` from `lib/ai/llm.ts`, the function takes a generic prompt (e.g., "A man walking") and enriches it with professional cinematography terms (e.g., "Medium wide shot, low angle, anamorphic lens, highly cinematic, rim lighting").
- Integrate this function into `lib/engine/scene-matcher.ts` so that when we generate AI video prompts, they are automatically enhanced by the Framewright agent.

### 2. VideoClaw (Autonomous B-Roll Hunter)
**Target:** `lib/engine/videoclaw.ts`
- Create a new helper module `videoclaw.ts`.
- It should export `huntForMedia(query: string): Promise<string>`.
- The function acts as a fallback for `beat-media-resolver.ts`. If Mixkit fails, VideoClaw uses `complete()` to generate a search term and (mocking a web crawler) returns a default fallback generic URL (e.g., a known Pexels/Pixabay direct MP4 link) to guarantee the render worker never starves for media.

### 3. Digital Slate (Render Worker Overlay)
**Target:** `scripts/render-worker.ts`
- When the worker compiles a job, if `job.logs.showSlate === true`, prepend a 1-second "Slate" clip before the actual video.
- *Implementation:* Generate a black frame using FFmpeg's `color=black:s=1080x1920:d=1` filter, and use `drawtext` to write the `job_id`, `created_at`, and `workflowType` onto it. Concat this slate clip at the very beginning of the final output.

## Instructions
- Implement the 3 features above.
- Verify `pnpm typecheck` passes.
