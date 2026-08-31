import Link from "next/link"
import { Video, Image as ImageIcon, Film, Layout, ListTodo, Scissors, Drama, Sparkles, ArrowRight } from "lucide-react"

const workflows = [
  {
    id: "footage",
    title: "Footage Video",
    description: "Generate video using premium stock footage matched to your script.",
    icon: Video,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    href: "/create/footage"
  },
  {
    id: "images",
    title: "AI Images Video",
    description: "Generate consistent AI images and animate them into a video.",
    icon: ImageIcon,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    href: "/create/images"
  },
  {
    id: "ai-videos",
    title: "AI Videos",
    description: "Use Kling or Veo to generate 100% synthetic video scenes.",
    icon: Film,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    href: "/create/ai-videos"
  },
  {
    id: "stories",
    title: "Stories Generator",
    description: "Turn a topic into a multi-part shorts series automatically.",
    icon: Layout,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    href: "/create/stories"
  },
  {
    id: "bulk",
    title: "Bulk Planner",
    description: "Generate 30 days of content in a specific niche at once.",
    icon: ListTodo,
    color: "text-green-500",
    bg: "bg-green-500/10",
    href: "/create/bulk"
  },
  {
    id: "shorts",
    title: "Extract Shorts",
    description: "Find viral hooks in long-form video and extract them into shorts.",
    icon: Scissors,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    href: "/create/shorts"
  },
  {
    id: "drama",
    title: "Micro-Drama",
    description: "Generate a cinematic mini-series with consistent characters.",
    icon: Drama,
    color: "text-red-500",
    bg: "bg-red-500/10",
    href: "/create/drama"
  },
  {
    id: "auto",
    title: "Auto Pilot",
    description: "Fully hands-off generation and scheduling pipeline.",
    icon: Sparkles,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    href: "/create/auto"
  },
]

export default function CreateHubPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a workflow to start generating your next viral video.
        </p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
        {workflows.map((wf) => (
          <Link
            key={wf.id}
            href={wf.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
          >
            <div>
              <div className={`mb-4 inline-flex rounded-lg p-3 ${wf.bg}`}>
                <wf.icon className={`h-6 w-6 ${wf.color}`} />
              </div>
              <h3 className="font-semibold mb-2">{wf.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {wf.description}
              </p>
            </div>
            <div className="mt-6 flex items-center text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Start workflow <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
