"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, RefreshCw, Loader2, Clock, CheckCircle2, XCircle, Plus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  generating_plan: "text-blue-400",
  processing: "text-purple-400",
  completed: "text-green-400",
  failed: "text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  generating_plan: "Generating Plan",
  processing: "Rendering",
  completed: "Completed",
  failed: "Failed",
};

export function QueueCard({ job }: { job: any }) {
  const isActive = ["pending", "generating_plan", "processing"].includes(job.status);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3.5 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm shadow-xs"
    >
      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
        {job.thumbnail ? (
          <img src={job.thumbnail} alt={job.title || "Job thumbnail"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-muted-foreground text-[10px]">
            No Preview
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate text-foreground">{job.title || "Untitled Job"}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{job.workflow_type || "Video"}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {isActive ? (
            <div className="w-full bg-muted rounded-full h-1">
              <motion.div
                className="h-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                animate={{ width: ["20%", "80%", "20%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          ) : (
            <span className={`text-[10px] font-medium ${STATUS_COLORS[job.status] || "text-muted-foreground"}`}>
              {STATUS_LABELS[job.status] || job.status}
            </span>
          )}
        </div>
      </div>
      <span
        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
          job.status === "completed"
            ? "bg-green-500/10 text-green-400"
            : job.status === "failed"
            ? "bg-red-500/10 text-red-400"
            : "bg-purple-500/10 text-purple-400"
        }`}
      >
        {STATUS_LABELS[job.status] || job.status}
      </span>
    </motion.div>
  );
}

export default function QueuePage() {
  const [queuedJobs, setQueuedJobs] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [failedJobs, setFailedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "failed">("all");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchJobs();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.success) {
        setQueuedJobs(data.queued || []);
        setCompletedJobs(data.completed || []);
        setFailedJobs(data.failed || []);

        if ((data.queued || []).length > 0) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = setInterval(fetchJobs, 8000);
        } else if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (e) {
      console.error("Failed to load queue jobs:", e);
    } finally {
      setLoading(false);
    }
  }

  const allJobs = [...queuedJobs, ...failedJobs, ...completedJobs];
  const displayedJobs =
    filter === "active"
      ? queuedJobs
      : filter === "completed"
      ? completedJobs
      : filter === "failed"
      ? failedJobs
      : allJobs;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-7 h-7 text-yellow-400" />
            Render Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor background video rendering, status, and job progression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchJobs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border bg-background hover:bg-muted font-medium text-xs transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Video
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Active in Queue</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{queuedJobs.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{completedJobs.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Failed</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{failedJobs.length}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        {(["all", "active", "completed", "failed"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === tab
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Job Grid / List */}
      {displayedJobs.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-card text-center p-8">
          <div>
            <Zap className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-semibold">No jobs in queue</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
              All rendering jobs have settled. Trigger a new video creation to see active progress.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Create New Video
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedJobs.map((job) => (
            <QueueCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
