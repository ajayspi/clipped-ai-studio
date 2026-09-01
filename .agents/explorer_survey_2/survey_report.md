# Clipped AI Studio — Dashboard, Library, Planner & Media Architecture Survey Report

**Explorer**: explorer_survey_2  
**Date**: 2026-09-01  
**Scope**: Exploration of `app/(app)/library`, `app/(app)/planner`, `app/(app)/dashboard`, media/image handling, data models, empty vs active states, and database seeding requirements.

---

## Executive Summary

This report presents a thorough structural and functional analysis of the Clipped AI Studio dashboard, specifically detailing:
1. **The Library & Dashboard Video Flow** (`app/(app)/library/page.tsx`, `app/(app)/dashboard/page.tsx`, `components/dashboard/DashboardCard.tsx`, `components/dashboard/PublishModal.tsx`).
2. **The Planner & Content Calendar Flow** (`app/(app)/planner/page.tsx`, `components/planner/ScheduleModal.tsx`, `supabase/migrations/20260831_create_scheduled_posts.sql`, `scripts/publish-worker.ts`).
3. **Image & Media Handling Across the Application** (`public/` assets, thumbnail resolution logic, preview fallbacks, and mock asset requirements for realistic studio rendering).
4. **Data Models and Seeder Blueprint** (`schema.sql`, `seed_videos.js`, `scripts/seed.ts`).

---

## 1. Library & Video Management Architecture

### 1.1 Page Architecture (`app/(app)/library/page.tsx`)
- **Route**: `/library`
- **Rendering Mode**: Server Component (`export const dynamic = 'force-dynamic'`, `export const revalidate = 0`)
- **Database Queries**:
  1. Primary query:
     ```typescript
     supabase
       .from('videos')
       .select(`*, render_jobs (*)`)
       .order('created_at', { ascending: false })
     ```
  2. Legacy / Direct jobs fallback query:
     ```typescript
     supabase
       .from('render_jobs')
       .select('*')
       .is('video_id', null)
       .order('created_at', { ascending: false })
     ```
- **Data Transformation Pipeline**:
  - The page iterates over `videos` and selects the latest associated `render_job` (`videoRecord.render_jobs[videoRecord.render_jobs.length - 1]`).
  - It parses `job.logs` (handles both stringified JSON and pre-parsed JSON objects).
  - Thumbnail resolution order:
    1. `firstClip.thumbnail` where `firstClip = parsedLogs?.videos?.[0]?.video || parsedLogs?.videos?.[0]`
    2. `firstClip.previewUrl`
    3. `null` (falls back to component-level placeholder).
  - Video properties passed to card:
    - `id`: Job ID or Video ID
    - `video_id`: Video ID
    - `title`: `videoRecord.title || parsedLogs?.subject || "Video " + id.slice(0, 8)`
    - `created_at`: Timestamp
    - `status`: `job.status` or `videoRecord.status` (`'pending' | 'processing' | 'completed' | 'failed'`)
    - `thumbnail`: URL string or null
    - `parsedLogs`: Parsed logs object
    - `clipCount`: `parsedLogs?.videos?.length || 0`
    - `workflowType`: `videoRecord.workflow || parsedLogs?.workflowType || "Footage"`

### 1.2 Library Empty State vs Active State
| State | Trigger Condition | Visual & Functional Behavior |
|---|---|---|
| **Empty State** | `allContent.length === 0` | Displays a centered dashed container (`border border-dashed bg-card h-64 p-8 text-center`) with a muted `Video` icon (opacity 20%), a "No videos yet" heading, descriptive copy ("Get started by creating your first AI-generated short-form video in the creation wizard"), and a primary CTA button linking to `/create/footage`. |
| **Active State** | `allContent.length > 0` | Displays a responsive multi-column CSS masonry grid (`columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6`) containing `DashboardCard` components. |

### 1.3 Video Card Component (`components/dashboard/DashboardCard.tsx`)
- **Visual Design**: Vertical 9:16 aspect ratio (`aspect-[9/16]`) card with Framer Motion hover elevation (`y: -4`) and smooth transitions.
- **Top Badge**: Workflow type tag in uppercase with frosted glass background (`bg-black/70 backdrop-blur-md text-[10px] font-bold`).
- **Thumbnail Handling**:
  - If `video.thumbnail` is present: renders `<img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />`.
  - If `video.thumbnail` is null/empty: renders a dark zinc placeholder with `<Video className="w-16 h-16 text-white" />` at 30% opacity.
- **Status Overlay Handling**:
  - If `status === 'pending'` or `status === 'processing'`: renders an animated overlay with `<Loader2 className="animate-spin" />`, an animated progress bar (`w-[45%] animate-pulse`), and text `"Rendering... ~2 mins left"`.
  - If `status === 'completed'`: renders a hover overlay with a centered circular play button (`h-10 w-10 bg-primary text-white hover:scale-110`).
- **Footer & Hover Actions**:
  - Video title (truncated with `line-clamp-1`).
  - Creation date (`toLocaleDateString()`) and clip count (`${video.clipCount} clips`).
  - On hover: reveals HD Download button, Share button (triggers `PublishModal`), and Delete button.

### 1.4 Publishing Modal (`components/dashboard/PublishModal.tsx`)
- Interactive dialog allowing multi-platform social distribution to **YouTube Shorts**, **TikTok**, and **Instagram Reels**.
- Allows custom titles and tag descriptions.
- Posts payload `{ jobId, platforms, title, description }` to `/api/publish`.

---

## 2. Planner & Content Calendar Architecture

### 2.1 Page Architecture (`app/(app)/planner/page.tsx`)
- **Route**: `/planner`
- **Rendering Mode**: Server Component (`force-dynamic`, `revalidate = 0`)
- **Database Query**:
  ```typescript
  supabase
    .from('scheduled_posts')
    .select('*, render_jobs(logs)')
    .order('scheduled_for', { ascending: true })
  ```
- **Calendar Logic**:
  - Generates a 7-day rolling window starting from current local date:
    ```typescript
    const today = new Date();
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(today, i));
    ```
  - For each day in `weekDays`, filters scheduled posts using date-fns `isSameDay(new Date(post.scheduled_for), day)`.

### 2.2 Planner Empty State vs Active State
| State | Trigger Condition | Visual & Functional Behavior |
|---|---|---|
| **Empty State** | `dayPosts.length === 0` for a day column | Each empty day column displays an internal empty state container: `flex-1 flex items-center justify-center text-muted-foreground/30 text-xs text-center p-4` with text `"No posts scheduled"`. If no posts exist across all 7 days, all 7 columns show this empty placeholder. |
| **Active State** | `dayPosts.length > 0` | Populates the day column with post cards showing:<br>• **Time Badge**: `format(new Date(post.scheduled_for), 'h:mm a')` inside an accent badge.<br>• **Status Icon**: `CheckCircle2` (green) for `published`, `XCircle` (red) for `failed`, `Clock` (muted) for `pending`.<br>• **Post Title/Caption**: `post.caption || parsed.subject || 'Untitled Video'`.<br>• **Platform Pills**: Array of platform chips (`youtube`, `tiktok`, `instagram`) with capitalized text. |

### 2.3 Schedule Modal Component (`components/planner/ScheduleModal.tsx`)
- **Trigger**: "Schedule Post" button in the page header with `Plus` icon.
- **Data Fetching on Open**: Queries Supabase for completed jobs:
  ```typescript
  supabase
    .from('render_jobs')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
  ```
- **Form Controls**:
  - **Video Selector**: Dropdown showing subject/title of completed render jobs.
  - **Caption & Hashtags**: Multi-line textarea.
  - **Date & Time Pickers**: Native HTML5 `date` and `time` inputs (defaults date to today, time to "12:00").
  - **Platform Selectors**: Toggle buttons for `youtube`, `tiktok`, `instagram`.
- **Submission**: Inserts into `scheduled_posts`:
  ```typescript
  await supabase.from('scheduled_posts').insert({
    job_id: selectedJob,
    caption,
    platforms,
    scheduled_for: scheduledFor,
    status: 'pending'
  });
  ```

### 2.4 Database Table Schema (`scheduled_posts`)
Defined in `supabase/migrations/20260831_create_scheduled_posts.sql`:
```sql
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES render_jobs(id) ON DELETE CASCADE,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  caption TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  result_urls JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_time ON scheduled_posts(status, scheduled_for);
```

---

## 3. Image & Media Asset Handling Across the Studio

### 3.1 Existing Asset Inventory in `public/`
The repository currently contains the following raster assets:
- `/hero-bg.jpg` (871 KB) — High-res abstract neural nodes background used on landing page.
- `/thumbnail_history.jpg` (841 KB) — 9:16 vertical thumbnail for historical documentary video ("The Fall of Rome").
- `/thumbnail_drama.jpg` (970 KB) — 9:16 vertical thumbnail for cyberpunk drama video ("Neon Nights").
- `/thumbnail_brain.jpg` (855 KB) — 9:16 vertical thumbnail for educational neuroscience video ("How Memory Works").

### 3.2 Thumbnail Resolution Chain in Dashboard/Library
```
render_jobs.logs (JSON string or object)
  └── parsedLogs.videos[0].video.thumbnail
        ├── Found → Render <img> with hover zoom (scale-105)
        └── Not found → parsedLogs.videos[0].previewUrl
              ├── Found → Render <img>
              └── Not found → Fallback <Video className="w-16 h-16 text-white" /> at 30% opacity
```

### 3.3 Media Handling in Other Studio Components
- **Wizard Scenes Step** (`components/wizard/ScenesStep.tsx`):
  - Renders candidate media for each script beat:
    - If URL ends with `.mp4` -> `<video src={...} muted loop autoPlay />`
    - Otherwise -> `<img src={...} />`
    - Fallback: `<Video className="w-6 h-6 text-muted-foreground opacity-50" />`
- **Live Player** (`components/wizard/LivePlayer.tsx`):
  - Uses Remotion Player (`@remotion/player`) with dynamic aspect ratios (`9:16`, `16:9`, `1:1`).
- **Create Hub** (`app/(app)/create/page.tsx`):
  - Uses Lucide icons with colorful background tints for the 8 creation workflows (`/create/footage`, `/create/images`, `/create/ai-videos`, `/create/stories`, `/create/bulk`, `/create/shorts`, `/create/drama`, `/create/auto`).

---

## 4. Current State Analysis & Gap Identification

### 4.1 Why Library & Dashboard Currently Look Empty / Unfinished
1. **Existing Seeder Limitation (`seed_videos.js`)**:
   - `seed_videos.js` inserts records into `videos` with `status: 'processing'` and into `render_jobs` with `status: 'pending'`, `progress: 0`, and **null logs**.
   - As a result:
     - `parsedLogs` is empty.
     - `thumbnail` is null.
     - `status` is pending/processing.
     - Cards display spinning loaders ("Rendering... ~2 mins left") and dark placeholder icons without any visual imagery or completed status.
2. **Planner Seeding Missing**:
   - There is no seed data inserted into `scheduled_posts`.
   - The Planner calendar displays "No posts scheduled" on every single day column.
3. **Asset Utilization**:
   - Existing high-quality thumbnails (`/thumbnail_history.jpg`, `/thumbnail_drama.jpg`, `/thumbnail_brain.jpg`) are referenced in `app/page.tsx` (landing page) but are NOT injected into the Supabase `render_jobs.logs` for the Library.

---

## 5. Specification for Supabase Seeder Script (`scripts/seed.ts`)

To ensure the studio displays a rich, vibrant, and realistic active state, the new seeder script should satisfy the following specification:

### 5.1 Target Tables & Record Hierarchy
1. **`users` Table**:
   - Ensure an active user exists (e.g. `admin@prostudio.com` with ID e.g. `00000000-0000-0000-0000-000000000001` or fetch existing user).
2. **`videos` Table**:
   - Insert at least 6-8 video records covering diverse workflows:
     - "The Fall of Rome: A 60-Second History" (workflow: `footage`)
     - "Neon Nights: Episode 1 - Memory Drive" (workflow: `micro-drama`)
     - "How Memory Works (Neuroscience Explained)" (workflow: `footage`)
     - "Daily Motivation: The 1% Mindset" (workflow: `ai-videos`)
     - "Cyberpunk Chronicles: The Neon Oracle" (workflow: `micro-drama`)
     - "Top 5 Space Mysteries Science Can't Explain" (workflow: `stories`)
     - "SaaS Growth Secrets: 0 to $10k MRR" (workflow: `bulk-plan`)
3. **`render_jobs` Table**:
   - Insert corresponding render jobs linked to `video_id`.
   - Set status primarily to `'completed'` (5-7 jobs) with 1 `'processing'` job to showcase active rendering UI.
   - Supply rich `logs` JSON structured as:
     ```json
     {
       "subject": "The Fall of Rome: A 60-Second History",
       "workflowType": "Footage",
       "duration": 45,
       "burnSubtitles": true,
       "finalVideoUrl": "/renders/sample-rome.mp4",
       "videos": [
         {
           "video": {
             "id": "vid-1",
             "title": "Roman Colosseum Sunset",
             "thumbnail": "/thumbnail_history.jpg",
             "previewUrl": "/thumbnail_history.jpg",
             "platform": "pexels"
           },
           "score": 1,
           "reason": "Top visual match"
         },
         {
           "video": {
             "id": "vid-2",
             "title": "Ancient Architecture Drone",
             "thumbnail": "/thumbnail_history.jpg",
             "platform": "pexels"
           }
         }
       ]
     }
     ```
   - For other videos, use `/thumbnail_drama.jpg`, `/thumbnail_brain.jpg`, and high-quality vertical Unsplash/Pexels URLs (e.g. curated neon cityscape, astronaut/space, fitness/motivation portraits).
4. **`scheduled_posts` Table**:
   - Insert at least 6-8 scheduled post records tied to completed `render_jobs`.
   - Dates must be dynamically computed relative to `new Date()` (today, tomorrow, day+2, day+3, day+4, day+5) so that regardless of when the seed runs, the 7-day grid view in `/planner` displays active scheduled cards.
   - Varying platforms: `['youtube', 'tiktok']`, `['instagram']`, `['youtube', 'tiktok', 'instagram']`.
   - Varying status: mix of `'published'` (for today/past) and `'pending'` (for upcoming).
   - Engaging captions with hashtags (e.g. `"#shorts #history #viral"`, `"#scifi #drama #cyberpunk"`).

---

## 6. Dashboard UI Enhancement & Sidebar Recommendations

To fulfill Requirements R1 & R2 from `ORIGINAL_REQUEST.md`:
1. **Collapsible Glassmorphism Sidebar (`components/sidebar.tsx` & `app/(app)/layout.tsx`)**:
   - Implement expandable / collapsible state (icon-only mode `w-16` vs expanded mode `w-64`).
   - Add glassmorphism CSS styling: `backdrop-blur-xl bg-background/80 border-r border-border/40 shadow-sm`.
   - Add collapse toggle button (e.g., `ChevronLeft` / `ChevronRight` or `PanelLeftClose` / `PanelLeftOpen`).
   - Include active state indicators with vibrant accent gradients and tooltips for icon-only mode.
2. **Dashboard Vibrancy & Icons**:
   - Enhance `components/sidebar.tsx`, `components/dashboard/DashboardCard.tsx`, and page headers with vibrant color badges, glow effects, and icons.
   - At least 5 new icons integrated (e.g. `Sparkles`, `Share2`, `Flame`, `TrendingUp`, `Layers`, `CalendarCheck`).

---

## 7. Conclusion

The architecture of Clipped AI Studio is clean and modular. The blank states in Library and Planner are purely caused by the absence of structured completed records in `render_jobs` (with populated `logs.videos[0].video.thumbnail`) and `scheduled_posts`. By implementing `scripts/seed.ts` according to this report's specifications, both `/library` and `/planner` will immediately render realistic, visually engaging cards and calendar schedules.
