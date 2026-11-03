"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Video,
  Download,
  Loader2,
  Play,
  Smartphone,
  Sparkles,
  Film,
  Folder,
  FolderPlus,
  Zap,
  Monitor,
  Square,
  X,
} from "lucide-react";
import { PublishModal } from "./PublishModal";
import { VideoPreviewModal } from "./VideoPreviewModal";
import { resolveShowcaseVideo, type JobLogsPayload } from "@/lib/engine/job-presentation";
import { motion, AnimatePresence } from "framer-motion";
import { useViewTransitionNavigate, getViewTransitionStyle } from "@/lib/utils/view-transitions";

interface DashboardVideo {
  id: string;
  video_id?: string;
  workspace_id?: string | null;
  workspace_name?: string;
  output_url?: string | null;
  outputUrl?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  title?: string;
  workflowType?: string;
  workflow_type?: string;
  status?: string;
  progress?: number;
  aspectRatio?: string;
  created_at?: string | null;
  updated_at?: string | null;
  clipCount?: number;
  clip_count?: number;
}

export function DashboardCard({
  video,
  workspaces = [],
  onMoveWorkspace,
}: {
  video: DashboardVideo;
  workspaces?: Array<{ id: string; name: string; color?: string }>;
  onMoveWorkspace?: (videoId: string, workspaceId: string) => void;
}) {
  const { navigate } = useViewTransitionNavigate();
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [publishTab, setPublishTab] = useState<"publish" | "export">("publish");
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [, setMoving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [optimisticWorkspaceId, setOptimisticWorkspaceId] = useState<string | null>(video.workspace_id || null);

  const currentWorkspace = workspaces.find((w) => w.id === optimisticWorkspaceId) || 
    (video.workspace_name ? { name: video.workspace_name, color: '#8b5cf6' } : null);

  const outputUrl = video.output_url || video.outputUrl || null;
  const thumbnailUrl = video.thumbnail || video.thumbnailUrl || null;
  const clipCount = video.clipCount ?? video.clip_count ?? 1;
  const progress = typeof video.progress === 'number'
    ? Math.round(video.progress)
    : (video.status === 'completed' ? 100 : 0);

  const rawAspect = video.aspectRatio || '9:16';
  const normalizedAspect: '9:16' | '16:9' | '1:1' =
    rawAspect === '16:9' || rawAspect === '16/9'
      ? '16:9'
      : rawAspect === '1:1'
      ? '1:1'
      : '9:16';

  const aspectClass =
    normalizedAspect === '16:9'
      ? 'aspect-[16/9]'
      : normalizedAspect === '1:1'
      ? 'aspect-square'
      : 'aspect-[9/16]';

  async function handleMove(workspaceId: string) {
    const previous = optimisticWorkspaceId;
    // 0ms Optimistic UI feedback
    setOptimisticWorkspaceId(workspaceId);
    setMoving(true);
    setShowWorkspaceMenu(false);
    try {
      if (onMoveWorkspace) {
        onMoveWorkspace(video.video_id || video.id, workspaceId);
      } else {
        const res = await fetch("/api/workspaces/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoIds: [video.video_id || video.id],
            workspaceId,
          }),
        });
        if (!res.ok) {
          throw new Error("Failed to move video");
        }
      }
    } catch (e) {
      console.error("Failed to move video:", e);
      // Rollback to previous confirmed workspace
      setOptimisticWorkspaceId(previous);
    } finally {
      setMoving(false);
    }
  }

  const handleOpenEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/editor/${video.id}`, { viewTransitionName: `video-player-${video.id}` });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -4 }}
        className="break-inside-avoid relative group rounded-2xl border border-border/70 bg-card dark:bg-zinc-900/80 backdrop-blur-xl shadow-xs overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-violet-500/40"
      >
        {/* Thumbnail Area */}
        <div 
          className={`relative ${aspectClass} bg-zinc-950 w-full overflow-hidden ${!isPlaying ? 'cursor-pointer' : ''}`}
          style={getViewTransitionStyle(`video-player-${video.id}`)}
          onClick={() => {
            if (!isPlaying) {
              setIsPreviewModalOpen(true);
            }
          }}
        >
          {isPlaying ? (
            <div className="absolute inset-0 z-20 bg-black">
              <video
                src={resolveShowcaseVideo(video.workflow_type || video.workflowType, (video as { logs?: JobLogsPayload }).logs, outputUrl)}
                autoPlay
                controls
                playsInline
                className="w-full h-full object-contain"
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  const target = e.currentTarget as HTMLVideoElement;
                  const fallback = resolveShowcaseVideo(video.workflow_type || video.workflowType, (video as { logs?: JobLogsPayload }).logs, null);
                  if (!target.src.endsWith(fallback)) {
                    target.src = fallback;
                    target.play().catch(() => {});
                  } else {
                    setIsPlaying(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white z-30 transition-colors cursor-pointer"
                title="Close Video"
                aria-label="Close video"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Rendered-video thumbnail (data:/signed URL)
            <img
              src={thumbnailUrl}
              alt={video.title || "Video thumbnail"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-30">
              <Video className="w-16 h-16 text-white" />
            </div>
          )}

          {/* Status & Format Overlay Badges */}
          {!isPlaying && (
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
              <span className="px-2.5 py-1 bg-black/70 dark:bg-black/85 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/10 flex items-center gap-1 shadow-md">
                <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                {video.workflowType || video.workflow_type || "AI Video"}
              </span>

              <div className="flex items-center gap-1.5">
                {currentWorkspace && (
                  <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-semibold text-violet-300 border border-violet-500/30 flex items-center gap-1">
                    <Folder className="w-2.5 h-2.5 text-violet-400" />
                    {currentWorkspace.name}
                  </span>
                )}
                <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-semibold text-white/90 border border-white/10 flex items-center gap-1">
                  {normalizedAspect === '16:9' ? (
                    <Monitor className="w-3 h-3 text-cyan-400" />
                  ) : normalizedAspect === '1:1' ? (
                    <Square className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <Smartphone className="w-3 h-3 text-cyan-400" />
                  )}
                  {normalizedAspect}
                </span>
              </div>
            </div>
          )}

          {(['pending', 'processing', 'generating_plan', 'queued', 'claimed', 'rendering', 'in_progress'].includes(video.status || '')) ? (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 z-10">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-violet-500" />
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
                />
              </div>
              <div className="flex items-center justify-between w-full text-[11px] text-zinc-300 font-medium px-0.5">
                <span>
                  {video.status === 'generating_plan'
                    ? 'Planning story...'
                    : (video.status === 'pending' || video.status === 'queued')
                    ? 'Queued...'
                    : 'Rendering video...'}
                </span>
                <span>{progress}%</span>
              </div>
            </div>
          ) : !isPlaying ? (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewModalOpen(true);
                }}
                className="h-12 w-12 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-violet-600/40 cursor-pointer"
                title="Play Video Preview"
                aria-label="Play Video Preview"
              >
                <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className="h-9 w-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/90 flex items-center justify-center hover:scale-110 transition-transform hover:text-white cursor-pointer"
                title={isPlaying ? "Stop inline" : "Quick inline play"}
                aria-label="Toggle inline playback"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Metadata Area */}
        <div className="p-4 flex flex-col flex-1 relative">
          <h3 className="font-semibold text-sm line-clamp-1 mb-1.5 text-foreground">
            <Link href={`/editor/${video.id}`} onClick={handleOpenEditor} className="hover:text-primary transition-colors">
              {video.title || "Untitled Video"}
            </Link>
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{video.created_at ? new Date(video.created_at).toLocaleDateString() : "Recent"}</span>
            <div className="flex items-center gap-1 font-medium text-foreground/80">
              <Film className="w-3 h-3 text-muted-foreground" />
              <span>{clipCount} clips</span>
            </div>
          </div>

          {/* Hover Quick Actions */}
          <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            {outputUrl ? (
              <a
                href={outputUrl}
                download={`${(video.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={async (e) => {
                  try {
                    const res = await fetch(outputUrl);
                    if (res.ok) {
                      e.preventDefault();
                      const blob = await res.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = blobUrl;
                      a.download = `${(video.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp4`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                    }
                  } catch {
                    // Fall back to native anchor navigation in new tab
                  }
                }}
                className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground hover:text-emerald-500 transition-colors"
                title="Download MP4"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPublishTab("export");
                  setIsPublishOpen(true);
                }}
                className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer"
                title="Download Presets"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="text-xs font-semibold flex items-center gap-1 text-foreground hover:text-primary transition-colors cursor-pointer"
              title="Play Video Preview"
            >
              <Play className="w-3 h-3 fill-current text-primary" /> Preview
            </button>

            <button
              type="button"
              onClick={() => {
                setPublishTab("publish");
                setIsPublishOpen(true);
              }}
              className="text-xs font-semibold flex items-center gap-1.5 text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> Publish
            </button>

            {/* Move to Workspace Context Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                className="text-xs font-medium flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted cursor-pointer"
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
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted text-foreground flex items-center gap-2 cursor-pointer"
                      >
                        <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Default (All)</span>
                      </button>
                      {workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => handleMove(ws.id)}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted text-foreground flex items-center gap-2 truncate cursor-pointer"
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

      <VideoPreviewModal
        video={video}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onOpenPublish={() => {
          setPublishTab("publish");
          setIsPublishOpen(true);
        }}
      />

      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        jobId={video.id}
        videoTitle={video.title || ''}
        defaultTab={publishTab}
      />
    </>
  );
}
