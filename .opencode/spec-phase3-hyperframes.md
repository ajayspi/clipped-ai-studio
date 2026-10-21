# Phase 3: Agentic HTML/GSAP Video Renderer (Hyperframes)

## Goal
Implement a workflow where an AI agent writes raw HTML/CSS/GSAP code (instead of generating a heavy MP4 via a video model). The Render Worker uses `puppeteer` to load this HTML file, record it frame-by-frame, and compile it into an MP4 video using FFmpeg.

## Requirements
1. **The Route & Orchestrator:**
   - Create `app/(app)/create/code-video/page.tsx`: A UI where the user can enter a script or description for a motion graphics video (e.g., "A neon tech intro").
   - Create `app/api/workflows/code-video/route.ts`: Enqueues the job.
   - Create `lib/engine/hyperframe-orchestrator.ts`: Uses the LLM (`complete`, `parseJson`) to generate a complete, animated `index.html` file (using inline CSS and GSAP via CDN). Save this HTML into the job's beats or logs.

2. **Puppeteer Integration in Render Worker:**
   - Modify `scripts/render-worker.ts` to support rendering HTML.
   - If `job.workflowType === 'code-video'`, the worker should:
     - Write the LLM-generated HTML to a temporary file (`temp.html`).
     - Spin up a headless Puppeteer browser (`const browser = await puppeteer.launch()`), open the file.
     - Advance the GSAP timeline manually frame-by-frame (or just wait while taking screenshots at 30fps).
     - Save the screenshots (`frame_%04d.png`) to the temp directory.
     - Use FFmpeg (`-framerate 30 -i frame_%04d.png`) to compile the frames into the final `.mp4`.

3. **Dependencies:**
   - Add `puppeteer` to the project if not present (`pnpm add puppeteer`).

4. **Verify Types & Tests:**
   - Ensure `pnpm typecheck` passes.
