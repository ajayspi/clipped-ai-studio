"use client";

import React, { useState } from "react";
import {
  Video,
  Download,
  Share2,
  Trash2,
  Loader2,
  Play,
  Smartphone,
  Sparkles,
  Film,
  Folder,
  FolderPlus,
  Zap,
  MoreVertical,
} from "lucide-react";
import { PublishModal } from "./PublishModal";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardCard({
  video,
  workspaces = [],
  onMoveWorkspace,
}: {
  video: any;
  workspaces?: Array<{ id: string; name: string; color?: string }>;
  onMoveWorkspace?: (videoId: string, workspaceId: string) => void;
}) {
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishTab, setPublishTab] = useState<"publish" | "export">("publish");
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [moving, setMoving] = useState(false);

  const currentWorkspace = workspaces.find((w) => w.id === video.workspace_id) || (video.workspace_name ? { name: video.workspace_name, color: '#8b5cf6' } : null);

  async function handleMove(workspaceId: string) {
    setMoving(true);
    setShowWorkspaceMenu(false);
    try {
      if (onMoveWorkspace) {
        onMoveWorkspace(video.video_id || video.id, workspaceId);
      } else {
        await fetch("/api/workspaces/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoIds: [video.video_id || video.id],
            workspaceId,
          }),
        });
      }
    } catch (e) {
      console.error("Failed to move video:", e);
    } finally {
      setMoving(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -4 }}
        className="break-inside-avoid relative group rounded-2xl border border-border/40 bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-xl hover:border-violet-500/30"
      >
        {/* Thumbnail Area */}
        <div className="relative aspect-[9/16] bg-zinc-950 w-full overflow-hidden">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-30">
              <Video className="w-16 h-16 text-white" />
            </div>
          )}

          {/* Status & Format Overlay Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="px-2.5 py-1 bg-black/70 dark:bg-black/85 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/10 flex items-center gap-1 shadow-md">
              <Sparkles className="w-2.5 h-2.5 text-violet-400" />
              {video.workflowType || "AI Video"}
            </span>

            <div className="flex items-center gap-1.5">
              {currentWorkspace && (
                <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-semibold text-violet-300 border border-violet-500/30 flex items-center gap-1">
                  <Folder className="w-2.5 h-2.5 text-violet-400" />
                  {currentWorkspace.name}
                </span>
              )}
              <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-semibold text-white/90 border border-white/10 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-cyan-400" />
                9:16
              </span>
            </div>
          </div>

          {video.status === "pending" || video.status === "processing" ? (
            <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-violet-500" />
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 w-[60%] animate-pulse" />
              </div>
              <p className="text-xs font-medium text-center text-zinc-300">Rendering AI video...</p>
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setPublishTab("publish");
                  setIsPublishOpen(true);
                }}
                className="h-11 w-11 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-violet-600/40"
                aria-label="Play & Publish Preview"
              >
                <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
              </button>
            </div>
          )}
        </div>

        {/* Metadata Area */}
        <div className="p-4 flex flex-col flex-1 relative">
          <h3 className="font-semibold text-sm line-clamp-1 mb-1.5 text-foreground">{video.title}</h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{video.created_at ? new Date(video.created_at).toLocaleDateString() : "Recent"}</span>
            <div className="flex items-center gap-1 font-medium text-foreground/80">
              <Film className="w-3 h-3 text-muted-foreground" />
              <span>{video.clipCount || 1} clips</span>
            </div>
          </div>

          {/* Hover Quick Actions */}
          <div className="mt-3.5 pt-3 border-t border-border/40 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setPublishTab("export");
                setIsPublishOpen(true);
              }}
              className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground hover:text-emerald-500 transition-colors"
              title="Download Presets"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>

            <button
              onClick={() => {
                setPublishTab("publish");
                setIsPublishOpen(true);
              }}
              className="text-xs font-semibold flex items-center gap-1.5 text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> Publish
            </button>

            {/* Move to Workspace Context Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                className="text-xs font-medium flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                title="Organize in Workspace"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>

              {/* Workspace Dropdown Menu */}
              <AnimatePresence>
                {showWorkspaceMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-popover border border-border shadow-xl p-1.5 z-30 text-xs"
                  >
                    <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Move to Workspace
                    </span>
                    <div className="space-y-0.5 mt-1 max-h-36 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => handleMove("default")}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted text-foreground flex items-center gap-2"
                      >
                        <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Default (All)</span>
                      </button>
                      {workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => handleMove(ws.id)}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted text-foreground flex items-center gap-2 truncate"
                        >
                          <Folder className="w-3.5 h-3.5 text-violet-500" />
                          <span className="truncate">{ws.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        jobId={video.id}
        videoTitle={video.title}
        defaultTab={publishTab}
      />
    </>
  );
}
