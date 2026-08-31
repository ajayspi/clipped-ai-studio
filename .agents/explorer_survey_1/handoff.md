# Handoff Report: Explorer Survey 1 (Architecture & Existing Patterns)

## 1. Observation

1. **Existing Engine Modules**:
   - `lib/engine/types.ts:1-49`: Defines core structures `Video`, `Scene`, `ScriptAnalysis`, `VideoMatch`, `GenerationRequest`, `GenerationResponse`.
   - `lib/engine/orchestrator.ts:5-59`: `VideoOrchestrator` implements `generateVideoPlan(script, platforms)` combining `sceneMatcher` and `videoSourcer`.
   - `lib/engine/scene-matcher.ts:32-115`: `SceneMatcher` splits narration into 350-word chunks (`splitIntoPasses`) and calls OpenAI `gpt-4o-mini` with `json_object` format to produce structured scenes.
   - `lib/engine/image-generator.ts:10-90`: `ImageGenerator` calls Fal.ai Flux API. Lines 19-30 show the cost-safe fallback:
     ```ts
     if (!apiKey) {
       console.warn("FAL_API_KEY is missing. Mocking image generation for scenes.");
       return scenes.map((scene, i) => ({
         ...scene,
         selectedVideo: {
           id: `img-mock-${i}`,
           url: `https://image.pollinations.ai/prompt/${encodeURIComponent(scene.description)}?width=1024&height=1024&nologo=true`,
           title: `Generated for: ${scene.description.substring(0, 30)}`,
           platform: 'openverse',
         }
       }));
     }
     ```
   - `lib/engine/video-sourcer.ts:25-119`: `VideoSourcer` searches Pexels (`PEXELS_API_KEY`) and Pixabay (`PIXABAY_API_KEY`), returning empty arrays gracefully on missing keys or network errors.

2. **Database Integration**:
   - `lib/db.ts:1-7`: Supabase client initialized via `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`.
   - `schema.sql:1-98`: Schema defines 6 PostgreSQL tables: `users`, `videos`, `render_jobs`, `api_credits`, `published_videos`, and `settings`.
   - `app/api/workflows/generate/route.ts:14-36` & `app/api/workflows/images/route.ts:15-56`: API routes generate a `crypto.randomUUID()` job ID, dispatch background asynchronous tasks via `setTimeout(..., 0)`, write completion or failure status directly into `render_jobs`, and return `{ success: true, jobId, message }` immediately.

3. **Current Workflow Implementation Status**:
   - Implemented Workflows: `footage` (`/api/workflows/generate` & `app/(app)/create/footage/page.tsx`) and `images` (`/api/workflows/images` & `app/(app)/create/images/page.tsx`).
   - Placeholder Workflows (currently returning static text "UI Dashboard for X (Week 3 Implementation)"):
     - `app/(app)/create/ai-videos/page.tsx`
     - `app/(app)/create/stories/page.tsx`
     - `app/(app)/create/bulk/page.tsx`
     - `app/(app)/create/shorts/page.tsx`
     - `app/(app)/create/drama/page.tsx`
     - `app/(app)/create/auto/page.tsx`
   - Missing Engine Files:
     - `lib/engine/video-generator.ts` (for AI Videos workflow with Kling/Luma/Fal APIs)
     - `lib/engine/stories-orchestrator.ts` (for multi-part stories workflow)
     - `lib/engine/bulk-planner.ts` (for 30-day content calendar workflow)
     - `lib/engine/shorts-extractor.ts` (for long-form video transcript hook slicing)
     - `lib/engine/drama-orchestrator.ts` (for consistent character multi-episode drama)
     - `lib/engine/autopilot.ts` (for hands-off pipeline)
   - Missing API Route Files:
     - `app/api/workflows/ai-videos/route.ts`
     - `app/api/workflows/stories/route.ts`
     - `app/api/workflows/bulk/route.ts`
     - `app/api/workflows/shorts/route.ts`
     - `app/api/workflows/drama/route.ts`
     - `app/api/workflows/auto/route.ts`

4. **External Services & Calling Conventions**:
   - Zero vendor SDK dependencies (no `@fal-ai/serverless-client`, `openai`, or `replicate` packages in `package.json`). All calls use native Node/browser `fetch` with standard bearer/key headers.
   - Settings page (`app/(app)/settings/page.tsx:18-61`) documents expected providers across 5 categories: LLMs (OpenRouter, Gemini, Groq, Claude, OpenAI), Voice (Azure, Google, ElevenLabs, Deepgram), Footage (Pexels, Pixabay, Coverr), Generation (ComfyUI, Kling, Luma, Fal, Runway), Publishing (YouTube, TikTok, Instagram).

---

## 2. Logic Chain

1. **Adherence to Established Design Patterns**:
   - Existing modules (`orchestrator.ts`, `image-generator.ts`, `scene-matcher.ts`, `video-sourcer.ts`) follow a class + exported singleton pattern using native `fetch`.
   - New engine modules (`video-generator.ts`, `stories-orchestrator.ts`, `bulk-planner.ts`, `shorts-extractor.ts`, `drama-orchestrator.ts`, `autopilot.ts`) should strictly follow this same pattern for architectural uniformity.

2. **Database Job Model Consistency**:
   - `app/api/workflows/generate/route.ts` and `app/api/workflows/images/route.ts` both use `crypto.randomUUID()` for `jobId` and record execution state in Supabase `render_jobs` with fields `{ id, status, progress, logs, error_message }`.
   - All 6 new API route handlers should follow this exact async-dispatch + Supabase logging contract.

3. **Cost-Safe Verification Requirement**:
   - As observed in `lib/engine/image-generator.ts:19-30`, when API keys are absent, functions must not crash; instead they should fall back to mock data, placeholder URLs, or deterministic generative previews.
   - Implementing mock modes in each of the 6 workflow engines allows end-to-end testing, UI verification, and database logging without incurring external API charges or blocking local execution when keys are unset.

---

## 3. Caveats

- **External Live API Keys**: During survey inspection, real API keys (e.g. `KLING_API_KEY`, `LUMA_API_KEY`, `OPENAI_API_KEY`, `FAL_API_KEY`) were not present in local environment files. Therefore, test runs must utilize the built-in cost-safe mock fallbacks.
- **Remotion / FFmpeg Video Rendering**: The backend currently creates job plans, scene cuts, and logs them in Supabase `render_jobs`. Actual video stitching / rendering (via Remotion or local FFmpeg binary) is planned for future stages, so workflow jobs represent structured generation plans and video asset pipelines.
- **Database Connection**: Supabase client (`lib/db.ts`) relies on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. In environments where Supabase is offline or unconfigured, background job updates should handle DB write rejections cleanly.

---

## 4. Conclusion

The Clipped codebase architecture is clean, modular, and ready for the implementation of the 6 remaining AI video generation workflows.
By following the established engine singleton pattern, native `fetch` calling conventions, asynchronous background Supabase `render_jobs` tracking, and cost-safe mock fallbacks, all 6 workflows can be built cleanly and verified against the acceptance criteria.

Recommended implementation plan:
1. Extend `lib/engine/types.ts` with all workflow data structures.
2. Create `lib/engine/prompts.ts` with structured prompt templates.
3. Implement the 6 engine classes in `lib/engine/` (`video-generator.ts`, `stories-orchestrator.ts`, `bulk-planner.ts`, `shorts-extractor.ts`, `drama-orchestrator.ts`, `autopilot.ts`) with cost-safe dry-run fallbacks.
4. Implement the 6 API route handlers in `app/api/workflows/*`.
5. Upgrade the 6 UI pages in `app/(app)/create/*` with interactive forms matching the style of `footage` and `images`.

---

## 5. Verification Method

To independently verify the observations and survey findings:
1. Inspect files directly:
   - `lib/engine/orchestrator.ts`
   - `lib/engine/image-generator.ts`
   - `lib/engine/types.ts`
   - `lib/db.ts` and `schema.sql`
   - `app/api/workflows/generate/route.ts` and `app/api/workflows/images/route.ts`
   - `app/(app)/create/footage/page.tsx` and `app/(app)/create/images/page.tsx`
2. Review report artifacts:
   - `survey_report.md` (Detailed architectural analysis)
   - `handoff.md` (Self-contained structured handoff)
