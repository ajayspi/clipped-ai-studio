"use client";

import { useState } from "react";
import {
  X,
  Music2,
  Loader2,
  CheckCircle2,
  Video,
  Share2,
  Zap,
  Download,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  FileVideo,
  FileAudio,
  Film,
} from "lucide-react";

interface PublishModalProps {
  jobId: string;
  videoTitle: string;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "publish" | "export";
}

export function PublishModal({
  jobId,
  videoTitle,
  isOpen,
  onClose,
  defaultTab = "publish",
}: PublishModalProps) {
  const [activeTab, setActiveTab] = useState<"publish" | "export">(defaultTab);
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({
    youtube: true,
    tiktok: true,
    instagram: true,
  });
  const [title, setTitle] = useState(videoTitle || "My Awesome AI Video");
  const [description, setDescription] = useState("Generated using Clipped AI #shorts #ai");
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [publishResults, setPublishResults] = useState<Record<string, any>>({});
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<any | null>(null);

  if (!isOpen) return null;

  async function handlePublish(e?: React.FormEvent, isOneClick = false) {
    if (e) e.preventDefault();
    const selected = isOneClick
      ? ["youtube", "tiktok", "instagram"]
      : Object.entries(platforms).filter(([_, v]) => v).map(([k]) => k);

    if (selected.length === 0) {
      setError("Please select at least one platform to publish");
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          platforms: selected,
          title,
          description,
          isOneClick,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publishing failed");

      setPublishResults(data.results || {});
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to publish video");
    } finally {
      setPublishing(false);
    }
  }

  async function handleExport(preset: string) {
    setExporting(preset);
    setError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          preset,
          title,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");

      setExportData(data);
      // Automatically trigger browser download
      if (data.downloadUrl) {
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = data.filename || `export_${preset}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      setError(err.message || "Failed to export video");
    } finally {
      setExporting(null);
    }
  }

  const togglePlatform = (id: string) => {
    setPlatforms((p) => ({ ...p, [id]: !p[id] }));
    setError(null);
  };

  const copyToClipboard = (url: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(key);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Export & Social Publish
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              One-click publish to shorts feeds or download production masters.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("publish");
              setSuccess(false);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "publish"
                ? "bg-card text-foreground shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            Social Publishing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "export"
                ? "bg-card text-foreground shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            Direct Download & Presets
          </button>
        </div>

        {/* Tab 1: Social Publishing */}
        {activeTab === "publish" && (
          <>
            {success ? (
              <div className="p-6 flex flex-col space-y-5">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="font-bold text-sm">Successfully Published!</h3>
                    <p className="text-xs text-muted-foreground">
                      Your video has been dispatched to connected channels with live preview links below.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live Channel URLs
                  </label>
                  {Object.entries(publishResults).map(([platform, result]: [string, any]) => (
                    <div
                      key={platform}
                      className="p-3 rounded-xl border bg-muted/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {platform === "youtube" && <Video className="w-4 h-4 text-red-500 shrink-0" />}
                        {platform === "tiktok" && <Music2 className="w-4 h-4 text-black dark:text-white shrink-0" />}
                        {platform === "instagram" && <Share2 className="w-4 h-4 text-pink-500 shrink-0" />}
                        <span className="font-semibold capitalize shrink-0">{platform}:</span>
                        <span className="font-mono text-muted-foreground truncate select-all">
                          {result.publishedUrl || "Processing upload..."}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {result.publishedUrl && (
                          <>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(result.publishedUrl, platform)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy URL"
                            >
                              {copiedLink === platform ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={result.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md hover:bg-muted text-primary transition-colors inline-flex items-center gap-1"
                              title="Open Live Link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
                  >
                    Publish Again
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold shadow hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handlePublish(e, false)} className="p-6 space-y-5">
                {/* One Click Instant Bar */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-pink-500/10 border border-violet-500/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-violet-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-foreground">One-Click Quick Publish</span>
                      <p className="text-[11px] text-muted-foreground">
                        Post to Shorts, TikTok & Reels simultaneously.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={publishing}
                    onClick={() => handlePublish(undefined, true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-violet-500/20 transition-all shrink-0 disabled:opacity-50"
                  >
                    {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                    Instant Post
                  </button>
                </div>

                {/* Platform Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Platforms
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => togglePlatform("youtube")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        platforms.youtube
                          ? "border-red-500 bg-red-500/10 shadow-sm"
                          : "border-border bg-muted/40 hover:bg-muted opacity-60"
                      }`}
                    >
                      <Video className={`w-5 h-5 ${platforms.youtube ? "text-red-500" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold">YouTube Shorts</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlatform("tiktok")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        platforms.tiktok
                          ? "border-black dark:border-white bg-black/10 dark:bg-white/10 shadow-sm"
                          : "border-border bg-muted/40 hover:bg-muted opacity-60"
                      }`}
                    >
                      <Music2 className={`w-5 h-5 ${platforms.tiktok ? "text-foreground" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold">TikTok</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlatform("instagram")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        platforms.instagram
                          ? "border-pink-500 bg-pink-500/10 shadow-sm"
                          : "border-border bg-muted/40 hover:bg-muted opacity-60"
                      }`}
                    >
                      <Share2 className={`w-5 h-5 ${platforms.instagram ? "text-pink-500" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold">Instagram Reels</span>
                    </button>
                  </div>
                </div>

                {/* Metadata Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Video Title / Hook
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Description & Hashtags
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold shadow hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {publishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Publish Selected
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Tab 2: Direct Download & Resolution Presets */}
        {activeTab === "export" && (
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Resolution Preset
              </label>

              {/* 1080p Preset */}
              <div className="p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">1080p Full HD</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      1080x1920 Vertical &bull; 8 Mbps &bull; ~18 MB &bull; MP4
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => handleExport("1080p")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition-all shrink-0 disabled:opacity-50"
                >
                  {exporting === "1080p" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download HD
                </button>
              </div>

              {/* 720p Preset */}
              <div className="p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground">720p Fast Preview</span>
                    <p className="text-[11px] text-muted-foreground">
                      720x1280 &bull; 3.5 Mbps &bull; ~6 MB &bull; MP4
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => handleExport("720p")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border bg-background hover:bg-muted text-foreground font-medium text-xs transition-all shrink-0 disabled:opacity-50"
                >
                  {exporting === "720p" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download 720p
                </button>
              </div>

              {/* 4K Master Preset */}
              <div className="p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground">4K Ultra Master</span>
                    <p className="text-[11px] text-muted-foreground">
                      2160x3840 &bull; 24 Mbps &bull; 60fps Master &bull; MP4
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => handleExport("4k")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border bg-background hover:bg-muted text-foreground font-medium text-xs transition-all shrink-0 disabled:opacity-50"
                >
                  {exporting === "4k" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download 4K
                </button>
              </div>

              {/* Audio Only MP3 */}
              <div className="p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground">Audio Narration (MP3)</span>
                    <p className="text-[11px] text-muted-foreground">
                      320 kbps Studio Audio &bull; Narration + BGM &bull; MP3
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => handleExport("mp3")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border bg-background hover:bg-muted text-foreground font-medium text-xs transition-all shrink-0 disabled:opacity-50"
                >
                  {exporting === "mp3" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download MP3
                </button>
              </div>
            </div>

            {exportData && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Export generated: <strong>{exportData.filename}</strong> ({exportData.fileSizeMb} MB)</span>
              </div>
            )}

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold shadow hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
