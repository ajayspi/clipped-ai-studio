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
  Download,
  Film,
  Trash2,
  Languages,
  RotateCcw,
  Ban,
  Terminal,
  Pause,
  Play,
  X,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  logs?: string | Record<string, unknown> | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }>; bg: string }
> = {
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
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [diagnosticJob, setDiagnosticJob] = useState<RenderJob | null>(null);
  const [dubbingJobId, setDubbingJobId] = useState<string | null>(null);
  const [dubLanguages, setDubLanguages] = useState<string[]>([]);
  const [isDubbing, setIsDubbing] = useState(false);

  const fetchJobs = useCallback(async () => {
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

  // Polling countdown & execution
  useEffect(() => {
    // Initial fetch
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!isPolling) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchJobs();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPolling, fetchJobs]);

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job record?")) return;
    setActionInProgressId(id);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
      } else {
        alert("Failed to delete job.");
      }
    } catch {
      alert("Error deleting job.");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRetryJob = async (id: string) => {
    setActionInProgressId(id);
    try {
      const res = await fetch(`/api/jobs/${id}/retry`, { method: "POST" });
      if (res.ok) {
        await fetchJobs();
        setTab("active");
        if (diagnosticJob?.id === id) setDiagnosticJob(null);
      } else {
        const err = await res.json();
        alert(`Failed to retry job: ${err.error || "Unknown error"}`);
      }
    } catch {
      alert("Error retrying job.");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleAbortJob = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this render job?")) return;
    setActionInProgressId(id);
    try {
      const res = await fetch(`/api/jobs/${id}/abort`, { method: "POST" });
      if (res.ok) {
        await fetchJobs();
      } else {
        alert("Failed to abort job.");
      }
    } catch {
      alert("Error aborting job.");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handlePurgeFailed = async () => {
    const failedList = jobs.filter((j) => j.status === "failed");
    if (failedList.length === 0) return;
    if (!confirm(`Are you sure you want to purge all ${failedList.length} failed jobs?`)) return;

    for (const job of failedList) {
      try {
        await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      } catch {}
    }
    await fetchJobs();
  };

  const handleDubSubmit = async () => {
    if (!dubbingJobId || dubLanguages.length === 0) return;
    setIsDubbing(true);
    try {
      const res = await fetch(`/api/jobs/${dubbingJobId}/dub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languages: dubLanguages }),
      });
      if (res.ok) {
        setDubbingJobId(null);
        setDubLanguages([]);
        fetchJobs();
      } else {
        alert("Failed to queue dubbing jobs.");
      }
    } catch {
      alert("Error dubbing job.");
    } finally {
      setIsDubbing(false);
    }
  };

  const activeJobs = jobs.filter((j) =>
    ["pending", "generating_plan", "processing"].includes(j.status)
  );
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  const displayJobs =
    tab === "active" ? activeJobs : tab === "completed" ? completedJobs : failedJobs;

  const tabs = [
    { key: "active" as const, label: "Active Pipeline", count: activeJobs.length },
    { key: "completed" as const, label: "Completed", count: completedJobs.length },
    { key: "failed" as const, label: "Failed", count: failedJobs.length },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <ListVideo className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Render Queue & Diagnostics
            </h1>
            {activeJobs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                {activeJobs.length} active
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time worker telemetry, render recovery, and error diagnostics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Polling Toggle with 5s Countdown */}
          <button
            type="button"
            onClick={() => setIsPolling(!isPolling)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              isPolling
                ? "bg-card/70 border-border/60 text-foreground hover:bg-muted"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
            }`}
            title={isPolling ? "Pause live telemetry" : "Resume live telemetry"}
          >
            {isPolling ? (
              <>
                <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Live ({countdown}s)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>Paused</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setCountdown(5);
              fetchJobs();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card/70 hover:bg-muted text-xs font-medium text-foreground transition-all cursor-pointer disabled:opacity-50"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {failedJobs.length > 0 && tab === "failed" && (
            <button
              onClick={handlePurgeFailed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-400 transition-all cursor-pointer"
              title="Purge all failed jobs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge All Failed ({failedJobs.length})</span>
            </button>
          )}

          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Create Video
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card/60 border border-border/40 w-fit backdrop-blur-md">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === t.key
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                tab === t.key
                  ? "bg-black/20 text-primary-foreground"
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
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-medium">Connecting to render telemetry queue...</span>
          </div>
        ) : displayJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 rounded-2xl border border-dashed border-border/60 bg-card/40">
            <Film className="w-10 h-10 opacity-25" />
            <p className="text-sm font-medium text-foreground">No {tab} jobs in this queue</p>
            <p className="text-xs text-muted-foreground max-w-xs text-center">
              {tab === "active"
                ? "The worker cluster is idle and ready for new render jobs."
                : tab === "completed"
                  ? "Completed videos appear in your library and can be downloaded or shared."
                  : "Zero failed jobs. All render pipelines are operating smoothly."}
            </p>
            {tab === "active" && (
              <Link
                href="/create"
                className="mt-2 text-xs text-primary hover:underline font-semibold"
              >
                Launch your first video workflow →
              </Link>
            )}
          </div>
        ) : (
          displayJobs.map((job) => {
            const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const isSpinning = ["generating_plan", "processing"].includes(job.status);
            const isBusy = actionInProgressId === job.id;

            return (
              <div
                key={job.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/70 backdrop-blur-md hover:border-border/80 transition-all shadow-xs"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Status Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cfg.bg} shrink-0`}>
                    <Icon className={`w-4.5 h-4.5 ${cfg.color} ${isSpinning ? "animate-spin" : ""}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {job.title || "Untitled Video Render"}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="capitalize">{job.workflow_type || "default"}</span>
                      <span>•</span>
                      <span>{new Date(job.created_at).toLocaleString()}</span>
                      {job.clip_count > 0 && (
                        <>
                          <span>•</span>
                          <span>{job.clip_count} clips</span>
                        </>
                      )}
                    </div>

                    {/* Progress Bar for Active Jobs */}
                    {isSpinning && (
                      <div className="mt-2 w-full max-w-md h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, job.progress)}%` }}
                        />
                      </div>
                    )}

                    {/* Error Snippet */}
                    {job.error_message && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{job.error_message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Suite */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Failed Job: 1-Click Retry */}
                  {job.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => handleRetryJob(job.id)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/30 hover:bg-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                      title="Re-queue render job"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      <span>Retry</span>
                    </button>
                  )}

                  {/* Failed Job: Diagnostic Drawer */}
                  {job.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => setDiagnosticJob(job)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Inspect Diagnostic Error Logs"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Inspect Logs</span>
                    </button>
                  )}

                  {/* Active Job: Abort / Cancel */}
                  {["pending", "generating_plan", "processing"].includes(job.status) && (
                    <button
                      type="button"
                      onClick={() => handleAbortJob(job.id)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      title="Cancel job execution"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      <span>Cancel</span>
                    </button>
                  )}

                  {/* Completed Job: Download */}
                  {job.status === "completed" && job.output_url && (
                    <a
                      href={job.output_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}

                  {/* Completed Job: Edit in NLE Timeline */}
                  {job.status === "completed" && (
                    <Link
                      href={`/editor/${job.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Editor</span>
                    </Link>
                  )}

                  {/* Delete Job */}
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    disabled={isBusy}
                    className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Delete job record"
                    aria-label="Delete job record"
                  >
                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3-Part Diagnostic Log Drawer Modal */}
      <AnimatePresence>
        {diagnosticJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDiagnosticJob(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-5 border-b border-border/40 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-rose-400" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Diagnostic Error Breakdown</h3>
                    <p className="text-[11px] text-muted-foreground">Job ID: {diagnosticJob.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDiagnosticJob(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close diagnostic modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* 1. What Happened */}
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                  <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">
                    1. What Failed
                  </span>
                  <p className="text-foreground">
                    Video generation halted during the render pipeline execution.
                  </p>
                </div>

                {/* 2. Why it occurred */}
                <div className="p-3 rounded-xl bg-background border border-border/60 space-y-1">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    2. Error Details
                  </span>
                  <p className="font-mono text-rose-300 text-[11px] break-all">
                    {diagnosticJob.error_message || "Execution terminated without an explicit exit message."}
                  </p>
                </div>

                {/* 3. Actionable Fix */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
                    3. Recommended Action
                  </span>
                  <p className="text-foreground">
                    Click <strong>1-Click Retry</strong> to re-lease the job to the worker cluster. If using external LLM providers, verify API keys in Settings.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setDiagnosticJob(null)}
                    className="px-4 py-2 border border-border/60 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRetryJob(diagnosticJob.id)}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-xl font-semibold shadow-sm hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>1-Click Retry</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
