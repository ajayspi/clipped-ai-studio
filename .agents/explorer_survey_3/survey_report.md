# Clipped AI Studio — Database, Queries, and Seeder Architecture Survey Report

**Explorer**: `explorer_survey_3`  
**Date**: 2026-09-01  
**Project Workspace**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`  
**Target Goal**: Comprehensive analysis of Supabase database schemas, query contracts (Library & Planner), scripts environment, and complete architectural design for standalone seeder script (`scripts/seed.ts`).

---

## 1. Supabase Database Schema & Setup

### 1.1 Supabase Configuration & Environment
- **Remote Supabase Project URL**: `https://agafustlankeieewtvck.supabase.co` (defined in `.env.local`)
- **Key Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase REST endpoint
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Anon Key (for browser/SSR client operations)
  - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (bypasses Row Level Security for admin operations and seeding)
- **Supabase Clients in Codebase**:
  1. `lib/db.ts`: Standard client initialized with `createClient(supabaseUrl, supabaseAnonKey)`. Used by server components, client components, and API routes.
  2. `lib/supabase/client.ts`: `@supabase/ssr` `createBrowserClient` for browser-side auth sessions.
  3. `lib/supabase/server.ts`: `@supabase/ssr` `createServerClient` for server components reading `cookies()`.
  4. `lib/supabase/middleware.ts`: Route protection for `/dashboard`, `/create`, `/planner`, `/library`, `/settings`.

---

### 1.2 Database Tables & Schema Definitions

Based on `schema.sql`, `supabase/migrations/20260831_create_scheduled_posts.sql`, and `supabase-rls-setup.sql`:

#### 1. `users` Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    tier TEXT DEFAULT 'free',
    niches TEXT[],
    storage_preference TEXT DEFAULT 'cloud',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### 2. `videos` Table
```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    script TEXT,
    workflow TEXT DEFAULT 'standard', -- e.g. 'footage', 'ai-videos', 'micro-drama', 'stories', 'bulk-plan'
    status TEXT DEFAULT 'draft',      -- 'draft', 'processing', 'completed'
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### 3. `render_jobs` Table
```sql
CREATE TABLE render_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE, -- nullable for direct jobs
    status TEXT DEFAULT 'pending',                         -- 'pending', 'processing', 'completed', 'failed'
    progress INTEGER DEFAULT 0,                            -- 0 to 100
    error_message TEXT,
    logs TEXT,                                             -- JSON string holding rich metadata, clip list, thumbnail, etc.
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### 4. `scheduled_posts` Table (Planner)
```sql
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES render_jobs(id) ON DELETE CASCADE,
    platforms JSONB NOT NULL DEFAULT '[]'::jsonb,           -- e.g. ["youtube", "tiktok", "instagram"]
    caption TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',                   -- 'pending', 'published', 'failed', 'publishing'
    result_urls JSONB DEFAULT '{}'::jsonb,                  -- e.g. {"youtube": "https://..."}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_time ON scheduled_posts(status, scheduled_for);
```

#### 5. `api_credits`, `published_videos`, `settings` Tables
- `api_credits`: user quotas and usage tracking.
- `published_videos`: historical publish logs.
- `settings`: API keys (`provider`, `api_key`, `is_active`, `priority`).

---

## 2. Query Contracts Analysis

### 2.1 Library View Query Contract (`app/(app)/library/page.tsx`)
1. **Primary Query**:
   ```ts
   const { data: videos } = await supabase
     .from('videos')
     .select(`
       *,
       render_jobs (*)
     `)
     .order('created_at', { ascending: false });
   ```
2. **Fallback Query for Direct Jobs**:
   ```ts
   const { data: directJobs } = await supabase
     .from('render_jobs')
     .select('*')
     .is('video_id', null)
     .order('created_at', { ascending: false });
   ```
3. **Data Parsing & Transformation Contract**:
   - `job`: `videoRecord.render_jobs[videoRecord.render_jobs.length - 1]`
   - `parsedLogs`: `typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs`
   - `thumbnail`: `parsedLogs?.videos?.[0]?.video?.thumbnail || parsedLogs?.videos?.[0]?.thumbnail || parsedLogs?.videos?.[0]?.previewUrl`
   - `status`: `job ? job.status : videoRecord.status`
   - `title`: `videoRecord.title || parsedLogs?.subject || 'Video ' + videoRecord.id.slice(0, 8)`
   - `clipCount`: `parsedLogs?.videos?.length || 0`
   - `workflowType`: `videoRecord.workflow || parsedLogs?.workflowType || "Footage"`
   - `created_at`: `videoRecord.created_at`
4. **Card Component (`components/dashboard/DashboardCard.tsx`)**:
   - Expects `video.thumbnail` (renders `<img>` with hover zoom if present, else fallback `Video` icon).
   - Displays `workflowType` badge in top-left corner.
   - If `status === 'pending' || status === 'processing'`, displays spinning `Loader2` and progress bar.
   - If `status === 'completed'`, displays hover play button and action buttons (Download HD, Share/Publish, Delete).

---

### 2.2 Planner View Query Contract (`app/(app)/planner/page.tsx`)
1. **Primary Query**:
   ```ts
   const { data: scheduled } = await supabase
     .from('scheduled_posts')
     .select('*, render_jobs(logs)')
     .order('scheduled_for', { ascending: true });
   ```
2. **Calendar View Filtering Contract**:
   - Calculates 7-day week array starting from `today = new Date()`:
     `weekDays = Array.from({ length: 7 }).map((_, i) => addDays(today, i))`
   - Groups posts by date matching `isSameDay(new Date(post.scheduled_for), day)`.
3. **Card Rendering Contract**:
   - Time: `format(new Date(post.scheduled_for), 'h:mm a')`
   - Status:
     - `post.status === 'published'` -> Green `CheckCircle2`
     - `post.status === 'failed'` -> Red `XCircle`
     - `post.status === 'pending'` -> Muted `Clock`
   - Title / Subject: `post.caption || parsed.subject || 'Untitled Video'`
   - Platforms: Iterates through `post.platforms` array (e.g. `youtube`, `tiktok`, `instagram`) and renders badges.

---

## 3. Existing Scripts & Execution Infrastructure

- `package.json`:
  - Contains `"tsx": "^4.23.13"`, `"dotenv": "^17.4.2"`, `"@supabase/supabase-js": "^2.112.4"`.
  - Existing scripts: `npm run worker:render` (`tsx scripts/render-worker.ts`), `npm run worker:publish` (`tsx scripts/publish-worker.ts`).
  - Running TypeScript scripts via `npx tsx <path>` or `pnpm tsx <path>` works seamlessly without compiling.
- Prior Prototypes:
  - `seed_videos.js`: Basic prototype inserting 4 draft videos; lacked completed jobs, thumbnail images, structured logs JSON, and `scheduled_posts`.
  - `create_user.js`: Admin user creator creating `admin@prostudio.com` via `supabase.auth.admin.createUser`.

---

## 4. Standalone Seeder Script Design (`scripts/seed.ts`)

### 4.1 Key Architecture Requirements
1. **Authentication & Service Role**:
   - Load environment variables from `.env.local` or `.env` using `dotenv`.
   - Initialize Supabase client with `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS and perform administrative inserts.
2. **User Management**:
   - Query existing user in `users` table or `auth.admin.listUsers()`.
   - If not present, create admin user `admin@prostudio.com` (UUID: `00000000-0000-0000-0000-000000000001` or generated) in `public.users` table so foreign key `videos.user_id` is satisfied.
3. **Library Mock Data (At least 5 Records)**:
   - Provide 6 distinct, rich video records across all major studio workflows:
     1. **"The Roman Colosseum: Engineering Marvels"** (`workflow: 'footage'`) — 4 clips, 42s, HD Unsplash architecture thumbnail, status `'completed'`.
     2. **"Cyberpunk 2099: Neo-Tokyo Underground"** (`workflow: 'ai-videos'`) — Kling synthetic video, neon cyberpunk thumbnail, 28s, status `'completed'`.
     3. **"Whispers in the Mist: The Vanishing Lighthouse"** (`workflow: 'micro-drama'`) — Cinematic thriller mini-series, moody atmospheric thumbnail, 55s, status `'completed'`.
     4. **"3 Mind-Blowing Facts About Deep Ocean Creatures"** (`workflow: 'stories'`) — Multi-part viral facts short, glowing bioluminescence thumbnail, 35s, status `'completed'`.
     5. **"Morning Power Protein Smoothie in 60s"** (`workflow: 'bulk-plan'`) — Batch food/fitness short, vibrant culinary thumbnail, 24s, status `'completed'`.
     6. **"Space Exploration 2050: Colonizing Mars"** (`workflow: 'footage'`) — Cinematic space visuals, Mars rover thumbnail, 38s, status `'processing'`.
   - For each record:
     - Insert into `videos` table (`user_id`, `title`, `script`, `workflow`, `status`).
     - Insert into `render_jobs` table (`video_id`, `status`, `progress: 100`, `logs: JSON.stringify({...})`).
     - Structure `logs` with `subject`, `workflowType`, `finalVideoUrl`, `duration`, `videos` array with `thumbnail`, `previewUrl`, `title`, `platform`, `analysis`, and `beats`.
4. **Planner Mock Data (At least 5 Records)**:
   - Schedule posts distributed over the next 7 days from `new Date()` (Today, Day +1, Day +2, Day +3, Day +4, Day +5, Day +6).
   - Link each scheduled post to the corresponding `render_jobs.id`.
   - Diverse platforms: `["youtube", "tiktok", "instagram"]`, `["youtube"]`, `["tiktok"]`, `["instagram"]`.
   - Diverse statuses: `'pending'`, `'published'`, `'pending'`.
   - Realistic captions with emojis and hashtags (e.g. `"Unveiling the ancient secrets of the Roman Colosseum 🏛️✨ #history #romanempire #shorts #clipped"`).
5. **NPM Script Hook**:
   - Add `"seed": "tsx scripts/seed.ts"` to `package.json` for easy execution (`npm run seed` / `pnpm seed`).

---

## 5. Summary Matrix of Seeder Mock Records

| # | Title | Workflow | Status | Thumbnail / Visual Theme | Planned Schedule | Platforms |
|---|---|---|---|---|---|---|
| 1 | The Roman Colosseum: Engineering Marvels | Footage | completed | Ancient Colosseum at sunset | Today @ 2:30 PM | YouTube, TikTok, Instagram |
| 2 | Cyberpunk 2099: Neo-Tokyo Underground | AI Videos | completed | Neon-lit rain drenched alleyway | Tomorrow @ 11:00 AM | YouTube, TikTok |
| 3 | Whispers in the Mist: The Vanishing Lighthouse | Micro-Drama | completed | Moody oceanic lighthouse in fog | In 2 Days @ 6:00 PM | Instagram, TikTok |
| 4 | 3 Mind-Blowing Facts About Deep Ocean Creatures | Stories | completed | Bioluminescent deep sea jellyfish | In 3 Days @ 1:15 PM | YouTube, TikTok, Instagram |
| 5 | Morning Power Protein Smoothie in 60s | Bulk Plan | completed | Fresh berries and smoothie bowl | In 4 Days @ 8:45 AM | Instagram |
| 6 | Space Exploration 2050: Colonizing Mars | Footage | processing | Futuristic Mars habitat concept | In 5 Days @ 5:00 PM | YouTube |
