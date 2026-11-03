"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Film,
  Users,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Settings2,
  Sliders,
  Clapperboard,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowLeft,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DRAMA_VOICE_PRESETS } from "@/lib/engine/voice-mapper"
import type { DramaSeriesResponse } from "@/lib/engine/types"

interface CharacterInput {
  name: string
  description: string
  visualAnchor: string
  voice: string
  avatarUrl?: string
}

const GENRE_PRESETS = [
  { id: "cyberpunk-noir", label: "Cyberpunk Noir", desc: "Neon rain, high tech, dark intrigue" },
  { id: "royal-romance", label: "Royal Romance", desc: "Castles, forbidden love, aristocracy" },
  { id: "supernatural-thriller", label: "Supernatural Thriller", desc: "Mysteries, eerie suspense, occult" },
  { id: "space-opera", label: "Space Opera", desc: "Galactic empires, starships, fleet commanders" },
  { id: "heist-action", label: "Modern Heist", desc: "Fast-paced, laser grids, tactical crews" },
  { id: "psychological-drama", label: "Psychological Drama", desc: "Tense confrontations, deep secrets" },
]

export default function DramaPage() {
  const router = useRouter()

  const [phase, setPhase] = useState<'planning' | 'storyboard'>('planning')
  const [seriesId, setSeriesId] = useState<string>('')
  const [seriesPlan, setSeriesPlan] = useState<DramaSeriesResponse | null>(null)

  const [genre, setGenre] = useState("cyberpunk-noir")
  const [customGenre, setCustomGenre] = useState("")
  const [script, setScript] = useState("")
  const [episodesCount, setEpisodesCount] = useState<number>(3)
  const [aspectRatio, setAspectRatio] = useState("9:16")
  const [visualStyle, setVisualStyle] = useState("cinematic, photorealistic 8k, dramatic lighting, high contrast")
  const [characters, setCharacters] = useState<CharacterInput[]>([
    {
      name: "Detective Jax",
      description: "Hardboiled cybernetic investigator haunted by his past",
      visualAnchor: "charcoal cyber-coat, glowing blue optic eye implant, messy dark hair",
      voice: "onyx",
    },
    {
      name: "Dr. Vesper",
      description: "Rogue neuroscientist holding the key to the memory archive",
      visualAnchor: "platinum bob hair, silver lab coat, mirrored neural eyepiece",
      voice: "nova",
    },
  ])

  const [loading, setLoading] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState("")

  function handleAddCharacter() {
    if (characters.length >= 6) return
    const nextIdx = characters.length + 1
    setCharacters([
      ...characters,
      {
        name: `Character ${nextIdx}`,
        description: `Key ally or rival in the series`,
        visualAnchor: `distinctive look, signature outfit and facial features`,
        voice: "onyx",
      },
    ])
  }

  function handleRemoveCharacter(index: number) {
    if (characters.length <= 1) return
    setCharacters(characters.filter((_, idx) => idx !== index))
  }

  function handleCharacterChange(index: number, field: keyof CharacterInput, value: string) {
    const updated = [...characters]
    updated[index] = { ...updated[index], [field]: value }
    setCharacters(updated)
  }

  // Phase 1 Submission: Generate Storyboard Plan
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    const activeGenre = genre === "custom" ? customGenre.trim() : genre
    if (!activeGenre) {
      setError("Please select or specify a genre")
      return
    }

    if (characters.length === 0 || !characters.some((c) => c.name.trim())) {
      setError("At least one character is required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/workflows/micro-drama?action=plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre: activeGenre,
          characters,
          episodesCount,
          script: script.trim() || undefined,
          aspectRatio,
          visualStyle,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to plan Micro-Drama series")
      }

      const data = await res.json()
      if (data.seriesPlan) {
        setSeriesId(data.jobId)
        setSeriesPlan(data.seriesPlan)
        setPhase('storyboard')
      } else {
        router.push(`/dashboard?job=${data.jobId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while generating series plan")
    } finally {
      setLoading(false)
    }
  }

  // Phase 2 Submission: Batch Enqueue All Episodes for Worker Rendering
  async function handleRenderAllEpisodes() {
    if (!seriesId || !seriesPlan) return
    setRendering(true)
    setError("")

    try {
      const res = await fetch("/api/workflows/micro-drama?action=render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId,
          seriesPlan,
          characters,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to enqueue episodes for rendering")
      }

      router.push("/queue")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error dispatching render queue")
      setRendering(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Film className="h-6 w-6 text-purple-500" />
              AI Micro-Drama Series Studio
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {phase === 'planning' ? 'Phase 1: Showrunner Planning' : 'Phase 2: Storyboard Studio'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Generate episodic micro-drama series with persistent character visual anchors, multi-voice dialogue, and batch worker rendering.
          </p>
        </div>

        {/* Phase Toggle & Direct CTAs */}
        {phase === 'storyboard' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPhase('planning')}
              className="text-xs gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Edit Setup
            </Button>
            <Button
              size="sm"
              onClick={handleRenderAllEpisodes}
              disabled={rendering}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5 shadow-sm"
            >
              {rendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {rendering ? 'Enqueueing Episodes...' : `Render All ${seriesPlan?.episodes.length || episodesCount} Episodes`}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* =================================================================== */}
      {/* PHASE 1: SERIES PLANNING CONFIGURATION                              */}
      {/* =================================================================== */}
      {phase === 'planning' ? (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Left Column: Form Configuration */}
          <div className="space-y-6">
            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Genre Selection */}
              <div className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Clapperboard className="h-4 w-4 text-purple-500" />
                  Series Genre
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GENRE_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setGenre(p.id)}
                      className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                        genre === p.id
                          ? "border-purple-600 bg-purple-50/10 ring-1 ring-purple-600"
                          : "hover:bg-muted/50 border-input"
                      }`}
                    >
                      <span className="text-xs font-semibold">{p.label}</span>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">{p.desc}</span>
                    </button>
                  ))}
                </div>

                {genre === "custom" && (
                  <div className="pt-2">
                    <input
                      type="text"
                      placeholder="Specify your custom genre (e.g. Supernatural Victorian Detective)"
                      value={customGenre}
                      onChange={(e) => setCustomGenre(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                )}
              </div>

              {/* Characters & Visual Anchors */}
              <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    Cast & Persistent Visual Anchors
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCharacter}
                    disabled={characters.length >= 6}
                    className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Character
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The visual anchor prompt prefix locks down attire, hair, and defining physical traits across all episodic camera angles.
                </p>

                <div className="space-y-4">
                  {characters.map((char, index) => (
                    <div key={index} className="rounded-lg border bg-muted/20 p-4 space-y-3 relative group">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          Character {index + 1}
                        </span>
                        {characters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCharacter(index)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground">Name</label>
                          <input
                            type="text"
                            value={char.name}
                            onChange={(e) => handleCharacterChange(index, "name", e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground">Neural Voice</label>
                          <select
                            value={char.voice}
                            onChange={(e) => handleCharacterChange(index, "voice", e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {DRAMA_VOICE_PRESETS.map((vp) => (
                              <option key={vp.id} value={vp.id}>
                                {vp.name} ({vp.archetype})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground">Role / Arc Description</label>
                        <input
                          type="text"
                          value={char.description}
                          onChange={(e) => handleCharacterChange(index, "description", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Visual Anchor Prompt Prefix (Locks Consistency)
                        </label>
                        <input
                          type="text"
                          value={char.visualAnchor}
                          onChange={(e) => handleCharacterChange(index, "visualAnchor", e.target.value)}
                          className="w-full rounded-md border border-purple-500/30 bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Series Arc Seed Script */}
              <div className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-purple-500" />
                  Premise or Seed Script (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste an existing script or premise outline. If left empty, the AI Showrunner will generate a continuous 3-episode cliffhanger arc from your genre and characters."
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 text-xs shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Synthesizing Characters & Episodes (&le;15s)...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Series Storyboard
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Right Column: Series Specifications & Format Settings */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-purple-500" />
                Series Specifications
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-medium">Episodes Count</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setEpisodesCount(num)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        episodesCount === num
                          ? "border-purple-600 bg-purple-50/10 text-purple-500"
                          : "hover:bg-muted/50 border-input"
                      }`}
                    >
                      {num} Ep
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "9:16", label: "9:16 Vertical", desc: "Shorts & Reels" },
                    { id: "16:9", label: "16:9 Widescreen", desc: "YouTube Cinema" },
                  ].map((ratio) => (
                    <button
                      type="button"
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        aspectRatio === ratio.id
                          ? "border-purple-600 bg-purple-50/10 text-purple-500 ring-1 ring-purple-600"
                          : "hover:bg-muted/50 border-input"
                      }`}
                    >
                      <div className="text-xs font-semibold">{ratio.label}</div>
                      <div className="text-[10px] text-muted-foreground">{ratio.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Visual Style Descriptor</label>
                <input
                  type="text"
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Architecture Invariants Card */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2.5 text-xs">
              <div className="font-semibold text-purple-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Decoupled 1:N Batch Execution
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Phase 1 plans the complete serialized narrative and generates character visual anchors. In Phase 2, you inspect scripts and audition dialogue before dispatching independent episode render jobs.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* PHASE 2: STORYBOARD STUDIO & BATCH RENDER DISPATCH                  */
        /* =================================================================== */
        <div className="flex flex-col gap-6">
          {/* Series Hero Bar */}
          <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Series Storyboard</span>
                <span className="text-xs text-muted-foreground">• {String(seriesPlan?.metadata?.genre || genre)} • {aspectRatio}</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {seriesPlan?.dramaTitle || `${genre.toUpperCase()} Series`}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhase('planning')}
                className="text-xs gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Edit Characters / Script
              </Button>
              <Button
                size="sm"
                onClick={handleRenderAllEpisodes}
                disabled={rendering}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5 shadow-md"
              >
                {rendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {rendering ? 'Enqueueing Episodes...' : `Render All ${seriesPlan?.episodes.length} Episodes`}
              </Button>
            </div>
          </div>

          {/* Cast Anchor Cards Shelf */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-400" />
              Locked Character Visual Anchors ({characters.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {characters.map((char, cIdx) => (
                <div key={cIdx} className="p-4 rounded-xl border bg-card/60 flex items-start gap-3 shadow-sm">
                  {/* Avatar thumbnail */}
                  <div className="relative h-14 w-14 rounded-lg bg-zinc-900 border border-purple-500/30 overflow-hidden shrink-0">
                    <Image
                      src={char.avatarUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(char.visualAnchor)}?width=128&height=128&nologo=true`}
                      alt={char.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground truncate">{char.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        {char.voice}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{char.visualAnchor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Episodic Storyboard Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              Episodic Arc & Dialogue Storyboards
            </h3>

            <div className="space-y-6">
              {seriesPlan?.episodes.map((ep) => (
                <div key={ep.episodeNumber} className="rounded-2xl border border-border bg-card/40 p-5 space-y-4 shadow-sm">
                  {/* Episode Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-xs">
                        Episode {ep.episodeNumber}
                      </span>
                      <h4 className="text-base font-bold text-foreground">{ep.title}</h4>
                    </div>

                    {ep.cliffhanger && (
                      <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        Cliffhanger: {ep.cliffhanger}
                      </div>
                    )}
                  </div>

                  {/* Scene Dialogue & Camera Moves Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ep.scenes.map((scene, sIdx) => (
                      <div key={sIdx} className="p-3.5 rounded-xl border bg-background/50 flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-purple-400">{scene.speaker || `Scene ${sIdx + 1}`}</span>
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
                                {scene.shotType || 'medium'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px]">
                                {scene.cameraMove || 'push-in'}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs italic text-foreground font-serif leading-relaxed">
                            &quot;{scene.dialogue || scene.text}&quot;
                          </p>
                        </div>

                        <div className="pt-2 border-t text-[10px] text-muted-foreground line-clamp-2">
                          <span className="font-semibold text-zinc-400">Visual Prompt: </span>
                          {scene.visualPrompt || scene.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
