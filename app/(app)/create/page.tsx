"use client";

import Link from "next/link";
import { Settings, Sparkles, RefreshCw, Key } from "lucide-react";
import { useApiKeys } from "@/components/create/useApiKeys";
import { WORKFLOWS } from "@/components/create/workflow-definitions";
import { MissionPromptBar } from "@/components/create/MissionPromptBar";
import { WorkflowGrid } from "@/components/create/WorkflowGrid";

export default function CreateHubPage() {
  const { keys, loading, refresh } = useApiKeys();

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Create Studio
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Sparkles className="w-3 h-3" />
              10 Workflows
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Choose an AI generation workflow or use 1-click Auto Pilot to produce viral videos in seconds.
          </p>
        </div>

        {/* Global Action Header Links */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/50 bg-card/70 hover:bg-accent/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-all backdrop-blur-md cursor-pointer disabled:opacity-50"
            title="Refresh API Key status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Keys</span>
          </button>

          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border/50 bg-card/70 hover:bg-accent/60 text-xs font-medium text-foreground transition-all backdrop-blur-md shadow-sm hover:border-primary/40"
          >
            <Key className="w-3.5 h-3.5 text-primary" />
            <span>API Settings</span>
          </Link>
        </div>
      </div>

      {/* Hero 1-Click Automatic Mission Prompt Bar */}
      <MissionPromptBar />

      {/* 10 Workflow Cards Grid with Status Badges & Filtering */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Video Generation Pipelines
          </h2>
          <span className="text-xs text-muted-foreground">
            Dynamic status based on your API configuration
          </span>
        </div>

        <WorkflowGrid workflows={WORKFLOWS} keyStatusMap={keys} />
      </div>
    </div>
  );
}
