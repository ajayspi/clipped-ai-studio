import React from "react"
import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/MobileNav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Video } from "lucide-react"
import Link from "next/link"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Video className="w-3 h-3 text-primary-foreground" />
          </div>
          Clipped
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <MobileNav />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-[calc(100vh-3.5rem)] md:h-screen">
        {/* Desktop Header */}
        <header className="hidden md:flex sticky top-0 z-10 h-14 items-center justify-end border-b bg-background/95 backdrop-blur px-4 gap-2">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/10 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
