"use client";

import { useState } from "react";
import { X, Music2, Loader2, CheckCircle2, Video, Share2 } from "lucide-react";

interface PublishModalProps {
  jobId: string;
  videoTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PublishModal({ jobId, videoTitle, isOpen, onClose }: PublishModalProps) {
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({
    youtube: false,
    tiktok: false,
    instagram: false,
  });
  const [title, setTitle] = useState(videoTitle || "My Awesome AI Video");
  const [description, setDescription] = useState("Generated using Clipped AI #shorts #ai");
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    const selected = Object.entries(platforms).filter(([_, v]) => v).map(([k]) => k);
    
    if (selected.length === 0) {
      setError("Please select at least one platform");
      return;
    }

    setPublishing(true);
    setError(null);
    
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, platforms: selected, title, description }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publishing failed");
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  const togglePlatform = (id: string) => {
    setPlatforms(p => ({ ...p, [id]: !p[id] }));
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Publish Video</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Successfully Published!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your video has been sent to the selected platforms. It may take a few minutes to process.
              </p>
            </div>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handlePublish} className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Platforms</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => togglePlatform("youtube")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${platforms.youtube ? "border-red-500 bg-red-500/10" : "border-transparent bg-muted hover:bg-muted/80"}`}
                >
                  <Video className={`w-6 h-6 ${platforms.youtube ? "text-red-500" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">Shorts</span>
                </button>
                <button
                  type="button"
                  onClick={() => togglePlatform("tiktok")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${platforms.tiktok ? "border-black bg-black/10 dark:border-white dark:bg-white/10" : "border-transparent bg-muted hover:bg-muted/80"}`}
                >
                  <Music2 className={`w-6 h-6 ${platforms.tiktok ? "text-black dark:text-white" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">TikTok</span>
                </button>
                <button
                  type="button"
                  onClick={() => togglePlatform("instagram")}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${platforms.instagram ? "border-pink-500 bg-pink-500/10" : "border-transparent bg-muted hover:bg-muted/80"}`}
                >
                  <Share2 className={`w-6 h-6 ${platforms.instagram ? "text-pink-500" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">Reels</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Video Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description & Tags</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishing}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium shadow hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
                Publish Now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
