"use client";

import React from "react";
import {
  FileText,
  Film,
  Image as ImageIcon,
  Mic,
  Video,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { MissionStepStatus, MissionStage } from "@/lib/engine/types";

interface MissionStepperProps {
  steps: MissionStepStatus[];
  currentStage: MissionStage;
}

const STAGE_META: Record<
  string,
  { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }
> = {
  script_generation: {
    title: "1. Script Generation",
    subtitle: "Narrative hook, structured dialogue & retention copy",
    icon: FileText,
  },
  scene_planning: {
    title: "2. Scene Decomposition",
    subtitle: "Storyboard beats, camera motions & timing breakdown",
    icon: Film,
  },
  asset_sourcing: {
    title: "3. Asset Sourcing",
    subtitle: "HD Stock video footage & AI generative visual matching",
    icon: ImageIcon,
  },
  voice_synthesis: {
    title: "4. Voice & Audio",
    subtitle: "Neural TTS voiceover synthesis & audio track syncing",
    icon: Mic,
  },
  video_composition: {
    title: "5. Video Composition",
    subtitle: "Remotion storyboard assembly, subtitles & playback bundle",
    icon: Video,
  },
};

export function MissionStepper({ steps, currentStage }: MissionStepperProps) {
  // Ensure we display all 5 steps in order even if not yet populated
  const defaultStages: Array<{ stage: MissionStage; label: string }> = [
    { stage: "script_generation", label: "Script Generation" },
    { stage: "scene_planning", label: "Scene Decomposition" },
    { stage: "asset_sourcing", label: "Asset Sourcing" },
    { stage: "voice_synthesis", label: "Voice & Audio Synthesis" },
    { stage: "video_composition", label: "Video Composition" },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 md:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Autonomous 5-Stage Pipeline
        </h2>
        <span className="text-xs text-muted-foreground">
          {steps.filter((s) => s.status === "completed").length} of 5 Stages Completed
        </span>
      </div>

      <div className="space-y-3">
        {defaultStages.map((def, idx) => {
          const stepData = steps.find((s) => s.stage === def.stage) || {
            stage: def.stage,
            label: def.label,
            status: "pending" as const,
            progress: 0,
          };

          const meta = STAGE_META[def.stage] || {
            title: def.label,
            subtitle: "Processing stage",
            icon: Film,
          };
          const Icon = meta.icon;

          const isCompleted = stepData.status === "completed";
          const isInProgress = stepData.status === "in_progress";
          const isFailed = stepData.status === "failed";
          const isPending = stepData.status === "pending";

          return (
            <div
              key={def.stage}
              className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                isInProgress
                  ? "border-violet-500/50 bg-violet-500/5 shadow-sm shadow-violet-500/5"
                  : isCompleted
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : isFailed
                  ? "border-rose-500/30 bg-rose-500/5"
                  : "border-border/40 bg-muted/20 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Icon & Titles */}
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      isCompleted
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                        : isInProgress
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-500"
                        : isFailed
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
                        : "border-border/40 bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {meta.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {meta.subtitle}
                    </p>
                    {stepData.log && (
                      <p className="text-[11px] text-foreground/80 font-mono pt-1 line-clamp-1">
                        {stepData.log}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Status Badge */}
                <div className="shrink-0">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready
                    </span>
                  )}
                  {isInProgress && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-500/10 text-violet-500 border border-violet-500/20">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Running
                    </span>
                  )}
                  {isFailed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Error
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-muted-foreground border border-border/30">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Line for In-Progress Step */}
              {isInProgress && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-violet-500/20">
                  <div
                    className="h-full bg-violet-500 transition-all duration-300 animate-pulse"
                    style={{ width: `${Math.max(15, stepData.progress || 30)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
