"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, ArrowRight, Wand2 } from "lucide-react";

interface MissionPromptBarProps {
  onStartMission?: (prompt: string) => void;
}

const SUGGESTIONS = [
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    setIsSubmitting(true);
    if (onStartMission) {
      onStartMission(cleanPrompt);
    } else {
      router.push(`/create/auto?prompt=${encodeURIComponent(cleanPrompt)}&autoStart=true`);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-card/80 to-fuchsia-500/10 p-5 md:p-6 backdrop-blur-xl shadow-lg shadow-violet-500/5 transition-all">
      {/* Glow Effects */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-tight text-foreground uppercase">
              One-Click Automatic Mission
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              Auto-Pilot
            </span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            Hit <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border">Enter ↵</kbd> to launch
          </span>
        </div>

        {/* Input & Launch Button */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 pointer-events-none" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type any video topic & hit Enter (e.g., 'How black holes warp spacetime')..."
              className="w-full rounded-xl border border-border/60 bg-background/80 py-3.5 pl-10 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 backdrop-blur-md transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Auto Generate</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80 mr-1">Suggestions:</span>
          {SUGGESTIONS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => handleSuggestionClick(topic)}
              className="rounded-lg border border-border/40 bg-accent/30 hover:bg-accent/70 hover:text-foreground px-2.5 py-1 transition-colors text-[11px] text-left cursor-pointer"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
