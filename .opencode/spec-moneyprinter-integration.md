# Plan: MoneyPrinterV2 concept integration into clipped

Status: DRAFT — awaiting sign-off.
Date: 2026-09-29
Slug: moneyprinter-integration
File: `.opencode/spec-moneyprinter-integration.md`

---

## Summary

MoneyPrinterV2 is a Python YouTube Shorts automator. After reading the source, **most of what it does clipped already does better** — the YouTube Data API v3 publisher (`lib/publishing/youtube.ts`) is more complete than MoneyPrinterV2's Selenium upload, and the render worker + TTS + image gen are already wired.

What clipped is actually missing:

1. **Tighter script prompts** — MoneyPrinterV2's constraints produce cleaner narration scripts.
2. **Image-pacing technique** — one image prompt per ~3 seconds of narration, paced to TTS duration.
3. **Real scheduling** — auto-pilot computes `nextRun` but never persists or executes it. It's a preview tool, not a scheduler.

This plan covers those three gaps. Two phases.

## Phase 1: Prompt + pacing improvements (small, safe, immediate)

### 1a. Script prompt constraints

**File:** `lib/engine/prompts.ts`

Port MoneyPrinterV2's script constraints into `buildAIVideoPrompt` and the auto-pilot synthesis prompt:

- "Get straight to the point, don't start with unnecessary things like 'welcome to this video'."
- "YOU MUST NOT EXCEED THE {sentence_length} SENTENCES LIMIT."
- "NEVER USE A TITLE. YOU MUST NOT INCLUDE ANY TYPE OF MARKDOWN."
- "ONLY RETURN THE RAW CONTENT. DO NOT INCLUDE 'VOICEOVER', 'NARRATOR' OR SIMILAR INDICATORS."

These constraints are stack-agnostic and immediately improve output quality.

### 1b. Image-pacing technique

**File:** `lib/engine/shot-planner.ts`

MoneyPrinterV2 generates one image prompt per ~3 sentences of script, then shows each image for `TTS_duration / num_images` seconds. This is a clean, deterministic way to pace visuals to narration.

Port the concept: the shot planner already produces per-beat visual prompts. The improvement is ensuring the **duration** of each beat is `total_tts_duration / num_beats` rather than a fixed default, so visuals pace to the actual narration length.

### 1c. Combine recipe (optional, only if needed)

**File:** `scripts/render-worker.ts`

MoneyPrinterV2's combine recipe: TTS on top, background music ducked to 0.1 volume, subtitles centered. clipped's render worker already does per-beat compositing with ffmpeg. Only port if the current output has issues with audio layering — otherwise skip.

## Phase 2: Auto-pilot scheduling (the real gap)

### The problem

`lib/engine/auto-pilot.ts` `executePipeline()`:
- Computes `nextRun` from a cron expression or keyword
- Synthesizes content (LLM or deterministic)
- Triggers one video generation
- Returns a response with `status: 'active'`

**But it never persists the pipeline.** There's no `auto_pipelines` table, no scheduler, no recurring execution. The `nextRun` is computed and discarded. A user configures a daily pipeline and... nothing happens.

### What needs to be built

**1. `auto_pipelines` table** (new migration)

```sql
CREATE TABLE auto_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name TEXT NOT NULL,
  niche TEXT NOT NULL,
  schedule TEXT NOT NULL,           -- cron expression or keyword
  next_run TIMESTAMPTZ,
  source_strategy TEXT DEFAULT 'trending-rss',
  visual_pipeline TEXT DEFAULT 'ai-videos',
  target_platforms JSONB DEFAULT '["youtube"]',
  voice TEXT DEFAULT 'alloy',
  visual_style TEXT,
  aspect_ratio TEXT DEFAULT '9:16',
  auto_publish BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**2. Persist the pipeline** — `executePipeline()` inserts into `auto_pipelines` and returns the `pipelineId`.

**3. Scheduler** — a new API route or worker that:
- Runs every minute (or every 5 minutes)
- Finds pipelines where `is_active = true` AND `next_run <= now()`
- For each due pipeline: synthesize content → generate video → render → publish (if `auto_publish`)
- Updates `next_run`, `last_run`, `last_status`

**4. Connect to existing publishers** — the scheduler uses `lib/publishing/youtube.ts`, `tiktok.ts`, `instagram.ts` for actual publishing. These already exist and work.

### Scheduler implementation options

| Option | Pros | Cons |
|---|---|---|
| **Next.js API route + Vercel Cron** | Simple, no extra infra | Vercel Cron is 1-min granularity, needs Vercel |
| **PM2 worker** (alongside render-worker) | Already have PM2, runs locally | Only runs when the server is on |
| **Supabase pg_cron** | DB-native, no extra service | Needs pg_cron extension, tied to Supabase |

Leaning: **PM2 worker** — it matches the existing architecture (render-worker + publish-worker already run under PM2), no new dependencies, and runs on the user's machine where the render worker already runs.

### Files for Phase 2

**New:**
- `supabase/migrations/20260929_create_auto_pipelines.sql`
- `lib/engine/auto-pilot-scheduler.ts` — the scheduler loop
- `app/api/workflows/auto-pipelines/route.ts` — CRUD for pipelines (list, create, pause, resume, delete)

**Modified:**
- `lib/engine/auto-pilot.ts` — persist pipeline to DB, return `pipelineId`
- `ecosystem.config.js` — add the scheduler as a PM2 service

## What this does NOT do

- **No Selenium.** clipped's YouTube publisher uses the Data API v3, which is better.
- **No Python.** Everything stays in TypeScript/Next.js.
- **No KittenTTS.** clipped's TTS (Edge TTS + ElevenLabs) is sufficient. KittenTTS is Python-only and would need a sidecar.
- **No Twitter bot.** Out of scope. clipped focuses on YouTube/TikTok/Instagram.
- **No affiliate marketing / cold outreach.** Out of scope.

## Acceptance criteria

**Phase 1:**
- `T26-PROMPT-01` — `buildAIVideoPrompt` includes the "get straight to the point" constraint.
- `T26-PROMPT-02` — `buildAIVideoPrompt` includes the sentence limit constraint.
- `T26-PACE-01` — shot planner beat durations are `total_tts / num_beats`, not fixed.

**Phase 2:**
- `T26-SCHED-01` — `executePipeline()` persists to `auto_pipelines` and returns `pipelineId`.
- `T26-SCHED-02` — the scheduler picks up a due pipeline and executes it.
- `T26-SCHED-03` — after execution, `next_run` is advanced and `last_run`/`last_status` are updated.
- `T26-SCHED-04` — a pipeline with `auto_publish = true` publishes to the target platforms after rendering.
- `T26-SCHED-05` — a pipeline with `is_active = false` is never picked up by the scheduler.
- `T26-SCHED-06` — the scheduler runs as a PM2 service alongside the existing workers.

## Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **YouTube API quota.** 1,600 units/upload, 10,000 units/day = ~6 videos/day max. | High | The rate limiter already exists. The scheduler should check quota before uploading and skip if exhausted. |
| **The scheduler and render worker compete for resources.** | Med | The scheduler only creates jobs; the render worker does the heavy lifting. They already coexist under PM2. |
| **Auto-pilot video generation fails (no API key).** | Med | The existing dry-run fallback handles this. The scheduler should mark `last_status: 'failed'` and continue. |
| **Pre-existing red in the tree.** | Low | `pnpm typecheck` fails on 6 errors in `scripts/render-worker.ts`. Not caused by this plan. |

## Open questions

1. **Scheduler: PM2 worker or Supabase pg_cron?** Leaning PM2 (matches existing architecture). Confirm.
2. **Should the scheduler publish immediately or just create render jobs?** MoneyPrinterV2 publishes immediately. But clipped's render worker is async — the video doesn't exist until rendering completes. So the scheduler should create render jobs, and publishing happens after rendering (via the existing publish worker or a post-render hook).
3. **Phase 1c (combine recipe)** — port only if the current render output has audio layering issues, or skip entirely?
