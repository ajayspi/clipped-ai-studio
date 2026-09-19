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
      <WorkflowHeader icon={Calendar} title="Bulk Content Planner" description="Generate 7 to 30 days of high-retention video content, hooks, scripts, and schedules in a single batch." />

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {error && <ErrorAlert message={error} />}

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

            <GenerateButton loading={loading} disabled={!niche.trim()} text={`Generate ${contentCount}-Day Bulk Content Plan`} loadingText="Generating Content Plan..." />
          </form>
        </div>

        <div className="space-y-6">
          {/* Settings Sidebar */}
          <SettingsCard icon={Settings2} title="Calendar Settings">

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
                <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Narrator Voice</label>
                <VoiceSelector value={voice} onChange={setVoice} />
              </div>

              <MockModeToggle checked={mock} onChange={setMock} />
            </div>
          </SettingsCard>

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