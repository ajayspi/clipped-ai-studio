"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Video,
  Folder,
  FolderPlus,
  Plus,
  X,
  Loader2,
  RefreshCw,
  Search,
  ArrowUpDown,
  CheckSquare,
  Square,
} from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { motion, AnimatePresence } from "framer-motion";

interface LibraryVideo {
  id: string;
  video_id?: string;
  thumbnail?: string;
  title?: string;
  workflow_type?: string;
  workflowType?: string;
  workspace_id?: string | null;
  workspace_name?: string;
  created_at?: string;
  output_url?: string;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  color?: string;
}

type SortOption = "newest" | "oldest" | "title";

export default function LibraryPage() {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#8b5cf6");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refreshJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();

      if (data.success) {
        setVideos(data.completed || []);
        setLastRefreshed(new Date());
      }
    } catch (e) {
      console.error("Failed to refresh library assets:", e);
    }
  }, []);

  const loadLibraryData = useCallback(async () => {
    try {
      // 1. Fetch workspaces
      const wsRes = await fetch("/api/workspaces");
      const wsData = await wsRes.json();
      if (wsData.workspaces) setWorkspaces(wsData.workspaces);

      // 2. Fetch completed video catalog
      await refreshJobs();
    } catch (e) {
      console.error("Failed to load library data:", e);
    } finally {
      setLoading(false);
    }
  }, [refreshJobs]);

  useEffect(() => {
    const timer = setTimeout(loadLibraryData, 0);
    return () => clearTimeout(timer);
  }, [loadLibraryData]);

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          color: newFolderColor,
        }),
      });

      const data = await res.json();
      if (data.workspace) {
        setWorkspaces((prev) => [...prev, data.workspace]);
        setActiveWorkspace(data.workspace.id);
        setShowNewFolderModal(false);
        setNewFolderName("");
      }
    } catch (err) {
      console.error("Failed to create workspace:", err);
    } finally {
      setCreatingFolder(false);
    }
  }

  function handleMoveVideo(videoId: string, workspaceId: string) {
    const targetWs = workspaces.find((w) => w.id === workspaceId);
    setVideos((prev) =>
      prev.map((v) =>
        v.video_id === videoId || v.id === videoId
          ? {
              ...v,
              workspace_id: workspaceId === "default" ? null : workspaceId,
              workspace_name: targetWs ? targetWs.name : undefined,
            }
          : v
      )
    );
  }

  // Filter and sort videos
  const filteredVideos = useMemo(() => {
    return videos
      .filter((v) => {
        // Workspace filter
        if (activeWorkspace !== "all" && v.workspace_id !== activeWorkspace) {
          return false;
        }
        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const title = (v.title || "").toLowerCase();
          const workflow = (v.workflow_type || v.workflowType || "").toLowerCase();
          return title.includes(query) || workflow.includes(query);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") {
          return (a.title || "").localeCompare(b.title || "");
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        }
        // "newest" default
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [videos, activeWorkspace, searchQuery, sortBy]);

  // Batch actions
  const toggleSelectAll = () => {
    if (selectedVideoIds.size === filteredVideos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(filteredVideos.map((v) => v.id)));
    }
  };

  const handleBatchMoveWorkspace = async (targetWsId: string) => {
    const ids = Array.from(selectedVideoIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      handleMoveVideo(id, targetWsId);
    }
    setSelectedVideoIds(new Set());
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Video className="w-7 h-7 text-primary" />
              Library & Assets
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              {videos.length} {videos.length === 1 ? "Video" : "Videos"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            Browse, search, and organize your rendered video assets and workspaces.
            <button
              type="button"
              onClick={refreshJobs}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Refresh Catalog"
              aria-label="Refresh Catalog"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">
                {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : "Refresh"}
              </span>
            </button>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowNewFolderModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/60 bg-card hover:bg-muted font-medium text-xs text-foreground transition-all shadow-sm hover:border-primary/40 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-violet-500" />
            New Folder
          </button>

          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Video
          </Link>
        </div>
      </div>

      {/* Workspace Folder Bar Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 select-none">
        <button
          type="button"
          onClick={() => setActiveWorkspace("all")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeWorkspace === "all"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>All Videos</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-black/20 text-[10px]">
            {videos.length}
          </span>
        </button>

        {workspaces.map((ws) => {
          const count = videos.filter((v) => v.workspace_id === ws.id).length;
          const isActive = activeWorkspace === ws.id;
          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => setActiveWorkspace(ws.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ws.color || "#8b5cf6" }}
              />
              <span>{ws.name}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-black/20 text-[10px]">
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowNewFolderModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-dashed border-border/60 transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-md">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos by title or workflow..."
            className="w-full rounded-xl border border-border/60 bg-background/80 py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {filteredVideos.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 bg-background/80 hover:bg-muted text-xs font-medium text-foreground transition-all cursor-pointer"
            >
              {selectedVideoIds.size === filteredVideos.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Square className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span>
                {selectedVideoIds.size > 0 ? `${selectedVideoIds.size} Selected` : "Select All"}
              </span>
            </button>
          )}

          <div className="flex items-center gap-1.5 border border-border/60 rounded-xl px-2.5 py-1.5 bg-background/80 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-foreground outline-none cursor-pointer"
              aria-label="Sort videos"
            >
              <option value="newest" className="bg-popover text-foreground">Newest First</option>
              <option value="oldest" className="bg-popover text-foreground">Oldest First</option>
              <option value="title" className="bg-popover text-foreground">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Floating Action Bar (Appears when items are selected) */}
      <AnimatePresence>
        {selectedVideoIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky bottom-6 z-30 flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-popover/90 border border-violet-500/40 shadow-2xl backdrop-blur-xl max-w-2xl mx-auto w-full"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground px-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>{selectedVideoIds.size} videos selected</span>
            </div>

            <div className="flex items-center gap-2">
              {workspaces.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">Move to:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleBatchMoveWorkspace(e.target.value);
                    }}
                    defaultValue=""
                    className="rounded-xl border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer"
                    aria-label="Move selected to workspace"
                  >
                    <option value="" disabled>Select Folder...</option>
                    <option value="default">Default (None)</option>
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedVideoIds(new Set())}
                className="px-3 py-1.5 rounded-xl border border-border/60 hover:bg-muted text-xs font-medium transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Videos Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/60 text-center p-8">
          <div>
            <Video className="mx-auto h-12 w-12 text-muted-foreground opacity-25 mb-3" />
            <h3 className="text-base font-semibold text-foreground">
              {searchQuery ? "No videos match your search" : "No videos in this workspace"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
              {searchQuery
                ? "Try clearing your search terms or checking another workspace folder."
                : "Move existing videos into this folder or generate a new AI video from the creation hub."}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center justify-center rounded-xl border border-border/60 bg-card px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Create Video
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {filteredVideos.map((video) => (
            <div key={video.id} className="relative group">
              {/* Optional selection checkbox badge */}
              <button
                type="button"
                onClick={() => {
                  setSelectedVideoIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(video.id)) {
                      next.delete(video.id);
                    } else {
                      next.add(video.id);
                    }
                    return next;
                  });
                }}
                className={`absolute top-3 left-3 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                  selectedVideoIds.has(video.id)
                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
                    : "bg-black/60 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/80 hover:text-white"
                }`}
                title="Select video"
                aria-label={`Select ${video.title || "video"}`}
              >
                {selectedVideoIds.has(video.id) ? (
                  <CheckSquare className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </button>

              <DashboardCard
                video={video}
                workspaces={workspaces}
                onMoveWorkspace={handleMoveVideo}
              />
            </div>
          ))}
        </div>
      )}

      {/* New Workspace Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewFolderModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-5 border-b border-border/40 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Create New Workspace</h3>
                </div>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Workspace / Folder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q3 Fitness Series, Roman Empire..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Folder Color Accent
                  </label>
                  <div className="flex items-center gap-2">
                    {["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewFolderColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          newFolderColor === c ? "scale-125 ring-2 ring-white shadow-md" : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(false)}
                    className="px-4 py-2 text-xs font-medium border border-border/60 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingFolder || !newFolderName.trim()}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {creatingFolder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Create Folder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
