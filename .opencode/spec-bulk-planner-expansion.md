# Spec: Bulk Planner reorder + feature expansion

Status: DRAFT — awaiting sign-off. No code written yet.
Date: 2026-09-28 (updated 2026-09-29)
Slug: bulk-planner-expansion
File: `.opencode/spec-bulk-planner-expansion.md`

---

## 1. Goal

Three things:

1. **Reorder the sidebar** so Bulk Planner sits at position 2 (right after Create AI Video).
2. **Expand the bulk planner** (`/create/bulk`) with six features that make a generated plan actually usable.
3. **Connect the generator to the calendar** (`/planner`) so a pushed plan shows up as scheduled posts.

The core problem this solves: the bulk planner generates a plan but **can't do anything with it**. The "Push All to Render Engine" and "Edit Sub-Second Script" buttons are dead — no `onClick` handlers. A user generates a 30-day plan and then has to manually recreate it elsewhere.

**Save plans storage decision: Supabase** (not localStorage). Plans persist across devices and survive browser clears.

## 2. Non-goals

- **No new rendering pipeline.** Pushing to the render queue uses the existing `claim_render_job` → `render-worker` → ffmpeg path. We create jobs; we don't change how they render.
- **No per-user auth on saved plans.** The app's RLS policies use `USING (true)` (all rows accessible). Saved plans are keyed by a client-generated `planId`, not a user ID. This matches the existing `scheduled_posts` pattern.
- **No AI re-generation.** "Multiple hook variants" means the LLM returns 2-3 hooks per day in one call, not 2-3 separate calls.
- **No platform-specific publishing.** Pushing to TikTok/YouTube is out of scope. We create scheduled posts; actual publishing is a separate workflow.
- **No changes to the render worker, ffmpeg pipeline, or Remotion.**

## 3. What exists today

| Component | Location | Status |
|---|---|---|
| Sidebar | `components/sidebar.tsx:32-41` | 7 nav items. Bulk Planner is #3, Library is #6. |
| Bulk planner page | `app/(app)/create/bulk/page.tsx` | Form → POST → renders day cards. **Two dead buttons.** |
| Bulk planner API | `app/api/workflows/bulk-plan/route.ts` | Works. Returns `{ success, plan }`. |
| Bulk planner engine | `lib/engine/bulk-planner.ts` | Works. LLM or dry-run. Returns items with one hook each. |
| **Push pusher** | `lib/engine/bulk-plan-pusher.ts` | **Already exists.** Creates render jobs (`orchestration_state: 'queued'`, with beats) + `scheduled_posts` rows. |
| **Push API route** | `app/api/workflows/bulk-plan/push/route.ts` | **Already exists.** POST `{ items, planTitle }` → calls pusher. |
| Calendar page | `app/(app)/planner/page.tsx` | 7-day week view. Reads `scheduled_posts`. |
| Schedule modal | `components/planner/ScheduleModal.tsx` | Exists but receives `jobs={}` (empty). |
| Types | `lib/engine/types.ts` | `BulkPlanRequest`, `BulkPlanResponse`, `BulkPlanItem`. |
| DB schema | `schema.sql` + `supabase/migrations/` | Tables: users, videos, render_jobs, api_credits, published_videos, settings, scheduled_posts. **No saved_plans table.** |

**Key finding:** the push backend (pusher + route) already exists and is correct. What's missing is the **frontend wiring** (dead buttons) and the **save-plans table**.

## 4. Affected files

**Modified (4):**
- `components/sidebar.tsx` — reorder nav items
- `app/(app)/create/bulk/page.tsx` — wire dead buttons, add 6 features
- `lib/engine/bulk-planner.ts` — return multiple hook variants per item
- `lib/engine/types.ts` — extend `BulkPlanItem` with `hookVariants`

**New (3):**
- `supabase/migrations/20260929_create_saved_bulk_plans.sql` — new table
- `app/api/workflows/bulk-plan/save/route.ts` — POST: save a plan; GET: list saved plans
- `lib/engine/saved-plans.ts` — shared save/list/delete logic

**Already exists (no change needed):**
- `lib/engine/bulk-plan-pusher.ts` — push logic is done
- `app/api/workflows/bulk-plan/push/route.ts` — push endpoint is done

## 5. Expected behavior

### Sidebar reorder

New order:
1. Dashboard
2. **Bulk Planner** ← moved here
3. Create AI Video
4. Newsroom
5. Render Queue
6. Library
7. Settings

### Feature 1: Working "Push to Render Queue"

The backend exists. This feature is **frontend wiring only**:

1. User clicks "Push All to Render Engine"
2. Frontend POSTs `{ items, planTitle }` to `/api/workflows/bulk-plan/push`
3. Backend (already built) creates render jobs + scheduled posts
4. Frontend shows success state with count + link to queue

### Feature 2: Script/hook editing

Each day card's "Edit Sub-Second Script" button opens an inline editor (textarea) pre-filled with the current hook + script. Edits are local state. When pushed, the **edited** versions are sent.

### Feature 3: Save plans to Supabase

New table `saved_bulk_plans`:

```sql
CREATE TABLE saved_bulk_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL,           -- client-generated, e.g. "plan-<timestamp>"
  plan_title TEXT NOT NULL,
  niche TEXT,
  items JSONB NOT NULL,            -- the full BulkPlanItem array
  metadata JSONB,                  -- cadence, platforms, visualStyle, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

- **Save:** POST `/api/workflows/bulk-plan/save` with `{ planId, planTitle, niche, items, metadata }`
- **List:** GET `/api/workflows/bulk-plan/save` → returns all saved plans (newest first)
- **Load:** GET `/api/workflows/bulk-plan/save?planId=...` → returns one plan
- **Delete:** DELETE `/api/workflows/bulk-plan/save?planId=...`

The "Save Plan" button writes to this table. A "Saved Plans" section (on the bulk planner page or the library) lists saved plans and lets the user load or delete them.

### Feature 4: Export (CSV/JSON/clipboard)

Three export buttons on the plan results:
- **CSV** — one row per day: day, date, platform, title, hook, script, tags
- **JSON** — the raw plan object
- **Clipboard** — formatted text

### Feature 5: Calendar integration

**Already works.** The pusher creates `scheduled_posts` rows, and the calendar reads that table. After pushing, posts appear on `/planner`. The only addition: a small badge or visual indicator showing the post came from a bulk plan (the `render_jobs.logs` JSON has `workflowType: 'bulk-plan'`).

### Feature 6: Multiple hook variants per day

The bulk planner engine returns one hook per item today. After this change, the LLM prompt asks for 2-3 hook variants. `BulkPlanItem` gains `hookVariants: string[]`. The UI shows variants as selectable chips; the selected hook is what gets pushed.

## 6. Acceptance criteria

**Sidebar:**
- `T25-ORDER-01` — Bulk Planner is the 2nd nav item in `components/sidebar.tsx`.
- `T25-ORDER-02` — Library is below Bulk Planner.

**Push to queue:**
- `T25-PUSH-01` — the "Push All to Render Engine" button has an `onClick` that calls `/api/workflows/bulk-plan/push`.
- `T25-PUSH-02` — pushing creates render jobs with `orchestration_state: 'queued'` and non-empty `beats` (already guaranteed by the existing pusher).
- `T25-PUSH-03` — pushing creates `scheduled_posts` rows (already guaranteed).

**Script editing:**
- `T25-EDIT-01` — each day card's edit button opens an inline editor.
- `T25-EDIT-02` — edited text is what gets pushed.

**Save plans (Supabase):**
- `T25-SAVE-01` — migration creates `saved_bulk_plans` table.
- `T25-SAVE-02` — "Save Plan" POSTs to `/api/workflows/bulk-plan/save` and the plan appears in the list.
- `T25-SAVE-03` — a saved plan survives a page reload (fetched from Supabase, not localStorage).
- `T25-SAVE-04` — loading a saved plan restores its items into the UI.
- `T25-SAVE-05` — deleting a saved plan removes it from the list.

**Export:**
- `T25-EXPORT-01` — CSV export produces a downloadable file with one row per day.
- `T25-EXPORT-02` — JSON export produces valid JSON.
- `T25-EXPORT-03` — clipboard export writes formatted text.

**Calendar integration:**
- `T25-CAL-01` — after pushing, the calendar shows the scheduled posts.
- `T25-CAL-02` — a pushed post is distinguishable from a manually scheduled post (badge).

**Hook variants:**
- `T25-HOOK-01` — `BulkPlanItem` has a `hookVariants` field.
- `T25-HOOK-02` — the engine returns ≥ 2 hook variants when the LLM is available.
- `T25-HOOK-03` — the UI shows variants as selectable chips.
- `T25-HOOK-04` — the selected hook is what gets pushed.

## 7. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **The `saved_bulk_plans` table doesn't exist yet.** | High | Migration is the first implementation step. Tests run after migration. |
| **The empty-concat failure mode.** A render job with `orchestration_state: 'queued'` but no `beats` burns all 3 render attempts. | High | Already handled by the existing pusher (it always writes beats). `T25-PUSH-02` guards it. |
| **The LLM may not return 2-3 hook variants reliably.** | Med | Dry-run fallback generates variants deterministically. UI handles 1 variant gracefully. |
| **The push creates many DB rows at once (30 items).** | Med | The existing pusher loops per-item and continues on failure. No change needed. |
| **Pre-existing red in the tree.** `pnpm typecheck` fails on 6 errors in `scripts/render-worker.ts`. | Low | Not caused by this change. |

## 8. Open questions for implementation

1. **Should saved plans appear on the library page (`/library`) or only on the bulk planner page?** The library shows rendered videos; plans are pre-render. Leaning: show them on the bulk planner page as a "Saved Plans" section, not in the library.
2. **Should the calendar badge be a simple dot/icon or a text label?** Leaving: a small "Bulk" badge.
3. **Should the push button show a progress indicator during the push?** 30 items × 3 inserts each could take a few seconds. Leaning: yes, disable the button and show "Pushing...".

## 9. Relationship to other specs

- **`.opencode/spec-fal-video-model-catalog.md`** — the fal video model catalog. When pushed jobs render, they'll use a video model from that catalog. Not integrated here.
- **`.opencode/spec-stickman-workflow.md`** — the stickman workflow. Unrelated.
