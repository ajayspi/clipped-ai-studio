import {
  Video,
  Image as ImageIcon,
  Film,
  BookOpen,
  Layers,
  Scissors,
  Clapperboard,
  Sparkles,
  UserCheck,
  PenTool,
  Mic,
  Code,
  MessageSquare,
  HelpCircle,
  Globe,
  Camera,
  FileText,
  FileCode,
  type LucideIcon,
} from "lucide-react";
import {
  WorkflowDefinition,
  ApiKeysMap,
  WorkflowStatusResult,
  WorkflowHealthStatus,
} from "@/lib/engine/types";

export interface ExtendedWorkflowDefinition extends WorkflowDefinition {
  icon: LucideIcon;
  glowBg: string;
  settingsTab: string;
}

export const WORKFLOWS: ExtendedWorkflowDefinition[] = [
  {
    id: "cinema",
    title: "Cinema Studio (Director Mode)",
    description: "Direct cinematic shots with optical physics (focal lengths, apertures), 3D camera moves, and multi-image consistency.",
    icon: Clapperboard,
    iconName: "Clapperboard",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    borderHover: "hover:border-amber-500/50",
    glowBg: "from-amber-500/30 to-rose-500/10",
    href: "/create/cinema",
    category: "cinema",
    costTier: "$$$",
    primaryProviders: ["kling", "fal", "gemini"],
    fallbackProviders: ["Deterministic Director Engine & Keyless Flux"],
    hasFallback: true,
    badge: "PRO CINEMA",
    isNew: true,
    settingsUrl: "/settings?tab=Video%20APIs&provider=api_fal",
    settingsTab: "Video APIs",
  },
  {
    id: "bulk",
    title: "Zero-Click Newsroom & Bulk Planner",
    description: "Generate 30 days of viral content and newsroom trend-jacking in a specific niche at once.",
    icon: Layers,
    iconName: "Layers",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    borderHover: "hover:border-emerald-500/50",
    glowBg: "from-emerald-500/30 to-teal-500/5",
    href: "/create/bulk",
    category: "campaign",
    costTier: "$$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["30-Day Procedural Content Template Bank"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "stories",
    title: "Stories Generator",
    description: "Turn any topic into a multi-part shorts narrative series automatically.",
    icon: BookOpen,
    iconName: "BookOpen",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    borderHover: "hover:border-orange-500/50",
    glowBg: "from-orange-500/30 to-amber-500/5",
    href: "/create/stories",
    category: "shorts",
    costTier: "$$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Deterministic Narrative Bank & Free TTS"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "auto",
    title: "Auto Pilot",
    description: "Fully hands-off prompt-to-video generation and scheduling pipeline.",
    icon: Sparkles,
    iconName: "Sparkles",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    borderHover: "hover:border-indigo-500/50",
    glowBg: "from-indigo-500/35 to-violet-500/10",
    href: "/create/auto",
    category: "shorts",
    costTier: "$$",
    primaryProviders: ["gemini", "openai", "pexels"],
    fallbackProviders: ["Autonomous Cascade Dry-Run Engine"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "character",
    title: "Character Consistency (IP-Adapter)",
    description: "Keep the exact same face or mascot consistent across 10+ generated video scenes.",
    icon: UserCheck,
    iconName: "UserCheck",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    borderHover: "hover:border-cyan-500/50",
    glowBg: "from-cyan-500/30 to-blue-500/5",
    href: "/create/character",
    category: "cinema",
    costTier: "$$$",
    primaryProviders: ["fal", "kling"],
    fallbackProviders: [],
    hasFallback: false,
    settingsUrl: "/settings?tab=Video%20APIs&provider=api_fal",
    settingsTab: "Video APIs",
  },
  {
    id: "v2v",
    title: "Video-to-Video Restyle",
    description: "Transform raw footage into stunning Anime, 3D, or cinematic renders using AI.",
    icon: Clapperboard,
    iconName: "Clapperboard",
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    borderHover: "hover:border-fuchsia-500/50",
    glowBg: "from-fuchsia-500/30 to-pink-500/5",
    href: "/create/v2v",
    category: "cinema",
    costTier: "$$$",
    primaryProviders: ["kling", "fal"],
    fallbackProviders: [],
    hasFallback: false,
    settingsUrl: "/settings?tab=Video%20APIs&provider=api_fal",
    settingsTab: "Video APIs",
  },
  {
    id: "outpaint",
    title: "Spatial Video Outpainting",
    description: "Convert 16:9 YouTube videos to 9:16 TikToks by letting AI naturally paint the missing borders.",
    icon: Scissors,
    iconName: "Scissors",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    borderHover: "hover:border-emerald-500/50",
    glowBg: "from-emerald-500/30 to-teal-500/5",
    href: "/create/outpaint",
    category: "campaign",
    costTier: "$$$",
    primaryProviders: ["fal"],
    fallbackProviders: ["Crop/Zoom"],
    hasFallback: true,
    settingsUrl: "/settings?tab=Video%20APIs&provider=api_fal",
    settingsTab: "Video APIs",
  },
  {
    id: "ai-videos",
    title: "AI Videos",
    description: "Use Kling, Luma, or Fal to generate 100% synthetic video scenes.",
    icon: Film,
    iconName: "Film",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    borderHover: "hover:border-pink-500/50",
    glowBg: "from-pink-500/30 to-rose-500/5",
    href: "/create/ai-videos",
    category: "shorts",
    costTier: "$$$",
    primaryProviders: ["kling", "luma", "fal"],
    fallbackProviders: ["Mixkit Royalty-Free Clips & Dry Run"],
    hasFallback: true,
    settingsUrl: "/settings?tab=Stock%20Media&provider=api_kling",
    settingsTab: "Stock Media",
  },
  {
    id: "images",
    title: "AI Images Video",
    description: "Generate consistent AI images and animate them into a video.",
    icon: ImageIcon,
    iconName: "Image",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    borderHover: "hover:border-purple-500/50",
    glowBg: "from-purple-500/30 to-indigo-500/5",
    href: "/create/images",
    category: "shorts",
    costTier: "$$",
    primaryProviders: ["fal", "ideogram", "openai", "gemini"],
    fallbackProviders: ["Pollinations.ai Keyless Flux Generator"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_fal",
    settingsTab: "AI Models",
  },
  {
    id: "footage",
    title: "Stock Footage Video",
    description: "Generate video using premium stock footage matched to your script.",
    icon: Video,
    iconName: "Video",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    borderHover: "hover:border-sky-500/50",
    glowBg: "from-sky-500/30 to-blue-500/5",
    href: "/create/footage",
    category: "shorts",
    costTier: "$",
    primaryProviders: ["pexels", "pixabay", "gemini"],
    fallbackProviders: ["Public Stock & Openverse Scraper"],
    hasFallback: true,
    settingsUrl: "/settings?tab=Stock%20Media&provider=api_pexels",
    settingsTab: "Stock Media",
  },
  {
    id: "avatar",
    title: "Avatar to Video",
    description: "Generate talking-head videos with realistic AI avatars and voice sync.",
    icon: UserCheck,
    iconName: "UserCheck",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    borderHover: "hover:border-cyan-500/50",
    glowBg: "from-cyan-500/30 to-teal-500/5",
    href: "/create/avatar",
    category: "2d",
    costTier: "$$$",
    primaryProviders: ["heygen", "did"],
    fallbackProviders: ["Remotion PiP Talking Head & Audio Visualizer"],
    hasFallback: true,
    badge: "NEW",
    isNew: true,
    settingsUrl: "/settings?tab=Voice%20%26%20Audio&provider=api_heygen",
    settingsTab: "Voice & Audio",
  },
  {
    id: "whiteboard",
    title: "Whiteboard Animation",
    description: "Create hand-drawn sketch videos driven by consistent Gemini character sheets.",
    icon: PenTool,
    iconName: "PenTool",
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    borderHover: "hover:border-fuchsia-500/50",
    glowBg: "from-fuchsia-500/30 to-pink-500/5",
    href: "/create/whiteboard",
    category: "2d",
    costTier: "$",
    primaryProviders: ["gemini"],
    fallbackProviders: ["Pre-rendered 9-Pose SVG Sketch Bank"],
    hasFallback: true,
    badge: "NEW",
    isNew: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "drama",
    title: "Micro-Drama",
    description: "Generate a cinematic episodic mini-series with consistent characters.",
    icon: Clapperboard,
    iconName: "Clapperboard",
    color: "text-red-500",
    bg: "bg-red-500/10",
    borderHover: "hover:border-red-500/50",
    glowBg: "from-red-500/30 to-rose-500/5",
    href: "/create/drama",
    category: "cinema",
    costTier: "$$$",
    primaryProviders: ["fal", "kling", "gemini"],
    fallbackProviders: ["Dynamic Comic Arc Storyboard Mock Engine"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_fal",
    settingsTab: "AI Models",
  },
  {
    id: "shorts",
    title: "Extract Shorts",
    description: "Find viral hooks in long-form video or transcripts and extract shorts.",
    icon: Scissors,
    iconName: "Scissors",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    borderHover: "hover:border-amber-500/50",
    glowBg: "from-amber-500/30 to-yellow-500/5",
    href: "/create/shorts",
    category: "shorts",
    costTier: "$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Heuristic Virality & Energy Slicer"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "stick-figure",
    title: "2D Stick Figure Studio",
    description: "Script-to-props vector animation with procedural foley & lip sync.",
    icon: PenTool,
    iconName: "PenTool",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    borderHover: "hover:border-amber-500/50",
    glowBg: "from-amber-500/30 to-yellow-500/10",
    href: "/create/stick-figure",
    category: "2d",
    costTier: "$",
    primaryProviders: ["Deterministic Canvas Engine"],
    fallbackProviders: ["Local 2D Procedural Audio Engine"],
    hasFallback: true,
    badge: "STUDIO",
    isNew: true,
    settingsUrl: "/settings?tab=AI%20Models",
    settingsTab: "AI Models",
  },
  {
    id: "podcast",
    title: "AI Podcast Studio",
    description: "Dual-host conversational AI dialogue with waveform visualizers.",
    icon: Mic,
    iconName: "Mic",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    borderHover: "hover:border-rose-500/50",
    glowBg: "from-rose-500/30 to-pink-500/10",
    href: "/create/podcast",
    category: "2d",
    costTier: "$$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Edge TTS Multi-Voice"],
    hasFallback: true,
    settingsUrl: "/settings?tab=Voice%20%26%20Audio",
    settingsTab: "Voice & Audio",
  },
  {
    id: "code-video",
    title: "Code Explainer Studio",
    description: "Syntax-highlighted code fly-throughs with technical narration.",
    icon: Code,
    iconName: "Code",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    borderHover: "hover:border-blue-500/50",
    glowBg: "from-blue-500/30 to-cyan-500/10",
    href: "/create/code-video",
    category: "2d",
    costTier: "$",
    primaryProviders: ["gemini"],
    fallbackProviders: ["Monaco AST Syntax Engine"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "reddit",
    title: "Reddit & Thread Shorts",
    description: "Scrape viral Reddit discussions or text threads into commentary shorts.",
    icon: MessageSquare,
    iconName: "MessageSquare",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    borderHover: "hover:border-orange-500/50",
    glowBg: "from-orange-500/30 to-amber-500/10",
    href: "/create/reddit",
    category: "shorts",
    costTier: "$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Reddit Scraper & Template Engine"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "trivia",
    title: "Gamified Trivia Shorts",
    description: "Interactive 3-question trivia challenge with countdown timers and sound effects.",
    icon: HelpCircle,
    iconName: "HelpCircle",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    borderHover: "hover:border-violet-500/50",
    glowBg: "from-violet-500/30 to-purple-500/10",
    href: "/create/trivia",
    category: "shorts",
    costTier: "$",
    primaryProviders: ["gemini"],
    fallbackProviders: ["Deterministic Trivia Bank"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "url",
    title: "URL to Video",
    description: "Turn any web article, blog post, or documentation page into a summary video.",
    icon: Globe,
    iconName: "Globe",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    borderHover: "hover:border-teal-500/50",
    glowBg: "from-teal-500/30 to-emerald-500/10",
    href: "/create/url",
    category: "shorts",
    costTier: "$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Readability Scraper & Free TTS"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "previs",
    title: "3D Camera Previs",
    description: "Pre-visualize camera angles, focal lengths, and framing before final render.",
    icon: Camera,
    iconName: "Camera",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    borderHover: "hover:border-indigo-500/50",
    glowBg: "from-indigo-500/30 to-purple-500/10",
    href: "/create/previs",
    category: "cinema",
    costTier: "$$",
    primaryProviders: ["gemini", "fal"],
    fallbackProviders: ["Three.js Camera Rig Preview"],
    hasFallback: true,
    settingsUrl: "/settings?tab=Video%20APIs&provider=api_fal",
    settingsTab: "Video APIs",
  },
  {
    id: "scriptbreak",
    title: "Script Breakdown & Tension",
    description: "Deconstruct scripts into emotional tension curves, pacing, and shot lists.",
    icon: FileText,
    iconName: "FileText",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    borderHover: "hover:border-pink-500/50",
    glowBg: "from-pink-500/30 to-rose-500/10",
    href: "/create/scriptbreak",
    category: "cinema",
    costTier: "$",
    primaryProviders: ["gemini", "openai"],
    fallbackProviders: ["Heuristic Pacing Engine"],
    hasFallback: true,
    settingsUrl: "/settings?tab=AI%20Models&provider=api_gemini",
    settingsTab: "AI Models",
  },
  {
    id: "yaml",
    title: "Declarative YAML Pipelines",
    description: "Build, edit, and run complex multi-step video DAG pipelines as code.",
    icon: FileCode,
    iconName: "FileCode",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    borderHover: "hover:border-emerald-500/50",
    glowBg: "from-emerald-500/30 to-green-500/10",
    href: "/create/yaml",
    category: "campaign",
    costTier: "$",
    primaryProviders: ["Deterministic DAG Orchestrator"],
    fallbackProviders: ["Local YAML Runner"],
    hasFallback: true,
    badge: "DAG",
    settingsUrl: "/settings?tab=AI%20Models",
    settingsTab: "AI Models",
  },
];

export const WORKFLOW_DEFINITIONS: Record<string, ExtendedWorkflowDefinition> = WORKFLOWS.reduce(
  (acc, wf) => {
    acc[wf.id] = wf;
    return acc;
  },
  {} as Record<string, ExtendedWorkflowDefinition>
);

// Map common aliases
if (WORKFLOW_DEFINITIONS["bulk"]) WORKFLOW_DEFINITIONS["bulk-plan"] = WORKFLOW_DEFINITIONS["bulk"];
if (WORKFLOW_DEFINITIONS["shorts"]) WORKFLOW_DEFINITIONS["extract-shorts"] = WORKFLOW_DEFINITIONS["shorts"];
if (WORKFLOW_DEFINITIONS["drama"]) WORKFLOW_DEFINITIONS["micro-drama"] = WORKFLOW_DEFINITIONS["drama"];

export function isProviderConfigured(provider: string, keysMap: ApiKeysMap = {}): boolean {
  if (!provider) return false;
  const raw = provider.toLowerCase().trim();
  const clean = raw.replace(/^api_/, "");

  if (raw.includes("deterministic") || raw.includes("canvas") || raw.includes("monaco") || raw.includes("orchestrator") || raw.includes("local")) {
    return true;
  }

  // OmniRoute is an LLM gateway — it satisfies LLM requirements, but NOT media/stock capabilities
  const isLlmProvider = ["gemini", "openai", "anthropic"].includes(clean);
  const omniEntry =
    keysMap["omniroute"] ||
    keysMap["omniroute_api_key"] ||
    keysMap["omniroute_endpoint_url"];
  if (isLlmProvider && omniEntry?.isConfigured) return true;

  const entry = keysMap[clean] || keysMap[`api_${clean}`] || keysMap[raw];
  return Boolean(entry?.isConfigured && entry?.isActive !== false);
}

export function evaluateWorkflowStatus(
  workflow: WorkflowDefinition | ExtendedWorkflowDefinition,
  keysMap: ApiKeysMap = {}
): WorkflowStatusResult {
  const required = workflow.primaryProviders || [];
  
  // Group providers by capability to avoid requiring redundant keys (e.g., both pexels AND pixabay)
  const isStock = required.includes("pexels") || required.includes("pixabay");
  const isVideoGen = required.includes("fal") || required.includes("kling") || required.includes("luma") || required.includes("ideogram") || required.includes("bytez");
  const isAvatar = required.includes("heygen") || required.includes("did");
  
  const configured = required.filter((p) => isProviderConfigured(p, keysMap));
  const missing = required.filter((p) => !isProviderConfigured(p, keysMap));
  
  // If we have at least one provider in a capability group, consider the group satisfied
  let satisfied = configured.length === required.length;
  const actuallyMissing: string[] = [];
  
  if (!satisfied) {
    // Check if we have at least one LLM
    const hasLlm = configured.some(p => ["gemini", "openai", "anthropic"].includes(p));
    const llmRequired = required.some(p => ["gemini", "openai", "anthropic"].includes(p));
    if (llmRequired && !hasLlm) actuallyMissing.push(required.find(p => ["gemini", "openai", "anthropic"].includes(p)) || "gemini");
    
    if (isStock) {
      const hasStock = configured.some(p => ["pexels", "pixabay"].includes(p));
      if (!hasStock) actuallyMissing.push("pexels");
    }
    
    if (isVideoGen) {
      const hasVideoGen = configured.some(p => ["fal", "kling", "luma", "ideogram", "bytez"].includes(p));
      if (!hasVideoGen) actuallyMissing.push("fal");
    }
    
    if (isAvatar) {
      const hasAvatar = configured.some(p => ["heygen", "did"].includes(p));
      if (!hasAvatar) actuallyMissing.push("heygen");
    }
    
    if (actuallyMissing.length === 0 && required.length > 0 && configured.length > 0) {
      satisfied = true;
    }
  }

  let status: WorkflowHealthStatus = "ready";
  let label = "Ready";
  let message = "All required AI engines configured.";

  if (satisfied) {
    status = "ready";
    label = "Ready";
    message = `Configured: ${configured.map((p) => p.toUpperCase()).join(", ")}`;
  } else if (workflow.hasFallback) {
    status = "warning";
    label = "Fallback Mode";
    const fallbackName = workflow.fallbackProviders?.[0] || "Built-in Engine";
    message = `Missing ${actuallyMissing.map((p) => p.toUpperCase()).join("/")}. Active fallback: ${fallbackName}.`;
  } else {
    status = "error";
    label = "Keys Needed";
    message = `Requires ${actuallyMissing.map((p) => p.toUpperCase()).join("/")} API key to operate.`;
  }

  return {
    status,
    costTier: workflow.costTier,
    label,
    requiredProviders: required,
    missingProviders: missing,
    configuredProviders: configured,
    fallbackAvailable: Boolean(workflow.hasFallback),
    message,
  };
}

