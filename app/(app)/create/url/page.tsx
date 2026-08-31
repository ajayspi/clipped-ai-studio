"use client";

import { useState } from "react";
import { Link, ArrowRight, Loader2, Link2, Sparkles, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWizardStore } from "@/components/wizard/wizard-store";

export default function UrlToVideoPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const w = useWizardStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/workflows/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to scrape URL");
      }
      
      // Inject into the wizard store
      w.reset();
      w.set("workflowType", "footage");
      w.set("narration", data.script);
      w.set("subject", `Video from: ${new URL(url).hostname}`);
      
      // Navigate to the footage wizard and trigger Auto-Pilot 
      // (Auto-Pilot will see narration is present and jump to scene breakdown)
      w.set("autoMode", true);
      router.push("/create/footage");
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 bg-muted/10 h-[calc(100vh-4rem)]">
      <div className="w-full max-w-xl mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Link2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">URL to Video</h1>
          <p className="text-muted-foreground text-lg">
            Paste any blog post, news article, or webpage. AI will extract the story and instantly turn it into a short-form video.
          </p>
        </div>

        <div className="bg-card border rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Article URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="url"
                  placeholder="https://example.com/blog/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  required
                  className="flex h-12 w-full rounded-md border border-input bg-transparent pl-10 pr-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!url || loading}
              className="w-full h-12 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                  Scraping and summarizing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" /> 
                  Generate Video <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Tip: The AI will automatically write a viral hook and summarize the content to fit a 30-60 second short.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
