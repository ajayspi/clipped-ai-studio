"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  X,
  LayoutDashboard,
  Video,
  Library,
  Settings,
  CalendarDays,
  LogOut,
  Sparkles,
  Wand2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create AI Video", href: "/create", icon: Wand2, badge: "AI" },
  { name: "Library", href: "/library", icon: Library },
  { name: "Planner", href: "/planner", icon: CalendarDays },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

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
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>

              <div className="p-4 border-t border-border/40 mt-auto">
                <button className="flex items-center gap-3 w-full text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl px-4 py-3 transition-colors">
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
