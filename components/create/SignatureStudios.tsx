import Link from "next/link";
import { Scissors, Clapperboard, PenTool, Layers, ArrowRight, Newspaper, Cpu } from "lucide-react";

export const SIGNATURE_STUDIOS = [
  {
    id: "shorts",
    title: "Social Shorts Studio",
    badge: "⚡ Virality & Shorts",
    href: "/create/shorts",
    icon: Scissors,
    iconColor: "text-amber-600 dark:text-amber-500",
    bgGradient: "from-amber-500/15 via-orange-500/5 to-transparent",
    borderHover: "hover:border-amber-500/50",
    glowColor: "group-hover:shadow-amber-500/10",
    description: "Produce viral shorts, automated stories, and social commentary clips with instant hooks.",
    features: [
      "1-Click Auto Pilot",
      "Stories Generator",
      "Stock B-Roll",
      "AI Video Clips",
      "Reddit/Trivia Hooks",
    ],
  },
  {
    id: "cinema",
    title: "Cinema & Drama Studio",
    badge: "🎬 Cinema & Drama",
    href: "/create/cinema",
    icon: Clapperboard,
    iconColor: "text-indigo-600 dark:text-indigo-500",
    bgGradient: "from-indigo-500/15 via-purple-500/5 to-transparent",
    borderHover: "hover:border-indigo-500/50",
    glowColor: "group-hover:shadow-indigo-500/10",
    description: "Direct cinematic narratives with physical optics, character consistency, and previs.",
    features: [
      "Episodic Micro-Drama Series",
      "Character Visual Consistency",
      "3D Camera Optics",
      "Previs & Script Breakdown",
    ],
  },
  {
    id: "2d",
    title: "2D & Explainer Studio",
    badge: "✏️ 2D & Explainers",
    href: "/create/2d",
    icon: PenTool,
    iconColor: "text-emerald-600 dark:text-emerald-500",
    bgGradient: "from-emerald-500/15 via-teal-500/5 to-transparent",
    borderHover: "hover:border-emerald-500/50",
    glowColor: "group-hover:shadow-emerald-500/10",
    description: "Script-to-props vector animation, whiteboard sketches, talking avatars, and zero-cost podcasts.",
    features: [
      "Script-to-Props Vector Engine",
      "Hand-Drawn Whiteboard Animation",
      "Talking Avatars",
      "Code Explainers",
      "AI Podcasts ($0 compute)",
    ],
  },
  {
    id: "papercraft",
    title: "Vox Papercraft & Documentary",
    badge: "📰 Vox & Origami",
    href: "/create/papercraft",
    icon: Newspaper,
    iconColor: "text-amber-600",
    bgGradient: "from-amber-600/15 via-orange-500/5 to-transparent",
    borderHover: "hover:border-amber-600/50",
    glowColor: "group-hover:shadow-amber-600/10",
    description: "Produce high-retention Vox-style documentary explainers with torn paper, tape fasteners, and 3D origami folds.",
    features: [
      "Ripped Paper Cutout Physics",
      "3D Origami Folding Transitions",
      "12 FPS Stop-Motion Jitter",
      "Vintage Newsprint & Kraft Themes",
      "Fastener Kits (Tape & Clips)",
    ],
  },
  {
    id: "tech-diagram",
    title: "Technical Architecture & Signals",
    badge: "⚡ SysArch & Signals",
    href: "/create/code-video",
    icon: Cpu,
    iconColor: "text-cyan-600 dark:text-cyan-500",
    bgGradient: "from-cyan-500/15 via-teal-500/5 to-transparent",
    borderHover: "hover:border-cyan-500/50",
    glowColor: "group-hover:shadow-cyan-500/10",
    description: "Produce technical explainer videos with WaveDrom digital timing waveforms, Lanshu architecture flows, and Lawrence Systems enterprise network topologies.",
    features: [
      "WaveDrom Vector Waveforms",
      "Lanshu Animated Architecture Flows",
      "Lawrence Systems Topologies",
      "Live Flowing Packet Indicators",
      "Deterministic HTML5 HyperFrames",
    ],
  },
  {
    id: "campaign",
    title: "Campaign & Newsroom Studio",
    badge: "🚀 Campaigns & Automation",
    href: "/create/campaign",
    icon: Layers,
    iconColor: "text-rose-600 dark:text-rose-500",
    bgGradient: "from-rose-500/15 via-pink-500/5 to-transparent",
    borderHover: "hover:border-rose-500/50",
    glowColor: "group-hover:shadow-rose-500/10",
    description: "Automate month-long content calendars, spatial video repurposing, and multi-channel publishing.",
    features: [
      "30-Day Viral Bulk Planner",
      "Spatial Video Outpainting (16:9 -> 9:16)",
      "Content Calendar",
      "Long-to-Shorts Repurposer",
    ],
  },
];

export function SignatureStudios() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            The 5 Signature Studios
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Specialized production environments engineered for high-retention video formats
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SIGNATURE_STUDIOS.map((studio) => {
          const Icon = studio.icon;
          return (
            <Link
              key={studio.id}
              href={studio.href}
              className={`group relative flex flex-col justify-between p-5 rounded-2xl border border-border/70 bg-gradient-to-b ${studio.bgGradient} bg-card hover:border-primary/50 transition-all duration-300 shadow-xs hover:shadow-md ${studio.glowColor} ${studio.borderHover} cursor-pointer`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`p-2.5 rounded-xl bg-card border border-border/70 ${studio.iconColor} shadow-xs group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-card/90 border border-border/60 text-muted-foreground">
                    {studio.badge}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {studio.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                  {studio.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {studio.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-muted-foreground font-medium"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                <span>Enter Studio</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
