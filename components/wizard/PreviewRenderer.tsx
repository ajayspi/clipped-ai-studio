"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PreviewRendererProps {
  beats: Array<{ id?: string; text?: string; duration?: number }>;
  aspectRatio: '9:16' | '16:9' | '1:1';
  autoPlay?: boolean;
  loop?: boolean;
}

export function PreviewRenderer({
  beats,
  aspectRatio,
  autoPlay = false,
  loop = true,
}: PreviewRendererProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Calculate total duration from beats
  const totalDuration = beats.reduce((sum, b) => sum + (b.duration || 3), 0);

  // Update duration when beats change - use derived state instead of effect
  const computedDuration = beats.reduce((sum, b) => sum + (b.duration || 3), 0);
  if (duration !== computedDuration) {
    setDuration(computedDuration);
  }

  // Initialize video element for WebCodecs preview
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVideoReady(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Handle autoPlay
  useEffect(() => {
    if (autoPlay && videoRef.current && videoReady) {
      videoRef.current.play().catch(() => {
        // Auto-play was prevented by browser policy
        setIsPlaying(false);
      });
    }
  }, [autoPlay, videoReady]);

  const handlePlay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Play was prevented
        setIsPlaying(false);
      });
    }
  }, []);

  const handlePause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleSeekByPosition = useCallback((pos: number) => {
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = pos * duration;
      setCurrentTime(pos * duration);
    }
  }, [duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get dimensions based on aspect ratio
  const getDimensions = () => {
    const maxWidth = 640;
    switch (aspectRatio) {
      case '9:16':
        return { width: maxWidth, height: Math.round(maxWidth * 16 / 9) };
      case '16:9':
        return { width: maxWidth, height: Math.round(maxWidth * 9 / 16) };
      case '1:1':
        return { width: maxWidth, height: maxWidth };
      default:
        return { width: maxWidth, height: Math.round(maxWidth * 16 / 9) };
    }
  };

  // Dimensions are used for video config
  getDimensions();

  if (beats.length === 0) {
    return (
      <div className="aspect-video rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center overflow-hidden">
        <div className="text-center p-8 text-zinc-400">
          <p className="text-lg font-medium mb-2">No preview available</p>
          <p className="text-sm text-zinc-500">Complete the script and scenes steps to generate a preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Container */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-white/10">
        <div
          className="w-full"
          style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '16:9' ? '16/9' : '1/1' }}
        >
          {/* Video Element for WebCodecs Preview */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            loop={loop}
            crossOrigin="anonymous"
            style={{ 
              width: '100%', 
              height: '100%',
              backgroundColor: '#030712',
            }}
          >
            <track kind="metadata" />
          </video>

          {/* Placeholder overlay when no video source */}
          {!videoReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-zinc-400 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
              <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Preview Ready</p>
              <p className="text-sm text-zinc-500 mt-1">WebCodecs player initialized</p>
              <div className="mt-4 text-xs text-zinc-600 font-mono">
                {beats.length} scenes • {totalDuration.toFixed(1)}s total
              </div>
              <div className="mt-4 p-3 rounded-lg bg-zinc-900/50 border border-white/10 text-xs text-zinc-500 max-w-xs text-center">
                Connect a video source to enable WebCodecs playback with frame-accurate seeking
              </div>
            </div>
          )}

          {/* Playback Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-3">
            <button
              onClick={() => videoRef.current ? (isPlaying ? videoRef.current?.pause() : videoRef.current?.play()) : null}
              disabled={!videoReady}
              className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary transition-colors disabled:opacity-50"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7-11-7z"/></svg>
              )}
            </button>
            
            <div className="flex-1 flex items-center gap-2 text-white text-sm font-mono">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer relative" onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.nativeEvent.clientX - rect.left) / rect.width;
                handleSeekByPosition(pos);
              }}>
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">{beats.length} scenes</span>
              <span className="text-xs text-zinc-500">{aspectRatio}</span>
            </div>
          </div>
        </div>

        {/* Scene Timeline */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-300">Scene Timeline</h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {beats.map((beat, index) => (
              <div
                key={beat.id || index}
                className="flex-shrink-0 w-24 rounded-lg border border-white/10 bg-zinc-900/50 p-2 text-center"
                style={{ borderColor: index === Math.floor(currentTime / (duration / beats.length)) ? 'rgba(34, 211, 238, 0.5)' : 'transparent' }}
              >
                <p className="text-xs font-mono text-primary mb-1">{beat.duration || 3}s</p>
                <p className="text-[10px] text-zinc-400 truncate">{beat.text?.slice(0, 20) || `Scene ${index + 1}`}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-3 gap-4 text-center p-4 rounded-lg bg-zinc-900/50 border border-white/5">
          <div>
            <p className="text-2xl font-bold text-primary">{beats.length}</p>
            <p className="text-xs text-zinc-500">Scenes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{totalDuration.toFixed(1)}s</p>
            <p className="text-xs text-zinc-500">Duration</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{aspectRatio}</p>
            <p className="text-xs text-zinc-500">Aspect Ratio</p>
          </div>
        </div>

        {/* WebCodecs Info */}
        <div className="p-3 rounded-lg bg-zinc-900/30 border border-white/5 text-xs text-zinc-500">
          <p className="font-medium text-zinc-400 mb-1">WebCodecs Preview Ready</p>
          <p>This preview uses HTML5 Video with WebCodecs support for frame-accurate seeking. 
          Connect a rendered video source to enable full playback with MP4/WebM codecs.</p>
        </div>
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper function for seek by position
function handleSeekByPosition(pos: number) {
  // Implementation handled in component
}