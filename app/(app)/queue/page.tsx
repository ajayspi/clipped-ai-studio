"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ListVideo,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Play,
  Download,
  Trash2,
  Film,
} from "lucide-react";

interface RenderJob {
  id: string;
  title: string;
  status: "pending" | "generating_plan" | "processing" | "completed" | "failed";
  progress: number;
  workflow_type: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
  output_url: string | null;
  clip_count: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<any>; bg: string }> = {
  pending: { label: "Queued", color: "text-amber-500", icon: Clock, bg: "bg-amber-500/10 border-amber-500/20" },
  generating_plan: { label: "Planning", color: "text-blue-500", icon: Loader2, bg: "bg-blue-500/10 border-blue-500/20" },
  processing: { label: "Rendering", color: "text-violet-500", icon: Loader2, bg: "bg-violet-500/10 border-violet-500/20" },
  completed: { label: "Done", color: "text-emerald-500", icon: CheckCircle2, bg: "bg-emerald-500/10 border-emerald-500/20" },
  failed: { label: "Failed", color: "text-red-500", icon: XCircle, bg: "bg-red-500/10 border-red-500/20" },
};

export default function QueuePage() {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "completed" | "failed">("active");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      console.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 8000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const activeJobs = jobs.filter((j) =>
    ["pending", "generating_plan", "processing"].includes(j.status)
  );
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  const displayJobs =
    tab === "active" ? activeJobs : tab === "completed" ? completedJobs : failedJobs;

  const tabs = [
    { key: "active" as const, label: "Active", count: activeJobs.length },
    { key: "completed" as const, label: "Completed", count: completedJobs.length },
    { key: "failed" as const, label: "Failed", count: failedJobs.length },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ListVideo className="w-6 h-6 text-violet-500" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Render Queue
            </h1>
            {activeJobs.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-500 border border-violet-500/20 animate-pulse">
                {activeJobs.length} active
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track your video renders and download completed exports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/50 bg-card/70 hover:bg-accent/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-all backdrop-blur-md cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Create New Video
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/40 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.key
                ? "bg-background text-foreground shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key
                  ? "bg-violet-500/10 text-violet-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Job List */}
      <div className="space-y-3">
        {loading && jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading render queue...</span>
          </div>
        ) : displayJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Film className="w-10 h-10 opacity-30" />
            <p className="text-sm">No {tab} jobs found</p>
            {tab === "active" && (
              <Link
                href="/create"
                className="text-xs text-violet-500 hover:text-violet-400 font-medium"
              >
                Create your first video →
              </Link>
            )}
          </div>
        ) : (
          displayJobs.map((job) => {
            const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const isSpinning = ["generating_plan", "processing"].includes(job.status);

            return (
              <div
                key={job.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/70 backdrop-blur-md hover:border-border/80 transition-all"
              >
                {/* Status Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cfg.bg} shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${cfg.color} ${isSpinning ? "animate-spin" : ""}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {job.title}
                    </p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {job.workflow_type}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  {isSpinning && (
                    <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, job.progress)}%` }}
                      />
                    </div>
                  )}
                  {job.error_message && (
                    <p className="text-[11px] text-red-400 mt-1 truncate">{job.error_message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {job.status === "completed" && job.output_url && (
                    <a
                      href={job.output_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
