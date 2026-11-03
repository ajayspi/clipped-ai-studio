"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Key,
  ListVideo,
  ChevronDown,
  ChevronUp,
  Layers,
  Wand2
} from "lucide-react";
import { useApiKeys } from "@/components/create/useApiKeys";
import { WORKFLOWS } from "@/components/create/workflow-definitions";
import { AgenticDirector } from "@/components/create/AgenticDirector";
import { SignatureStudios } from "@/components/create/SignatureStudios";
import { WorkflowGrid } from "@/components/create/WorkflowGrid";

export default function CreateHubPage() {
  const { keys, loading, refresh } = useApiKeys();
  const [showAdvancedCatalog, setShowAdvancedCatalog] = useState(false);

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
              AI Director
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Direct autonomous AI video stories with script synthesis, multi-agent execution, and verified rendering.
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
            href="/queue"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border/50 bg-card/70 hover:bg-accent/60 text-xs font-medium text-foreground transition-all backdrop-blur-md shadow-sm hover:border-primary/40"
          >
            <ListVideo className="w-3.5 h-3.5 text-orange-500" />
            <span>Render Queue</span>
          </Link>

          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border/50 bg-card/70 hover:bg-accent/60 text-xs font-medium text-foreground transition-all backdrop-blur-md shadow-sm hover:border-primary/40"
          >
            <Key className="w-3.5 h-3.5 text-primary" />
            <span>API Settings</span>
          </Link>
        </div>
      </div>

      {/* Hero Autonomous Multi-Agent Video Director */}
      <AgenticDirector />

      {/* Signature Studios Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            Signature Creative Studios
          </h2>
          <span className="text-xs text-muted-foreground">
            Specialized engines for Claymation, 3D Origami, Explainers & Cinema
          </span>
        </div>
        <SignatureStudios />
      </div>

      {/* Collapsible Advanced Pipelines Catalog */}
      <div className="border border-border/60 rounded-2xl bg-card/40 p-4 transition-all">
        <button
          type="button"
          onClick={() => setShowAdvancedCatalog(!showAdvancedCatalog)}
          className="w-full flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div>
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Advanced Generation Pipelines ({WORKFLOWS.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Custom API pipelines, manual schedulers & batch scripts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span>{showAdvancedCatalog ? "Hide Pipelines" : "Browse All Pipelines"}</span>
            {showAdvancedCatalog ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showAdvancedCatalog && (
          <div className="pt-6 border-t border-border/40 mt-4">
            <WorkflowGrid workflows={WORKFLOWS} keyStatusMap={keys} />
          </div>
        )}
      </div>
    </div>
  );
}
