"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { MissionJobState } from "@/lib/engine/types";
import { transferMissionToWizard } from "./MissionStateHandoff";

interface MissionHeaderProps {
  job: MissionJobState;
  onRetry?: () => void;
}

export function MissionHeader({ job, onRetry }: MissionHeaderProps) {
  const router = useRouter();
  const isCompleted = job.overallProgress === 100 && !job.error;
  const isFailed = Boolean(job.error);

  const handleEditInWizard = () => {
    transferMissionToWizard(job, router);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 md:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Title & Metadata */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Automatic Mission Mode
            </span>

            {isCompleted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed (100%)
              </span>
            ) : isFailed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                Failed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                In Progress ({job.overallProgress}%)
              </span>
            )}

            <span className="text-xs px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
              {job.aspectRatio || "9:16"}
            </span>

            <span className="text-xs px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 capitalize">
              Voice: {job.voice || "alloy"}
            </span>

            <span className="text-xs px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 capitalize">
              Style: {job.style || "cinematic"}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground line-clamp-2">
            {job.prompt}
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isFailed && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border/60 bg-muted/40 hover:bg-muted text-foreground transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Mission
            </button>
          )}

          <button
            onClick={handleEditInWizard}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Manual / Edit in Wizard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mt-5 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Overall Mission Pipeline Progress</span>
          <span className="font-semibold text-foreground">{job.overallProgress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/30">
          <div
            className={`h-full transition-all duration-500 ${
              isFailed
                ? "bg-rose-500"
                : isCompleted
                ? "bg-gradient-to-r from-violet-500 to-emerald-500"
                : "bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600"
            }`}
            style={{ width: `${Math.max(3, job.overallProgress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
