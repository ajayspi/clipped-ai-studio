import Link from "next/link";
import { Video, CheckCircle2, Calendar, ShieldCheck, ArrowUpRight } from "lucide-react";

interface StudioPulseProps {
  activeRenders: number;
  completedVideos: number;
  scheduledPosts: number;
  quotaHealth?: string;
}

export function StudioPulse({
  activeRenders,
  completedVideos,
  scheduledPosts,
  quotaHealth = "100% (Keyless)",
}: StudioPulseProps) {
  const cards = [
    {
      label: "Active Renders",
      value: activeRenders,
      subtext: activeRenders > 0 ? `${activeRenders} compiling in queue` : "Render queue idle",
      href: "/queue",
      icon: Video,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/20",
      activePulse: activeRenders > 0,
      badge: activeRenders > 0 ? "LIVE" : "IDLE",
      badgeColor: activeRenders > 0 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground border-border/60",
    },
    {
      label: "Completed Videos",
      value: completedVideos,
      subtext: "Published & ready in library",
      href: "/library",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      activePulse: false,
      badge: "LIBRARY",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    },
    {
      label: "Scheduled Posts",
      value: scheduledPosts,
      subtext: "Automated distribution queue",
      href: "/planner",
      icon: Calendar,
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      activePulse: false,
      badge: "CALENDAR",
      badgeColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
    },
    {
      label: "API Quota Health",
      value: quotaHealth,
      subtext: "Edge TTS + Pollinations AI ($0 compute)",
      href: "/settings",
      icon: ShieldCheck,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
      activePulse: false,
      badge: "ZERO-COST",
      badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          Studio Pulse & Infrastructure
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`group relative overflow-hidden rounded-xl border ${card.borderColor} bg-card p-4 backdrop-blur-md transition-all duration-200 hover:border-primary/50 hover:bg-card shadow-xs hover:shadow-md hover:shadow-zinc-900/5 dark:hover:shadow-violet-500/5`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block">
                      {card.label}
                    </span>
                    <span className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5 mt-0.5">
                      {card.value}
                      {card.activePulse && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground mt-3 line-clamp-1">
                {card.subtext}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
