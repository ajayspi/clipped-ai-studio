"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { ApiKeysMap } from "@/lib/engine/types";
import { ExtendedWorkflowDefinition, evaluateWorkflowStatus } from "./workflow-definitions";
import { WorkflowCard } from "./WorkflowCard";

interface WorkflowGridProps {
  workflows: ExtendedWorkflowDefinition[];
  keyStatusMap?: ApiKeysMap;
}

const CATEGORIES = [
  { id: "all", label: "All Workflows" },
  { id: "avatar-wb", label: "Avatars & Whiteboards" },
  { id: "ai-video", label: "AI Generative" },
  { id: "stock", label: "Stock Footage" },
  { id: "automation", label: "Automation & Series" },
];

export function WorkflowGrid({
  workflows,
  keyStatusMap = {},
}: WorkflowGridProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Compute stats across all 10 workflows
  const stats = useMemo(() => {
    let readyCount = 0;
    let fallbackCount = 0;
    let errorCount = 0;

    workflows.forEach((wf) => {
      const evalResult = evaluateWorkflowStatus(wf, keyStatusMap);
      if (evalResult.status === "ready") readyCount++;
      else if (evalResult.status === "warning") fallbackCount++;
      else errorCount++;
    });

    return { readyCount, fallbackCount, errorCount, total: workflows.length };
  }, [workflows, keyStatusMap]);

  // Filter workflows by category, search query, and optional status filter
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      // Category match
      if (selectedCategory !== "all" && wf.category !== selectedCategory) {
        return false;
      }

      // Status match
      if (statusFilter) {
        const evalResult = evaluateWorkflowStatus(wf, keyStatusMap);
        if (evalResult.status !== statusFilter) return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = wf.title.toLowerCase().includes(query);
        const matchesDesc = wf.description.toLowerCase().includes(query);
        const matchesProviders = wf.primaryProviders.some((p) =>
          p.toLowerCase().includes(query)
        );
        return matchesTitle || matchesDesc || matchesProviders;
      }

      return true;
    });
  }, [workflows, keyStatusMap, selectedCategory, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Filter and Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card/70 border border-border/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Right Controls: Search + Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Quick Filters */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setStatusFilter(statusFilter === "ready" ? null : "ready")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                statusFilter === "ready"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
              }`}
              title="Filter Ready workflows"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{stats.readyCount} Ready</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "warning" ? null : "warning")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                statusFilter === "warning"
                  ? "bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-semibold"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
              }`}
              title="Filter Fallback workflows"
            >
              <AlertCircle className="w-3 h-3" />
              <span>{stats.fallbackCount} Fallback</span>
            </button>

            {stats.errorCount > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === "error" ? null : "error")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                  statusFilter === "error"
                    ? "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 font-semibold"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
                }`}
                title="Filter Keys Needed workflows"
              >
                <XCircle className="w-3 h-3" />
                <span>{stats.errorCount} Unset</span>
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows & models..."
              className="w-full rounded-xl border border-border/50 bg-card/60 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-md"
            />
          </div>
        </div>
      </div>

      {/* Workflow Cards Grid */}
      {filteredWorkflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/60 bg-card/30">
          <SlidersHorizontal className="w-8 h-8 text-muted-foreground mb-3" />
          <h4 className="text-sm font-semibold text-foreground">No workflows match your filter</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Try adjusting your search query or selecting a different category tab.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setStatusFilter(null);
              setSearchQuery("");
            }}
            className="mt-4 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              keyStatusMap={keyStatusMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}
