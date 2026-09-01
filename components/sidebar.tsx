"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Video,
  Library,
  Settings,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Sparkles,
  Wand2,
  Zap,
  Film,
} from "lucide-react"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeColor?: string
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create AI Video", href: "/create", icon: Wand2, badge: "AI", badgeColor: "from-violet-500 to-fuchsia-500" },
  { name: "Library", href: "/library", icon: Library },
  { name: "Planner", href: "/planner", icon: CalendarDays },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Safe client-side hydration for localStorage
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem("clipped_sidebar_collapsed")
      if (saved !== null) {
        setIsCollapsed(saved === "true")
      }
    } catch (e) {
      // Ignore localStorage access errors
    }
  }, [])

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("clipped_sidebar_collapsed", String(next))
      } catch (e) {}
      return next
    })
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
      className="relative flex h-screen flex-col border-r border-border/40 bg-card/70 dark:bg-zinc-950/60 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/40 z-30 select-none transition-colors"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-3.5 border-b border-border/40">
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
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">
                  AI
                </span>
              </div>
            </Link>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 dark:hover:bg-zinc-800/60 transition-colors"
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

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
            const Icon = item.icon

            if (isCollapsed) {
              return (
                <div key={item.href} className="relative group flex justify-center">
                  <Link
                    href={item.href}
                    className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 scale-105"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60 dark:hover:bg-zinc-800/60"
                    }`}
                    aria-label={item.name}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>

                  {/* Floating Tooltip when collapsed */}
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover/95 text-popover-foreground text-xs font-medium rounded-lg shadow-xl border border-border/50 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 flex items-center gap-1.5 backdrop-blur-md top-1/2 -translate-y-1/2">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded text-white bg-gradient-to-r ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
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

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white bg-gradient-to-r ${item.badgeColor} shadow-xs flex items-center gap-0.5`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* AI Usage Card (When Expanded) */}
        {!isCollapsed && (
          <div className="mt-6 mx-1 p-3 rounded-xl bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent border border-violet-500/20 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-xs font-semibold text-foreground">AI Credits</span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">850 / 1k</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 w-[85%] rounded-full" />
            </div>
            <Link
              href="/create"
              className="text-[11px] font-semibold text-violet-500 hover:text-violet-400 flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3" /> Create new clip &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Footer Area */}
      <div className="p-3 border-t border-border/40 mt-auto">
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
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-popover/95 text-popover-foreground text-xs font-medium rounded-lg shadow-xl border border-border/50 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 backdrop-blur-md top-1/2 -translate-y-1/2">
                Expand Sidebar
              </div>
            </div>

            <div className="relative group">
              <button
                className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-popover/95 text-popover-foreground text-xs font-medium rounded-lg shadow-xl border border-border/50 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 backdrop-blur-md top-1/2 -translate-y-1/2">
                Logout
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
