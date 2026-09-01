"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiKeysMap, CostTier } from "@/lib/engine/types";
import {
  ExtendedWorkflowDefinition,
  evaluateWorkflowStatus,
  isProviderConfigured,
} from "./workflow-definitions";

interface WorkflowCardProps {
  workflow: ExtendedWorkflowDefinition;
  keyStatusMap?: ApiKeysMap;
  onOpenSettings?: (url: string) => void;
}

const COST_TIER_LABELS: Record<CostTier, { label: string; desc: string; style: string }> = {
  $: {
    label: "$ Low Cost / Free",
    desc: "Built-in zero-cost templates, public archives, or local rendering",
    style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  $$: {
    label: "$$ Standard AI",
    desc: "Gemini / GPT / Flux image generation & neural audio",
    style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  $$$: {
    label: "$$$ High Compute",
    desc: "Diffusion video models (Kling, Luma) or AI Talking Avatars (HeyGen)",
    style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
};

export function WorkflowCard({
  workflow,
  keyStatusMap = {},
  onOpenSettings,
}: WorkflowCardProps) {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);

  const evaluation = evaluateWorkflowStatus(workflow, keyStatusMap);
  const costInfo = COST_TIER_LABELS[workflow.costTier] || COST_TIER_LABELS["$"];

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetUrl = workflow.settingsUrl || "/settings";
    if (onOpenSettings) {
      onOpenSettings(targetUrl);
    } else {
      router.push(targetUrl);
    }
  };

  const statusStyles = {
    ready: {
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse",
      icon: CheckCircle2,
      label: "Ready",
    },
    warning: {
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
      icon: AlertCircle,
      label: "Fallback",
    },
    error: {
      badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
      icon: XCircle,
      label: "Keys Needed",
    },
  }[evaluation.status];

  const Icon = workflow.icon;

  return (
    <Link
      href={workflow.href}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-card/70 dark:bg-zinc-900/60 backdrop-blur-xl p-6 shadow-sm transition-all duration-300",
        "hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1 hover:border-violet-500/40",
        workflow.borderHover
      )}
    >
      {/* Ambient Glow Accent */}
      <div
        className={cn(
          "absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl pointer-events-none opacity-30 group-hover:opacity-75 transition-all duration-500 bg-gradient-to-br",
          workflow.glowBg
        )}
      />

      <div>
        {/* Header Row: Icon + Badges + Settings Link */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className={cn("inline-flex rounded-xl p-3 border border-border/30", workflow.bg)}>
              <Icon className={cn("h-6 w-6", workflow.color)} />
            </div>
            {workflow.badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
                {workflow.badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 relative">
            {/* Status Dot Pill with Tooltip trigger */}
            <div
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-help transition-colors",
                  statusStyles.badge
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", statusStyles.dot)} />
                <span>{statusStyles.label}</span>
              </div>

              {/* Glassmorphic Tooltip Popover */}
              {showTooltip && (
                <div
                  className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-border/60 bg-popover/95 dark:bg-zinc-950/95 p-3.5 text-popover-foreground shadow-2xl backdrop-blur-xl transition-all animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <div className="text-xs font-semibold pb-2 border-b border-border/40 flex items-center justify-between">
                    <span>API Configuration</span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {workflow.title}
                    </span>
                  </div>

                  <div className="py-2.5 space-y-1.5 text-xs">
                    {workflow.primaryProviders.map((provider) => {
                      const isConfig = isProviderConfigured(provider, keyStatusMap);
                      const keyInfo =
                        keyStatusMap[provider] || keyStatusMap[`api_${provider}`];
                      return (
                        <div
                          key={provider}
                          className="flex items-center justify-between text-xs py-0.5"
                        >
                          <span className="capitalize text-foreground font-medium">
                            {provider}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] font-mono px-1.5 py-0.5 rounded border",
                              isConfig
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                : "text-muted-foreground bg-muted/30 border-border/40"
                            )}
                          >
                            {isConfig
                              ? keyInfo?.maskedValue || "Configured"
                              : "Missing"}
                          </span>
                        </div>
                      );
                    })}

                    {evaluation.status === "warning" && (
                      <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] leading-tight">
                        ⚡ {evaluation.message}
                      </div>
                    )}

                    {evaluation.status === "error" && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] leading-tight">
                        ⚠️ {evaluation.message}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <button
                      onClick={handleSettingsClick}
                      className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      Configure in Settings <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Settings Shortcut Gear Icon */}
            <button
              onClick={handleSettingsClick}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors border border-transparent hover:border-border/40"
              title="Manage API Keys for this workflow"
              aria-label={`Open settings for ${workflow.title}`}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Workflow Title & Description */}
        <h3 className="font-semibold text-base mb-1.5 text-foreground group-hover:text-primary transition-colors">
          {workflow.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {workflow.description}
        </p>
      </div>

      {/* Footer Row: Cost Badge + Start Action */}
      <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between">
        <div
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border font-mono",
            costInfo.style
          )}
          title={costInfo.desc}
        >
          {workflow.costTier}
        </div>

        <div className="flex items-center text-xs font-semibold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
          <span>Start</span>
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}
