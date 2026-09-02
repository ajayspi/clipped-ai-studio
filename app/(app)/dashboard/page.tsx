import { Video, Zap, Eye, Clock, Download, Share2, Trash2, Loader2, Play, Sparkles, Folder } from "lucide-react"
import { supabase } from "@/lib/db"
import { DashboardCard } from "@/components/dashboard/DashboardCard"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const { data: jobs } = await supabase
    .from('render_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch workspaces for folder labels
  const { data: dbWorkspaces } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })

  const workspaces = (dbWorkspaces || []).map((w: any) => ({
    id: w.id,
    name: w.name,
    color: w.color || '#8b5cf6',
  }));

  // Parse jobs to extract thumbnail and video data
  const videos = (jobs || []).map(job => {
    let parsed: any = {}
    try {
      parsed = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs
    } catch {}
    
    const firstClip = parsed?.videos?.[0]?.video || parsed?.videos?.[0]
    const thumbnail = firstClip?.thumbnail || firstClip?.previewUrl || null
    
    return {
      ...job,
      thumbnail,
      parsedLogs: parsed,
      clipCount: parsed?.videos?.length || 0,
      title: parsed?.subject || `Job ${job.id.slice(0, 8)}`,
      workflowType: parsed?.workflowType || "Footage"
    }
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            Studio Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, view, and publish your rendered short-form videos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/library"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border bg-background hover:bg-muted font-medium text-xs transition-colors shadow-sm"
          >
            <Folder className="w-4 h-4 text-violet-500" />
            View Workspaces
          </a>
          <a
            href="/create/footage"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Create New Video
          </a>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-card text-center p-8">
          <div>
            <Video className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">No videos yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
              Get started by creating your first AI-generated short-form video in the creation wizard.
            </p>
            <a href="/create/footage" className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
              Create New Video
            </a>
          </div>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {videos.map((video) => (
            <DashboardCard key={video.id} video={video} workspaces={workspaces} />
          ))}
        </div>
      )}
    </div>
  )
}
