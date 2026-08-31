"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

    try {
      const res = await fetch("/api/workflows/bulk-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
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
      router.push(`/dashboard?job=${data.jobId}`)
    } catch (err: any) {
      setError(err.message || "An error occurred during workflow initiation")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-6 w-6 text-emerald-500" />
          Bulk Content Planner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate 7 to 30 days of high-retention video content, hooks, scripts, and schedules in a single batch.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="niche" className="text-sm font-medium">
                Content Niche or Industry Domain
              </label>
              <input
                id="niche"
                type="text"
                placeholder="e.g. 'B2B AI Productivity Software', 'High Intensity Interval Training', 'Personal Finance Hacks'"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-emerald-500" /> Content Batch Size: {contentCount} Videos
                </label>
                <span className="text-xs text-muted-foreground">
                  {contentCount === 30 ? "Full 1-Month Editorial Batch" : `${contentCount} Days of Continuous Content`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[7, 14, 21, 30].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setContentCount(num)}
                    className={`py-2.5 px-3 text-xs rounded-lg border transition-colors ${
                      contentCount === num
                        ? "bg-emerald-600 text-white border-emerald-600 font-medium shadow-sm"
                        : "bg-transparent hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {num === 30 ? "30 Days (Full)" : `${num} Videos`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Share2 className="h-4 w-4 text-emerald-500" /> Target Distribution Platforms
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                        active
                          ? "border-emerald-600 bg-emerald-50/10 font-medium text-emerald-400"
                          : "hover:bg-muted/50 text-muted-foreground opacity-60"
                      }`}
                    >
                      <span>{p.label}</span>
                      {active && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="visualStyle" className="text-sm font-medium flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-muted-foreground" /> Visual Aesthetic & B-Roll Style
              </label>
              <input
                id="visualStyle"
                type="text"
                placeholder="e.g. modern clean aesthetic, bright high-key lighting, 4k resolution, sleek motion graphics"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !niche.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-sm font-medium text-white shadow transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Content Plan...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate {contentCount}-Day Bulk Content Plan
                </>
              )}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {/* Settings Sidebar */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-emerald-500" />
              Calendar Settings
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Publishing Cadence
                </label>
                <select
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="daily">Daily (1 video per day)</option>
                  <option value="weekdays">Weekdays Only (Mon - Fri)</option>
                  <option value="3x_per_week">3x Per Week (Mon, Wed, Fri)</option>
                  <option value="weekly">Weekly (1 video per week)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio("9:16")}
                    className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                      aspectRatio === "9:16" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent hover:bg-muted"
                    }`}
                  >
                    9:16 (Shorts)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("16:9")}
                    className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                      aspectRatio === "16:9" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent hover:bg-muted"
                    }`}
                  >
                    16:9 (YT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("1:1")}
                    className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                      aspectRatio === "1:1" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent hover:bg-muted"
                    }`}
                  >
                    1:1 (Insta)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Narrator Voice</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="alloy">Alloy (Authoritative Neutral)</option>
                  <option value="echo">Echo (Warm Conversational)</option>
                  <option value="fable">Fable (Expressive Storyteller)</option>
                  <option value="onyx">Onyx (Deep Professional)</option>
                  <option value="nova">Nova (High-Energy Dynamic)</option>
                  <option value="shimmer">Shimmer (Clear & Polished)</option>
                </select>
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Dry Run / Test Mode</div>
                  <div className="text-[11px] text-muted-foreground">Generate full batch plan without API fees</div>
                </div>
                <input
                  type="checkbox"
                  checked={mock}
                  onChange={(e) => setMock(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Omnichannel Batch Card */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Share2 className="h-4 w-4 text-emerald-500" />
              Batch Execution Engine
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every day in your plan receives an independent Supabase job ID mapped for parallel or scheduled rendering, with platform-specific hashtags and thumbnail prompts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}