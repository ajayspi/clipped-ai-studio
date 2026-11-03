"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Trash2,
  Loader2,
  Filter,
} from "lucide-react";
import { supabase } from "@/lib/db";
import { ScheduleModal } from "@/components/planner/ScheduleModal";

export interface ScheduledPost {
  id: string;
  job_id?: string;
  scheduled_for: string | null;
  status: string;
  caption?: string | null;
  platforms?: string[] | null;
  render_jobs?: {
    logs?: string | Record<string, unknown> | null;
    status?: string;
  } | null;
}

interface PlannerViewProps {
  initialPosts: ScheduledPost[];
}

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const dayNumFmt = new Intl.DateTimeFormat("en-US", { day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const monthYearFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const shortMonthFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PlannerView({ initialPosts = [] }: PlannerViewProps) {
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Schedule modal direct-date state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string>(formatIsoDate(new Date()));

  const today = useMemo(() => new Date(), []);

  // Filter posts by platform
  const filteredPosts = useMemo(() => {
    if (platformFilter === "all") return posts;
    return posts.filter((p) => Array.isArray(p.platforms) && p.platforms.includes(platformFilter));
  }, [posts, platformFilter]);

  // Generate 7-day week array centered or starting around currentDate
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentDate, i));
  }, [currentDate]);

  // Generate month grid days (Sun - Sat)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
      });
    }

    // Days of current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Trailing days to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else {
      setCurrentDate((prev) => addDays(prev, -7));
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else {
      setCurrentDate((prev) => addDays(prev, 7));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenScheduleForDate = (date: Date) => {
    setModalDate(formatIsoDate(date));
    setModalOpen(true);
  };

  // Immediate Publish Action
  const handlePublishNow = async (post: ScheduledPost) => {
    setPublishingId(post.id);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: post.job_id,
          platforms: post.platforms && post.platforms.length > 0 ? post.platforms : ["youtube"],
          title: post.caption || "AI Video Release",
          description: post.caption || "AI Video generated via Clipped Studio #shorts",
          isDryRun: false,
        }),
      });

      if (res.ok) {
        // Optimistically update status to published
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, status: "published" } : p))
        );
      }
    } catch (err) {
      console.error("Failed to publish video:", err);
    } finally {
      setPublishingId(null);
    }
  };

  // Cancel / Delete Post Action
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Cancel and delete this scheduled post?")) return;
    setDeletingId(postId);
    try {
      const res = await fetch(`/api/scheduled-posts/${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        // Fallback to direct supabase delete
        await supabase.from("scheduled_posts").delete().eq("id", postId);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error("Failed to cancel post:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Header Title Range String
  const periodTitle = useMemo(() => {
    if (viewMode === "month") {
      return monthYearFmt.format(currentDate);
    }
    const endOfWeek = addDays(currentDate, 6);
    return `${shortMonthFmt.format(currentDate)} – ${shortMonthFmt.format(endOfWeek)}, ${endOfWeek.getFullYear()}`;
  }, [viewMode, currentDate]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      {/* Top Header & Launch Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card/60 border border-border/40 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Content Calendar</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              30-Day Multi-Channel
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule and automate your AI video distribution across YouTube Shorts, TikTok, and Instagram Reels.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-background/60 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "week"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7-Day Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "month"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30-Day Month
            </button>
          </div>

          <ScheduleModal
            isOpen={modalOpen}
            initialDate={modalDate}
            onOpenChange={setModalOpen}
            onScheduled={() => {
              setModalOpen(false);
            }}
          />
        </div>
      </div>

      {/* Navigation & Distribution Telemetry Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 border border-border/40 px-4 py-3 rounded-xl">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-border/40 bg-background/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous Period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-border/40 bg-background/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-border/40 bg-background/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next Period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold tracking-tight text-foreground ml-2">
            {periodTitle}
          </span>
        </div>

        {/* Platform Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {["all", "youtube", "tiktok", "instagram"].map((plat) => (
            <button
              key={plat}
              type="button"
              onClick={() => setPlatformFilter(plat)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                platformFilter === plat
                  ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                  : "bg-background/40 hover:bg-muted text-muted-foreground border-border/40"
              }`}
            >
              {plat === "all"
                ? "All Channels"
                : plat === "youtube"
                ? "YouTube"
                : plat === "tiktok"
                ? "TikTok"
                : "Instagram"}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW: 7-DAY WEEK STRIP */}
      {viewMode === "week" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day, i) => {
            const isCurrentDay = isSameDay(day, today);
            const dayPosts = filteredPosts.filter((p) => {
              if (!p?.scheduled_for) return false;
              const d = new Date(p.scheduled_for);
              return isValidDate(d) && isSameDay(d, day);
            });

            return (
              <div
                key={i}
                className={`flex flex-col border rounded-2xl bg-card/70 overflow-hidden min-h-[440px] transition-all ${
                  isCurrentDay
                    ? "ring-1 ring-primary/60 border-primary/40 shadow-lg shadow-primary/5"
                    : "border-border/50 hover:border-border"
                }`}
              >
                {/* Column Day Header */}
                <div
                  className={`p-3.5 border-b font-medium text-sm flex justify-between items-center ${
                    isCurrentDay
                      ? "bg-primary/10 border-primary/20 text-primary font-semibold"
                      : "bg-muted/30 border-border/40 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{weekdayFmt.format(day)}</span>
                    {isCurrentDay && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-primary text-primary-foreground">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenScheduleForDate(day)}
                      title="Schedule on this day"
                      className="w-6 h-6 rounded-md hover:bg-background/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrentDay ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {dayNumFmt.format(day)}
                    </span>
                  </div>
                </div>

                {/* Column Posts Feed */}
                <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
                  {dayPosts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40 text-xs text-center p-4">
                      <span>No posts scheduled</span>
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleForDate(day)}
                        className="mt-2 text-[11px] text-primary/70 hover:text-primary transition-colors inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Quick Schedule
                      </button>
                    </div>
                  ) : (
                    dayPosts.map((post) => {
                      let parsed: { subject?: string; workflowType?: string } = {};
                      try {
                        parsed =
                          typeof post.render_jobs?.logs === "string"
                            ? JSON.parse(post.render_jobs.logs)
                            : post.render_jobs?.logs || {};
                      } catch {}

                      const isPublished = post.status === "published";
                      const isFailed = post.status === "failed";
                      const postDate = post.scheduled_for ? new Date(post.scheduled_for) : null;
                      const formattedTime = isValidDate(postDate) ? timeFmt.format(postDate) : "Time TBD";

                      return (
                        <div
                          key={post.id}
                          className="group relative border border-border/60 rounded-xl p-3 bg-background/80 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col gap-2"
                        >
                          {/* Time & Status Row */}
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/40">
                              {formattedTime}
                            </span>
                            <div className="flex items-center gap-1">
                              {isPublished ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> Published
                                </span>
                              ) : isFailed ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                  <XCircle className="w-3 h-3" /> Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                                  <Clock className="w-3 h-3" /> Scheduled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Caption / Title */}
                          <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
                            {post.caption || parsed.subject || "Untitled Video Release"}
                          </p>

                          {/* Platforms & Badges */}
                          <div className="flex gap-1 flex-wrap pt-1">
                            {parsed.workflowType === "bulk-plan" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Bulk Plan
                              </span>
                            )}
                            {Array.isArray(post.platforms) &&
                              post.platforms.map((p: string) => {
                                const isYt = p === "youtube";
                                const isTt = p === "tiktok";
                                const isIg = p === "instagram";
                                return (
                                  <span
                                    key={p}
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${
                                      isYt
                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                        : isTt
                                        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                                        : isIg
                                        ? "bg-pink-500/10 text-pink-400 border-pink-500/20"
                                        : "bg-muted text-muted-foreground border-border/40"
                                    }`}
                                  >
                                    {p}
                                  </span>
                                );
                              })}
                          </div>

                          {/* Hover Action Bar */}
                          <div className="pt-2 border-t border-border/40 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                            {!isPublished && (
                              <button
                                type="button"
                                disabled={publishingId === post.id}
                                onClick={() => handlePublishNow(post)}
                                className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                {publishingId === post.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                Publish Now
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={deletingId === post.id}
                              onClick={() => handleDeletePost(post.id)}
                              className="text-[11px] font-medium text-muted-foreground hover:text-rose-400 flex items-center gap-1 ml-auto transition-colors disabled:opacity-50"
                              title="Delete scheduled post"
                            >
                              {deletingId === post.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: 30-DAY MONTH GRID */}
      {viewMode === "month" && (
        <div className="flex flex-col border border-border/50 rounded-2xl bg-card/70 overflow-hidden shadow-lg">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30 text-center py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <div key={dayName}>{dayName}</div>
            ))}
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-[140px] divide-x divide-y divide-border/40">
            {monthDays.map(({ date, isCurrentMonth }, idx) => {
              const isCurrentDay = isSameDay(date, today);
              const cellPosts = filteredPosts.filter((p) => {
                if (!p?.scheduled_for) return false;
                const d = new Date(p.scheduled_for);
                return isValidDate(d) && isSameDay(d, date);
              });

              return (
                <div
                  key={idx}
                  className={`p-2 flex flex-col gap-1 overflow-hidden transition-all group ${
                    !isCurrentMonth ? "bg-muted/10 opacity-40" : "bg-card/40"
                  } ${isCurrentDay ? "ring-1 ring-inset ring-primary/60 bg-primary/5" : "hover:bg-muted/20"}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isCurrentDay
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground group-hover:text-primary transition-colors"
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenScheduleForDate(date)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                      title="Schedule on this date"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Cell posts list */}
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {cellPosts.map((post) => {
                      let parsed: { subject?: string } = {};
                      try {
                        parsed =
                          typeof post.render_jobs?.logs === "string"
                            ? JSON.parse(post.render_jobs.logs)
                            : post.render_jobs?.logs || {};
                      } catch {}

                      const isPublished = post.status === "published";
                      const postDate = post.scheduled_for ? new Date(post.scheduled_for) : null;
                      const timeStr = isValidDate(postDate) ? timeFmt.format(postDate) : "";

                      return (
                        <div
                          key={post.id}
                          className={`text-[10px] p-1.5 rounded-lg border leading-tight flex items-center justify-between gap-1 transition-all ${
                            isPublished
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-background/80 text-foreground border-border/60 hover:border-primary/50"
                          }`}
                        >
                          <div className="truncate flex-1">
                            <span className="font-semibold mr-1">{timeStr}</span>
                            <span>{post.caption || parsed.subject || "Video"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="text-muted-foreground hover:text-rose-400 p-0.5 rounded transition-colors"
                            title="Cancel post"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
