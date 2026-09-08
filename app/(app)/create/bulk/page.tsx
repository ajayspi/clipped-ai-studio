"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { WorkflowHeader } from "@/components/create/ui/WorkflowHeader"
import { VoiceSelector } from "@/components/create/ui/VoiceSelector"
import { AspectRatioSelector } from "@/components/create/ui/AspectRatioSelector"
import { MockModeToggle } from "@/components/create/ui/MockModeToggle"
import { GenerateButton } from "@/components/create/ui/GenerateButton"
import { ErrorAlert } from "@/components/create/ui/ErrorAlert"
import { SettingsCard } from "@/components/create/ui/SettingsCard"

import {
  Calendar,
  Loader2,
  Sparkles,
  Settings2,
  Sliders,
  Share2,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  Activity,
  Flame,
  RadioTower,
  Newspaper
} from "lucide-react"

export default function BulkPage() {
  const router = useRouter()
  const [niche, setNiche] = useState("")
  const [contentCount, setContentCount] = useState<number>(7)
  const [cadence, setCadence] = useState("daily")
  const [visualStyle, setVisualStyle] = useState("modern clean aesthetic, bright high-key lighting, 4k resolution")
  const [voice, setVoice] = useState("alloy")
  const [aspectRatio, setAspectRatio] = useState("9:16")
  const [platforms, setPlatforms] = useState<string[]>(["tiktok", "youtube", "instagram"])
  const [mock, setMock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [generatedPlan, setGeneratedPlan] = useState<any>(null)
  const [useTrendJacking, setUseTrendJacking] = useState(true)

  function togglePlatform(platformId: string) {
    if (platforms.includes(platformId)) {
      if (platforms.length > 1) {
        setPlatforms(platforms.filter((p) => p !== platformId))
      }
    } else {
      setPlatforms([...platforms, platformId])
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()

    if (!niche.trim()) return

    setLoading(true)
    setError("")
    setGeneratedPlan(null)

    try {
      const res = await fetch("/api/workflows/bulk-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: useTrendJacking ? `${niche} (Include real-time viral trends and newsroom newsjacking)` : niche,
          contentCount,
          cadence,
          visualStyle,
          voice,
          platforms,
          aspectRatio,
          mock,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to start bulk plan generation job")
      }

      const data = await res.json()
      setGeneratedPlan(data.plan)
    } catch (err: any) {
      setError(err.message || "An error occurred during workflow initiation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <WorkflowHeader 
        icon={RadioTower} 
        title="Zero-Click Newsroom & Bulk Planner" 
        description="Sub-Second Pacing Engine: Generate high-retention daily content ideas, real-time trend jacking, and scripts in a single batch." 
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        <div className="space-y-8">
          {error && <ErrorAlert message={error} />}

          <form onSubmit={handleGenerate} className="space-y-8 bg-card border rounded-2xl p-6 shadow-sm">
            <div className="space-y-3">
              <label htmlFor="niche" className="text-sm font-bold flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Industry Domain / Viral Niche
              </label>
              <input
                id="niche"
                type="text"
                placeholder="e.g. 'Tech Startups', 'Fitness Hacks', 'AI News'"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                required
              />
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Activity className="h-5 w-5" />
                  Real-Time Trend Jacking (Newsroom Agents)
                </label>
                <div className="flex items-center h-5">
                  <input
                    id="trend-jacking"
                    type="checkbox"
                    checked={useTrendJacking}
                    onChange={(e) => setUseTrendJacking(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                Automatically scans Twitter and News APIs to inject today's viral topics into your daily content plan to maximize algorithm reach.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" /> Content Batch Size: {contentCount} Days
                </label>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[7, 14, 21, 30].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setContentCount(num)}
                    className={`py-3 px-4 text-sm rounded-xl border-2 transition-all ${
                      contentCount === num
                        ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md scale-[1.02]"
                        : "bg-background hover:bg-muted text-muted-foreground border-transparent hover:border-border"
                    }`}
                  >
                    {num} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2">
                <Share2 className="h-5 w-5 text-purple-500" /> Target Distribution Networks
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "tiktok", label: "TikTok" },
                  { id: "youtube", label: "YouTube Shorts" },
                  { id: "instagram", label: "Instagram Reels" },
                  { id: "twitter", label: "X / Twitter" },
                ].map((p) => {
                  const active = platforms.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 text-left text-sm transition-all ${
                        active
                          ? "border-purple-500 bg-purple-500/10 font-bold text-purple-600 dark:text-purple-400 shadow-sm"
                          : "border-transparent bg-background hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span>{p.label}</span>
                      {active && <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <GenerateButton 
              loading={loading} 
              disabled={!niche.trim()} 
              text={`Launch ${contentCount}-Day Newsroom Plan`} 
              loadingText="Agents Scouting Trends..." 
            />
          </form>
        </div>

        <div className="space-y-6">
          <SettingsCard icon={Settings2} title="Sub-Second Engine Settings">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Pacing & Cadence
                </label>
                <select
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value)}
                  className="w-full rounded-lg border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="daily">Aggressive (1/day)</option>
                  <option value="weekdays">Standard (Mon-Fri)</option>
                  <option value="weekly">Quality over Quantity (1/week)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="h-4 w-4" /> Visual Aesthetic
                </label>
                <input
                  type="text"
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className="w-full rounded-lg border-2 border-input bg-background px-3 py-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">Video Format</label>
                <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">AI Voice Clone</label>
                <VoiceSelector value={voice} onChange={setVoice} />
              </div>

              <MockModeToggle checked={mock} onChange={setMock} />
            </div>
          </SettingsCard>
        </div>
      </div>

      {/* GENERATED CONTENT RESULTS */}
      {generatedPlan && (
        <div className="mt-12 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl border border-emerald-500/20">
            <div>
              <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-blue-600">
                {generatedPlan.planTitle || "Newsroom Daily Ideas Creator"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your high-retention schedule is locked in. Edit hooks below before pushing to the render queue.
              </p>
            </div>
            <button className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
              <Zap className="w-4 h-4 fill-white" /> Push All to Render Engine
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {generatedPlan.items?.map((item: any) => (
              <div key={item.day} className="group relative rounded-2xl border-2 bg-card hover:border-emerald-500/50 transition-colors shadow-sm hover:shadow-md p-5 space-y-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black px-3 py-1 bg-emerald-500 text-white rounded-lg shadow-sm">
                      Day {item.day}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {new Date(item.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {useTrendJacking && (
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-base leading-tight group-hover:text-emerald-600 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs font-medium text-emerald-600/80 mt-1 uppercase tracking-wider">
                    {item.targetPlatform}
                  </p>
                </div>

                <div className="bg-muted/50 p-3 rounded-xl border border-border/50 flex-1 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                  <span className="text-[10px] font-black uppercase text-orange-500 mb-1 block">3-Second Hook</span>
                  <p className="text-sm italic text-foreground leading-relaxed font-medium">
                    "{item.hook}"
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap gap-1.5">
                  {item.tags?.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs font-bold bg-secondary/80 px-2 py-1 rounded-md text-secondary-foreground">
                      {tag}
                    </span>
                  ))}
                </div>

                <button className="w-full mt-2 py-2.5 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-xl hover:bg-emerald-500 hover:text-white transition-all active:scale-95">
                  Edit Sub-Second Script
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}