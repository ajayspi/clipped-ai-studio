"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Wand2,
  Loader2,
  Scissors,
  Clapperboard,
  PenTool,
  Layers,
} from "lucide-react";

const SIGNATURE_SHORTCUTS = [
  {
    id: "shorts",
    label: "Social Shorts",
    href: "/create/shorts",
    icon: Scissors,
    badge: "Viral Hooks",
    desc: "Vertical 9:16 clips with AI animated captions",
    color: "from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20 hover:border-amber-500/50",
  },
  {
    id: "cinema",
    label: "Cinema & Drama",
    href: "/create/drama",
    icon: Clapperboard,
    badge: "Multi-Episode",
    desc: "Episodic storytelling with character consistency",
    color: "from-indigo-500/10 to-purple-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 dark:border-indigo-500/20 hover:border-indigo-500/50",
  },
  {
    id: "2d",
    label: "2D & Explainer",
    href: "/create/2d",
    icon: PenTool,
    badge: "$0 Stick/Whiteboard",
    desc: "Zero-cost procedural stick figure & whiteboard engine",
    color: "from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/20 hover:border-emerald-500/50",
  },
  {
    id: "campaign",
    label: "Bulk Campaign",
    href: "/create/campaign",
    icon: Layers,
    badge: "30-Day Batch",
    desc: "Automated multi-week video drops scheduled to calendar",
    color: "from-rose-500/10 to-pink-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 dark:border-rose-500/20 hover:border-rose-500/50",
  },
];

export function OmniLaunchpad() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/workflows/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanPrompt,
          aspectRatio: "9:16",
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

    // Fallback navigation
    const fallbackJobId = crypto.randomUUID();
    router.push(`/create/mission/${fallbackJobId}?prompt=${encodeURIComponent(cleanPrompt)}&autoStart=true`);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 md:p-6 backdrop-blur-xl shadow-xs dark:shadow-lg dark:shadow-black/20 transition-all space-y-5">
      {/* Subtle ambient lighting */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Fast Navigation */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              Omni-Launchpad
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20">
                Studio Jump Deck
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Launch autonomous video workflows or open specialized creative studios
            </p>
          </div>
        </div>

        <Link
          href="/create"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] w-fit"
        >
          <span>Open Full Studio Hub</span>
          <ArrowRight className="w-3.5 h-3.5 text-primary" />
        </Link>
      </div>

      {/* 4 Signature Studios Jump Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SIGNATURE_SHORTCUTS.map((studio) => {
          const Icon = studio.icon;
          return (
            <Link
              key={studio.id}
              href={studio.href}
              className={`group flex flex-col justify-between p-3.5 rounded-xl border bg-gradient-to-br ${studio.color} backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-card border border-border/60 text-foreground group-hover:text-primary transition-colors shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {studio.label}
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-card/80 border border-border/60 text-muted-foreground group-hover:text-foreground transition-colors">
                  {studio.badge}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1 group-hover:text-foreground/80 transition-colors">
                {studio.desc}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Sleek Fast-Track Single-Line Prompt Bar */}
      <div className="relative z-10 pt-1">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-600 dark:text-violet-400 pointer-events-none" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSubmitting}
              placeholder="What video do you want to create today? [ e.g. 3 Facts About Black Holes ]"
              className="w-full rounded-xl border border-border/80 bg-background/90 py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 backdrop-blur-md transition-all disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Pilot Launch</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
