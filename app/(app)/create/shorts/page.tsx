"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Scissors,
  Link2,
  FileText,
  Upload,
  Sparkles,
  Loader2,
  Sliders,
  Flame,
  CheckCircle2,
  HelpCircle,
} from "lucide-react"

const STRATEGIES = [
  { id: "highest_virality", label: "Highest Virality Score", desc: "Top emotional peaks and retention magnets" },
  { id: "hook-detector", label: "Hook Detector", desc: "Aggressive curiosity gaps and bold claims" },
  { id: "question-hook", label: "Question-Hook", desc: "Provocative questions answered in 30-50s" },
  { id: "high-emotion", label: "High Emotion / Debate", desc: "Controversial takes and passionate dialogue" },
  { id: "story-arc", label: "Micro-Story Arc", desc: "Self-contained beginning, middle, and punchline" },
]

const CAPTION_STYLES = [
  { id: "bold-yellow-stroke", label: "Bold Yellow Stroke (MrBeast Style)" },
  { id: "clean-minimal", label: "Clean White Minimal" },
  { id: "neon-glow", label: "Cyberpunk Neon Glow" },
  { id: "dynamic-karaoke", label: "Dynamic Word-by-Word Bounce" },
]

export default function ShortsPage() {
  const router = useRouter()

  const [sourceType, setSourceType] = useState<"url" | "transcript" | "file">("url")
  const [videoUrl, setVideoUrl] = useState("https://storage.clipped.ai/raw/tech-keynote-2026.mp4")
  const [transcript, setTranscript] = useState("")
  const [clipCount, setClipCount] = useState<number>(3)
  const [strategy, setStrategy] = useState("highest_virality")
  const [captionStyle, setCaptionStyle] = useState("bold-yellow-stroke")
  const [aspectRatio, setAspectRatio] = useState("9:16")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault()

    if (sourceType === "url" && !videoUrl.trim()) {
      setError("Please provide a valid video URL")
      return
    }

    if (sourceType === "transcript" && !transcript.trim()) {
      setError("Please paste a transcript to extract clips from")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/workflows/extract-shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          videoUrl: sourceType === "url" ? videoUrl.trim() : undefined,
          transcript: sourceType === "transcript" ? transcript.trim() : undefined,
          clipCount,
          strategy,
          captionStyle,
          aspectRatio,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to start Shorts Extraction job")
      }

      const data = await res.json()
      router.push(`/dashboard?job=${data.jobId}`)
    } catch (err: any) {
      setError(err.message || "An error occurred during shorts extraction")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Scissors className="h-6 w-6 text-amber-500" />
          Extract Shorts Workflow
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Slice long-form podcasts, webinars, and keynotes into high-scoring vertical viral shorts with AI hook detection.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Left Column: Input Form */}
        <div className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleExtract} className="space-y-6">
            {/* Source Type Selection Tabs */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-500" />
                Source Input Type
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType("url")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    sourceType === "url"
                      ? "border-amber-500 bg-amber-50/10 text-amber-600 ring-1 ring-amber-500"
                      : "border-input hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Link2 className="h-4 w-4" />
                  Video URL
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType("transcript")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    sourceType === "transcript"
                      ? "border-amber-500 bg-amber-50/10 text-amber-600 ring-1 ring-amber-500"
                      : "border-input hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Raw Transcript
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType("file")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    sourceType === "file"
                      ? "border-amber-500 bg-amber-50/10 text-amber-600 ring-1 ring-amber-500"
                      : "border-input hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Video File
                </button>
              </div>

              {/* URL Input */}
              {sourceType === "url" && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Video URL (YouTube, Vimeo, Cloud Storage MP4)
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or direct MP4 link"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                </div>
              )}

              {/* Transcript Textarea */}
              {sourceType === "transcript" && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Paste Transcript or SRT with Timestamps
                  </label>
                  <textarea
                    rows={8}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="[00:01:20] The single biggest secret to our 10x growth was eliminating lock contention... [00:15:30] Why do 90% of startups fail? Because they build wrappers instead of moats."
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                </div>
              )}

              {/* File Upload Placeholder */}
              {sourceType === "file" && (
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 bg-muted/20">
                  <div className="bg-amber-500/10 p-3 rounded-full text-amber-600">
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Drag & Drop Long-form MP4 / MOV Video</span>
                  <span className="text-[11px] text-muted-foreground">Supports up to 2GB files (1080p / 4k)</span>
                </div>
              )}
            </div>

            {/* Slicing Strategy */}
            <div className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                Viral Slicing Strategy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STRATEGIES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setStrategy(s.id)}
                    className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                      strategy === s.id
                        ? "border-amber-500 bg-amber-50/10 ring-1 ring-amber-500"
                        : "hover:bg-muted/50 border-input"
                    }`}
                  >
                    <span className="text-xs font-semibold">{s.label}</span>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Extraction Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
                <label className="text-xs font-semibold">Clip Count to Extract</label>
                <select
                  value={clipCount}
                  onChange={(e) => setClipCount(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={1}>1 Clip (Top 1% Hook)</option>
                  <option value={2}>2 Clips</option>
                  <option value={3}>3 Clips (Standard Batch)</option>
                  <option value={5}>5 Clips (Comprehensive Slicing)</option>
                  <option value={8}>8 Clips</option>
                  <option value={10}>10 Clips (Max Batch)</option>
                </select>
              </div>

              <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
                <label className="text-xs font-semibold">Caption Preset Style</label>
                <select
                  value={captionStyle}
                  onChange={(e) => setCaptionStyle(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CAPTION_STYLES.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
              <label className="text-xs font-semibold">Target Vertical Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio("9:16")}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    aspectRatio === "9:16"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-transparent hover:bg-muted"
                  }`}
                >
                  9:16 (Shorts / Reels)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("1:1")}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    aspectRatio === "1:1"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-transparent hover:bg-muted"
                  }`}
                >
                  1:1 (Square)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("16:9")}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    aspectRatio === "16:9"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-transparent hover:bg-muted"
                  }`}
                >
                  16:9 (Landscape)
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 px-4 py-3 text-sm font-medium text-white shadow transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Slicing and Scoring Clips...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract {clipCount} Viral Shorts
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Virality Intelligence Engine */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" />
              Virality Scoring Intelligence
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our extractor parses speech cadences and sentiment velocity to detect points of maximum audience retention.
            </p>

            <div className="space-y-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between font-medium">
                  <span>Curiosity Gap Detection</span>
                  <span className="text-amber-600 font-bold">Score 85-98</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pinpoints cliffhanger lines that force viewers to stay for the resolution.
                </p>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between font-medium">
                  <span>Question-Answer Hook</span>
                  <span className="text-amber-600 font-bold">Score 80-95</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Extracts concise explanations solving high-intent questions.
                </p>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between font-medium">
                  <span>Optimal Clip Timing</span>
                  <span className="text-foreground font-bold">30 - 45 Sec</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pre-trimmed for peak algorithm completion rate on TikTok & Shorts.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Batch Repurposing Pipeline
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Once extracted, clips can be directly sent to Auto Pilot for automated scheduled publishing across YouTube Shorts, Instagram Reels, and TikTok.
            </p>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Full transcript timestamps and subtitle burn-in included.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}