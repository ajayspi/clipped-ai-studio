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
  Bot,
  Loader2,
  Sparkles,
  Settings2,
  Share2,
  CheckCircle2,
  Clock,
  Radio,
  Sliders,
  Layers,
  Globe,
  Rss,
  Activity,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"

export default function AutoPilotPage() {
  const router = useRouter()
  const [pipelineName, setPipelineName] = useState("")
  const [niche, setNiche] = useState("")
  const [schedule, setSchedule] = useState("0 8 * * *")
  const [sourceStrategy, setSourceStrategy] = useState("trending-rss")
  const [visualPipeline, setVisualPipeline] = useState("ai-videos")
  const [autoPublish, setAutoPublish] = useState(false)
  const [platforms, setPlatforms] = useState<string[]>(["youtube", "tiktok"])
  const [voice, setVoice] = useState("alloy")
  const [visualStyle, setVisualStyle] = useState("modern cinematic, 4k ultra-detailed, vibrant dynamic lighting")
  const [aspectRatio, setAspectRatio] = useState("9:16")
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
    if (!pipelineName.trim() || !niche.trim()) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/workflows/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineName,
          niche,
          schedule,
          sourceStrategy,
          visualPipeline,
          autoPublish,
          targetPlatforms: platforms,
          voice,
          visualStyle,
          aspectRatio,
          mock,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to configure auto-pilot pipeline")
      }

      const data = await res.json()
      router.push(`/dashboard?job=${data.jobId}`)
    } catch (err: any) {
      setError(err.message || "An error occurred during auto-pilot pipeline launch")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-6 w-6 text-purple-500" />
          Auto Pilot Pipeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure a fully autonomous 24/7 video creation and omnichannel publishing engine powered by AI.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        {/* Main Configuration Panel */}
        <div className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="pipelineName" className="text-sm font-medium flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-purple-500" /> Pipeline Identifier Name
              </label>
              <input
                id="pipelineName"
                type="text"
                placeholder="e.g. 'Daily Tech Pulse', 'Crypto Market Flash', 'Ancient History Shorts'"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="niche" className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-purple-500" /> Content Niche & Industry Focus
              </label>
              <input
                id="niche"
                type="text"
                placeholder="e.g. 'Artificial Intelligence & Robotics', 'Personal Finance & Investing', 'Astrophysics & Space'"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Rss className="h-4 w-4 text-purple-500" /> Trending Curation Source Strategy
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: "trending-rss",
                    label: "Trending RSS Feeds",
                    desc: "Real-time industry feeds & news wires",
                  },
                  {
                    id: "news-aggregator",
                    label: "News Aggregator",
                    desc: "Top breaking stories & editorial summaries",
                  },
                  {
                    id: "market-quotes",
                    label: "Market Quotes",
                    desc: "Stock & crypto volatility insights",
                  },
                  {
                    id: "arxiv-preprints",
                    label: "ArXiv Research",
                    desc: "Peer-reviewed scientific breakthroughs",
                  },
                  {
                    id: "wikipedia-featured",
                    label: "Historical Archives",
                    desc: "Curated facts & deep dive trivia",
                  },
                  {
                    id: "social-scraper",
                    label: "Social Virality",
                    desc: "High-curiosity debates & viral discussions",
                  },
                ].map((s) => {
                  const active = sourceStrategy === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSourceStrategy(s.id)}
                      className={`p-3 rounded-lg border text-left text-xs transition-colors ${
                        active
                          ? "border-purple-600 bg-purple-50/10 font-medium text-purple-400"
                          : "hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <div className="font-semibold text-foreground">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-purple-500" /> Visual Generation Engine
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "ai-videos", label: "AI Video (Kling / Luma)" },
                  { id: "ai-images", label: "Flux AI Images + Motion" },
                  { id: "stock-footage", label: "Stock Footage Matcher" },
                  { id: "stories", label: "Multi-Part Stories" },
                  { id: "extract-shorts", label: "Shorts Hook Extractor" },
                ].map((p) => {
                  const active = visualPipeline === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setVisualPipeline(p.id)}
                      className={`p-2.5 rounded-lg border text-xs text-center transition-colors ${
                        active
                          ? "border-purple-600 bg-purple-50/10 font-medium text-purple-400"
                          : "hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Share2 className="h-4 w-4 text-purple-500" /> Target Publishing Platforms
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "youtube", label: "YouTube Shorts" },
                  { id: "tiktok", label: "TikTok" },
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
                          ? "border-purple-600 bg-purple-50/10 font-medium text-purple-400"
                          : "hover:bg-muted/50 text-muted-foreground opacity-60"
                      }`}
                    >
                      <span>{p.label}</span>
                      {active && <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="visualStyle" className="text-sm font-medium flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-muted-foreground" /> Visual Style & Aesthetic Anchor
              </label>
              <input
                id="visualStyle"
                type="text"
                placeholder="e.g. modern cinematic, 4k ultra-detailed, vibrant dynamic lighting, photorealistic"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !pipelineName.trim() || !niche.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-600 hover:bg-purple-700 px-4 py-3 text-sm font-medium text-white shadow transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating Auto-Pilot Pipeline...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Deploy & Activate Auto Pilot Pipeline
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sidebar & Schedule Controls */}
        <div className="space-y-6">
          {/* Settings Box */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-purple-500" />
              Schedule & Automation
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Recurring Trigger Schedule
              </label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="0 8 * * *">Daily at 08:00 AM UTC</option>
                <option value="0 12 * * *">Daily at 12:00 PM UTC</option>
                <option value="twice_daily">Twice Daily (Morning & Evening)</option>
                <option value="hourly">Hourly News Pulse</option>
                <option value="0 9 * * 1">Weekly on Monday (09:00 UTC)</option>
                <option value="manual">Manual / On-Demand Only</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Aspect Ratio</label>
              <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
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
                <option value="nova">Nova (Dynamic High-Energy)</option>
                <option value="shimmer">Shimmer (Clear & Polished)</option>
              </select>
            </div>

            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Direct Auto-Publish</div>
                  <div className="text-[11px] text-muted-foreground">Publish directly to channels upon render</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Dry Run / Test Mode</div>
                  <div className="text-[11px] text-muted-foreground">Cost-safe pipeline simulation</div>
                </div>
                <input
                  type="checkbox"
                  checked={mock}
                  onChange={(e) => setMock(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Autonomous Execution Flow Monitor */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              Autonomous Pipeline Flow
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <span className="font-mono text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">01</span>
                <span>RSS/Topic Ingestion & Fact Extraction</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <span className="font-mono text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">02</span>
                <span>LLM Script & Viral Hook Generation</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <span className="font-mono text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">03</span>
                <span>Neural Voice Synthesis ({voice})</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <span className="font-mono text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">04</span>
                <span>Generative Video & Asset Composition</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <span className="font-mono text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">05</span>
                <span>Omnichannel Social Distribution</span>
              </div>
            </div>
            <div className="pt-2 border-t flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              Continuous Health & Error Recovery Active
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}