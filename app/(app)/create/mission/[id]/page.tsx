"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { MissionJobState } from "@/lib/engine/types";
import { MissionHeader } from "./components/MissionHeader";
import { MissionStepper } from "./components/MissionStepper";
import { MissionLogConsole } from "./components/MissionLogConsole";
import { MissionLivePreview } from "./components/MissionLivePreview";

export default function MissionProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const jobId = unwrappedParams.id;
  const searchParams = useSearchParams();

  const [job, setJob] = useState<MissionJobState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fallback bootstrap if triggered via query params
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    const autoStartParam = searchParams.get("autoStart");

    if (promptParam && autoStartParam === "true") {
      fetch("/api/workflows/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptParam,
          aspectRatio: "9:16",
          style: "cinematic",
          voice: "alloy",
        }),
      }).catch((err) => console.warn("Background auto-start error:", err));
    }
  }, [searchParams]);

  // Polling function for job status
  const pollJobStatus = async () => {
    try {
      const res = await fetch(`/api/workflows/mission?id=${encodeURIComponent(jobId)}`);
      if (!res.ok) {
        if (res.status === 404 && !job) {
          // If not found yet, create initial placeholder while orchestrator spins up
          const fallbackPrompt = searchParams.get("prompt") || "Automatic Video Mission";
          setJob({
            jobId,
            prompt: fallbackPrompt,
            aspectRatio: "9:16",
            style: "cinematic",
            voice: "alloy",
            currentStage: "script_generation",
            overallProgress: 10,
            steps: [
              {
                stage: "script_generation",
                label: "Script Generation",
                status: "in_progress",
                progress: 25,
                startedAt: new Date().toISOString(),
                log: `[Stage 1: Script] Analyzing topic "${fallbackPrompt}"...`,
              },
              { stage: "scene_planning", label: "Scene Decomposition", status: "pending", progress: 0 },
              { stage: "asset_sourcing", label: "Asset Sourcing", status: "pending", progress: 0 },
              { stage: "voice_synthesis", label: "Voice & Audio Synthesis", status: "pending", progress: 0 },
              { stage: "video_composition", label: "Video Composition", status: "pending", progress: 0 },
            ],
          });
        }
        return;
      }

      const json = await res.json();
      if (json.success) {
        setJob({
          jobId: json.jobId,
          prompt: json.data?.prompt || "Video Mission",
          aspectRatio: json.data?.aspectRatio || "9:16",
          style: json.data?.style || "cinematic",
          voice: json.data?.voice || "alloy",
          currentStage: json.currentStage || "ready",
          overallProgress: json.overallProgress ?? 0,
          steps: json.steps || [],
          script: json.data?.script,
          scenes: json.data?.scenes,
          audioUrl: json.data?.audioUrl,
          videoUrl: json.data?.videoUrl,
          error: json.error,
        });
        setFetchError(null);
      }
    } catch (err: any) {
      console.warn("Polling error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    pollJobStatus();

    // Poll every 1000ms until completion or failure
    const interval = setInterval(() => {
      if (job && (job.overallProgress === 100 || job.error)) {
        clearInterval(interval);
        return;
      }
      pollJobStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId, job?.overallProgress, job?.error]);

  const handleRetry = async () => {
    if (!job) return;
    setLoading(true);
    try {
      await fetch("/api/workflows/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: job.prompt,
          aspectRatio: job.aspectRatio,
          style: job.style,
          voice: job.voice,
        }),
      });
      pollJobStatus();
    } catch (err: any) {
      setFetchError(err.message || "Failed to retry mission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Create Hub</span>
        </Link>

        <span className="text-xs font-mono text-muted-foreground">
          Job ID: <span className="text-foreground">{jobId.substring(0, 13)}...</span>
        </span>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-500 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={pollJobStatus}
            className="underline font-semibold cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* Main Mission View */}
      {job ? (
        <div className="space-y-6">
          {/* Header Card */}
          <MissionHeader job={job} onRetry={handleRetry} />

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (5-Stage Visualizer & Log Console) */}
            <div className="lg:col-span-7 space-y-6">
              <MissionStepper steps={job.steps || []} currentStage={job.currentStage} />
              <MissionLogConsole steps={job.steps || []} error={job.error} />
            </div>

            {/* Right Column (Live Player & Storyboard Preview) */}
            <div className="lg:col-span-5 space-y-6">
              <MissionLivePreview job={job} />

              {/* Script / Narration Summary Card */}
              {job.script && (
                <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Generated Narration Script
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
                      {job.script.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed max-h-40 overflow-y-auto pr-1">
                    {job.script}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-violet-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-foreground">Initializing Autonomous Mission Pipeline...</p>
          <p className="text-xs text-muted-foreground">Connecting to orchestrator and reserving render resources...</p>
        </div>
      )}
    </div>
  );
}
