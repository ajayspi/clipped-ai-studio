"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Loader2, Sparkles, Paintbrush } from "lucide-react";

export default function VideoToVideoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceVideoUrl.trim() || !stylePrompt.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/workflows/v2v", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVideoUrl, stylePrompt }),
      });

      if (!res.ok) throw new Error("Failed to enqueue v2v workflow");
      const { jobId } = await res.json();
      router.push(`/dashboard?job=${jobId}`);
    } catch (err) {
      console.error(err);
      alert("Error starting Video-to-Video workflow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center text-white shadow-md">
          <Paintbrush className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Video-to-Video Restyling</h1>
          <p className="text-muted-foreground">Transform a raw video into 3D Animation, Anime, or Cinematic styles using Kling / Fal.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div className="space-y-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Source Video URL
          </label>
          <div className="relative">
            <Video className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="url"
              placeholder="https://example.com/raw-footage.mp4"
              value={sourceVideoUrl}
              onChange={(e) => setSourceVideoUrl(e.target.value)}
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Target Style / Prompt
          </label>
          <textarea
            placeholder="e.g. Studio Ghibli style, vibrant colors, magical glowing forest..."
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            required
            className="w-full h-24 p-4 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/50 text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !sourceVideoUrl || !stylePrompt}
          className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-md shadow-fuchsia-500/20 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Transform Video
            </>
          )}
        </button>
      </form>
    </div>
  );
}
