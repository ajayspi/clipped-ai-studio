"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ListVideo, Loader2 } from "lucide-react";

export function RenderQueueIndicator() {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/jobs?limit=20");
        const data = await res.json();
        const jobs = data.jobs || [];
        const active = jobs.filter((j: any) =>
          ["pending", "generating_plan", "processing"].includes(j.status)
        );
        setActiveCount(active.length);
      } catch {}
    }

    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/queue"
      className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/50 bg-card/70 hover:bg-accent/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-all backdrop-blur-md"
      title="Render Queue"
    >
      {activeCount > 0 ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
      ) : (
        <ListVideo className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline">Queue</span>
      {activeCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse shadow-sm shadow-violet-500/30">
          {activeCount}
        </span>
      )}
    </Link>
  );
}
