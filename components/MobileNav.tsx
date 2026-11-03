"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
  Folder,
  Film,
  ListVideo,
  CalendarDays,
  Settings,
  Video,
  LogOut,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

export const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Video", href: "/create", icon: Sparkles },
  { name: "Library & Assets", href: "/library", icon: Folder },
  { name: "Timeline Editor", href: "/editor", icon: Film },
  { name: "Render Queue", href: "/queue", icon: ListVideo },
  { name: "Publish Calendar", href: "/planner", icon: CalendarDays },
  { name: "Settings & Keys", href: "/settings", icon: Settings },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0)
  const pathname = usePathname()
  const [prevPathname, setPrevPathname] = useState(pathname)

  // Close the menu when the route changes; adjusting state during render is
  // the effect-free pattern (avoids set-state-in-effect cascade).
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setIsOpen(false)
  }

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
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 -mr-2 rounded-xl hover:bg-muted/80 text-foreground transition-colors"
        aria-label="Open Mobile Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-md z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-3/4 max-w-sm bg-card/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-l border-border/40 z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-lg">Clipped Studio</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close Mobile Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  const Icon = item.icon
                  const isQueue = item.href === "/queue"

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-semibold shadow-md shadow-indigo-500/20"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </div>
                      {isQueue && activeJobsCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white animate-pulse shadow-sm shadow-violet-500/30">
                          {activeJobsCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>

              <div className="p-4 border-t border-border/40 mt-auto">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl px-4 py-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
