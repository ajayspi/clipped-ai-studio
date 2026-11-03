import Link from "next/link";
import { Video, Sparkles, Folder, Film, Clapperboard } from "lucide-react";
import { supabase } from "@/lib/db";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { StudioPulse } from "@/components/dashboard/StudioPulse";
import { OmniLaunchpad } from "@/components/dashboard/OmniLaunchpad";
import { ActiveOperationsDeck } from "@/components/dashboard/ActiveOperationsDeck";
import { extractJobPresentation } from "@/lib/engine/job-presentation";

interface WorkspaceSummary {
  id: string;
  name: string;
  color?: string | null;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ACTIVE_STATUSES = [
  'pending',
  'generating_plan',
  'processing',
  'queued',
  'claimed',
  'rendering',
  'planning',
  'in_progress',
  'retryable',
];

export default async function DashboardPage() {
  // Fetch recent jobs with projected presentation fields to avoid downloading full LLM log payloads
  const { data: jobs } = await supabase
    .from('render_jobs')
    .select('id, workspace_id, orchestration_state, status, progress, created_at, output_url, title:logs->>title, thumbnail_url:logs->>thumbnailUrl, aspectRatio:logs->>aspectRatio, workflowType:logs->>workflowType')
    .order('created_at', { ascending: false })
    .limit(30);

  // Fetch workspaces for folder labels
  const { data: dbWorkspaces } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true });

  // Fetch scheduled posts count
  const { count: scheduledCount } = await supabase
    .from('scheduled_posts')
    .select('*', { count: 'exact', head: true });

  const workspaces = (dbWorkspaces || []).map((w: WorkspaceSummary) => ({
    id: w.id,
    name: w.name,
    color: w.color || '#8b5cf6',
  }));

  // Parse jobs to extract canonical presentation data
  const allVideos = (jobs || []).map((job) => extractJobPresentation(job));

  // Partition into active operations vs completed videos
  const activeJobs = allVideos.filter((v) =>
    ACTIVE_STATUSES.includes(v.status) ||
    (v.orchestration_state ? ACTIVE_STATUSES.includes(v.orchestration_state) : false)
  );
  const completedVideos = allVideos.filter((v) => v.status === 'completed');

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            Studio Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time command center, autonomous creation pipelines, and video library.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border bg-background hover:bg-muted font-medium text-xs transition-colors shadow-sm"
          >
            <Folder className="w-4 h-4 text-violet-500" />
            Workspaces
          </Link>
          <Link
            href="/queue"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border bg-background hover:bg-muted font-medium text-xs transition-colors shadow-sm"
          >
            <Clapperboard className="w-4 h-4 text-amber-500" />
            Queue ({activeJobs.length})
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Create New Video
          </Link>
        </div>
      </div>

      {/* 1. Studio Pulse: KPI Metric Cards */}
      <StudioPulse
        activeRenders={activeJobs.length}
        completedVideos={completedVideos.length}
        scheduledPosts={scheduledCount || 0}
        quotaHealth="100% (Keyless)"
      />

      {/* 2. Omni-Launchpad: 1-Click Prompt & Studio Shortcuts */}
      <OmniLaunchpad />

      {/* 3. Active Operations Deck (Appears when renders or planning are active) */}
      <ActiveOperationsDeck initialJobs={activeJobs} />

      {/* 4. Recent Creations Reel */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              Recent Creations Reel
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              High-retention renders with playable preview, multi-channel distribution, and workspace tagging
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {allVideos.length} {allVideos.length === 1 ? "Video" : "Videos"}
            </span>
            <span>•</span>
            <Link
              href="/library"
              className="text-primary hover:underline font-medium"
            >
              Browse Full Catalog →
            </Link>
          </div>
        </div>

        {allVideos.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-card text-center p-8">
            <div>
              <Video className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-semibold">No videos created yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                Use the Omni-Launchpad above or select a Signature Studio to generate your first video.
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
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {allVideos.map((video) => (
              <DashboardCard key={video.id} video={video} workspaces={workspaces} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
