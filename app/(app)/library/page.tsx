import { Video } from "lucide-react"
import { supabase } from "@/lib/db"
import { DashboardCard } from "@/components/dashboard/DashboardCard"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LibraryPage() {
  // Fetch videos and their latest render job
  const { data: videos } = await supabase
    .from('videos')
    .select(`
      *,
      render_jobs (*)
    `)
    .order('created_at', { ascending: false })

  // Parse videos to map into the format expected by DashboardCard
  const parsedVideos = (videos || []).map(videoRecord => {
    // Get the most recent render job for this video
    const job = videoRecord.render_jobs && videoRecord.render_jobs.length > 0 
      ? videoRecord.render_jobs[videoRecord.render_jobs.length - 1] 
      : null;
      
    let parsedLogs: any = {}
    if (job) {
      try {
        parsedLogs = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs
      } catch {}
    }
    
    // Attempt to find a thumbnail from the parsed logs or fallback to a default
    const firstClip = parsedLogs?.videos?.[0]?.video || parsedLogs?.videos?.[0]
    let thumbnail = firstClip?.thumbnail || firstClip?.previewUrl || null
    
    // If completed and no thumbnail, try using the finalVideoUrl
    if (!thumbnail && job?.status === 'completed' && parsedLogs?.finalVideoUrl) {
      // Just a placeholder since video thumbnails need extraction, 
      // but if we had one we'd use it. For now DashboardCard falls back to a Video icon.
    }

    // Override the job status if it exists
    const status = job ? job.status : videoRecord.status;

    return {
      id: job ? job.id : videoRecord.id,
      video_id: videoRecord.id,
      title: videoRecord.title || parsedLogs?.subject || `Video ${videoRecord.id.slice(0, 8)}`,
      created_at: videoRecord.created_at,
      status: status,
      thumbnail,
      parsedLogs,
      clipCount: parsedLogs?.videos?.length || 0,
      workflowType: videoRecord.workflow || parsedLogs?.workflowType || "Footage"
    }
  })

  // Also fetch direct render_jobs that might not have a video record yet (legacy)
  const { data: directJobs } = await supabase
    .from('render_jobs')
    .select('*')
    .is('video_id', null)
    .order('created_at', { ascending: false })
    
  const parsedDirectJobs = (directJobs || []).map(job => {
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

  // Combine both lists
  const allContent = [...parsedVideos, ...parsedDirectJobs].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All your generated videos live here.
          </p>
        </div>
      </div>

      {allContent.length === 0 ? (
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
          {allContent.map((video) => (
            <DashboardCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}
