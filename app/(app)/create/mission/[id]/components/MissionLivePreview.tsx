"use client";

import React, { useState } from "react";
import {
  Play,
  Film,
  Camera,
  Layers,
  Sparkles,
  Volume2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { MissionJobState, Scene } from "@/lib/engine/types";
import { MainComposition } from "@/remotion/Composition";
import { Player } from "@remotion/player";

interface MissionLivePreviewProps {
  job: MissionJobState;
}

export function MissionLivePreview({ job }: MissionLivePreviewProps) {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [showRemotionPlayer, setShowRemotionPlayer] = useState(true);

  const scenes = job.scenes || [];
  const activeScene: Scene | undefined = scenes[selectedSceneIndex] || scenes[0];
  const isCompleted = job.overallProgress === 100 && !job.error;

  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 4), 0);
  const fps = 30;
  const durationInFrames = Math.max(1, Math.floor(totalDuration * fps));

  const compWidth = job.aspectRatio === "16:9" ? 1920 : 1080;
  const compHeight = job.aspectRatio === "9:16" ? 1920 : 1080;
  const aspectClass =
    job.aspectRatio === "16:9"
      ? "aspect-video"
      : job.aspectRatio === "1:1"
      ? "aspect-square"
      : "aspect-[9/16]";

  const beats = scenes.map((s, idx) => ({
    id: s.id || `beat-${idx + 1}`,
    text: s.text,
    duration: s.duration || 4,
    clipUrl: s.selectedVideo?.url || s.videoUrl || s.imageUrl || "",
    audioUrl: s.audioUrl || "",
  }));

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 md:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-violet-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Live Preview & Storyboard
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
            <Clock className="w-3 h-3" />
            {totalDuration.toFixed(1)}s Duration
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
            <Layers className="w-3 h-3" />
            {scenes.length} Scenes
          </span>
        </div>
      </div>

      {/* Video / Remotion Player Preview Box */}
      <div className="flex justify-center bg-black/40 rounded-xl p-3 border border-border/40">
        <div
          className={`relative w-full ${aspectClass} bg-black rounded-lg overflow-hidden border border-border/60 shadow-lg`}
          style={{ maxWidth: job.aspectRatio === "16:9" ? "100%" : "320px" }}
        >
          {isCompleted && beats.length > 0 && showRemotionPlayer ? (
            <Player
              component={MainComposition}
              durationInFrames={durationInFrames}
              compositionWidth={compWidth}
              compositionHeight={compHeight}
              fps={fps}
              controls
              autoPlay
              loop
              inputProps={{
                beats: beats,
                burnSubtitles: true,
                subtitleStyle: {
                  y: 78,
                  color: "#ffffff",
                  size: 5.2,
                  outlineWidth: 2.5,
                  outlineColor: "#000000",
                  isBox: false,
                  boxColor: "#000000",
                  uppercase: false,
                  maxWidth: 82,
                },
              }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : activeScene ? (
            <div className="relative w-full h-full flex flex-col justify-between p-4 bg-gradient-to-t from-black/90 via-black/30 to-black/60">
              {/* Media Background */}
              {activeScene.imageUrl || activeScene.selectedVideo?.thumbnail ? (
                <img
                  src={activeScene.imageUrl || activeScene.selectedVideo?.thumbnail}
                  alt={activeScene.description}
                  className="absolute inset-0 w-full h-full object-cover -z-10 opacity-70"
                />
              ) : activeScene.videoUrl ? (
                <video
                  src={activeScene.videoUrl}
                  className="absolute inset-0 w-full h-full object-cover -z-10 opacity-70"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-violet-950/40 via-zinc-900 to-black -z-10 flex items-center justify-center">
                  <Film className="w-12 h-12 text-violet-500/30 animate-pulse" />
                </div>
              )}

              {/* Top Scene Tag */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur border border-white/10 uppercase">
                  Scene {selectedSceneIndex + 1}
                </span>
                {activeScene.cameraMotion && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 text-violet-300 backdrop-blur border border-white/10 flex items-center gap-1">
                    <Camera className="w-2.5 h-2.5" />
                    {activeScene.cameraMotion}
                  </span>
                )}
              </div>

              {/* Bottom Subtitle / Narration Beat Preview */}
              <div className="space-y-1 bg-black/70 backdrop-blur-md p-3 rounded-lg border border-white/10 text-center">
                <p className="text-xs font-semibold text-white line-clamp-3">
                  "{activeScene.text}"
                </p>
                <div className="flex items-center justify-center gap-2 pt-1 text-[10px] text-zinc-400">
                  <span>{activeScene.duration}s</span>
                  <span>•</span>
                  <span>{activeScene.keywords?.slice(0, 2).join(", ")}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground p-6 text-center">
              <Film className="w-8 h-8 opacity-40 animate-pulse" />
              <p className="text-xs">Generating visual storyboard beats...</p>
            </div>
          )}
        </div>
      </div>

      {/* Storyboard Scene Selector Thumbnails */}
      {scenes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Scene Storyboard Beats</span>
            <span>Click scene to inspect</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {scenes.map((scene, idx) => (
              <button
                key={scene.id || idx}
                onClick={() => setSelectedSceneIndex(idx)}
                className={`relative rounded-xl border p-2.5 text-left transition-all cursor-pointer overflow-hidden ${
                  selectedSceneIndex === idx
                    ? "border-violet-500 bg-violet-500/10 shadow-sm"
                    : "border-border/40 bg-muted/20 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-foreground">
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {scene.duration}s
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                  {scene.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
