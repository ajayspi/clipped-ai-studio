"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Loader2 } from "lucide-react";

export default function PodcastWorkflowPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/workflows/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: url }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start workflow");
      }

      router.push(`/dashboard?job=${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border rounded-xl shadow-sm">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Mic className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Audio Podcast to Video</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Enter a YouTube URL to extract an engaging highlight and generate a short video.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              YouTube URL
            </label>
            <input
              id="url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading || !url}
            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Generate Video"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
