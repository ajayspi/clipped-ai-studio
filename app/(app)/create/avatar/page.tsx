"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  User,
  Sparkles,
  Mic,
  Sliders,
  Layout,
  Play,
  Volume2,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Layers,
  Upload,
} from "lucide-react";
import { AVATAR_PRESETS } from "@/lib/engine/avatar-orchestrator";

const VOICES = [
  { id: "nova", label: "Nova (Warm & Engaging)", gender: "Female", accent: "American" },
  { id: "onyx", label: "Onyx (Deep & Authoritative)", gender: "Male", accent: "American" },
  { id: "rachel", label: "Rachel (Professional Presenter)", gender: "Female", accent: "British" },
  { id: "josh", label: "Josh (Dynamic & Youthful)", gender: "Male", accent: "American" },
  { id: "alloy", label: "Alloy (Neutral & Balanced)", gender: "Neutral", accent: "American" },
  { id: "shimmer", label: "Shimmer (Expressive & Clear)", gender: "Female", accent: "American" },
];

const LAYOUTS = [
  {
    id: "pip_bottom_right",
    label: "PiP Bottom-Right",
    desc: "Corner badge over B-roll video",
    icon: "↘",
  },
  {
    id: "pip_bottom_left",
    label: "PiP Bottom-Left",
    desc: "Left corner badge over B-roll",
    icon: "↙",
  },
  {
    id: "fullscreen",
    label: "Fullscreen Presenter",
    desc: "Talking head fills the entire frame",
    icon: "🔲",
  },
  {
    id: "circular_bubble",
    label: "Circular Bubble",
    desc: "Floating glowing circular avatar",
    icon: "🫧",
  },
  {
    id: "side_by_side",
    label: "Side by Side",
    desc: "50/50 Split screen with media",
    icon: "◫",
  },
];

export default function AvatarCreatePage() {
  const router = useRouter();

  const [avatarType, setAvatarType] = useState<"preset" | "custom_photo">("preset");
  const [selectedAvatarId, setSelectedAvatarId] = useState("sarah_presenter");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [script, setScript] = useState(
    "Welcome to Clipped AI Studio. Today we are launching new AI-driven video pipelines with full character consistency and multi-track compositing."
  );
  const [voice, setVoice] = useState("nova");
  const [speed, setSpeed] = useState(1.0);
  const [layout, setLayout] = useState("pip_bottom_right");
  const [aspectRatio, setAspectRatio] = useState("9:16");

  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const selectedPreset =
    AVATAR_PRESETS.find((p) => p.id === selectedAvatarId) || AVATAR_PRESETS[0];

  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const estimatedDuration = Math.max(3, Math.ceil((wordCount / 2.5) * (1 / speed)));

  const handleGenerate = async () => {
    if (!script.trim()) return;
    setGenerating(true);
    setStatusMessage("Synthesizing neural voice and initializing talking head compositing...");

    try {
      const res = await fetch("/api/workflows/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          avatarType,
          avatarId: selectedAvatarId,
          customImageUrl: avatarType === "custom_photo" ? customImageUrl : undefined,
          layout,
          voice,
          speed,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (data.success && data.jobId) {
        setStatusMessage("Job created! Redirecting to Mission Progress...");
        router.push(`/create/mission/${data.jobId}`);
      } else {
        setStatusMessage(data.error || "Generation failed");
        setGenerating(false);
      }
    } catch (err: any) {
      setStatusMessage(err.message || "An error occurred");
      setGenerating(false);
    }
  };

  const previewAvatarUrl =
    avatarType === "custom_photo" && customImageUrl.trim().length > 0
      ? customImageUrl
      : selectedPreset.previewUrl;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
              <Video className="w-6 h-6" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              Avatar to Video Studio
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Generate photorealistic and animated talking-head videos with PiP overlays, background B-roll, and neural speech sync.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            HeyGen / LivePortrait & Remotion PiP Ready
          </span>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Avatar Source Tabs */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-violet-400" />
                Presenter Avatar Selection
              </label>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAvatarType("preset")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    avatarType === "preset"
                      ? "bg-violet-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Preset Avatars
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarType("custom_photo")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    avatarType === "custom_photo"
                      ? "bg-violet-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Custom Photo
                </button>
              </div>
            </div>

            {avatarType === "preset" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = selectedAvatarId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatarId(preset.id)}
                      className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col gap-2 ${
                        isSelected
                          ? "bg-violet-500/15 border-violet-500/70 shadow-lg shadow-violet-500/10"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden relative bg-slate-900">
                        <img
                          src={preset.previewUrl}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 p-1 bg-violet-600 rounded-full text-white shadow">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-100 truncate">{preset.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{preset.style.replace("_", " ")}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Custom Photo Image URL (Front-facing portrait)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 bg-slate-950/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                  </div>
                </div>
                {customImageUrl && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                    <img src={customImageUrl} alt="Custom Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Script Input */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Spoken Script & Narration
              </label>
              <span className="text-[11px] text-slate-400">
                {wordCount} words (~{estimatedDuration}s audio)
              </span>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={4}
              placeholder="Enter the speech script for the avatar presenter..."
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none transition-all"
            />
          </div>

          {/* Voice & Speed */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Mic className="w-4 h-4 text-violet-400" />
                Neural Voice
              </label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.gender}, {v.accent})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  Pacing & Speed
                </label>
                <span className="text-xs font-mono text-violet-400">{speed}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-violet-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.75x Slow</span>
                <span>1.0x Normal</span>
                <span>1.5x Fast</span>
              </div>
            </div>
          </div>

          {/* Layout & Aspect Ratio */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <Layout className="w-4 h-4 text-violet-400" />
                Compositing Layout
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLayout(l.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      layout === l.id
                        ? "bg-violet-500/15 border-violet-500/70 text-slate-100 shadow"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-base mb-0.5">{l.icon}</div>
                    <div className="text-xs font-semibold truncate">{l.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "9:16", label: "9:16 Vertical", sub: "Reels / TikTok" },
                  { id: "16:9", label: "16:9 Landscape", sub: "YouTube / Desktop" },
                  { id: "1:1", label: "1:1 Square", sub: "Instagram / Feed" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAspectRatio(r.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      aspectRatio === r.id
                        ? "bg-violet-500/15 border-violet-500/70 text-slate-100 font-semibold"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs">{r.label}</div>
                    <div className="text-[10px] text-slate-500">{r.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !script.trim()}
              type="button"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white font-bold text-base hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-500/20 flex items-center justify-center gap-3 cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Synthesizing & Rendering Avatar...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Talking Head Avatar Video
                </>
              )}
            </button>
            {statusMessage && (
              <p className="text-center text-xs text-violet-400 mt-3 font-medium">{statusMessage}</p>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Live Framing Canvas Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layout className="w-4 h-4 text-violet-400" />
                  Live Framing Canvas Preview
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Real-time simulation of background B-roll and avatar framing
                </p>
              </div>
              <span className="text-[11px] font-mono text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded border border-violet-400/20">
                {aspectRatio}
              </span>
            </div>

            {/* Simulated Video Frame */}
            <div
              className="w-full rounded-2xl border border-slate-700 overflow-hidden relative shadow-2xl bg-slate-950 flex flex-col justify-between"
              style={{
                aspectRatio: aspectRatio === "9:16" ? "9/16" : aspectRatio === "1:1" ? "1/1" : "16/9",
              }}
            >
              {/* Background Video Simulation */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.25),transparent_50%)]" />
              </div>

              {/* Avatar Positioning based on Layout */}
              {layout === "fullscreen" ? (
                <div className="absolute inset-0">
                  <img
                    src={previewAvatarUrl}
                    alt="Presenter"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                </div>
              ) : layout === "pip_bottom_right" ? (
                <div className="absolute bottom-5 right-4 w-[34%] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl shadow-black/80">
                  <img
                    src={previewAvatarUrl}
                    alt="Presenter"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white uppercase backdrop-blur-sm">
                    Live
                  </div>
                </div>
              ) : layout === "pip_bottom_left" ? (
                <div className="absolute bottom-5 left-4 w-[34%] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl shadow-black/80">
                  <img
                    src={previewAvatarUrl}
                    alt="Presenter"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white uppercase backdrop-blur-sm">
                    Live
                  </div>
                </div>
              ) : layout === "circular_bubble" ? (
                <div className="absolute bottom-6 right-5 w-28 h-28 rounded-full overflow-hidden border-4 border-violet-500 shadow-2xl shadow-violet-500/40">
                  <img
                    src={previewAvatarUrl}
                    alt="Presenter"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                /* Side by side */
                <div className="absolute top-0 right-0 w-1/2 h-full border-l border-white/20 overflow-hidden">
                  <img
                    src={previewAvatarUrl}
                    alt="Presenter"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Sample Hormozi Subtitle Overlay */}
              <div className="relative z-10 mt-auto p-4 text-center">
                <div className="inline-block bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                    NEW AI-DRIVEN
                  </span>{" "}
                  <span className="text-xs font-extrabold text-white uppercase tracking-wide">
                    VIDEO PIPELINES
                  </span>
                </div>
              </div>
            </div>

            {/* Audio Wave Visualizer Simulation */}
            <div className="mt-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-violet-500/20 text-violet-400 rounded-lg">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Voice Sync: {voice.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-500">Duration: ~{estimatedDuration}s</div>
                </div>
              </div>
              <div className="flex items-end gap-1 h-5">
                {[40, 70, 95, 55, 80, 100, 60, 45, 90, 75].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-violet-500 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
