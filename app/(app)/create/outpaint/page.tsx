"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize, Loader2, Sparkles, Video } from "lucide-react";
import { AspectRatioSelector } from "@/components/create/ui/AspectRatioSelector";

export default function OutpaintingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [targetRatio, setTargetRatio] = useState("9:16");
  const [contextPrompt, setContextPrompt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceVideoUrl.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/workflows/outpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVideoUrl, targetRatio, contextPrompt }),
      });

      if (!res.ok) throw new Error("Failed to enqueue outpainting workflow");
      const { jobId } = await res.json();
      router.push(`/dashboard?job=${jobId}`);
    } catch (err) {
      console.error(err);
      alert("Error starting Video Outpainting workflow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md">
          <Maximize className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Video Outpainting</h1>
          <p className="text-muted-foreground">Convert a 16:9 YouTube video into a 9:16 TikTok by letting AI organically paint the missing top and bottom scenery.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div className="space-y-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Original Video URL
          </label>
          <div className="relative">
            <Video className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="url"
              placeholder="https://example.com/landscape-video.mp4"
              value={sourceVideoUrl}
              onChange={(e) => setSourceVideoUrl(e.target.value)}
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Target Aspect Ratio
          </label>
          <AspectRatioSelector value={targetRatio} onChange={setTargetRatio} />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Context Prompt (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Expand into a beautiful blue sky and green grass..."
            value={contextPrompt}
            onChange={(e) => setContextPrompt(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !sourceVideoUrl}
          className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Outpaint Video
            </>
          )}
        </button>
      </form>
    </div>
  );
}
