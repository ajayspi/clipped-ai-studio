"use client";

import React, { useState, useMemo } from "react";
import { Plus, X, Loader2, Calendar, Film, Hash, Check } from "lucide-react";
import { supabase } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";

export type RenderJobLike = {
  id: string;
  logs?: string | Record<string, unknown> | null;
  status?: string;
  created_at?: string;
};

export interface ScheduleModalProps {
  jobs?: RenderJobLike[];
  isOpen?: boolean;
  initialDate?: string;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onScheduled?: () => void;
}

const PRESET_TIMES = [
  { label: "Morning Peak (09:00)", time: "09:00" },
  { label: "Lunch (12:30)", time: "12:30" },
  { label: "Evening Prime (18:00)", time: "18:00" },
  { label: "Late Night (21:00)", time: "21:00" },
];

const SUGGESTED_TAGS = ["#shorts", "#viral", "#aivideo", "#trending", "#story", "#reels"];

const PLATFORM_CONFIG: Record<string, { label: string; activeClass: string }> = {
  youtube: {
    label: "YouTube Shorts",
    activeClass: "bg-red-500/20 text-red-400 border-red-500/40 shadow-sm",
  },
  tiktok: {
    label: "TikTok",
    activeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm",
  },
  instagram: {
    label: "Instagram Reels",
    activeClass: "bg-pink-500/20 text-pink-400 border-pink-500/40 shadow-sm",
  },
};

export function ScheduleModal({
  jobs = [],
  isOpen: controlledIsOpen,
  initialDate,
  onOpenChange,
  trigger,
  onScheduled,
}: ScheduleModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(open);
    }
    onOpenChange?.(open);
  };

  const [fetchedJobs, setFetchedJobs] = useState<RenderJobLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingJobs, setFetchingJobs] = useState(false);

  // Form State
  const [selectedJob, setSelectedJob] = useState("");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("12:00");
  const [platforms, setPlatforms] = useState<string[]>(["youtube", "tiktok"]);

  // Derive available jobs from props or dynamically fetched completed jobs without cascading setState
  const availableJobs = useMemo(() => {
    return jobs.length > 0 ? jobs : fetchedJobs;
  }, [jobs, fetchedJobs]);

  async function fetchJobs() {
    setFetchingJobs(true);
    try {
      const { data } = await supabase
        .from("render_jobs")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setFetchedJobs(data);
      }
    } catch (err) {
      console.warn("Failed to fetch completed jobs for planner:", err);
    } finally {
      setFetchingJobs(false);
    }
  }

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const addTag = (tag: string) => {
    if (!caption.includes(tag)) {
      setCaption((prev) => (prev ? `${prev.trim()} ${tag}` : tag));
    }
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJob(jobId);
    const chosen = availableJobs.find((j) => j.id === jobId);
    if (chosen && !caption) {
      try {
        const parsed =
          typeof chosen.logs === "string" ? JSON.parse(chosen.logs) : chosen.logs;
        if (parsed?.subject) {
          setCaption(`${parsed.subject} #aivideo #shorts`);
        }
      } catch {}
    }
  };

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob || !date || !time || platforms.length === 0) return;

    setLoading(true);
    try {
      const scheduledFor = new Date(`${date}T${time}:00`).toISOString();

      const { error } = await supabase.from("scheduled_posts").insert({
        job_id: selectedJob,
        caption,
        platforms,
        scheduled_for: scheduledFor,
        status: "pending",
      });

      if (error) {
        console.error("Failed to insert scheduled post:", error);
      } else {
        setOpen(false);
        onScheduled?.();
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error("Error scheduling post:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {trigger !== undefined ? (
        trigger
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            if (!initialDate) {
              setDate(new Date().toISOString().split("T")[0]);
            }
            setTime("12:00");
            void fetchJobs();
          }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" /> Schedule Post
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card/95 border border-border/60 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">
                      Schedule Video Publication
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Automate release across short-form channels
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSchedule} className="p-5 space-y-5">
                {/* Video Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Completed Video
                    </label>
                    {fetchingJobs && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Fetching videos...
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      required
                      value={selectedJob}
                      onChange={(e) => handleJobSelect(e.target.value)}
                      className="w-full rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all appearance-none"
                    >
                      <option value="">-- Choose a completed render from library --</option>
                      {availableJobs.map((job) => {
                        let title = `Render #${job.id.slice(0, 8)}`;
                        let aspect = "9:16";
                        try {
                          const logs =
                            typeof job.logs === "string"
                              ? JSON.parse(job.logs)
                              : job.logs;
                          if (logs?.subject) title = logs.subject;
                          if (logs?.aspectRatio) aspect = logs.aspectRatio;
                        } catch {}
                        return (
                          <option key={job.id} value={job.id}>
                            [{aspect}] {title}
                          </option>
                        );
                      })}
                    </select>
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Film className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Caption & Tags */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Caption & Viral Hooks
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {caption.length} chars
                    </span>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    placeholder="Write an engaging hook and caption for this release..."
                    className="w-full rounded-xl border border-border/60 bg-background/60 p-3 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none resize-none transition-all placeholder:text-muted-foreground/50"
                  />
                  {/* Tag quick-append pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Quick Tags:
                    </span>
                    {SUGGESTED_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-secondary/60 hover:bg-secondary text-secondary-foreground border border-border/40 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timing controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Publish Date
                    </label>
                    <input
                      required
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Publish Time
                    </label>
                    <input
                      required
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Preset Timing Shortcuts */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">Cadence Presets:</span>
                  {PRESET_TIMES.map((preset) => (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => setTime(preset.time)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                        time === preset.time
                          ? "bg-primary/20 text-primary border-primary/40 font-medium"
                          : "bg-background/40 hover:bg-muted text-muted-foreground border-border/40"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Platform Toggles */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Social Channels
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {Object.entries(PLATFORM_CONFIG).map(([platformKey, cfg]) => {
                      const isSelected = platforms.includes(platformKey);
                      return (
                        <button
                          key={platformKey}
                          type="button"
                          onClick={() => togglePlatform(platformKey)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                            isSelected
                              ? cfg.activeClass
                              : "bg-background/40 text-muted-foreground border-border/40 hover:bg-muted"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-border/40 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading || !selectedJob || platforms.length === 0}
                    type="submit"
                    className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-primary/20"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
