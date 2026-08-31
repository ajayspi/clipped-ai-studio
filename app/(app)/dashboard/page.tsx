import { Video, Zap, Eye, Clock, Download, Share2, Trash2, Loader2, Play } from "lucide-react"
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

  // Parse jobs to extract thumbnail and video data
  const videos = (jobs || []).map(job => {
    let parsed: any = {}
    try {
      parsed = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs
    } catch {}
    
    // Attempt to find a thumbnail from the generated videos or sourced clips
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
          <h1 className="text-3xl font-bold tracking-tight">Video Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, view, and share your rendered AI videos.
          </p>
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
            <DashboardCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}
