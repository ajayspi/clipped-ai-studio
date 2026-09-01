import React from "react"
import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/MobileNav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Video, Sparkles, Activity } from "lucide-react"
import Link from "next/link"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col md:flex-row bg-background overflow-x-hidden">
      {/* Ambient Glowing Mesh Gradients in Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Top-left vibrant violet/indigo glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-violet-600/20 via-indigo-500/15 to-transparent rounded-full blur-[140px] dark:from-violet-600/25 dark:via-indigo-500/20" />
        {/* Mid-right fuchsia/pink glow */}
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-gradient-to-bl from-fuchsia-500/15 via-pink-500/10 to-transparent rounded-full blur-[140px] dark:from-fuchsia-600/20 dark:via-pink-500/15" />
        {/* Bottom-center cyan/teal glow */}
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-gradient-to-tr from-cyan-500/15 via-teal-500/10 to-transparent rounded-full blur-[140px] dark:from-cyan-500/20" />
      </div>

      {/* Mobile Header (Sticky Glassmorphism) */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/40 bg-background/70 dark:bg-zinc-950/70 backdrop-blur-xl px-4 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-violet-500/20">
            <Video className="w-3.5 h-3.5" />
          </div>
          <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text">
            Clipped
          </span>
          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">
            AI
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <MobileNav />
        </div>
      </header>

      {/* Desktop Sidebar with Glassmorphism */}
      <div className="hidden md:block shrink-0 relative z-30">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-[calc(100vh-3.5rem)] md:h-screen relative z-10">
        {/* Desktop Header (Glassmorphism & Quick Actions) */}
        <header className="hidden md:flex sticky top-0 z-20 h-16 items-center justify-between border-b border-border/40 bg-background/60 dark:bg-zinc-950/50 backdrop-blur-xl px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AI Studio Engine Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Video</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
