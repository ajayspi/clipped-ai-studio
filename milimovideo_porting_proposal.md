# Milimo Video Porting Proposal (Phase 8)

## 📌 Overview
The `mainza-ai/milimovideo` repository represents the gold standard for real-time AI NLE (Non-Linear Editing) interfaces and advanced localized video editing. By adapting its core architectural patterns to our Next.js/PM2 stack, we can elevate Clipped AI from a "queue-and-wait" batch processor into a professional, real-time interactive editing suite.

## 🚀 Core Features to Port

### 1. Real-Time SSE (Server-Sent Events) Streaming
**The Problem:** Currently, our Web UI polls the Supabase `render_jobs` table or relies on simple `status` enum flips (e.g., `planning` ➔ `queued` ➔ `completed`). There is no granular visibility into the FFmpeg render progress or LLM streaming.
**The Port:**
- Implement an SSE endpoint in Next.js (`app/api/jobs/[id]/stream/route.ts`).
- Modify the PM2 `render-worker.ts` to emit granular progress events (e.g., FFmpeg frame count, TTS generation steps) directly to a Redis pub/sub channel or Supabase Realtime broadcast.
- The UI will consume this SSE stream to render exact percentage bars, ETA, and live logs, mirroring Milimo's interactive feedback loop.

### 2. The 7-Slice Zustand NLE Architecture
**The Problem:** Our current Timeline Editor (`/editor/[jobId]`) manages state locally within React components, which becomes fragile when handling complex drag-and-drop beat reordering, multi-track audio, and undo/redo histories.
**The Port:**
- Adopt Milimo's frontend state architecture: A robust `Zustand` store utilizing the `zundo` middleware for time-travel (Undo/Redo).
- Break the state into logical slices: `TimelineSlice`, `MediaSlice`, `PlaybackSlice`, etc.
- This will allow seamless drag-and-drop file imports, keyboard shortcuts (Cmd+Z), and perfectly synchronized state across the Director's Canvas and the Timeline.

### 3. Advanced Inpainting & SAM3 Object Tracking
**The Problem:** Our video models generate full frames, but if a single detail is wrong (e.g., a glitchy hand), the user must regenerate the entire video (V2).
**The Port:**
- Build a new interactive `MaskingPanel` in the Shotbuddy Asset UI.
- Allow users to click/brush over a specific object in a generated video.
- Pass these masks to a dedicated SAM3 (Segment Anything Model 3) API or a lightweight equivalent (like `fal.ai/sam2`) to track the object across frames.
- Use Flux or Kling to perform localized video inpainting, fixing only the masked area without losing the rest of the shot.

## 🛠️ Implementation Strategy (Epic 3 Add-on)

We can seamlessly slot this into our current roadmap:
1. **Immediate:** Upgrade the Timeline Editor (`app/(app)/editor/[jobId]/page.tsx`) to use the Zustand + Zundo state manager.
2. **Next:** Wire up the Supabase Realtime / SSE streams for the `render-worker.ts` so users see their video compiling frame-by-frame.
3. **Future:** Add the SAM3/Inpainting microservices to the API router.
