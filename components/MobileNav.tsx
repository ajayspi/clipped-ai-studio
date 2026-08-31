"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Video, Library, Settings, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create", href: "/create", icon: Video },
  { name: "Library", href: "/library", icon: Library },
  { name: "Planner", href: "/planner", icon: CalendarDays },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 -mr-2 rounded-md hover:bg-muted text-foreground"
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
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-3/4 max-w-sm bg-background border-l z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-bold text-lg">Menu</span>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded-md hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={\`flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium transition-colors \${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}\`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
              
              <div className="p-4 border-t">
                <button className="w-full text-sm font-medium text-muted-foreground hover:text-foreground text-left px-4 py-2">
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
