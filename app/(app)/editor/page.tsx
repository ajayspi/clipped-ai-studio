import { redirect } from "next/navigation"
import Link from "next/link"
import { Film, Sparkles } from "lucide-react"
import { supabase } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function EditorLandingPage() {
  // Find the latest active or completed render job to open directly in the timeline editor
  const { data: jobs } = await supabase
    .from("render_jobs")
    .select("id, status, orchestration_state")
    .order("created_at", { ascending: false })
    .limit(1)

  if (jobs && jobs.length > 0 && jobs[0]?.id) {
    redirect(`/editor/${jobs[0].id}`)
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-4rem)] p-8 text-center bg-background">
      <div className="max-w-md space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
          <Film className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Timeline Editor</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No video projects found to edit. Start by creating an AI video or mission workflow to unlock fine-grained beat timeline editing.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium text-sm shadow-md shadow-violet-500/25 hover:opacity-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Create Your First Video
          </Link>
        </div>
      </div>
    </div>
  )
}
