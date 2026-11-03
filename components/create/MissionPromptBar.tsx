"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  ArrowRight,
  Wand2,
  Loader2,
  SlidersHorizontal,
  Clock,
  Ratio,
} from "lucide-react";

interface MissionPromptBarProps {
  onStartMission?: (prompt: string) => void;
}

export const SUGGESTIONS = [
  "Ancient Roman Engineering & Aqueducts",
  "5 Psychology Tricks That Actually Work",
  "Quantum Computing in 60 Seconds",
  "Cyberpunk AI News & Future Tech",
  "How Black Holes Warp Spacetime",
];

export function MissionPromptBar({ onStartMission }: MissionPromptBarProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"auto" | "director">("auto");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [duration, setDuration] = useState<"15s" | "30s" | "60s" | "3m">("30s");

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isSubmitting) return;

    setIsSubmitting(true);

    if (onStartMission) {
      onStartMission(cleanPrompt);
      setIsSubmitting(false);
      return;
    }

    if (mode === "director") {
      // In Director Mode, route to the Creation Wizard with prompt and parameters
      router.push(
        `/create/stories?prompt=${encodeURIComponent(cleanPrompt)}&aspectRatio=${aspectRatio}`
      );
      return;
    }

    // Auto-Pilot Mode: Direct mission API dispatch
    try {
      const res = await fetch("/api/workflows/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanPrompt,
          aspectRatio,
          duration,
          style: "cinematic",
          voice: "alloy",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.jobId) {
          router.push(`/create/mission/${data.jobId}`);
          return;
        }
      }
    } catch (err) {
      console.warn("Direct mission API dispatch error, using fallback navigation:", err);
    }

    // Resilient fallback navigation
    const fallbackJobId = crypto.randomUUID();
    router.push(
      `/create/mission/${fallbackJobId}?prompt=${encodeURIComponent(cleanPrompt)}&aspectRatio=${aspectRatio}&autoStart=true`
    );
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 md:p-6 backdrop-blur-xl shadow-xs dark:shadow-lg dark:shadow-black/20 transition-all space-y-4">
      {/* Glow Effects */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Top Mode Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-tight text-foreground uppercase">
              Production Launchpad
            </span>
          </div>

          {/* Director Mode vs Auto-Pilot Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setMode("auto")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                mode === "auto"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Auto-Pilot (1-Click)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("director")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                mode === "director"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Studio Director (5-Step)</span>
            </button>
          </div>
        </div>

        {/* Input & Launch Button */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-600 dark:text-violet-400 pointer-events-none" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSubmitting}
              placeholder="Type any video concept (e.g., 'How Black Holes Warp Spacetime')..."
              className="w-full rounded-xl border border-border/80 bg-background/90 py-3 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 backdrop-blur-md transition-all disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 px-6 py-3 text-xs font-semibold text-white shadow-md shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer min-w-[150px] shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Launching...</span>
              </>
            ) : mode === "auto" ? (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Auto Generate</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Open Director</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Parameter Preset Controls: Aspect Ratio & Target Duration */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Ratio className="w-3 h-3" /> Ratio:
            </span>
            <div className="flex items-center gap-1">
              {(["9:16", "16:9", "1:1"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    aspectRatio === r
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/60"
                  }`}
                >
                  {r === "9:16" ? "9:16 Vertical" : r === "16:9" ? "16:9 Landscape" : "1:1 Square"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Target Length:
            </span>
            <div className="flex items-center gap-1">
              {(["15s", "30s", "60s", "3m"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    duration === d
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground border-t border-border/40">
          <span className="font-semibold text-foreground/80 mr-1 text-[11px]">Prompt Ideas:</span>
          {SUGGESTIONS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => handleSuggestionClick(topic)}
              disabled={isSubmitting}
              className="rounded-lg border border-border/60 bg-muted/40 hover:bg-muted hover:text-foreground px-2.5 py-1 transition-colors text-[11px] text-left cursor-pointer disabled:opacity-50"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
