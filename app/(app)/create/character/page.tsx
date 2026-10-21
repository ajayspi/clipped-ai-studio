"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserSquare, Upload, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import { AspectRatioSelector } from "@/components/create/ui/AspectRatioSelector";

export default function CharacterConsistencyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [characterUrl, setCharacterUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!script.trim() || !characterUrl.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/workflows/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, aspectRatio, characterUrl }),
      });

      if (!res.ok) throw new Error("Failed to enqueue character workflow");
      const { jobId } = await res.json();
      router.push(`/dashboard?job=${jobId}`);
    } catch (err) {
      console.error(err);
      alert("Error starting character consistency workflow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
          <UserSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Character Consistency</h1>
          <p className="text-muted-foreground">Keep the exact same character face across all generated video scenes using IP-Adapters.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div className="space-y-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Character Reference Image URL
          </label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="url"
              placeholder="https://example.com/character-sheet.jpg"
              value={characterUrl}
              onChange={(e) => setCharacterUrl(e.target.value)}
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>
          {characterUrl && (
            <div className="mt-2 relative aspect-square w-24 rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={characterUrl} alt="Character Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Video Script / Narrative
          </label>
          <textarea
            placeholder="Scene 1: The hero stands in a cyberpunk alleyway... Scene 2: The hero is running from a drone..."
            value={script}
            onChange={(e) => setScript(e.target.value)}
            required
            className="w-full min-h-[150px] p-4 rounded-xl border border-input bg-background/50 focus:ring-2 focus:ring-primary/50 text-sm resize-y"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Format
          </label>
          <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
        </div>

        <button
          type="submit"
          disabled={loading || !script || !characterUrl}
          className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Consistent Video
            </>
          )}
        </button>
      </form>
    </div>
  );
}
