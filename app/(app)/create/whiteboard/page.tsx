"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PenTool,
  Sparkles,
  Layers,
  Palette,
  Layout,
  Play,
  Loader2,
  CheckCircle2,
  User,
  Sliders,
  Maximize2,
  RefreshCw,
  Eye,
  Info,
} from "lucide-react";

interface CharacterPose {
  name: string;
  description: string;
  bbox: [number, number, number, number];
  svgPath?: string;
}

interface CharacterSheet {
  characterId: string;
  archetype: string;
  customDescription?: string;
  sheetImageUrl: string;
  poses: Record<string, CharacterPose>;
  style: string;
}

const ARCHETYPES = [
  { id: "stickman", label: "Stickman Classic", desc: "Timeless minimalist line art", icon: "✏️" },
  { id: "saint", label: "Saint / Philosopher", desc: "Robed elder with wisdom poses", icon: "📜" },
  { id: "old man", label: "Elder Professor", desc: "Wise elder with cane and glasses", icon: "👴" },
  { id: "founder", label: "Startup Founder", desc: "Modern tech founder presenter", icon: "💼" },
  { id: "doctor", label: "Medical Doctor", desc: "Physician with stethoscope", icon: "🩺" },
  { id: "teacher", label: "Academic Teacher", desc: "Educator with chalkboard pointer", icon: "🎓" },
  { id: "scientist", label: "Lab Scientist", desc: "Researcher with safety goggles", icon: "🧪" },
  { id: "custom", label: "Custom Character", desc: "Bespoke character from prompt", icon: "✨" },
];

const STYLES = [
  { id: "monoline_marker", label: "Monoline Marker", desc: "Clean black marker on white" },
  { id: "blackboard_chalk", label: "Blackboard Chalk", desc: "White chalk on dark slate" },
  { id: "blueprint", label: "Blueprint Grid", desc: "Cyan vector on navy blue" },
  { id: "colored_doodle", label: "Colored Doodle", desc: "Vibrant accent fills" },
  { id: "sketch_outline", label: "Rough Sketch", desc: "Hand-drawn artistic sketch" },
];

const MARKER_COLORS = [
  { name: "Slate Dark", hex: "#1E293B" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Crimson Red", hex: "#DC2626" },
  { name: "Emerald Green", hex: "#16A34A" },
  { name: "Violet Purple", hex: "#9333EA" },
  { name: "Amber Gold", hex: "#D97706" },
];

const POSE_NAMES = [
  { id: "pose_1", label: "Neutral", desc: "Standing balanced" },
  { id: "pose_2", label: "Pointing", desc: "Pointing to concept" },
  { id: "pose_3", label: "Eureka", desc: "Idea discovery moment" },
  { id: "pose_4", label: "Explaining", desc: "Discourse & presenting" },
  { id: "pose_5", label: "Reading", desc: "Reviewing scroll/book" },
  { id: "pose_6", label: "Confused", desc: "Pondering & questioning" },
  { id: "pose_7", label: "Sitting", desc: "Seated posture" },
  { id: "pose_8", label: "Writing", desc: "Inscribing on board" },
  { id: "pose_9", label: "Blessing", desc: "Triumph & wisdom" },
];

export default function WhiteboardCreatePage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("How neural networks learn: from simple weights to intelligence");
  const [archetype, setArchetype] = useState("stickman");
  const [customDescription, setCustomDescription] = useState("");
  const [style, setStyle] = useState("monoline_marker");
  const [markerColor, setMarkerColor] = useState("#1E293B");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [activePosePreview, setActivePosePreview] = useState<string>("pose_1");

  const [characterSheet, setCharacterSheet] = useState<CharacterSheet | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Fetch / Generate character sheet on archetype or style change
  const fetchCharacterSheet = async () => {
    setLoadingSheet(true);
    try {
      const res = await fetch("/api/workflows/whiteboard/character-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archetype,
          customDescription: archetype === "custom" ? customDescription : undefined,
          style,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCharacterSheet(data);
      }
    } catch (err) {
      console.error("Failed to load character sheet:", err);
    } finally {
      setLoadingSheet(false);
    }
  };

  useEffect(() => {
    fetchCharacterSheet();
  }, [archetype, style]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setStatusMessage("Initializing Gemini character reference & storyboard engine...");

    try {
      const res = await fetch("/api/workflows/whiteboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          characterArchetype: archetype,
          customCharacterDescription: customDescription,
          style,
          markerColor,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (data.success && data.jobId) {
        setStatusMessage("Job created successfully! Navigating to Mission Progress...");
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <PenTool className="w-6 h-6" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200 bg-clip-text text-transparent">
              Whiteboard Animation Studio
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Generate animated whiteboard explainer videos powered by Google Gemini 9-pose character reference consistency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Gemini Reference Engine Ready
          </span>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prompt Section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Explainer Topic & Script Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Enter your topic, lessons, or educational concept..."
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none transition-all"
            />
          </div>

          {/* Character Archetype Selection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                Gemini Character Archetype
              </label>
              <button
                onClick={fetchCharacterSheet}
                disabled={loadingSheet}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loadingSheet ? "animate-spin" : ""}`} />
                Regenerate Sheet
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ARCHETYPES.map((arch) => (
                <button
                  key={arch.id}
                  onClick={() => setArchetype(arch.id)}
                  type="button"
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    archetype === arch.id
                      ? "bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10 text-slate-100"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="text-xl mb-1">{arch.icon}</div>
                  <div className="font-semibold text-xs truncate">{arch.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{arch.desc}</div>
                </button>
              ))}
            </div>

            {archetype === "custom" && (
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Custom Character Persona Description
                </label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="e.g. A robotic astronaut in sleek white spacesuit with holographic display"
                  className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            )}
          </div>

          {/* Visual Style & Marker Color */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Style */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Whiteboard Style
              </label>
              <div className="space-y-2">
                {STYLES.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStyle(st.id)}
                    type="button"
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs ${
                      style === st.id
                        ? "bg-amber-500/15 border-amber-500/50 text-slate-100 font-medium"
                        : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className="text-[10px] text-slate-500">{st.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Marker Color & Aspect Ratio */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  Marker Ink Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MARKER_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setMarkerColor(c.hex)}
                      type="button"
                      className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                        markerColor.toLowerCase() === c.hex.toLowerCase()
                          ? "border-amber-500 bg-slate-800 text-slate-100 shadow-sm"
                          : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                      <span className="text-[11px] truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-amber-400" />
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "16:9", label: "16:9 Landscape", sub: "YouTube / Web" },
                    { id: "9:16", label: "9:16 Portrait", sub: "TikTok / Shorts" },
                    { id: "1:1", label: "1:1 Square", sub: "Instagram / Feed" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setAspectRatio(r.id)}
                      type="button"
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        aspectRatio === r.id
                          ? "bg-amber-500/15 border-amber-500/60 text-slate-100 font-semibold"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="text-xs">{r.label}</div>
                      <div className="text-[10px] text-slate-500">{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              type="button"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-slate-950 font-bold text-base hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Whiteboard Video...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 fill-slate-950" />
                  Generate Whiteboard Explainer Video
                </>
              )}
            </button>
            {statusMessage && (
              <p className="text-center text-xs text-amber-400 mt-3 font-medium">{statusMessage}</p>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Gemini 9-Pose Sheet & Preview Canvas (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Gemini 9-Pose Reference Grid */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  Consistent 9-Pose Reference Grid
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Normalized [0,0,1000,1000] canvas poses generated via Gemini
                </p>
              </div>
              <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {archetype}
              </span>
            </div>

            {loadingSheet ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                <span className="text-xs">Generating 9-pose reference sheet...</span>
              </div>
            ) : characterSheet ? (
              <div className="space-y-3">
                {/* 3x3 Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  {POSE_NAMES.map((pose) => {
                    const poseData = characterSheet.poses[pose.id];
                    const isSelected = activePosePreview === pose.id;
                    return (
                      <button
                        key={pose.id}
                        type="button"
                        onClick={() => setActivePosePreview(pose.id)}
                        className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-between gap-1 relative ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-400 text-slate-100 shadow-md"
                            : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center">
                          {poseData?.svgPath ? (
                            <svg viewBox="0 0 100 100" className="w-10 h-10">
                              <path
                                d={poseData.svgPath}
                                fill="none"
                                stroke={isSelected ? "#F59E0B" : markerColor}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <User className="w-6 h-6 text-slate-600" />
                          )}
                        </div>
                        <div className="text-[10px] font-semibold truncate w-full">{pose.label}</div>
                        <div className="text-[8px] font-mono text-slate-500">{pose.id}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Pose Detail */}
                {characterSheet.poses[activePosePreview] && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300 flex items-start gap-3">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-100">
                        {activePosePreview.toUpperCase()}: {characterSheet.poses[activePosePreview].name}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {characterSheet.poses[activePosePreview].description}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 block mt-1">
                        BBox: [{characterSheet.poses[activePosePreview].bbox.join(", ")}]
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                No sheet loaded
              </div>
            )}
          </div>

          {/* Live Whiteboard Drawing Canvas Mockup */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-amber-400" />
              Live Progressive Sketch Canvas
            </h3>

            <div
              className={`w-full rounded-xl border border-slate-700/60 overflow-hidden relative flex flex-col justify-between p-4 shadow-inner ${
                style === "blackboard_chalk"
                  ? "bg-slate-900 text-slate-100"
                  : style === "blueprint"
                  ? "bg-sky-950 text-cyan-200"
                  : "bg-white text-slate-900"
              }`}
              style={{
                aspectRatio: aspectRatio === "9:16" ? "9/12" : aspectRatio === "1:1" ? "1/1" : "16/9",
              }}
            >
              {/* Canvas Header */}
              <div className="text-[11px] font-bold opacity-75 truncate">{prompt}</div>

              {/* Center Sketch with Hand Marker */}
              <div className="flex-1 flex items-center justify-center relative">
                {characterSheet?.poses[activePosePreview]?.svgPath && (
                  <svg viewBox="0 0 100 100" className="w-24 h-24 sm:w-28 sm:h-28">
                    <path
                      d={characterSheet.poses[activePosePreview].svgPath}
                      fill="none"
                      stroke={
                        style === "blackboard_chalk"
                          ? "#FFFFFF"
                          : style === "blueprint"
                          ? "#67E8F9"
                          : markerColor
                      }
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}

                {/* Animated Hand Marker Overlay Mock */}
                <div className="absolute top-1/2 right-1/4 translate-x-2 -translate-y-2 pointer-events-none animate-bounce">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                    <PenTool className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                </div>
              </div>

              {/* Subtitle Line */}
              <div
                className="text-center font-bold text-xs py-1 px-3 rounded shadow-sm mx-auto"
                style={{
                  backgroundColor:
                    style === "blackboard_chalk" || style === "blueprint"
                      ? "rgba(0,0,0,0.6)"
                      : "rgba(241, 245, 249, 0.9)",
                  fontFamily: "Caveat, cursive, sans-serif",
                  fontSize: "15px",
                }}
              >
                "Here is how this fundamental mechanism operates."
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
