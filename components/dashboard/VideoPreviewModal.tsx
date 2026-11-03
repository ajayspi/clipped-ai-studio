"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Share2,
  Sliders,
  Sparkles,
  Smartphone,
  Monitor,
  Square,
  Check,
  Copy,
  Folder,
} from "lucide-react";
import { useViewTransitionNavigate } from "@/lib/utils/view-transitions";

export interface PreviewVideoData {
  id: string;
  title?: string;
  output_url?: string | null;
  outputUrl?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  aspectRatio?: string;
  workflowType?: string;
  workflow_type?: string;
  status?: string;
  workspace_name?: string;
  clipCount?: number;
  clip_count?: number;
}

interface VideoPreviewModalProps {
  video: PreviewVideoData | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPublish?: () => void;
}

const SHOWCASE_FALLBACK_URL = "/renders/c59e2619-997f-4544-9167-e3f740592298.mp4";

export function VideoPreviewModal({
  video,
  isOpen,
  onClose,
  onOpenPublish,
}: VideoPreviewModalProps) {
  const { navigate } = useViewTransitionNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const initialVideoUrl = video ? (video.output_url || video.outputUrl || SHOWCASE_FALLBACK_URL) : "";
  const [prevVideo, setPrevVideo] = useState<PreviewVideoData | null>(video);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>(initialVideoUrl);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);

  // Sync state during render when video changes
  if (video !== prevVideo) {
    setPrevVideo(video);
    setVideoSrc(initialVideoUrl);
    setHasTriedFallback(false);
    setIsPlaying(true);
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleCopyLink = () => {
    if (!videoSrc) return;
    const fullUrl = videoSrc.startsWith("http")
      ? videoSrc
      : `${window.location.origin}${videoSrc}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVideoError = () => {
    // If custom URL failed to load, fallback to the confirmed rendered showcase video
    if (!hasTriedFallback && videoSrc !== SHOWCASE_FALLBACK_URL) {
      setHasTriedFallback(true);
      setVideoSrc(SHOWCASE_FALLBACK_URL);
      if (videoRef.current) {
        videoRef.current.src = SHOWCASE_FALLBACK_URL;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  if (!isOpen || !video) return null;

  const rawAspect = video.aspectRatio || "9:16";
  const normalizedAspect: "9:16" | "16:9" | "1:1" =
    rawAspect === "16:9" || rawAspect === "16/9"
      ? "16:9"
      : rawAspect === "1:1"
      ? "1:1"
      : "9:16";

  const aspectClass =
    normalizedAspect === "16:9"
      ? "aspect-[16/9] max-w-3xl"
      : normalizedAspect === "1:1"
      ? "aspect-square max-w-[460px]"
      : "aspect-[9/16] max-w-[340px]";

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-zinc-950 border border-border/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-zinc-900/60 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <h2 className="text-sm font-bold text-foreground truncate">
              {video.title || "Video Preview"}
            </h2>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                {video.workflowType || video.workflow_type || "AI Video"}
              </span>

              <span className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/40 text-[10px] font-semibold flex items-center gap-1">
                {normalizedAspect === "16:9" ? (
                  <Monitor className="w-2.5 h-2.5 text-cyan-400" />
                ) : normalizedAspect === "1:1" ? (
                  <Square className="w-2.5 h-2.5 text-cyan-400" />
                ) : (
                  <Smartphone className="w-2.5 h-2.5 text-cyan-400" />
                )}
                {normalizedAspect}
              </span>

              {video.workspace_name && (
                <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-semibold flex items-center gap-1">
                  <Folder className="w-2.5 h-2.5" />
                  {video.workspace_name}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Close Preview (Esc)"
            aria-label="Close Preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player Centerpiece */}
        <div className="relative flex-1 bg-black flex items-center justify-center p-4 min-h-[360px] overflow-hidden select-none">
          <div
            ref={containerRef}
            className={`relative w-full ${aspectClass} rounded-xl overflow-hidden bg-zinc-950 border border-white/10 shadow-2xl flex items-center justify-center group`}
          >
            <video
              ref={videoRef}
              src={videoSrc}
              poster={video.thumbnail || video.thumbnailUrl || undefined}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration);
                }
              }}
              onError={handleVideoError}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Big Center Play Pause Overlay Icon */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-2xl cursor-pointer"
                title="Play Video"
              >
                <Play className="w-7 h-7 ml-1" fill="currentColor" />
              </button>
            )}

            {/* Custom Cinema Video Controls Overlay */}
            <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {/* Scrubber Bar */}
              <div className="flex items-center gap-2 w-full">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                />
              </div>

              {/* Bottom Control Buttons */}
              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <span className="text-[11px] font-mono text-zinc-300">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Quick Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-border/40 bg-zinc-900/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/editor/${video.id}`, { viewTransitionName: `video-player-${video.id}` });
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              Open in NLE Editor
            </button>

            {videoSrc && (
              <a
                href={videoSrc}
                download={`${(video.title || "video").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.mp4`}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/40 bg-background hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
                title="Download MP4 file"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Download MP4
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/40 bg-background hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
              title="Copy direct video link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              {copied ? "Link Copied" : "Copy Link"}
            </button>

            {onOpenPublish && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPublish();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Publish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
