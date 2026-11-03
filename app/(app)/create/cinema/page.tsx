"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  Camera,
  Film,
  SunMedium,
  Compass,
  Sparkles,
  Layers,
  Loader2,
  Copy,
  Check,
  Plus,
  Trash2,
  Sliders,
  Eye,
} from "lucide-react";
import {
  SensorFormat,
  FocalLength,
  Aperture,
  CameraChoreography,
  LightingAtmosphere,
  FilmStockGrade,
  ReferenceRole,
  CinemaReferenceAsset,
  DIRECTOR_PRESETS,
  compileCinematicPrompt,
} from "@/lib/engine/cinema-director";
import { AspectRatioSelector } from "@/components/create/ui/AspectRatioSelector";

export default function CinemaStudioPage() {
  const router = useRouter();

  // Core scene parameters
  const [subject, setSubject] = useState("A lone detective in a wet trench coat walking through neon-drenched Tokyo rain");
  const [environment, setEnvironment] = useState("Narrow cyberpunk alleyway illuminated by holographic billboards and steam vents");
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [duration, setDuration] = useState<number>(4);

  // Optics & Physics
  const [sensorFormat, setSensorFormat] = useState<SensorFormat>("full-frame-35mm");
  const [focalLength, setFocalLength] = useState<FocalLength>("35mm-street");
  const [aperture, setAperture] = useState<Aperture>("f/1.8");

  // Camera Motion & Staging
  const [cameraMotion, setCameraMotion] = useState<CameraChoreography>("steadicam-lead");
  const [motionIntensity, setMotionIntensity] = useState<"subtle" | "smooth" | "dynamic" | "chaotic">("smooth");

  // Lighting & Color Timing
  const [lighting, setLighting] = useState<LightingAtmosphere>("cyberpunk-neon");
  const [filmStock, setFilmStock] = useState<FilmStockGrade>("kodak-vision3-500t");

  // Multi-Image References (up to 14)
  const [references, setReferences] = useState<CinemaReferenceAsset[]>([]);
  const [refUrlInput, setRefUrlInput] = useState("");
  const [refRoleInput, setRefRoleInput] = useState<ReferenceRole>("@face");

  // Submission & Preview state
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live compiled prompt
  const compiled = compileCinematicPrompt({
    subject,
    environment,
    sensorFormat,
    focalLength,
    aperture,
    cameraMotion,
    lighting,
    filmStock,
    aspectRatio: aspectRatio === "9:16" || aspectRatio === "1:1" || aspectRatio === "2.39:1" ? aspectRatio : "16:9",
    motionIntensity,
    references,
  });

  const handleApplyPreset = (presetId: string) => {
    const found = DIRECTOR_PRESETS.find((p) => p.id === presetId);
    if (!found || !found.config) return;
    const c = found.config;
    if (c.sensorFormat) setSensorFormat(c.sensorFormat);
    if (c.focalLength) setFocalLength(c.focalLength);
    if (c.aperture) setAperture(c.aperture);
    if (c.cameraMotion) setCameraMotion(c.cameraMotion);
    if (c.lighting) setLighting(c.lighting);
    if (c.filmStock) setFilmStock(c.filmStock);
    if (c.motionIntensity) setMotionIntensity(c.motionIntensity);
  };

  const handleAddReference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refUrlInput.trim() || references.length >= 14) return;
    const newRef: CinemaReferenceAsset = {
      id: `ref_${Date.now().toString(36)}`,
      url: refUrlInput.trim(),
      role: refRoleInput,
      label: `${refRoleInput.replace('@', '')} reference ${references.length + 1}`,
      weight: 0.85,
    };
    setReferences([...references, newRef]);
    setRefUrlInput("");
  };

  const handleRemoveReference = (id: string) => {
    setReferences(references.filter((r) => r.id !== id));
  };

  const handleCopyPrompt = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(compiled.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/workflows/cinema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          environment,
          sensorFormat,
          focalLength,
          aperture,
          cameraMotion,
          lighting,
          filmStock,
          aspectRatio,
          motionIntensity,
          references,
          duration,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start cinema workflow");
      }

      const { jobId } = await res.json();
      router.push(`/dashboard?job=${jobId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating cinema shot";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
            <Clapperboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Cinema Studio</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                Director Mode
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Open-Higgsfield-AI inspired cinematography suite with real lens physics, 3D camera moves, and multi-image consistency.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPreviewOpen(!previewOpen)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-card hover:bg-muted text-xs font-semibold shadow-sm transition-colors self-start sm:self-center"
        >
          <Eye className="w-4 h-4 text-primary" />
          {previewOpen ? "Hide Prompt Inspector" : "Inspect Compiled Prompt"}
        </button>
      </div>

      {/* Quick Director Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Famous Director Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {DIRECTOR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleApplyPreset(p.id)}
              className="px-3 py-1.5 rounded-lg border bg-card hover:bg-muted text-xs font-medium transition-all hover:scale-[1.02] text-foreground flex items-center gap-2 shadow-xs"
            >
              <span>{p.name}</span>
              <span className="text-[10px] text-muted-foreground opacity-75">({p.director.split('/')[0].trim()})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compiled Prompt Live Inspector */}
      {previewOpen && (
        <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Live Compiled Director Prompt
            </span>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border bg-background hover:bg-muted text-foreground transition-colors font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-foreground font-mono bg-background/80 p-3 rounded-xl border border-border/60">
            {compiled.prompt}
          </p>
        </div>
      )}

      {/* Main Director Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Scene Action & Subject */}
        <div className="p-5 md:p-6 rounded-2xl border bg-card shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">1. Scene Subject & Atmosphere</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Subject & Foreground Action (Required)
              </label>
              <textarea
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                rows={2}
                placeholder="e.g. An astronaut floating through an abandoned space station airlock holding a vintage cassette player..."
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Background & Environment Description
              </label>
              <input
                type="text"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="e.g. Rusted industrial bulkhead with flickering emergency red strobes and floating zero-G water droplets..."
                className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pro Lens & Optical Physics */}
        <div className="p-5 md:p-6 rounded-2xl border bg-card shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">2. Pro Camera & Lens Mechanics</h2>
          </div>

          {/* Sensor Size */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">Sensor & Gate Format</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  ["full-frame-35mm", "35mm Full Frame"],
                  ["imax-70mm", "70mm IMAX"],
                  ["super35", "Super 35"],
                  ["arri-alexa-65", "ALEXA 65"],
                  ["anamorphic-2x", "2x Anamorphic Scope"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSensorFormat(val)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    sensorFormat === val
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold"
                      : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Focal Length */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">Lens Focal Length (Field of View)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {(
                [
                  ["14mm-ultra-wide", "14mm Ultra-Wide"],
                  ["24mm-wide", "24mm Wide"],
                  ["35mm-street", "35mm Cinema"],
                  ["50mm-standard", "50mm Prime"],
                  ["85mm-portrait", "85mm Portrait"],
                  ["135mm-telephoto", "135mm Tele"],
                  ["200mm-long-range", "200mm Long"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFocalLength(val)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    focalLength === val
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold"
                      : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Aperture (Depth of Field) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">
              Aperture (Bokeh & Optical Depth of Field)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {(
                [
                  ["f/0.95", "f/0.95 Extreme"],
                  ["f/1.2", "f/1.2 Dreamy"],
                  ["f/1.8", "f/1.8 Cinematic"],
                  ["f/2.8", "f/2.8 Balanced"],
                  ["f/4", "f/4 Commercial"],
                  ["f/8", "f/8 Deep"],
                  ["f/16", "f/16 Sharp Landscape"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAperture(val)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    aperture === val
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold"
                      : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: 3D Camera Choreography & Movement */}
        <div className="p-5 md:p-6 rounded-2xl border bg-card shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              3. 3D Camera Choreography & Trajectory
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {(
              [
                ["orbit-360", "360° Orbit Arc", "Dynamic revolving subject track"],
                ["dolly-zoom-vertigo", "Dolly Zoom (Vertigo)", "Push-in + zoom out reverse"],
                ["fpv-drone-rush", "FPV Drone Rush", "High-velocity kinetic rush"],
                ["steadicam-lead", "Steadicam Lead", "Fluid forward backward glide"],
                ["steadicam-follow", "Steadicam Follow", "Third-person chase track"],
                ["crane-jib-ascend", "Crane Jib Ascend", "Ground to aerial reveal"],
                ["whip-pan", "Whip Pan Snap", "High-speed rotational blur"],
                ["dutch-angle-tilt", "Dutch Angle Tilt", "Canted psychological tension"],
                ["bullet-time-freeze", "Bullet Time Matrix", "Frozen temporal 3D arc"],
                ["push-in", "Slow Push-In", "Deliberate cinematic dolly"],
                ["pull-out", "Slow Pull-Out", "World revealing dolly back"],
                ["static-tripod", "Locked-Off Tripod", "Master composition stillness"],
              ] as const
            ).map(([val, label, sub]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCameraMotion(val)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  cameraMotion === val
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 shadow-xs"
                    : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <span className="font-bold text-xs text-foreground block">{label}</span>
                <span className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{sub}</span>
              </button>
            ))}
          </div>

          {/* Velocity */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-muted-foreground block">Camera Velocity & Motion Cadence</label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["subtle", "Subtle (Paced)"],
                  ["smooth", "Smooth (Hollywood)"],
                  ["dynamic", "Dynamic (Commercial)"],
                  ["chaotic", "Chaotic (Action)"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMotionIntensity(val)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    motionIntensity === val
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-500 font-bold"
                      : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Atmospheric Lighting & Color Grading */}
        <div className="p-5 md:p-6 rounded-2xl border bg-card shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <SunMedium className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              4. Atmospheric Lighting & Film Stock Grading
            </h2>
          </div>

          {/* Lighting */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">Lighting Scheme & Ambience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  ["volumetric-god-rays", "Volumetric God Rays"],
                  ["cyberpunk-neon", "Cyberpunk Neon Rim"],
                  ["golden-hour-backlight", "Golden Hour Sun"],
                  ["rembrandt-chiaroscuro", "Rembrandt Chiaroscuro"],
                  ["film-noir-venetian", "Film Noir Venetian"],
                  ["studio-high-key", "Studio High-Key Clean"],
                  ["moody-candlelight", "Flickering Candlelight"],
                  ["fluorescent-grit", "Fluorescent Grit"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLighting(val)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    lighting === val
                      ? "border-amber-500 bg-amber-500/10 text-amber-500 font-bold"
                      : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Film Stock */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">Film Stock Emulation & LUT</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  ["kodak-vision3-500t", "Kodak Vision3 500T"],
                  ["kodak-portra-400", "Kodak Portra 400"],
                  ["technicolor-3-strip", "Technicolor 3-Strip"],
                  ["bleach-bypass-silver", "Bleach Bypass Silver"],
                  ["noir-monochrome", "35mm Noir Monochrome"],
                  ["blockbuster-teal-orange", "Teal & Orange Grade"],
                  ["vintage-1970s-film", "1970s Vintage Print"],
                  ["vhs-camcorder-90s", "90s VHS Camcorder"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFilmStock(val)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    filmStock === val
                      ? "border-amber-500 bg-amber-500/10 text-amber-500 font-bold"
                      : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5: Multi-Image Reference Rig (Up to 14 References) */}
        <div className="p-5 md:p-6 rounded-2xl border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                5. Multi-Image Reference Rig ({references.length}/14)
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">Character, wardrobe & scene locking</span>
          </div>

          {/* Add reference URL input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={refRoleInput}
              onChange={(e) => setRefRoleInput(e.target.value as ReferenceRole)}
              className="px-3 py-2 rounded-xl border border-input bg-card text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-44"
            >
              <option value="@face">@face (Actor / Headshot)</option>
              <option value="@outfit">@outfit (Wardrobe & Props)</option>
              <option value="@pose">@pose (Action & Stance)</option>
              <option value="@environment">@environment (Location)</option>
              <option value="@style">@style (Art Direction)</option>
            </select>
            <input
              type="url"
              placeholder="https://example.com/character-sheet.jpg"
              value={refUrlInput}
              onChange={(e) => setRefUrlInput(e.target.value)}
              className="flex-1 rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={handleAddReference}
              disabled={!refUrlInput.trim() || references.length >= 14}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Ref
            </button>
          </div>

          {/* Reference List */}
          {references.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="p-2.5 rounded-xl border bg-muted/20 flex items-center justify-between gap-3 overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 shrink-0">
                      {ref.role}
                    </span>
                    <span className="text-xs text-foreground truncate font-mono">{ref.url.slice(-25)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveReference(ref.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6: Format & Duration Settings */}
        <div className="p-5 md:p-6 rounded-2xl border bg-card shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Aspect Ratio</label>
              <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">
                Shot Duration: <span className="text-foreground font-bold">{duration}s</span>
              </label>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>2s (Quick cut)</span>
                <span>5s (Standard master)</span>
                <span>10s (Long take)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !subject.trim()}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
            Generate Cinematic Shot
          </button>
        </div>
      </form>
    </div>
  );
}
