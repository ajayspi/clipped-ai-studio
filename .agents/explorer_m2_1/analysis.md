# Milestone 2 Investigation & Technical Analysis Report
**Target Components**: `app/(app)/dashboard/page.tsx`, `app/(app)/planner/page.tsx`, `app/(app)/queue/page.tsx`  
**Author**: Explorer M2-1  
**Project**: Clipped AI Studio — Frontend Automated Headless Unit Test Suite  
**Date**: 2026-09-17  

---

## 1. Executive Summary

This investigation analyzes the technical structure, data dependencies, runtime behavior, and test harness requirements for three core routes under Milestone 2 of the Clipped Headless Test Suite:
1. `app/(app)/dashboard/page.tsx` is an **async React Server Component (RSC)** querying `render_jobs` and `workspaces` via `@/lib/db`. Testing requires awaiting the page function (`const Page = await DashboardPage(); render(Page);`) to avoid React 19 / RTL child Promise crashes.
2. `app/(app)/planner/page.tsx` is an **async React Server Component (RSC)** querying `scheduled_posts` with `render_jobs(logs)`. It uses `date-fns` v4 (`^4.4.0`), which strictly throws `RangeError: Invalid time value` when `new Date(p.scheduled_for)` is evaluated on null, undefined, or malformed strings at lines 36 and 64. Defensive validation guards are identified and detailed for implementation.
3. `app/(app)/queue/page.tsx` currently **does not exist** in the repository. The queue UI currently lives inline inside `app/(app)/library/page.tsx` (lines 36-80 and 236-262) driven by the `/api/jobs` endpoint (`app/api/jobs/route.ts`). A standalone Client Component route `app/(app)/queue/page.tsx` and accompanying unit test `test/pages/core/queue.test.tsx` must be constructed.

---

## 2. Detailed Technical Breakdown

### 2.1 `app/(app)/dashboard/page.tsx`

#### Component Architecture
- **Type**: Async React Server Component (RSC).
- **Directives**:
  - `export const dynamic = 'force-dynamic'` (line 5)
  - `export const revalidate = 0` (line 6)
  - `export default async function DashboardPage()` (line 8)
- **No `'use client'` directive**. This component executes purely on the server in production Next.js.

#### Data Fetching & Database Queries
- Imports `supabase` from `@/lib/db` (line 2).
- Executes two sequential queries:
  1. `render_jobs` query (lines 9-13):
     ```ts
     const { data: jobs } = await supabase
       .from('render_jobs')
       .select('*')
       .order('created_at', { ascending: false })
       .limit(20)
     ```
  2. `workspaces` query (lines 16-19):
     ```ts
     const { data: dbWorkspaces } = await supabase
       .from('workspaces')
       .select('*')
       .order('created_at', { ascending: true })
     ```
- Tables queried:
  - `render_jobs`
  - `workspaces`
- Mapping & parsing logic (lines 28-45):
  - Iterates over `jobs || []`.
  - Safely handles `job.logs`: if string, executes `JSON.parse(job.logs)` wrapped in a `try...catch` block.
  - Resolves thumbnail from `firstClip?.thumbnail || firstClip?.previewUrl || null`.
  - Defaults `title` to `parsed?.subject || 'Job ' + job.id.slice(0, 8)`.
  - Defaults `workflowType` to `parsed?.workflowType || 'Footage'`.

#### Sub-components & Client Trees Mounted
- `Sparkles`, `Folder`, `Video` from `lucide-react`.
- `<DashboardCard key={video.id} video={video} workspaces={workspaces} />` (imported from `@/components/dashboard/DashboardCard`):
  - `DashboardCard` is a `'use client'` component.
  - Mounts `framer-motion` (`motion.div`, `AnimatePresence`).
  - Mounts `PublishModal` (`components/dashboard/PublishModal.tsx`), which remains closed initially (`isOpen={false}`).
  - Mounts HTML `<video>` elements conditionally on play toggle, and `<img>` when thumbnail is present.
  - Mounts quick action buttons: "Export", "Publish", "Move to Workspace".

#### Render States
1. **Empty State (`videos.length === 0`)**:
   - Renders container: `flex h-64 items-center justify-center rounded-xl border border-dashed bg-card text-center p-8`.
   - Displays icon: `<Video className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />`.
   - Displays header: `No videos yet`.
   - Displays description: `Get started by creating your first AI-generated short-form video in the creation wizard.`.
   - Displays action link: `<a href="/create/footage">Create New Video</a>`.
   - Header banner displays: `Studio Dashboard` and `Manage, view, and publish your rendered short-form videos.`.
   - Quick action link displays: `View Workspaces` (`/library`).
2. **Populated State (`videos.length > 0`)**:
   - Renders column masonry grid: `columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6`.
   - Mounts a `<DashboardCard>` for each item with title, badges, clip counts, and actions.

#### Headless Vitest / React Testing Library Pattern
- **Async RSC Resolution Requirement**:
  Passing `<DashboardPage />` directly to RTL's `render()` causes Vitest to fail with:
  `Objects are not valid as a React child (found: [object Promise]).`
  Therefore, the page must be invoked as an async function first, and the resolved JSX rendered:
  ```tsx
  const element = await DashboardPage();
  render(element);
  ```
- **Harness Integration**:
  - `test/setup.ts` already mocks `@/lib/db` returning a chainable query builder that resolves `.from('render_jobs').select('*').order(...).limit(...)` to `{ data: [], error: null, count: 0, status: 200 }`.
  - For empty state verification, calling `await DashboardPage()` requires zero setup and renders the empty state out of the box.
  - For populated state verification, `vi.spyOn(supabase, 'from')` can be used to inject mock jobs and workspaces.

---

### 2.2 `app/(app)/planner/page.tsx`

#### Component Architecture
- **Type**: Async React Server Component (RSC).
- **Directives**:
  - `export const dynamic = "force-dynamic"` (line 6)
  - `export const revalidate = 0` (line 7)
  - `export default async function PlannerPage()` (line 9)
- **No `'use client'` directive**.

#### Data Fetching & Database Queries
- Imports `supabase` from `@/lib/db` (line 2).
- Executes query (lines 11-14):
  ```ts
  const { data: scheduled } = await supabase
    .from('scheduled_posts')
    .select('*, render_jobs(logs)')
    .order('scheduled_for', { ascending: true });
  ```
- Table queried: `scheduled_posts` with foreign relation `render_jobs(logs)`.

#### Date Calculation & date-fns v4 Crash Analysis
- Imports from `date-fns`: `format`, `addDays`, `startOfWeek`, `isSameDay` (line 4).
- `package.json` specifies `"date-fns": "^4.4.0"`.
- `date-fns` v4 introduced strict type and runtime argument validation:
  Passing an `Invalid Date` object (e.g. `new Date(undefined)` or `new Date("invalid")`) to `isSameDay` or `format` throws an immediate `RangeError: Invalid time value`.

##### Crash Point 1: Post Filtering (Line 36)
```ts
const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_for), day));
```
- When `p.scheduled_for` is `undefined`, `""`, or a non-date string, `new Date(p.scheduled_for)` produces `Invalid Date`.
- `isSameDay(new Date(p.scheduled_for), day)` throws:
  `RangeError: Invalid time value`
  This halts execution and crashes the server component.

##### Crash Point 2: Time Formatting (Line 64)
```ts
<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
  {format(new Date(post.scheduled_for), 'h:mm a')}
</span>
```
- If an invalid post bypassed filtering or if `post.scheduled_for` is invalid, `format(...)` throws `RangeError: Invalid time value`.

#### Defensive Safeguards & Fix Proposal (Scheduled for Milestone 4, Feature 24)
To make `app/(app)/planner/page.tsx` resilient against any mock or live data anomalies:
```tsx
// Helper to validate date values safely before passing to date-fns
function isValidDate(d: any): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

// Line 36 replacement:
const dayPosts = posts.filter((p) => {
  if (!p?.scheduled_for) return false;
  const d = new Date(p.scheduled_for);
  return isValidDate(d) && isSameDay(d, day);
});

// Line 64 replacement:
const postDate = post.scheduled_for ? new Date(post.scheduled_for) : null;
const formattedTime = isValidDate(postDate) ? format(postDate, 'h:mm a') : 'Time TBD';
```

#### Sub-components Mounted
- `Calendar`, `Plus`, `Play`, `Clock`, `CheckCircle2`, `XCircle` from `lucide-react`.
- `<ScheduleModal jobs={[]} />` (imported from `@/components/planner/ScheduleModal`).
  - `ScheduleModal` is a `'use client'` component.
  - Initially renders a button: `<Plus className="w-4 h-4" /> Schedule Post`.
  - Its modal dialog remains unmounted (`isOpen = false`) until clicked.

#### Headless Vitest / RTL Testing Strategy
- Await the RSC:
  ```tsx
  const element = await PlannerPage();
  render(element);
  ```
- Verify:
  - Header: `Content Calendar`
  - Subtitle: `Schedule and automate your AI video distribution.`
  - Button: `Schedule Post`
  - 7 day columns rendered (`format(day, 'EEE')` and `format(day, 'd')`).
  - Empty state text: `No posts scheduled` across columns when mock database returns `[]`.
  - Populated state: mock `scheduled_posts` with `scheduled_for` set to today's date (`new Date().toISOString()`), verifying post title/caption, platform badges, and time chip render cleanly.

---

### 2.3 `app/(app)/queue/page.tsx` & Standalone Queue Route

#### Codebase Status
- **File Exists**: **NO**.
  A search across the workspace confirms `app/(app)/queue` does not exist.
- **Current Location of Queue UI**:
  - `QueueCard` is currently defined locally inside `app/(app)/library/page.tsx` (lines 36-80).
  - The live queue panel in `app/(app)/library/page.tsx` (lines 236-262) conditionally displays:
    ```tsx
    {(queuedJobs.length > 0 || failedJobs.length > 0) && (
      <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
        ...
        <span className="text-sm font-semibold">Rendering Queue</span>
        ...
        {[...queuedJobs, ...failedJobs].map((job) => (
          <QueueCard key={job.id} job={job} />
        ))}
      </div>
    )}
    ```
- **Backend API Source**:
  - `app/api/jobs/route.ts` provides `GET /api/jobs`.
  - Supports query filters: `?status=pending`, `limit=50`.
  - Separates jobs into:
    - `queued`: status in `['pending', 'generating_plan', 'processing']`
    - `completed`: status `=== 'completed'`
    - `failed`: status `=== 'failed'`
    - `counts`: `{ total, queued, completed, failed }`
  - `test/setup.ts` (lines 414-419) already mocks this endpoint:
    ```ts
    if (url.includes('/api/jobs')) {
      return new Response(JSON.stringify({ success: true, completed: [], queued: [], failed: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    ```

#### Recommended Standalone Route Architecture (`app/(app)/queue/page.tsx`)
1. **Client Component (`'use client'`)**:
   - A queue page is dynamic, state-driven, and benefits from auto-polling (e.g. 5s-8s intervals) and tab filtering (`All`, `Active`, `Completed`, `Failed`).
   - Using a Client Component allows direct consumption of `/api/jobs` (which is already globally intercepted in `test/setup.ts`).
2. **Modular `QueueCard`**:
   - `QueueCard` can either be placed in `components/dashboard/queue-card.tsx` (or `components/queue/QueueCard.tsx`) and shared with `library/page.tsx`, or co-located directly within the new `app/(app)/queue/page.tsx`.
3. **Key Features of the Standalone Queue Page**:
   - Page Header: Title `Render Queue`, subtitle `Monitor real-time status of video generation jobs.`, Refresh button.
   - Status Summary Stat Cards:
     - Active / Rendering (`queued.length`)
     - Completed (`completed.length`)
     - Failed (`failed.length`)
   - Filter Tabs: `All`, `Active`, `Completed`, `Failed`.
   - Empty State: When no jobs are in queue, displays an informative placeholder card with an icon and `Create New Video` button linking to `/create`.
   - Populated State: Grid/List rendering `QueueCard` items with live status badges, progress bars, thumbnail preview, workflow badges, and error messages for failed jobs.

#### Headless Vitest / RTL Testing Pattern (`test/pages/core/queue.test.tsx`)
- Since `QueuePage` will be a Client Component:
  ```tsx
  render(<QueuePage />);
  ```
- Intercepting `/api/jobs` via `globalThis.fetch`:
  - **Test Case 1: Empty Queue**:
    Default setup mock returns `{ success: true, completed: [], queued: [], failed: [] }`.
    Assert page mounts cleanly, shows `Render Queue` title, stats show `0`, and empty state message `No jobs currently in queue` is displayed.
  - **Test Case 2: Populated Active & Failed Queue**:
    Mock `/api/jobs` returning sample jobs:
    ```ts
    const mockQueued = [
      {
        id: 'job-1',
        title: 'Cyberpunk Teaser',
        workflow_type: 'AI Video',
        status: 'processing',
        progress: 45,
        thumbnail: '/images/workflows/ai_videos_cover.jpg',
      },
    ];
    ```
    Assert job title `Cyberpunk Teaser` is displayed, status badge `Rendering` is present, and progress indicator is mounted.
  - **Test Case 3: Filter Tab Interaction**:
    Click tab buttons (`Active`, `Completed`, `Failed`) to ensure client state updates without unhandled exceptions.

---

## 3. Test Harness Strategy for Milestone 2

### Directory & File Structure
```
test/
└── pages/
    └── core/
        ├── dashboard.test.tsx  (Milestone 2 - Feature 4)
        ├── settings.test.tsx   (Milestone 2 - Feature 5)
        ├── library.test.tsx    (Milestone 2 - Feature 6)
        ├── queue.test.tsx      (Milestone 2 - Feature 7)
        ├── planner.test.tsx    (Milestone 2 - Feature 8)
        └── auth.test.tsx       (Milestone 2 - Features 9 & 10)
```

### Execution Model Comparison
| Route | Component Kind | Invocation in Test | Primary Mocks Required |
|---|---|---|---|
| `dashboard/page.tsx` | Async RSC | `const page = await DashboardPage(); render(page);` | `@/lib/db` (`render_jobs`, `workspaces`) |
| `planner/page.tsx` | Async RSC | `const page = await PlannerPage(); render(page);` | `@/lib/db` (`scheduled_posts`, `render_jobs`) |
| `queue/page.tsx` | Client Component | `render(<QueuePage />);` | `fetch('/api/jobs')` |
| `settings/page.tsx` | Client Component | `render(<SettingsPage />);` | `SupabaseProvider`, `useSupabase`, `window.Audio`, `fetch('/api/settings/keys')` |
| `library/page.tsx` | Client Component | `render(<LibraryPage />);` | `fetch('/api/jobs')`, `fetch('/api/workspaces')` |
| `login/page.tsx` | Client Component | `render(<LoginPage />);` | `createClient().auth.signInWithPassword`, `next/navigation` |
| `register/page.tsx` | Client Component | `render(<RegisterPage />);` | `createClient().auth.signUp`, `next/navigation` |

---

## 4. Concrete Code Reference Specifications

### 4.1 Specification for `test/pages/core/dashboard.test.tsx`
```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/(app)/dashboard/page';
import { supabase } from '@/lib/db';

describe('Dashboard Route Headless Test (app/(app)/dashboard/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Studio Dashboard with empty state when no jobs exist', async () => {
    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('Studio Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Manage, view, and publish your rendered short-form videos/i)).toBeInTheDocument();
    expect(screen.getByText('No videos yet')).toBeInTheDocument();
    expect(screen.getByText(/Get started by creating your first AI-generated short-form video/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view workspaces/i })).toHaveAttribute('href', '/library');
  });

  it('renders video cards when render jobs exist in database', async () => {
    const mockJobs = [
      {
        id: 'job-98765432-1234',
        status: 'completed',
        logs: JSON.stringify({
          subject: 'AI Cyberpunk City',
          workflowType: 'AI Videos',
          videos: [{ thumbnail: 'https://example.com/cyberpunk.jpg' }],
        }),
        created_at: '2026-09-17T00:00:00.000Z',
      },
    ];
    const mockWorkspaces = [
      { id: 'ws-test', name: 'Product Marketing', color: '#8b5cf6' },
    ];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'render_jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
        } as any;
      }
      if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockWorkspaces, error: null }),
        } as any;
      }
      return {} as any;
    });

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('Studio Dashboard')).toBeInTheDocument();
    expect(screen.getByText('AI Cyberpunk City')).toBeInTheDocument();
    expect(screen.getByText('AI Videos')).toBeInTheDocument();
    expect(screen.queryByText('No videos yet')).not.toBeInTheDocument();
  });
});
```

### 4.2 Specification for `test/pages/core/planner.test.tsx`
```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlannerPage from '@/app/(app)/planner/page';
import { supabase } from '@/lib/db';
import { format } from 'date-fns';

describe('Planner Route Headless Test (app/(app)/planner/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Content Calendar empty week grid when no scheduled posts exist', async () => {
    const page = await PlannerPage();
    render(page);

    expect(screen.getByText('Content Calendar')).toBeInTheDocument();
    expect(screen.getByText(/Schedule and automate your AI video distribution/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /schedule post/i })).toBeInTheDocument();

    const emptySlots = screen.getAllByText('No posts scheduled');
    expect(emptySlots.length).toBe(7);

    const todayD = format(new Date(), 'd');
    expect(screen.getByText(todayD)).toBeInTheDocument();
  });

  it('renders scheduled posts in day columns when data exists', async () => {
    const todayStr = new Date().toISOString();
    const mockScheduled = [
      {
        id: 'post-1',
        scheduled_for: todayStr,
        status: 'pending',
        caption: 'Viral Tech Drop #1',
        platforms: ['youtube', 'tiktok'],
        render_jobs: { logs: JSON.stringify({ subject: 'Tech Drop' }) },
      },
    ];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'scheduled_posts') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockScheduled, error: null }),
        } as any;
      }
      return {} as any;
    });

    const page = await PlannerPage();
    render(page);

    expect(screen.getByText('Content Calendar')).toBeInTheDocument();
    expect(screen.getByText('Viral Tech Drop #1')).toBeInTheDocument();
    expect(screen.getByText('youtube')).toBeInTheDocument();
    expect(screen.getByText('tiktok')).toBeInTheDocument();
  });
});
```

### 4.3 Specification for `app/(app)/queue/page.tsx`
```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, RefreshCw, Loader2, Clock, CheckCircle2, XCircle, Plus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  generating_plan: "text-blue-400",
  processing: "text-purple-400",
  completed: "text-green-400",
  failed: "text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  generating_plan: "Generating Plan",
  processing: "Rendering",
  completed: "Completed",
  failed: "Failed",
};

export function QueueCard({ job }: { job: any }) {
  const isActive = ["pending", "generating_plan", "processing"].includes(job.status);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3.5 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm shadow-xs"
    >
      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
        {job.thumbnail ? (
          <img src={job.thumbnail} alt={job.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-muted-foreground text-[10px]">
            No Preview
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate text-foreground">{job.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{job.workflow_type || "Video"}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {isActive ? (
            <div className="w-full bg-muted rounded-full h-1">
              <motion.div
                className="h-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                animate={{ width: ["20%", "80%", "20%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          ) : (
            <span className={`text-[10px] font-medium ${STATUS_COLORS[job.status] || "text-muted-foreground"}`}>
              {STATUS_LABELS[job.status] || job.status}
            </span>
          )}
        </div>
      </div>
      <span
        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
          job.status === "completed"
            ? "bg-green-500/10 text-green-400"
            : job.status === "failed"
            ? "bg-red-500/10 text-red-400"
            : "bg-purple-500/10 text-purple-400"
        }`}
      >
        {STATUS_LABELS[job.status] || job.status}
      </span>
    </motion.div>
  );
}

export default function QueuePage() {
  const [queuedJobs, setQueuedJobs] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [failedJobs, setFailedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "failed">("all");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchJobs();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.success) {
        setQueuedJobs(data.queued || []);
        setCompletedJobs(data.completed || []);
        setFailedJobs(data.failed || []);

        if ((data.queued || []).length > 0) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = setInterval(fetchJobs, 8000);
        } else if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (e) {
      console.error("Failed to load queue jobs:", e);
    } finally {
      setLoading(false);
    }
  }

  const allJobs = [...queuedJobs, ...failedJobs, ...completedJobs];
  const displayedJobs =
    filter === "active"
      ? queuedJobs
      : filter === "completed"
      ? completedJobs
      : filter === "failed"
      ? failedJobs
      : allJobs;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-7 h-7 text-yellow-400" />
            Render Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor background video rendering, status, and job progression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchJobs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border bg-background hover:bg-muted font-medium text-xs transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Video
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Active in Queue</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{queuedJobs.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{completedJobs.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Failed</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{failedJobs.length}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        {(["all", "active", "completed", "failed"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === tab
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Job Grid / List */}
      {displayedJobs.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-card text-center p-8">
          <div>
            <Zap className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">No jobs in queue</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
              All rendering jobs have settled. Trigger a new video creation to see active progress.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Create New Video
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedJobs.map((job) => (
            <QueueCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.4 Specification for `test/pages/core/queue.test.tsx`
```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import QueuePage from '@/app/(app)/queue/page';

describe('Queue Route Headless Test (app/(app)/queue/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders QueuePage with empty state when no jobs exist in API response', async () => {
    render(<QueuePage />);

    expect(screen.getByText('Render Queue')).toBeInTheDocument();
    expect(screen.getByText(/Monitor background video rendering, status, and job progression/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('No jobs in queue')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /create new video/i })).toBeInTheDocument();
  });

  it('renders active and failed jobs when returned by /api/jobs', async () => {
    const mockJobsResponse = {
      success: true,
      queued: [
        {
          id: 'job-active-1',
          title: 'Cyberpunk Teaser Episode 1',
          workflow_type: 'AI Video',
          status: 'processing',
          thumbnail: 'https://example.com/cyber.jpg',
        },
      ],
      completed: [],
      failed: [
        {
          id: 'job-failed-1',
          title: 'Explainer Failed Render',
          workflow_type: 'Whiteboard',
          status: 'failed',
          thumbnail: null,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockJobsResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    render(<QueuePage />);

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Teaser Episode 1')).toBeInTheDocument();
      expect(screen.getByText('Explainer Failed Render')).toBeInTheDocument();
    });

    expect(screen.getByText('Whiteboard')).toBeInTheDocument();
  });
});
```

---

## 5. Summary Matrix & Recommendation

| Component / Route | Current Codebase Status | Key Technical Finding | Required Test Strategy |
|---|---|---|---|
| `app/(app)/dashboard/page.tsx` | Present (100 lines) | Async RSC querying `render_jobs` and `workspaces` | Await component before rendering: `const page = await DashboardPage(); render(page);` |
| `app/(app)/planner/page.tsx` | Present (96 lines) | Async RSC querying `scheduled_posts`. Unchecked date parsing causes `date-fns` v4 `Invalid time value` crash on null/invalid date strings | Await component: `const page = await PlannerPage(); render(page);`. Guard date parsing defensively. |
| `app/(app)/queue/page.tsx` | Missing (Not yet created) | Queue currently embedded in `library/page.tsx`. Powered by `/api/jobs` | Create standalone `'use client'` route and test with `render(<QueuePage />)` + mock fetch response. |
