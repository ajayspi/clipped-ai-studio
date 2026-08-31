"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
} from "lucide-react"

interface CharacterInput {
  name: string
  description: string
  visualAnchor: string
  voice: string
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
        voice: "alloy",
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
      const res = await fetch("/api/workflows/micro-drama", {
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
        throw new Error(errData.error || "Failed to start Micro-Drama generation job")
      }

      const data = await res.json()
      router.push(`/dashboard?job=${data.jobId}`)
    } catch (err: any) {
      setError(err.message || "An error occurred while initiating workflow")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Film className="h-6 w-6 text-purple-500" />
          Micro-Drama Workflow
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate cinematic serialized drama episodes with persistent, consistent character visual anchors across all shots.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Left Column: Form Configuration */}
        <div className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

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
                    placeholder="Enter custom genre (e.g. dystopian-cyber-western)"
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                </div>
              )}
            </div>

            {/* Character Roster Builder */}
            <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    Consistent Character Roster
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define persistent visual anchors to guarantee consistent facial features, clothing, and styling.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCharacter}
                  disabled={characters.length >= 6}
                  className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50/20 hover:bg-purple-50/40 px-2.5 py-1.5 rounded-md border border-purple-200 transition-colors disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Character
                </button>
              </div>

              <div className="space-y-4 pt-1">
                {characters.map((char, idx) => (
                  <div key={idx} className="rounded-lg border bg-background/50 p-4 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-600 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Character #{idx + 1}
                      </span>
                      {characters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCharacter(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Remove character"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Character Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Detective Jax"
                          value={char.name}
                          onChange={(e) => handleCharacterChange(idx, "name", e.target.value)}
                          className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Voice Persona</label>
                        <select
                          value={char.voice}
                          onChange={(e) => handleCharacterChange(idx, "voice", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="onyx">Onyx (Deep, Gritty)</option>
                          <option value="alloy">Alloy (Neutral, Balanced)</option>
                          <option value="nova">Nova (Sharp, Energetic)</option>
                          <option value="echo">Echo (Warm, Confident)</option>
                          <option value="fable">Fable (Expressive, Dramatic)</option>
                          <option value="shimmer">Shimmer (Clear, Melodic)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">Role & Personality</label>
                      <input
                        type="text"
                        placeholder="e.g. Underground hacker with a secret bounty on her head"
                        value={char.description}
                        onChange={(e) => handleCharacterChange(idx, "description", e.target.value)}
                        className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-purple-600 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Persistent Visual Anchor (Key to Consistent AI Generation)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. charcoal trench coat, glowing blue optic eye, wet messy hair"
                        value={char.visualAnchor}
                        onChange={(e) => handleCharacterChange(idx, "visualAnchor", e.target.value)}
                        className="w-full rounded-md border border-purple-200 bg-purple-50/5 px-2.5 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Story Premise / Outline */}
            <div className="space-y-2 rounded-xl border bg-card p-5 shadow-sm">
              <label htmlFor="script" className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" />
                Story Premise / Outline (Optional)
              </label>
              <textarea
                id="script"
                placeholder="Provide an overarching premise, plot twist, or dialogue snippet. If omitted, the engine crafts an authentic dramatic arc from your genre and characters."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="min-h-[110px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Series Configuration Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
                <label className="text-xs font-semibold flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-muted-foreground" /> Episodes Count
                </label>
                <select
                  value={episodesCount}
                  onChange={(e) => setEpisodesCount(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={1}>1 Episode (Pilot Special)</option>
                  <option value={2}>2 Episodes (Mini-Arc)</option>
                  <option value={3}>3 Episodes (Standard Trilogy)</option>
                  <option value={5}>5 Episodes (Full Mini-Series)</option>
                  <option value={8}>8 Episodes (Extended Season)</option>
                  <option value={10}>10 Episodes (Epic Arc)</option>
                </select>
              </div>

              <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
                <label className="text-xs font-semibold flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5 text-muted-foreground" /> Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio("9:16")}
                    className={`py-1.5 text-xs rounded border transition-colors ${
                      aspectRatio === "9:16"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-transparent hover:bg-muted"
                    }`}
                  >
                    9:16 (Shorts)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("16:9")}
                    className={`py-1.5 text-xs rounded border transition-colors ${
                      aspectRatio === "16:9"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-transparent hover:bg-muted"
                    }`}
                  >
                    16:9 (Cinema)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("1:1")}
                    className={`py-1.5 text-xs rounded border transition-colors ${
                      aspectRatio === "1:1"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-transparent hover:bg-muted"
                    }`}
                  >
                    1:1 (Square)
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Cinematic Visual Aesthetic & Lighting
              </label>
              <input
                type="text"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                placeholder="e.g. moody neon reflections, 35mm film grain, anamorphic lens flare"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-600 hover:bg-purple-700 px-4 py-3 text-sm font-medium text-white shadow transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Micro-Drama Series...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate {episodesCount}-Episode Micro-Drama
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Visual Anchor & Consistency Preview */}
        <div className="space-y-6">
          {/* Consistency Anchor Intelligence */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              Character Consistency Engine
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI video generators often morph character appearances across cuts. Clipped solves this by locking
              semantic visual anchors and feeding persistent physical traits into every generative scene prompt.
            </p>

            <div className="space-y-3 pt-2">
              {characters.map((char, i) => (
                <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{char.name || `Character ${i + 1}`}</span>
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-mono">
                      {char.voice}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                    &quot;{char.visualAnchor || "No visual anchor defined"}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Episodic Blueprint */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-purple-500" />
              Series Narrative Arc ({episodesCount} Episodes)
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Ep 1: The Inciting Incident & Visual Establishing Shot</span>
              </div>
              {episodesCount > 1 && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span>Ep 2: Rising Conflict & The Hidden Secret</span>
                </div>
              )}
              {episodesCount > 2 && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span>Ep 3: The Confrontation & Cliffhanger Twist</span>
                </div>
              )}
              {episodesCount > 3 && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span>Ep 4+: High-Stakes Resolution & Climax</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}