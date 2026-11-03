"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Loader2,
  Trash2,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import type { CanonicalJobPresentation } from "@/lib/engine/job-presentation";

const ACTIVE_STATUSES = [
  "pending",
  "generating_plan",
  "processing",
  "queued",
  "claimed",
  "rendering",
  "planning",
  "in_progress",
  "retryable",
];

interface ActiveOperationsDeckProps {
  initialJobs: CanonicalJobPresentation[];
}

export function ActiveOperationsDeck({ initialJobs }: ActiveOperationsDeckProps) {
  const [jobs, setJobs] = useState<CanonicalJobPresentation[]>(initialJobs);
  const [cancelingIds, setCancelingIds] = useState<Set<string>>(new Set());

  // Function to refresh active jobs from /api/jobs
  const refreshJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs?limit=25");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.queued)) {
        setJobs(data.queued);
      }
    } catch (err) {
      console.warn("Failed to poll active jobs:", err);
    }
  }, []);

  // Poll while there are active operations
  useEffect(() => {
    const hasActive = jobs.some(
      (j) =>
        ACTIVE_STATUSES.includes(j.status) ||
        (j.orchestration_state ? ACTIVE_STATUSES.includes(j.orchestration_state) : false)
    );

    if (!hasActive) return;

    const interval = setInterval(refreshJobs, 4000);
    return () => clearInterval(interval);
  }, [jobs, refreshJobs]);

  const handleCancel = async (jobId: string) => {
    if (!jobId || cancelingIds.has(jobId)) return;

    setCancelingIds((prev) => new Set(prev).add(jobId));
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Optimistically remove from state
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch (err) {
      console.error("Failed to cancel job:", err);
    } finally {
      setCancelingIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  // Only render when active jobs exist
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-card to-orange-500/10 p-5 shadow-xs dark:shadow-lg dark:shadow-amber-500/5 backdrop-blur-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2 uppercase">
              <Activity className="w-4 h-4 text-amber-500" />
              Active Operations Deck
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/35">
                {jobs.length} in progress
              </span>
            </h2>
          </div>
        </div>

        <Link
          href="/queue"
          className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors flex items-center gap-1"
        >
          View Full Queue
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {jobs.map((job) => {
          const isCanceling = cancelingIds.has(job.id);
          const rawProgress = job.progress || 0;
          const displayProgress = Math.max(10, Math.min(100, Math.round(rawProgress)));
          const isPlanning =
            job.status === "generating_plan" ||
            job.status === "planning" ||
            job.orchestration_state === "planning";

          const statusText = isPlanning
            ? "Planning Storyboard & Script..."
            : job.status === "queued" || job.orchestration_state === "queued"
            ? "Queued in Line..."
            : `Rendering Beats & Audio (${displayProgress}%)`;

          return (
            <div
              key={job.id}
              className="relative flex flex-col justify-between p-4 rounded-xl border border-border/80 bg-card backdrop-blur-xs space-y-3 transition-all hover:border-amber-500/40 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-500/20">
                      <Sparkles className="w-3 h-3" />
                      {job.workflowType || "Auto-Pilot"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      #{job.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate" title={job.title}>
                    {job.title || "Processing Video..."}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/queue?highlight=${job.id}`}
                    className="p-1.5 rounded-lg border border-border/50 bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Inspect in Queue"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleCancel(job.id)}
                    disabled={isCanceling}
                    className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Cancel Job"
                  >
                    {isCanceling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Progress Bar & Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                    {statusText}
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {displayProgress}%
                  </span>
                </div>

                <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-500 rounded-full"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
