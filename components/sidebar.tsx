"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Sparkles,
  Folder,
  Film,
  ListVideo,
  CalendarDays,
  Settings,
  Video,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Zap,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    title: "STUDIO",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Create Video", href: "/create", icon: Sparkles },
    ],
  },
  {
    title: "CONTENT",
    items: [
      { name: "Library & Assets", href: "/library", icon: Folder },
      { name: "Timeline Editor", href: "/editor", icon: Film },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "Render Queue", href: "/queue", icon: ListVideo },
      { name: "Publish Calendar", href: "/planner", icon: CalendarDays },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Settings & Keys", href: "/settings", icon: Settings },
    ],
  },
]

export const navItems: NavItem[] = navSections.flatMap((s) => s.items)

interface CreditsData {
  tier: string
  used: number
  total: number
  remaining: number
  isUnlimited: boolean
  engineReady: boolean
}

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0)
  const [credits, setCredits] = useState<CreditsData | null>(null)

  // Safe client-side hydration for localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("clipped_sidebar_collapsed")
      if (saved !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- client-side localStorage hydration
        setIsCollapsed(saved === "true")
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, [])

  // Poll active jobs count for dynamic Render Queue badge
  useEffect(() => {
    let isMounted = true
    async function fetchActiveJobs() {
      try {
        const res = await fetch("/api/jobs?limit=20")
        if (!res.ok) return
        const data = await res.json()
        const count =
          data.counts?.queued ??
          (Array.isArray(data.queued) ? data.queued.length : 0) ??
          (Array.isArray(data.jobs)
            ? data.jobs.filter((j: { status?: string; orchestration_state?: string }) =>
                [
                  "pending",
                  "generating_plan",
                  "processing",
                  "queued",
                  "claimed",
                  "rendering",
                  "planning",
                  "in_progress",
                  "retryable",
                ].includes(j.status || "") ||
                [
                  "pending",
                  "generating_plan",
                  "processing",
                  "queued",
                  "claimed",
                  "rendering",
                  "planning",
                  "in_progress",
                  "retryable",
                ].includes(j.orchestration_state || "")
              ).length
            : 0)
        if (isMounted) {
          setActiveJobsCount(count)
        }
      } catch {
        // Ignore polling errors
      }
    }

    fetchActiveJobs()
    const interval = setInterval(fetchActiveJobs, 10000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Fetch real quota & engine readiness status
  useEffect(() => {
    let isMounted = true
    async function fetchCredits() {
      try {
        const res = await fetch("/api/credits")
        if (!res.ok) return
        const data = await res.json()
        if (isMounted && data.success) {
          setCredits(data)
        }
      } catch {
        // Fallback cleanly
      }
    }

    fetchCredits()
    return () => {
      isMounted = false
    }
  }, [])

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("clipped_sidebar_collapsed", String(next))
      } catch {}
      return next
    })
  }

  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.error("SignOut error:", err)
    } finally {
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? 72 : 256,
      }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 30,
      }}
      className="relative flex h-screen flex-col border-r border-border/60 bg-card/90 dark:bg-zinc-950/60 backdrop-blur-xl shadow-sm dark:shadow-black/40 z-30 select-none transition-colors"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-3.5 border-b border-border/60">
        {!isCollapsed ? (
          <div className="flex items-center justify-between w-full">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-fuchsia-600 flex items-center justify-center text-white shadow-md shadow-violet-500/25 group-hover:scale-105 transition-transform duration-200">
                <Video className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text">
                  Clipped
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20">
                  AI
                </span>
              </div>
            </Link>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-zinc-800/60 transition-colors"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl bg-accent/50 hover:bg-accent text-foreground hover:text-primary transition-all duration-200 group"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <PanelLeftOpen className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div className={`flex-1 py-3 px-2 ${isCollapsed ? "overflow-visible" : "overflow-y-auto"}`}>
        {!isCollapsed ? (
          <div className="space-y-4">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </div>
                <nav className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    const Icon = item.icon
                    const isQueue = item.href === "/queue"

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-semibold shadow-md shadow-indigo-500/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                              isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          />
                          <span>{item.name}</span>
                        </div>

                        {isQueue && activeJobsCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-600 text-white animate-pulse shadow-sm shadow-violet-500/30">
                            {activeJobsCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {navSections.map((section, idx) => (
              <div key={section.title} className="w-full flex flex-col items-center gap-1.5">
                {idx > 0 && <div className="w-8 h-px bg-border/40 my-1" />}
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  const Icon = item.icon
                  const isQueue = item.href === "/queue"

                  return (
                    <div key={item.href} className="relative group flex justify-center w-full">
                      <Link
                        href={item.href}
                        className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 scale-105"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60 dark:hover:bg-zinc-800/60"
                        }`}
                        aria-label={item.name}
                      >
                        <Icon className="w-5 h-5" />
                        {isQueue && activeJobsCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-4.5 px-1 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse shadow-sm shadow-violet-500/30">
                            {activeJobsCount}
                          </span>
                        )}
                      </Link>

                      {/* Floating Tooltip when collapsed */}
                      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover/95 text-popover-foreground text-xs font-medium rounded-lg shadow-xl border border-border/50 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-150 z-50 flex items-center gap-1.5 backdrop-blur-md top-1/2 -translate-y-1/2">
                        <span>{item.name}</span>
                        {isQueue && activeJobsCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white bg-violet-600">
                            {activeJobsCount}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Dynamic AI Quota Meter (When Expanded) */}
        {!isCollapsed && (
          <div className="mt-5 mx-1 p-3 rounded-xl bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent border border-violet-500/25 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-xs font-semibold text-foreground">
                  {credits?.tier === "enterprise" || credits?.isUnlimited
                    ? "Enterprise Plan"
                    : credits?.tier === "pro"
                    ? "Pro Quota"
                    : "AI Quota"}
                </span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {credits?.isUnlimited
                  ? "Unlimited"
                  : credits
                  ? `${credits.used} / ${credits.total} videos`
                  : "Keyless Engine Ready"}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{
                  width: credits?.isUnlimited
                    ? "100%"
                    : credits && credits.total > 0
                    ? `${Math.min(100, Math.round((credits.used / credits.total) * 100))}%`
                    : "0%",
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Link
                href="/create"
                className="text-[11px] font-semibold text-violet-700 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" /> Create video &rarr;
              </Link>
              <span className="text-[9px] text-muted-foreground/70 font-mono">
                {credits?.engineReady ? "Engine ready" : "Ready"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Area */}
      <div className="p-3 border-t border-border/60 mt-auto">
        {!isCollapsed ? (
          <div className="flex flex-col gap-1">
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-3 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 dark:hover:bg-zinc-800/60 rounded-xl transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/60 dark:hover:bg-zinc-800/60 transition-colors"
                aria-label="Expand Sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-popover/95 text-popover-foreground text-xs font-medium rounded-lg shadow-xl border border-border/50 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-150 z-50 backdrop-blur-md top-1/2 -translate-y-1/2">
                Expand Sidebar
              </div>
            </div>

            <div className="relative group">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-popover/95 text-popover-foreground text-xs font-medium rounded-lg shadow-xl border border-border/50 whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-150 z-50 backdrop-blur-md top-1/2 -translate-y-1/2">
                Logout
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
