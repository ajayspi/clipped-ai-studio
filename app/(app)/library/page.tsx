"use client";

import { useState, useEffect, useRef } from "react";
import {
  Video,
  Folder,
  FolderPlus,
  Plus,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { motion, AnimatePresence } from "framer-motion";

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

function QueueCard({ job }: { job: any }) {
  const isActive = ["pending", "generating_plan", "processing"].includes(job.status);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm"
    >
      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
        <img src={job.thumbnail} alt={job.title} className="w-full h-full object-cover" />
        {isActive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{job.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{job.workflow_type}</p>
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
      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
        job.status === "completed" ? "bg-green-500/10 text-green-400" :
        job.status === "failed" ? "bg-red-500/10 text-red-400" :
        "bg-purple-500/10 text-purple-400"
      }`}>
        {STATUS_LABELS[job.status] || job.status}
      </span>
    </motion.div>
  );
}

export default function LibraryPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [queuedJobs, setQueuedJobs] = useState<any[]>([]);
  const [failedJobs, setFailedJobs] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#8b5cf6");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadLibraryData();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadLibraryData() {
    setLoading(true);
    try {
      // 1. Fetch workspaces
      const wsRes = await fetch("/api/workspaces");
      const wsData = await wsRes.json();
      if (wsData.workspaces) setWorkspaces(wsData.workspaces);

      // 2. Fetch all jobs from Supabase
      await refreshJobs();
    } catch (e) {
      console.error("Failed to load library data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshJobs() {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();

      if (data.success) {
        setVideos(data.completed || []);
        setQueuedJobs(data.queued || []);
        setFailedJobs(data.failed || []);
        setLastRefreshed(new Date());

        // Auto-poll if there are active jobs
        if ((data.queued || []).length > 0) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = setInterval(refreshJobs, 8000);
        } else {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      }
    } catch (e) {
      console.error("Failed to refresh jobs:", e);
    }
  }


          workspace_id: "ws_history",
          workspace_name: "Roman History Series",
          title: "Julius Caesar's Secret Battle Tactic",
          thumbnail: "/images/workflows/stories_cover.jpg",
          created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
          status: "completed",
          clipCount: 4,
          workflowType: "Stories",
        },
        {
          id: "vid_tch_06",
          video_id: "vid_tch_06",

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
        (v.video_id === videoId || v.id === videoId)
          ? {
              ...v,
              workspace_id: workspaceId === "default" ? null : workspaceId,
              workspace_name: targetWs ? targetWs.name : undefined,
            }
          : v
      )
    );
  }

  // Filtered videos based on activeWorkspace
  const filteredVideos = videos.filter((v) => {
    if (activeWorkspace === "all") return true;
    return v.workspace_id === activeWorkspace;
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Video className="w-7 h-7 text-primary" />
            Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            Organize, filter, and manage your AI video assets.
            <button
              type="button"
              onClick={refreshJobs}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Refreshed {lastRefreshed.toLocaleTimeString()}</span>
            </button>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowNewFolderModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border bg-background hover:bg-muted font-semibold text-xs transition-colors shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-violet-500" />
            New Folder
          </button>

          <a
            href="/create/footage"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Video
          </a>
        </div>
      </div>

      {/* Live Queue Status Panel */}
      {(queuedJobs.length > 0 || failedJobs.length > 0) && (
        <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold">Rendering Queue</span>
              {queuedJobs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold">
                  {queuedJobs.length} active
                </span>
              )}
              {failedJobs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                  {failedJobs.length} failed
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">Auto-refreshing every 8s</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...queuedJobs, ...failedJobs].map((job) => (
              <QueueCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Workspace Folder Bar Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 select-none">
        <button
          type="button"
          onClick={() => setActiveWorkspace("all")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeWorkspace === "all"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>All Videos</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-md bg-black/20 text-[10px]">
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
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
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
              <span className="ml-1 px-1.5 py-0.2 rounded-md bg-black/20 text-[10px]">
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowNewFolderModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-dashed border-border transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed bg-card text-center p-8">
          <div>
            <Folder className="mx-auto h-12 w-12 text-muted-foreground opacity-30 mb-3" />
            <h3 className="text-base font-semibold">No videos in this workspace</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
              Move existing videos into this folder or generate a new AI video for this campaign.
            </p>
            <a
              href="/create/footage"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
            >
              Generate Video
            </a>
          </div>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {filteredVideos.map((video) => (
            <DashboardCard
              key={video.id}
              video={video}
              workspaces={workspaces}
              onMoveWorkspace={handleMoveVideo}
            />
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
              className="relative w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-5 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold">Create New Workspace</h3>
                </div>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
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
                    className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(false)}
                    className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingFolder || !newFolderName.trim()}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold shadow hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
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
